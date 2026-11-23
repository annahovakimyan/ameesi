"""Check interpretation entries and load them into Supabase.

The entries themselves are private (ameesi-content repository); this script only reads them.

    python scripts/import_content.py entries.csv            # check and preview, writes nothing
    python scripts/import_content.py entries.csv --apply    # write new and changed entries
    python scripts/import_content.py entries.csv --apply --prune   # also delete entries not in the file
                                                    # (more than 20 deletions also need --confirm-prune)
    python scripts/import_content.py --template blank.csv   # every entry x 3 languages, to fill in
    python scripts/import_content.py --write-ids            # refresh content/entry-ids.json

Input: CSV or JSON, one row per entry and language, with columns
id, lang, text, status (draft|approved|rejected), reviewer, reviewed_at (YYYY-MM-DD), source_notes.
Rows with empty text are skipped, so a half-filled template can be imported.

Needs SUPABASE_URL and SUPABASE_SECRET_KEY in the environment (never in a file in this repository).
"""
import argparse
import csv
import json
import os
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import date
from itertools import combinations
from pathlib import Path
from typing import IO

ROOT = Path(__file__).resolve().parents[2]
IDS_FILE = ROOT / "content" / "entry-ids.json"

LANGS = ("hy", "en", "ru")
STATUSES = ("draft", "approved", "rejected")
PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]
SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius",
         "capricorn", "aquarius", "pisces"]
ASPECTS = ["conjunction", "sextile", "square", "trine", "opposition"]
HOUSES = [f"{n:02d}" for n in range(1, 13)]
# Aspect pairs that can't occur with the agreed orbs (PRD section 9: 225 - 11 = 214).
ONLY = {("sun", "mercury"): {"conjunction"}, ("sun", "venus"): {"conjunction"},
        ("mercury", "venus"): {"conjunction", "sextile"}}
# Design system voice: never "will", "always" or "destined". Checked in English approved texts.
BANNED_EN = ("will", "always", "destined")
PLACEHOLDER_MARKERS = ("placeholder", "lorem ipsum", "test text for")
PRUNE_LIMIT = 20  # deleting more than this in one run needs --confirm-prune


def expected_ids() -> list[str]:
    """Every entry the app can show: the PRD's content plan, about 608 per language."""
    ids = [f"basic.planet.{p}" for p in PLANETS] + [f"basic.sign.{s}" for s in SIGNS]
    ids += [f"basic.house.{h}" for h in HOUSES] + [f"basic.aspect.{a}" for a in ASPECTS]
    ids += [f"basic.angle.{a}" for a in ("ascendant", "midheaven", "descendant", "ic")]
    ids += [f"sign.{p}.{s}" for p in PLANETS for s in SIGNS]
    ids += [f"house.{p}.{h}" for p in PLANETS for h in HOUSES]
    ids += [f"angle.{a}.{s}" for a in ("asc", "mc") for s in SIGNS]
    ids += [f"node.sign.{s}" for s in SIGNS] + [f"node.house.{h}" for h in HOUSES]
    ids += [f"chiron.sign.{s}" for s in SIGNS] + [f"chiron.house.{h}" for h in HOUSES]
    ids += [f"aspect.{a}.{b}.{t}" for a, b in combinations(PLANETS, 2) for t in ASPECTS if t in ONLY.get((a, b), ASPECTS)]
    ids += [f"retro.{p}" for p in PLANETS[2:]]
    ids += [f"element.{e}" for e in ("fire", "earth", "air", "water")]
    ids += [f"modality.{m}" for m in ("cardinal", "fixed", "mutable")]
    ids += [f"stellium.sign.{s}" for s in SIGNS] + [f"stellium.house.{h}" for h in HOUSES]
    return ids


def describe(entry_id: str) -> str:
    """Plain-English label for writers, e.g. 'Sun in Leo', 'Mars in house 07'."""
    p = entry_id.split(".")
    cap = lambda s: s.replace("_", " ").capitalize()  # noqa: E731
    return {
        "basic": lambda: f"What is: {cap(p[1])} {cap(p[2])}",
        "sign": lambda: f"{cap(p[1])} in {cap(p[2])}",
        "house": lambda: f"{cap(p[1])} in house {p[2]}",
        "angle": lambda: f"{'Ascendant' if p[1] == 'asc' else 'Midheaven'} in {cap(p[2])}",
        "node": lambda: f"North Node in {'house ' + p[2] if p[1] == 'house' else cap(p[2])} (covers the nodal axis)",
        "chiron": lambda: f"Chiron in {'house ' + p[2] if p[1] == 'house' else cap(p[2])}",
        "aspect": lambda: f"{cap(p[1])} {p[3]} {cap(p[2])}",
        "retro": lambda: f"{cap(p[1])} retrograde",
        "element": lambda: f"Element: {cap(p[1])}",
        "modality": lambda: f"Modality: {cap(p[1])}",
        "stellium": lambda: f"Stellium in {'house ' + p[2] if p[1] == 'house' else cap(p[2])}",
    }[p[0]]()


# --- reading and checking ----------------------------------------------------

FIELDS = ("id", "lang", "text", "status", "reviewer", "reviewed_at", "source_notes")


def read_entries(path: Path) -> list[dict]:
    if path.suffix.lower() == ".json":
        rows = json.loads(path.read_text(encoding="utf-8"))
    else:
        with path.open(encoding="utf-8-sig", newline="") as f:
            rows = list(csv.DictReader(f))
    out = []
    for r in rows:
        clean = {k: (str(r.get(k) or "").strip()) for k in FIELDS}
        if clean["text"]:
            clean["status"] = clean["status"].lower() or "draft"
            out.append(clean)
    return out


def validate(rows: list[dict]) -> tuple[list[str], list[str]]:
    known = set(expected_ids())
    errors, warnings, seen = [], [], set()
    for n, r in enumerate(rows, start=2):  # row 1 is the header
        where = f"row {n} ({r['id']}, {r['lang']})"
        if r["id"] not in known:
            errors.append(f"{where}: id not in the content plan")
        if r["lang"] not in LANGS:
            errors.append(f"{where}: language must be hy, en or ru")
        if r["status"] not in STATUSES:
            errors.append(f"{where}: status must be draft, approved or rejected")
        if not r["text"].strip():
            errors.append(f"{where}: empty text")
        if any(m in r["text"].lower() for m in PLACEHOLDER_MARKERS):
            errors.append(f"{where}: looks like a placeholder or test text")
        if (r["id"], r["lang"]) in seen:
            errors.append(f"{where}: appears twice")
        seen.add((r["id"], r["lang"]))
        if r["reviewed_at"]:
            try:
                date.fromisoformat(r["reviewed_at"])
            except ValueError:
                errors.append(f"{where}: review date must be YYYY-MM-DD")
        if r["status"] == "approved":
            if not r["reviewer"]:
                errors.append(f"{where}: approved entries need a reviewer")
            if not r["reviewed_at"]:
                errors.append(f"{where}: approved entries need a review date")
            if r["lang"] == "en":
                found = [w for w in BANNED_EN if re.search(rf"\b{w}\b", r["text"], re.I)]
                if found:
                    warnings.append(f"{where}: uses {', '.join(repr(w) for w in found)}; "
                                    "the voice guide says “tend to”, “often”, “may”")
    return errors, warnings


def coverage(rows: list[dict]) -> dict[str, int]:
    """Approved entries per language (launch gate G2: all 608 in each)."""
    return {lang: len({r["id"] for r in rows if r["lang"] == lang and r["status"] == "approved"}) for lang in LANGS}


@dataclass
class Plan:
    new: list[dict] = field(default_factory=list)
    changed: list[dict] = field(default_factory=list)
    unchanged: int = 0
    missing: list[dict] = field(default_factory=list)


def _norm(r: dict) -> tuple:
    return tuple((r.get(k) or "") for k in ("text", "status", "reviewer", "reviewed_at", "source_notes"))


def plan_changes(existing: list[dict], incoming: list[dict]) -> Plan:
    have = {(r["id"], r["lang"]): r for r in existing}
    plan = Plan()
    for r in incoming:
        old = have.get((r["id"], r["lang"]))
        if old is None:
            plan.new.append(r)
        elif _norm(old) != _norm(r):
            plan.changed.append(r)
        else:
            plan.unchanged += 1
    keys = {(r["id"], r["lang"]) for r in incoming}
    plan.missing = [r for k, r in have.items() if k not in keys]
    return plan


def write_template(out: IO[str]) -> None:
    w = csv.DictWriter(out, fieldnames=["id", "element", "lang", *FIELDS[2:]])
    w.writeheader()
    for entry_id in expected_ids():
        for lang in LANGS:
            w.writerow({"id": entry_id, "element": describe(entry_id), "lang": lang, "status": "draft"})


# --- Supabase (service role: the only writer) -------------------------------------

class Supabase:
    def __init__(self, url: str, key: str):
        self.url, self.key = url.rstrip("/"), key

    def _call(self, method: str, path: str, body=None, prefer: str | None = None):
        headers = {"apikey": self.key, "Authorization": f"Bearer {self.key}", "Content-Type": "application/json"}
        if prefer:
            headers["Prefer"] = prefer
        req = urllib.request.Request(f"{self.url}/rest/v1/{path}", method=method, headers=headers,
                                     data=json.dumps(body).encode() if body is not None else None)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            raise SystemExit(f"Supabase said {e.code}: {e.read().decode()[:300]}")

    def all_entries(self) -> list[dict]:
        rows, page = [], 1000
        while True:
            chunk = self._call("GET", f"entries?select=id,lang,text,status,reviewer,reviewed_at,source_notes"
                                      f"&order=id,lang&offset={len(rows)}&limit={page}")
            rows += chunk
            if len(chunk) < page:
                return rows

    def upsert(self, rows: list[dict]) -> None:
        for i in range(0, len(rows), 500):
            batch = [{k: (r[k] or None) for k in FIELDS} for r in rows[i:i + 500]]
            self._call("POST", "entries?on_conflict=id,lang", batch, prefer="resolution=merge-duplicates")

    def delete(self, rows: list[dict]) -> None:
        for r in rows:
            self._call("DELETE", f"entries?id=eq.{r['id']}&lang=eq.{r['lang']}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file", nargs="?", type=Path, help="entries as CSV or JSON")
    ap.add_argument("--apply", action="store_true", help="write new and changed entries to Supabase")
    ap.add_argument("--prune", action="store_true", help="with --apply: delete entries that aren't in the file")
    ap.add_argument("--confirm-prune", action="store_true", help=f"allow --prune to delete more than {PRUNE_LIMIT} entries")
    ap.add_argument("--template", type=Path, help="write a blank CSV with every entry in every language")
    ap.add_argument("--write-ids", action="store_true", help="refresh content/entry-ids.json")
    args = ap.parse_args()

    if args.write_ids:
        IDS_FILE.write_text(json.dumps({"_comment": "Generated by server/scripts/import_content.py --write-ids. "
                                        "Every interpretation entry id in the content plan (PRD section 9).",
                                        "ids": expected_ids()}, indent=1) + "\n")
        print(f"wrote {len(expected_ids())} ids to {IDS_FILE.relative_to(ROOT)}")
        return
    if args.template:
        with args.template.open("w", newline="", encoding="utf-8") as f:
            write_template(f)
        print(f"wrote {len(expected_ids()) * 3} rows to {args.template}")
        return
    if not args.file:
        ap.error("give a CSV or JSON file, or --template / --write-ids")

    rows = read_entries(args.file)
    errors, warnings = validate(rows)
    total = len(expected_ids())
    print(f"{len(rows)} entries read from {args.file.name}")
    for lang, n in coverage(rows).items():
        print(f"  approved {lang}: {n} of {total}")
    for w in warnings:
        print(f"  warning: {w}")
    if errors:
        for e in errors:
            print(f"  error: {e}")
        sys.exit(f"{len(errors)} errors: nothing written.")

    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        sys.exit("Checks passed. Set SUPABASE_URL and SUPABASE_SECRET_KEY to compare with Supabase and import.")
    db = Supabase(url, key)
    plan = plan_changes(db.all_entries(), rows)
    print(f"Supabase: {len(plan.new)} new, {len(plan.changed)} changed, {plan.unchanged} unchanged, "
          f"{len(plan.missing)} in Supabase but not in this file")
    if args.prune and len(plan.missing) > PRUNE_LIMIT and not args.confirm_prune:
        sys.exit(f"--prune would delete {len(plan.missing)} entries. If that's right, add --confirm-prune. Nothing written.")
    if not args.apply:
        print("Preview only. Run again with --apply to write" + (" (and --prune to delete the missing ones)." if plan.missing else "."))
        return
    db.upsert(plan.new + plan.changed)
    print(f"Wrote {len(plan.new) + len(plan.changed)} entries.")
    if args.prune and plan.missing:
        db.delete(plan.missing)
        print(f"Deleted {len(plan.missing)} entries that weren't in the file.")


if __name__ == "__main__":
    main()
