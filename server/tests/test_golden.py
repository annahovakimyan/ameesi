"""Golden charts: astro.com reference positions must match within 1 arcminute."""
import csv
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from app import engine
from app.timezones import resolve_local

CSV = Path(__file__).resolve().parents[2] / "tests" / "golden" / "charts.csv"
TOLERANCE = 1 / 60  # 1 arcminute. Never loosen this to make a test pass.
POINTS = engine.PLANETS + ["north_node", "chiron", "asc", "mc"]

ROWS = [r for r in csv.DictReader(CSV.open(encoding="utf-8")) if r["id"] != "example"]


def utc_of(row) -> datetime:
    local = datetime.fromisoformat(f"{row['date']}T{row['time']}")
    return (local - timedelta(minutes=int(row["utc_offset_minutes"]))).replace(tzinfo=timezone.utc)


@pytest.mark.skipif(not ROWS, reason="no golden charts in tests/golden/charts.csv yet")
@pytest.mark.parametrize("row", ROWS, ids=[r["id"] for r in ROWS])
def test_golden_positions(row):
    chart = engine.calculate(utc_of(row), float(row["lat"]), float(row["lon"]), row["house_system"])
    got = {b: v["lon"] for b, v in chart["bodies"].items()}
    got.update(asc=chart["angles"]["asc"]["lon"], mc=chart["angles"]["mc"]["lon"])
    errors = {p: round(engine.separation(got[p], float(row[p])) * 60, 2)
              for p in POINTS if engine.separation(got[p], float(row[p])) > TOLERANCE}
    assert not errors, f"off by more than 1′ (values in arcminutes): {errors}"


@pytest.mark.skipif(not ROWS, reason="no golden charts in tests/golden/charts.csv yet")
@pytest.mark.parametrize("row", ROWS, ids=[r["id"] for r in ROWS])
def test_golden_utc_offset_matches_tzdata(row):
    """Flags births where our time zone data disagrees with astro.com's offset."""
    local = datetime.fromisoformat(f"{row['date']}T{row['time']}")
    r = resolve_local(local.date(), local.time(), row["tz"])
    assert r["utc_offset_minutes"] == int(row["utc_offset_minutes"])
