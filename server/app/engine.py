"""Chart calculation. The only place astrology is calculated (see docs/engine-spec.md)."""
from datetime import datetime, timezone
from itertools import combinations
from pathlib import Path
import threading

import swisseph as swe

ENGINE_VERSION = "ameesi-engine 0.1.0"
EPHE_DIR = Path(__file__).resolve().parent.parent / "ephe"
EPHE_FILES = ("sepl_18.se1", "semo_18.se1", "seas_18.se1")

SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo",
         "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]
ELEMENTS = ["fire", "earth", "air", "water"]
MODALITIES = ["cardinal", "fixed", "mutable"]

PLANETS = ["sun", "moon", "mercury", "venus", "mars",
           "jupiter", "saturn", "uranus", "neptune", "pluto"]
BODIES = PLANETS + ["north_node", "south_node", "chiron"]
SWE_IDS = {
    "sun": swe.SUN, "moon": swe.MOON, "mercury": swe.MERCURY, "venus": swe.VENUS,
    "mars": swe.MARS, "jupiter": swe.JUPITER, "saturn": swe.SATURN, "uranus": swe.URANUS,
    "neptune": swe.NEPTUNE, "pluto": swe.PLUTO, "north_node": swe.TRUE_NODE, "chiron": swe.CHIRON,
}

# (type, exact angle, base orb)
ASPECTS = [("conjunction", 0, 8), ("sextile", 60, 5), ("square", 90, 7),
           ("trine", 120, 7), ("opposition", 180, 8)]
LUMINARY_BONUS = 2
NEARLY_EXACT = 1.0
ON_CUSP = 1.0
HOUSE_CODES = {"placidus": b"P", "whole_sign": b"W"}


_thread_state = threading.local()


def init_ephemeris() -> None:
    """Point Swiss Ephemeris at the data files; fail loudly if any is missing.

    Swiss Ephemeris keeps its settings per thread, and FastAPI runs requests in worker
    threads, so this runs once per thread (see _ensure_ephemeris).
    """
    missing = [f for f in EPHE_FILES if not (EPHE_DIR / f).is_file()]
    if missing:
        raise RuntimeError(f"Swiss Ephemeris files missing from {EPHE_DIR}: {', '.join(missing)}")
    swe.set_ephe_path(str(EPHE_DIR))
    _thread_state.ready = True


def _ensure_ephemeris() -> None:
    if not getattr(_thread_state, "ready", False):
        init_ephemeris()


# --- small helpers -------------------------------------------------------

def norm(x: float) -> float:
    return x % 360.0


def sign_index(lon: float) -> int:
    return int(norm(lon) // 30)


def sign_of(lon: float) -> str:
    return SIGNS[sign_index(lon)]


def sign_deg(lon: float) -> float:
    return norm(lon) % 30


def separation(a: float, b: float) -> float:
    d = abs(norm(a) - norm(b))
    return 360 - d if d > 180 else d


def house_of(lon: float, cusps: list[float]) -> int:
    """House number (1–12) for a longitude, by exact position against the cusps."""
    for i in range(12):
        start, end = cusps[i], cusps[(i + 1) % 12]
        if norm(lon - start) < norm(end - start):
            return i + 1
    raise ValueError("cusps do not cover the circle")


def on_cusp(lon: float, cusps: list[float]) -> bool:
    return any(separation(lon, c) <= ON_CUSP for c in cusps)


def julian_day(utc: datetime) -> float:
    utc = utc.astimezone(timezone.utc)
    hour = utc.hour + utc.minute / 60 + utc.second / 3600 + utc.microsecond / 3.6e9
    return swe.julday(utc.year, utc.month, utc.day, hour)


# --- aspects, stelliums, balance -----------------------------------------

def aspect_between(a: str, b: str, sep: float) -> dict | None:
    bonus = LUMINARY_BONUS if {"sun", "moon"} & {a, b} else 0
    best = None
    for kind, angle, orb_max in ASPECTS:
        orb = abs(sep - angle)
        if orb <= orb_max + bonus + 1e-9 and (best is None or orb < best["orb"]):
            best = {"a": a, "b": b, "type": kind, "exact_angle": angle,
                    "separation": sep, "orb": orb, "nearly_exact": orb <= NEARLY_EXACT + 1e-9}
    return best


def find_aspects(lons: dict[str, float]) -> list[dict]:
    found = []
    for a, b in combinations(PLANETS, 2):
        asp = aspect_between(a, b, separation(lons[a], lons[b]))
        if asp:
            found.append(asp)
    return found


def find_stelliums(signs: dict[str, str], houses: dict[str, int] | None) -> list[dict]:
    result = []
    for kind, placement, order in (("sign", signs, SIGNS), ("house", houses, range(1, 13))):
        if placement is None:
            continue
        for where in order:
            members = [p for p in PLANETS if placement[p] == where]
            if len(members) >= 3:
                result.append({"kind": kind, "where": where, "members": members})
    return result


def balance(signs: dict[str, str]) -> dict[str, int]:
    counts = {k: 0 for k in ELEMENTS + MODALITIES}
    for p in PLANETS:
        i = SIGNS.index(signs[p])
        counts[ELEMENTS[i % 4]] += 1
        counts[MODALITIES[i % 3]] += 1
    return counts


# --- positions and houses ------------------------------------------------

def body_positions(jd: float) -> dict[str, tuple[float, float, float]]:
    """(longitude, latitude, speed in longitude) for every body, full precision."""
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED
    out = {}
    for body in BODIES:
        if body == "south_node":
            lon, lat, speed = out["north_node"]
            out[body] = (norm(lon + 180), -lat, speed)
            continue
        xx, ret = swe.calc_ut(jd, SWE_IDS[body], flags)
        if not ret & swe.FLG_SWIEPH:
            raise RuntimeError(f"{body}: Swiss Ephemeris files not used (flag {ret})")
        out[body] = (xx[0], xx[1], xx[3])
    return out


def placidus_fails(jd: float, lat: float) -> bool:
    """Placidus is undefined where parts of the ecliptic never rise: |lat| > 90° − obliquity."""
    obliquity = swe.calc_ut(jd, swe.ECL_NUT)[0][0]
    return abs(lat) >= 90 - obliquity


def house_cusps(jd: float, lat: float, lon: float, system: str):
    """Returns (cusps[12], asc, mc, system_used, warnings)."""
    warnings = []
    if system == "placidus" and placidus_fails(jd, lat):
        system = "whole_sign"
        warnings.append({"code": "placidus_polar_fallback",
                         "message": "Placidus houses cannot be calculated at this latitude; "
                                    "Whole Sign houses are shown instead."})
    cusps, ascmc = swe.houses_ex(jd, lat, lon, HOUSE_CODES[system])
    return list(cusps[:12]), ascmc[0], ascmc[1], system, warnings


def calculate(utc: datetime, lat: float, lon: float, house_system: str,
              with_houses: bool = True) -> dict:
    """Full-precision chart for one moment. Rounding happens at the API layer."""
    _ensure_ephemeris()
    jd = julian_day(utc)
    positions = body_positions(jd)
    lons = {b: p[0] for b, p in positions.items()}
    signs = {b: sign_of(x) for b, x in lons.items()}

    cusps = angles = houses = None
    used, warnings = house_system, []
    if with_houses:
        cusps, asc, mc, used, warnings = house_cusps(jd, lat, lon, house_system)
        angles = {name: {"lon": x, "sign": sign_of(x), "sign_deg": sign_deg(x), "uncertain": False}
                  for name, x in (("asc", asc), ("mc", mc),
                                  ("dsc", norm(asc + 180)), ("ic", norm(mc + 180)))}
        houses = [{"house": i + 1, "cusp_lon": c, "sign": sign_of(c), "uncertain": False}
                  for i, c in enumerate(cusps)]
    body_houses = {b: house_of(x, cusps) for b, x in lons.items()} if cusps else None

    bodies = {
        b: {"id": b, "lon": x, "lat": positions[b][1], "speed": positions[b][2],
            "sign": signs[b], "sign_deg": sign_deg(x),
            "house": body_houses[b] if body_houses else None,
            "retrograde": positions[b][2] < 0,
            "on_cusp": on_cusp(x, cusps) if cusps else False,
            "uncertain": False}
        for b, x in lons.items()
    }
    return {
        "house_system_used": used,
        "bodies": bodies,
        "angles": angles,
        "houses": houses,
        "aspects": find_aspects(lons),
        "stelliums": find_stelliums(signs, body_houses),
        "balance": balance(signs),
        "aspects_uncertain": [],
        "warnings": warnings,
    }
