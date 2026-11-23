"""Turn an astro.com position table into a golden-chart row.

Paste the planet table from astro.com (chart page or "Additional tables"), with the
"Univ.Time" line and the place's coordinates if you can. Settings there: tropical, Placidus,
TRUE node. The script converts the positions to decimal degrees, shows them next to our engine's,
and with --write appends the row to tests/golden/charts.csv.

    python scripts/golden_add.py --id yerevan-1975 --label "Yerevan, Soviet winter" \\
        --date 1975-01-15 --time 08:20 --place Yerevan --tz Asia/Yerevan  < pasted.txt

Then paste and press Ctrl-D (or redirect a file). Add --write once the numbers look right.
"""
import argparse
import csv
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app import engine  # noqa: E402

CSV_PATH = ROOT.parent / "tests" / "golden" / "charts.csv"
POINTS = engine.PLANETS + ["north_node", "chiron", "asc", "mc"]

SIGNS = engine.SIGNS
SIGN_WORDS = {s: i for i, s in enumerate(SIGNS)}
SIGN_WORDS.update({s[:3]: i for i, s in enumerate(SIGNS)})
COMPACT = {c: i for i, c in enumerate(["ar", "ta", "ge", "cn", "le", "vi", "li", "sc", "sg", "cp", "aq", "pi"])}
GLYPHS = {g: i for i, g in enumerate("♈♉♊♋♌♍♎♏♐♑♒♓")}

BODY_NAMES = [  # longest first so "Ascendant" wins over "Asc"
    ("true node", "north_node"), ("north node", "north_node"), ("ascendant", "asc"), ("midheaven", "mc"),
    ("asc", "asc"), ("ac", "asc"), ("mc", "mc"), ("chiron", "chiron"),
] + [(p, p) for p in engine.PLANETS]
BODY_RE = re.compile(r"(?<![\w])(" + "|".join(re.escape(n) for n, _ in BODY_NAMES) + r")(?![\w])", re.I)

SIGN_ALT = "|".join(sorted(SIGN_WORDS, key=len, reverse=True)) + "|" + "".join(GLYPHS)
DMS = r"(\d{1,2})\s*°\s*(\d{1,2})\s*['′]\s*(?:(\d{1,2}(?:\.\d+)?)\s*[\"″]?)?"
POS_PATTERNS = [
    re.compile(rf"(?P<sign>{SIGN_ALT})\s*︎?\s+{DMS}", re.I),              # Leo 22°14'05"
    re.compile(rf"{DMS}\s*(?P<sign>{SIGN_ALT})", re.I),                         # 22°14'05" Leo
    re.compile(r"(\d{1,2})\s*(?P<sign>" + "|".join(COMPACT) + r")\s*(\d{1,2})(?:\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*[\"″]?)?",
               re.I),                                                           # 22le14'05
]


class ParseError(ValueError):
    pass


@dataclass
class Parsed:
    positions: dict[str, float] = field(default_factory=dict)
    missing: list[str] = field(default_factory=list)
    ut: str | None = None
    lat: float | None = None
    lon: float | None = None


def parse_dms(text: str) -> float:
    m = re.fullmatch(r"\s*" + DMS + r"\s*", text)
    if not m:
        raise ParseError(f"not degrees-minutes-seconds: {text!r}")
    d, mi, s = m.groups()
    return int(d) + int(mi) / 60 + float(s or 0) / 3600


def _sign_index(token: str) -> int:
    t = token.lower()
    if t in GLYPHS:
        return GLYPHS[t]
    return SIGN_WORDS[t] if t in SIGN_WORDS else COMPACT[t]


def _position(segment: str) -> float | None:
    for i, pat in enumerate(POS_PATTERNS):
        m = pat.search(segment)
        if not m:
            continue
        sign = _sign_index(m.group("sign"))
        nums = [g for k, g in enumerate(m.groups()) if g is not None and m.start(k + 1) != m.start("sign")]
        if i == 2:  # compact: degrees, sign, minutes, seconds
            d, mi, s = int(m.group(1)), int(m.group(3)), float(m.group(4) or 0)
        else:
            d, mi, s = int(nums[0]), int(nums[1]), float(nums[2]) if len(nums) > 2 else 0.0
        if d >= 30 or mi >= 60 or s >= 60:
            raise ParseError(f"impossible position in {segment.strip()!r}")
        return sign * 30 + d + mi / 60 + s / 3600
    return None


def parse_paste(text: str) -> Parsed:
    if re.search(r"mean\s+node", text, re.I):
        raise ParseError("this table uses the mean node; switch astro.com to the true node")
    out = Parsed()
    hits = list(BODY_RE.finditer(text))
    names = dict(BODY_NAMES)
    for k, m in enumerate(hits):
        body = names[m.group(1).lower()]
        if body in out.positions:
            continue
        end = hits[k + 1].start() if k + 1 < len(hits) else len(text)
        pos = _position(text[m.end():end])
        if pos is not None:
            out.positions[body] = pos
    out.missing = [p for p in POINTS if p not in out.positions]

    if m := re.search(r"Univ\.?\s*Time\s*:?\s*(\d{1,2}):(\d{2})", text, re.I):
        out.ut = f"{int(m.group(1)):02d}:{m.group(2)}"
    if m := re.search(r"(\d{1,3})\s*([ns])\s*(\d{1,2})\W+(\d{1,3})\s*([ew])\s*(\d{1,2})", text, re.I):
        lat = int(m.group(1)) + int(m.group(3)) / 60
        lon = int(m.group(4)) + int(m.group(6)) / 60
        out.lat = -lat if m.group(2).lower() == "s" else lat
        out.lon = -lon if m.group(5).lower() == "w" else lon
    return out


def utc_offset_minutes(local: str, ut: str) -> int:
    """Minutes east of UTC from the local time and astro.com's Univ.Time (may cross midnight)."""
    to_min = lambda t: int(t[:2]) * 60 + int(t[3:])  # noqa: E731
    diff = to_min(local) - to_min(ut)
    if diff > 14 * 60:
        diff -= 1440
    elif diff < -14 * 60:
        diff += 1440
    return diff


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", required=True)
    ap.add_argument("--label", required=True)
    ap.add_argument("--date", required=True, help="YYYY-MM-DD, local")
    ap.add_argument("--time", required=True, help="HH:MM, local")
    ap.add_argument("--place", required=True)
    ap.add_argument("--tz", required=True, help="IANA zone, e.g. Asia/Yerevan")
    ap.add_argument("--lat", type=float, help="if the paste has no coordinates")
    ap.add_argument("--lon", type=float)
    ap.add_argument("--utc-offset", type=int, help="minutes east of UTC, if the paste has no Univ.Time")
    ap.add_argument("--house-system", default="placidus", choices=["placidus", "whole_sign"])
    ap.add_argument("--write", action="store_true", help="append the row to tests/golden/charts.csv")
    args = ap.parse_args()

    if sys.stdin.isatty():
        print("Paste the astro.com table, then press Ctrl-D:", file=sys.stderr)
    parsed = parse_paste(sys.stdin.read())
    if parsed.missing:
        sys.exit(f"Couldn't find: {', '.join(parsed.missing)}. Paste the whole table.")
    lat = args.lat if args.lat is not None else parsed.lat
    lon = args.lon if args.lon is not None else parsed.lon
    if lat is None or lon is None:
        sys.exit("No coordinates in the paste: add --lat and --lon as astro.com shows them.")
    if args.utc_offset is not None:
        offset = args.utc_offset
    elif parsed.ut:
        offset = utc_offset_minutes(args.time, parsed.ut)
    else:
        sys.exit("No Univ.Time in the paste: add --utc-offset (minutes east of UTC, e.g. 240).")

    local = datetime.fromisoformat(f"{args.date}T{args.time}")
    utc = (local - timedelta(minutes=offset)).replace(tzinfo=timezone.utc)
    chart = engine.calculate(utc, lat, lon, args.house_system)
    ours = {b: v["lon"] for b, v in chart["bodies"].items()}
    ours.update(asc=chart["angles"]["asc"]["lon"], mc=chart["angles"]["mc"]["lon"])

    print(f"\n{args.label}: {local:%Y-%m-%d %H:%M} local, UTC{offset / 60:+g}, {lat:.4f}, {lon:.4f}\n")
    print(f"{'':12}{'astro.com':>12}{'ours':>12}{'diff':>9}")
    worst = 0.0
    for p in POINTS:
        diff = engine.separation(parsed.positions[p], ours[p]) * 60
        worst = max(worst, diff)
        flag = "  ← over 1′" if diff > 1 else ""
        print(f"{p:12}{parsed.positions[p]:12.4f}{ours[p]:12.4f}{diff:8.2f}′{flag}")
    print(f"\nLargest difference {worst:.2f}′ (tolerance 1′).")

    row = {"id": args.id, "label": args.label, "source": "astro.com", "date": args.date, "time": args.time,
           "place": args.place, "lat": f"{lat:.4f}", "lon": f"{lon:.4f}", "tz": args.tz,
           "utc_offset_minutes": offset, "house_system": args.house_system,
           **{p: f"{parsed.positions[p]:.4f}" for p in POINTS}}
    if not args.write:
        print("Looks right? Run again with --write to add it to tests/golden/charts.csv.")
        return
    with CSV_PATH.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        header, existing = reader.fieldnames, {r["id"] for r in reader}
    if args.id in existing:
        sys.exit(f"id {args.id!r} is already in {CSV_PATH.name}")
    with CSV_PATH.open("a", encoding="utf-8", newline="") as f:
        csv.DictWriter(f, fieldnames=header).writerow(row)
    print(f"Added {args.id} to {CSV_PATH.relative_to(ROOT.parent)}.")


if __name__ == "__main__":
    main()
