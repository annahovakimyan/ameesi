"""Local birth time → UTC, without guessing across daylight-saving changes."""
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import tzdata

TZDATA_VERSION = tzdata.IANA_VERSION


def _iso_utc(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")


def resolve_local(d: date, t: time, tz_name: str, override_minutes: int | None = None) -> dict:
    """Returns the UTC moment, the offset used and, if the local time is ambiguous, the candidates."""
    naive = datetime.combine(d, t)
    if override_minutes is not None:
        utc = naive.replace(tzinfo=timezone(timedelta(minutes=override_minutes)))
        return {"utc_dt": utc, "utc": _iso_utc(utc), "utc_offset_minutes": override_minutes,
                "offset_source": "user_override", "dst_ambiguity": None}

    tz = ZoneInfo(tz_name)
    first, second = naive.replace(tzinfo=tz, fold=0), naive.replace(tzinfo=tz, fold=1)
    off0, off1 = first.utcoffset(), second.utcoffset()
    ambiguity = None
    if off0 != off1:
        # Same wall time, two offsets: either it happened twice (overlap) or never (gap).
        exists = first.astimezone(timezone.utc).astimezone(tz).replace(tzinfo=None) == naive
        candidates = sorted([_iso_utc(first), _iso_utc(second)])
        ambiguity = {"kind": "overlap" if exists else "gap", "candidates_utc": candidates}
    return {"utc_dt": first.astimezone(timezone.utc), "utc": _iso_utc(first),
            "utc_offset_minutes": int(off0.total_seconds() // 60),
            "offset_source": "tzdata", "dst_ambiguity": ambiguity}
