from contextlib import asynccontextmanager
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import swisseph as swe
from fastapi import FastAPI, HTTPException

from . import engine
from .models import ChartRequest
from .timezones import TZDATA_VERSION, resolve_local


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
            "stelliums": chart["stelliums"], "balance": chart["balance"]}


@app.post("/charts/calculate")
def calculate_chart(req: ChartRequest):
    try:
        ZoneInfo(req.place.tz)
    except (ZoneInfoNotFoundError, ValueError):
        raise HTTPException(422, f"unknown time zone: {req.place.tz}")
    if req.time_confidence != "exact":
        raise HTTPException(501, f"time_confidence '{req.time_confidence}' is not implemented yet")

    resolved = resolve_local(req.date, req.time, req.place.tz, req.utc_offset_override)
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
        "local": f"{req.date.isoformat()}T{req.time.strftime('%H:%M')}",
        "utc": resolved["utc"],
        "utc_offset_minutes": resolved["utc_offset_minutes"],
        "offset_source": resolved["offset_source"],
        "confidence": req.time_confidence,
        "dst_ambiguity": resolved["dst_ambiguity"],
    }

    if resolved["dst_ambiguity"]:
        # Don't guess: the app asks the user and resends with utc_offset_override.
        return {"meta": meta, "time": time_block, "bodies": [], "angles": None, "houses": None,
                "aspects": [], "stelliums": [], "balance": None,
                "warnings": [{"code": "needs_confirmation",
                              "message": "This local time is ambiguous because of a clock change. "
                                         "Please choose the correct moment."}]}

    chart = engine.calculate(resolved["utc_dt"], req.place.lat, req.place.lon, req.house_system)
    meta["house_system_used"] = chart["house_system_used"]
    warnings = list(chart["warnings"])
    if resolved["offset_source"] == "user_override":
        warnings.append({"code": "utc_offset_overridden",
                         "message": "The UTC offset was set by hand instead of the time zone database."})
    return {"meta": meta, "time": time_block, **to_response(chart), "warnings": warnings}
