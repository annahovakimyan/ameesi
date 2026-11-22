"""Ameesi chart engine: the only place astrology is calculated. See docs/engine-spec.md."""
from __future__ import annotations

import os
import threading
from datetime import date, datetime, time, timedelta, timezone

import swisseph as swe

from .timeutil import TZDATA_VERSION, resolve_local_time

ENGINE_VERSION = "ameesi-engine 0.1.0"
EPHE_PATH = os.environ.get("AMEESI_EPHE_PATH", os.path.join(os.path.dirname(__file__), "..", "ephe"))

SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo",
         "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]
ELEMENT = {"aries": "fire", "leo": "fire", "sagittarius": "fire",
           "taurus": "earth", "virgo": "earth", "capricorn": "earth",
           "gemini": "air", "libra": "air", "aquarius": "air",
           "cancer": "water", "scorpio": "water", "pisces": "water"}
MODALITY = {"aries": "cardinal", "cancer": "cardinal", "libra": "cardinal", "capricorn": "cardinal",
            "taurus": "fixed", "leo": "fixed", "scorpio": "fixed", "aquarius": "fixed",
            "gemini": "mutable", "virgo": "mutable", "sagittarius": "mutable", "pisces": "mutable"}

PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]
SWE_IDS = {"sun": swe.SUN, "moon": swe.MOON, "mercury": swe.MERCURY, "venus": swe.VENUS, "mars": swe.MARS,
           "jupiter": swe.JUPITER, "saturn": swe.SATURN, "uranus": swe.URANUS, "neptune": swe.NEPTUNE,
           "pluto": swe.PLUTO, "north_node": swe.TRUE_NODE, "chiron": swe.CHIRON}
BODY_ORDER = PLANETS + ["north_node", "south_node", "chiron"]

ASPECTS = [("conjunction", 0, 8.0), ("sextile", 60, 5.0), ("square", 90, 7.0),
           ("trine", 120, 7.0), ("opposition", 180, 8.0)]
LUMINARY_BONUS = 2.0
CUSP_FLAG_DEG = 1.0
POLAR_LATITUDE = 66.0
SAMPLE_MINUTES = 5

_local = threading.local()


class EngineError(Exception):
    """A calculation that cannot be done reliably. Never return a guessed chart instead."""


def init() -> None:
    """Point Swiss Ephemeris at the data files. Its settings are per thread, so every thread runs this once."""
    if getattr(_local, "ready", False):
        return
    path = os.path.abspath(EPHE_PATH)
    for f in ("sepl_18.se1", "semo_18.se1", "seas_18.se1"):
        if not os.path.exists(os.path.join(path, f)):
            raise EngineError(f"Swiss Ephemeris file missing: {f} in {path}")
    swe.set_ephe_path(path)
    _local.ready = True


# ---------- small helpers ----------

def norm(x: float) -> float:
    return x % 360.0


def sign_of(lon: float) -> str:
    return SIGNS[int(norm(lon) // 30) % 12]


def sign_deg(lon: float) -> float:
    return norm(lon) % 30.0


def separation(a: float, b: float) -> float:
    d = abs(norm(a) - norm(b)) % 360.0
    return 360.0 - d if d > 180.0 else d


def julday(utc: datetime) -> float:
    h = utc.hour + utc.minute / 60 + utc.second / 3600
    return swe.julday(utc.year, utc.month, utc.day, h, swe.GREG_CAL)


# ---------- positions ----------

def body_positions(jd: float) -> dict:
    init()
    out = {}
    for name, sid in SWE_IDS.items():
        try:
            xx, ret = swe.calc_ut(jd, sid, swe.FLG_SWIEPH | swe.FLG_SPEED)
        except swe.Error as e:  # e.g. Chiron outside its ephemeris range
            raise EngineError(f"could not calculate {name}: {e}") from e
        if not ret & swe.FLG_SWIEPH:
            raise EngineError(f"{name} fell back from Swiss Ephemeris files; check the ephe folder")
        out[name] = {"lon": norm(xx[0]), "lat": xx[1], "speed": xx[3]}
    nn = out["north_node"]
    out["south_node"] = {"lon": norm(nn["lon"] + 180.0), "lat": -nn["lat"], "speed": nn["speed"]}
    return out


def houses(jd: float, lat: float, lon: float, system: str) -> tuple[list[float], dict, str, list[dict]]:
    """Return (12 cusps, angles, system used, warnings)."""
    warnings = []
    used = system
    if system == "placidus" and abs(lat) >= POLAR_LATITUDE:
        used = "whole_sign"
        warnings.append({"code": "placidus_polar_fallback",
                         "message": "Placidus houses can't be calculated this far north or south, so Whole Sign houses are used."})
    cusps, ascmc = swe.houses_ex(jd, lat, lon, b"P" if used == "placidus" else b"W")
    if used == "placidus" and (len(cusps) != 12 or any(c != c for c in cusps)):
        used = "whole_sign"
        warnings.append({"code": "placidus_polar_fallback",
                         "message": "Placidus houses failed for this place, so Whole Sign houses are used."})
        cusps, ascmc = swe.houses_ex(jd, lat, lon, b"W")
    asc, mc = norm(ascmc[0]), norm(ascmc[1])
    angles = {"asc": asc, "mc": mc, "dsc": norm(asc + 180), "ic": norm(mc + 180)}
    return [norm(c) for c in cusps], angles, used, warnings


def house_of(lon: float, cusps: list[float]) -> int:
    lon = norm(lon)
    for i in range(12):
        start, end = cusps[i], cusps[(i + 1) % 12]
        width = (end - start) % 360.0
        if (lon - start) % 360.0 < width:
            return i + 1
    return 12  # unreachable with valid cusps


def near_cusp(lon: float, cusps: list[float]) -> bool:
    return any(separation(lon, c) <= CUSP_FLAG_DEG for c in cusps)


def find_aspects(pos: dict) -> list[dict]:
    found = []
    for i, a in enumerate(PLANETS):
        for b in PLANETS[i + 1:]:
            sep = separation(pos[a]["lon"], pos[b]["lon"])
            bonus = LUMINARY_BONUS if a in ("sun", "moon") or b in ("sun", "moon") else 0.0
            best = None
            for name, angle, orb in ASPECTS:
                o = abs(sep - angle)
                if o <= orb + bonus and (best is None or o < best[2]):
                    best = (name, angle, o)
            if best:
                found.append({"a": a, "b": b, "type": best[0], "exact_angle": best[1],
                              "separation": round(sep, 2), "orb": round(best[2], 2),
                              "nearly_exact": best[2] <= 1.0})
    return found


def find_stelliums(placements: dict) -> list[dict]:
    out = []
    for kind in ("sign", "house"):
        groups: dict = {}
        for p in PLANETS:
            where = placements[p][kind]
            if where is not None:
                groups.setdefault(where, []).append(p)
        for where, members in groups.items():
            if len(members) >= 3:
                out.append({"kind": kind, "where": where, "members": members})
    return out


# ---------- the chart ----------

def _chart_at(utc: datetime, lat: float, lon: float, house_system: str, with_houses: bool) -> dict:
    jd = julday(utc)
    pos = body_positions(jd)
    cusps, angles, used, warnings = (None, None, None, [])
    if with_houses:
        cusps, angles, used, warnings = houses(jd, lat, lon, house_system)
    placements = {}
    for name in BODY_ORDER:
        p = pos[name]
        placements[name] = {
            "sign": sign_of(p["lon"]),
            "house": house_of(p["lon"], cusps) if cusps else None,
        }
    return {"pos": pos, "cusps": cusps, "angles": angles, "house_system_used": used,
            "warnings": warnings, "placements": placements, "aspects": find_aspects(pos)}


def _fmt_body(name, p, placement, cusps, uncertain=False):
    return {"id": name, "lon": round(p["lon"], 4), "lat": round(p["lat"], 4), "speed": round(p["speed"], 4),
            "sign": placement["sign"], "sign_deg": round(sign_deg(p["lon"]), 4),
            "house": placement["house"], "retrograde": p["speed"] < 0 and name not in ("north_node", "south_node"),
            "on_cusp": bool(cusps) and near_cusp(p["lon"], cusps), "uncertain": uncertain}


def calculate(*, birth_date: date, birth_time: time | None, time_confidence: str, time_window: dict | None,
              lat: float, lon: float, tz: str, house_system: str = "placidus",
              utc_offset_override: int | None = None) -> dict:
    if time_confidence not in ("exact", "approximate", "unknown"):
        raise EngineError("time_confidence must be exact, approximate or unknown")
    if house_system not in ("placidus", "whole_sign"):
        raise EngineError("house_system must be placidus or whole_sign")
    init()

    if time_confidence == "unknown":
        local = datetime.combine(birth_date, time(12, 0))
    elif time_confidence == "approximate":
        if not time_window:
            raise EngineError("approximate time needs time_window")
        t0, t1 = _window(birth_date, time_window)
        local = t0 + (t1 - t0) / 2
    else:
        if birth_time is None:
            raise EngineError("exact time needs time")
        local = datetime.combine(birth_date, birth_time)

    rt = resolve_local_time(local, tz, utc_offset_override)
    time_block = {"local": local.strftime("%Y-%m-%dT%H:%M"), "confidence": time_confidence,
                  "offset_source": rt.source, "dst_ambiguity": rt.ambiguity,
                  "utc": None, "utc_offset_minutes": rt.offset_minutes}
    meta = {"engine": ENGINE_VERSION, "swisseph": swe.version, "tzdata": TZDATA_VERSION, "zodiac": "tropical",
            "house_system_requested": house_system, "node": "true",
            "calculated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
    if rt.ambiguity:
        return {"meta": meta, "time": time_block, "bodies": [], "angles": None, "houses": None, "aspects": [],
                "stelliums": [], "balance": None,
                "warnings": [{"code": "needs_confirmation",
                              "message": "This local time was skipped or repeated by a clock change. Ask which time was meant."}]}

    utc = rt.utc
    time_block["utc"] = utc.strftime("%Y-%m-%dT%H:%MZ")
    with_houses = time_confidence != "unknown"
    c = _chart_at(utc, lat, lon, house_system, with_houses)
    meta["house_system_used"] = c["house_system_used"]

    uncertain_ids: set = set()
    aspects_uncertain: list = []
    if time_confidence == "unknown":
        uncertain_ids |= _moon_changes_sign_that_day(birth_date, tz, utc_offset_override)
    elif time_confidence == "approximate":
        uncertain_ids, aspects_uncertain = _window_changes(birth_date, time_window, lat, lon, tz,
                                                           house_system, utc_offset_override, c)

    bodies = [_fmt_body(n, c["pos"][n], c["placements"][n], c["cusps"], n in uncertain_ids) for n in BODY_ORDER]
    result = {"meta": meta, "time": time_block, "bodies": bodies, "aspects": c["aspects"],
              "stelliums": find_stelliums(c["placements"]), "balance": _balance(c["placements"]),
              "warnings": c["warnings"]}
    if aspects_uncertain:
        result["aspects_uncertain"] = aspects_uncertain
    if with_houses:
        result["angles"] = {k: {"lon": round(v, 4), "sign": sign_of(v), "sign_deg": round(sign_deg(v), 4),
                                "uncertain": k in uncertain_ids}
                            for k, v in c["angles"].items()}
        result["houses"] = [{"house": i + 1, "cusp_lon": round(cu, 4), "sign": sign_of(cu),
                             "uncertain": f"house_{i + 1}" in uncertain_ids}
                            for i, cu in enumerate(c["cusps"])]
    else:
        result["angles"] = None
        result["houses"] = None
    return result


def _balance(placements: dict) -> dict:
    out = {k: 0 for k in ("fire", "earth", "air", "water", "cardinal", "fixed", "mutable")}
    for p in PLANETS:
        s = placements[p]["sign"]
        out[ELEMENT[s]] += 1
        out[MODALITY[s]] += 1
    return out


def _window(birth_date: date, w: dict) -> tuple[datetime, datetime]:
    t0 = datetime.combine(birth_date, time.fromisoformat(w["from"]))
    t1 = datetime.combine(birth_date, time.fromisoformat(w["to"]))
    if t1 < t0:
        t1 += timedelta(days=1)
    if (t1 - t0) > timedelta(hours=24):
        raise EngineError("time window can't be longer than 24 hours")
    return t0, t1


def _moon_changes_sign_that_day(d: date, tz: str, override: int | None) -> set:
    signs = set()
    for hh, mm in ((0, 0), (23, 59)):
        rt = resolve_local_time(datetime.combine(d, time(hh, mm)), tz, override)
        utc = rt.utc or datetime.fromisoformat(rt.ambiguity["candidates_utc"][0].replace("Z", "+00:00"))
        signs.add(sign_of(body_positions(julday(utc))["moon"]["lon"]))
    return {"moon"} if len(signs) > 1 else set()


def _window_changes(d, w, lat, lon, tz, system, override, mid_chart) -> tuple[set, list]:
    t0, t1 = _window(d, w)
    samples = []
    t = t0
    while t <= t1:
        rt = resolve_local_time(t, tz, override)
        if rt.utc:
            samples.append(_chart_at(rt.utc, lat, lon, system, True))
        t += timedelta(minutes=SAMPLE_MINUTES)
    uncertain: set = set()
    for name in BODY_ORDER:
        if len({s["placements"][name]["sign"] for s in samples}) > 1 or \
           len({s["placements"][name]["house"] for s in samples}) > 1:
            uncertain.add(name)
    for k in ("asc", "mc", "dsc", "ic"):
        if len({sign_of(s["angles"][k]) for s in samples}) > 1:
            uncertain.add(k)
    for i in range(12):
        if len({sign_of(s["cusps"][i]) for s in samples}) > 1:
            uncertain.add(f"house_{i + 1}")
    keyset = lambda s: {(a["a"], a["b"], a["type"]) for a in s["aspects"]}
    always = set.intersection(*(keyset(s) for s in samples))
    ever = set.union(*(keyset(s) for s in samples))
    changing = sorted(ever - always)
    return uncertain, [{"a": a, "b": b, "type": ty} for a, b, ty in changing]
