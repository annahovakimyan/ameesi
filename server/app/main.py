from contextlib import asynccontextmanager
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import swisseph as swe
from fastapi import FastAPI, HTTPException

from . import engine
from .models import ChartRequest
from .timezones import TZDATA_VERSION, resolve_local
from .uncertainty import flag_uncertain, moon_changes_sign

SAMPLE_STEP = timedelta(minutes=5)


@asynccontextmanager
async def lifespan(_app):
    engine.init_ephemeris()
    yield


app = FastAPI(title="Ameesi calculation server", lifespan=lifespan)


def r2(x: float) -> float:
    return round(x, 2)


def to_response(chart: dict) -> dict:
    """Round for display. Full precision stays inside the engine."""
    bodies = [{**b, "lon": r2(b["lon"]), "lat": r2(b["lat"]), "speed": round(b["speed"], 4),
               "sign_deg": r2(b["sign_deg"])} for b in chart["bodies"].values()]
    angles = ({k: {**a, "lon": r2(a["lon"]), "sign_deg": r2(a["sign_deg"])}
               for k, a in chart["angles"].items()} if chart["angles"] else None)
    houses = ([{**h, "cusp_lon": r2(h["cusp_lon"])} for h in chart["houses"]]
              if chart["houses"] else None)
    aspects = [{**a, "separation": r2(a["separation"]), "orb": r2(a["orb"])} for a in chart["aspects"]]
    return {"bodies": bodies, "angles": angles, "houses": houses, "aspects": aspects,
            "aspects_uncertain": chart["aspects_uncertain"],
            "stelliums": chart["stelliums"], "balance": chart["balance"]}


def window_times(d: date, start: time, end: time) -> tuple[list[time], time]:
    """Every 5 minutes from start to end (both included), and the midpoint."""
    t0, t1 = datetime.combine(d, start), datetime.combine(d, end)
    samples, t = [], t0
    while t <= t1:
        samples.append(t.time())
        t += SAMPLE_STEP
    if samples[-1] != end:
        samples.append(end)
    return samples, (t0 + (t1 - t0) / 2).time()


@app.post("/charts/calculate")
def calculate_chart(req: ChartRequest):
    try:
        ZoneInfo(req.place.tz)
    except (ZoneInfoNotFoundError, ValueError):
        raise HTTPException(422, f"unknown time zone: {req.place.tz}")

    def utc_at(t: time) -> datetime:
        return resolve_local(req.date, t, req.place.tz, req.utc_offset_override)["utc_dt"]

    def chart_at(t: time, with_houses: bool = True) -> dict:
        return engine.calculate(utc_at(t), req.place.lat, req.place.lon, req.house_system, with_houses)

    # The moment the chart is drawn for
    if req.time_confidence == "exact":
        report_time = req.time
    elif req.time_confidence == "approximate":
        samples, report_time = window_times(req.date, req.time_window.from_, req.time_window.to)
    else:
        report_time = time(12, 0)

    resolved = resolve_local(req.date, report_time, req.place.tz, req.utc_offset_override)
    meta = {
        "engine": engine.ENGINE_VERSION,
        "swisseph": swe.version,
        "tzdata": TZDATA_VERSION,
        "zodiac": "tropical",
        "house_system_requested": req.house_system,
        "house_system_used": None,
        "node": "true",
        "calculated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    time_block = {
        "local": f"{req.date.isoformat()}T{report_time.strftime('%H:%M')}",
        "utc": resolved["utc"],
        "utc_offset_minutes": resolved["utc_offset_minutes"],
        "offset_source": resolved["offset_source"],
        "confidence": req.time_confidence,
        "dst_ambiguity": resolved["dst_ambiguity"],
    }
    if req.time_confidence == "approximate":
        time_block["window"] = {"from": req.time_window.from_.strftime("%H:%M"),
                                "to": req.time_window.to.strftime("%H:%M")}

    if resolved["dst_ambiguity"]:
        # Don't guess: the app asks the user and resends with utc_offset_override.
        return {"meta": meta, "time": time_block, "bodies": [], "angles": None, "houses": None,
                "aspects": [], "aspects_uncertain": [], "stelliums": [], "balance": None,
                "warnings": [{"code": "needs_confirmation",
                              "message": "This local time is ambiguous because of a clock change. "
                                         "Please choose the correct moment."}]}

    if req.time_confidence == "exact":
        chart = chart_at(report_time)
    elif req.time_confidence == "approximate":
        chart = flag_uncertain(chart_at(report_time), [chart_at(t) for t in samples])
    else:
        chart = chart_at(report_time, with_houses=False)
        if moon_changes_sign(chart_at(time(0, 0), False), chart_at(time(23, 59), False)):
            chart["bodies"]["moon"]["uncertain"] = True

    meta["house_system_used"] = chart["house_system_used"] if chart["houses"] else None
    warnings = list(chart["warnings"])
    if resolved["offset_source"] == "user_override":
        warnings.append({"code": "utc_offset_overridden",
                         "message": "The UTC offset was set by hand instead of the time zone database."})
    return {"meta": meta, "time": time_block, **to_response(chart), "warnings": warnings}
