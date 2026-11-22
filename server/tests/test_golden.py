"""Compare the engine with reference charts in tests/golden/charts.csv (1 arcminute tolerance)."""
import csv
import os
from datetime import date, time

import pytest

from app import engine

CSV = os.path.join(os.path.dirname(__file__), "..", "..", "tests", "golden", "charts.csv")
TOL = 1 / 60  # degrees
COLUMNS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune",
           "pluto", "north_node", "chiron", "asc", "mc"]


def _rows():
    if not os.path.exists(CSV):
        return []
    with open(CSV, encoding="utf-8") as f:
        return [r for r in csv.DictReader(f) if r["id"] != "example"]


ROWS = _rows()


@pytest.mark.skipif(not ROWS, reason="no golden charts yet: add real rows to tests/golden/charts.csv")
@pytest.mark.parametrize("row", ROWS, ids=[r["id"] for r in ROWS])
def test_golden_chart(row):
    r = engine.calculate(
        birth_date=date.fromisoformat(row["date"]), birth_time=time.fromisoformat(row["time"]),
        time_confidence="exact", time_window=None, lat=float(row["lat"]), lon=float(row["lon"]), tz=row["tz"],
        house_system=row.get("house_system") or "placidus",
        utc_offset_override=int(row["utc_offset_minutes"]) if row.get("utc_offset_minutes") else None)
    got = {b["id"]: b["lon"] for b in r["bodies"]}
    got["asc"], got["mc"] = r["angles"]["asc"]["lon"], r["angles"]["mc"]["lon"]
    errors = []
    for col in COLUMNS:
        if row.get(col):
            diff = engine.separation(got[col], float(row[col]))
            if diff > TOL:
                errors.append(f"{col}: expected {row[col]}, got {got[col]:.4f} (off by {diff * 60:.2f} arcmin)")
    assert not errors, "; ".join(errors)
