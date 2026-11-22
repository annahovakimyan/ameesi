"""Local birth time to UTC, with daylight-saving gaps and overlaps detected instead of guessed."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import tzdata


TZDATA_VERSION = getattr(tzdata, "IANA_VERSION", "unknown")


@dataclass
class ResolvedTime:
    utc: datetime | None
    offset_minutes: int | None
    source: str  # "tzdata" or "override"
    ambiguity: dict | None  # set when the local time is skipped or repeated


def _offset_minutes(dt: datetime) -> int:
    return int(dt.utcoffset().total_seconds() // 60)


def resolve_local_time(local: datetime, tz_name: str, override_minutes: int | None = None) -> ResolvedTime:
    """Convert a naive local datetime to UTC.

    With an override, the given offset is used as is. Otherwise the IANA rules decide; a time
    that doesn't exist (clocks jumped forward) or happens twice (clocks went back) is returned
    with no UTC and both candidates, so the app can ask the user.
    """
    if local.tzinfo is not None:
        raise ValueError("local time must be naive")
    if override_minutes is not None:
        utc = (local - timedelta(minutes=override_minutes)).replace(tzinfo=timezone.utc)
        return ResolvedTime(utc, override_minutes, "override", None)

    zone = ZoneInfo(tz_name)
    a = local.replace(tzinfo=zone, fold=0)
    b = local.replace(tzinfo=zone, fold=1)
    off_a, off_b = _offset_minutes(a), _offset_minutes(b)
    if off_a == off_b:
        utc = a.astimezone(timezone.utc)
        return ResolvedTime(utc, off_a, "tzdata", None)

    utc_a, utc_b = a.astimezone(timezone.utc), b.astimezone(timezone.utc)
    round_a = utc_a.astimezone(zone).replace(tzinfo=None) == local
    round_b = utc_b.astimezone(zone).replace(tzinfo=None) == local
    kind = "repeated" if (round_a and round_b) else "skipped"
    candidates = sorted({utc_a, utc_b})
    return ResolvedTime(None, None, "tzdata", {
        "kind": kind,
        "candidates_utc": [c.strftime("%Y-%m-%dT%H:%MZ") for c in candidates],
        "candidate_offsets_minutes": sorted({off_a, off_b}),
    })
