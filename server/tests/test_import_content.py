import csv
import io
import json

import pytest

from scripts import import_content as ic

# Short fake texts only: real interpretation texts never appear in this repository.
def row(id_="sign.sun.leo", lang="en", text="Test text.", status="approved", reviewer="Tester", reviewed_at="2026-11-20", notes=""):
    return {"id": id_, "lang": lang, "text": text, "status": status, "reviewer": reviewer,
            "reviewed_at": reviewed_at, "source_notes": notes}


# --- the content plan ---------------------------------------------------------

def test_content_plan_has_608_entries_per_language():
    ids = ic.expected_ids()
    assert len(ids) == 608 and len(set(ids)) == 608
    counts = {}
    for i in ids:
        counts[i.split(".")[0]] = counts.get(i.split(".")[0], 0) + 1
    assert counts == {"basic": 43, "sign": 120, "house": 120, "angle": 24, "node": 24, "chiron": 24,
                      "aspect": 214, "retro": 8, "element": 4, "modality": 3, "stellium": 24}


def test_impossible_aspects_are_left_out():
    ids = set(ic.expected_ids())
    assert "aspect.sun.mercury.conjunction" in ids and "aspect.sun.mercury.square" not in ids
    assert "aspect.sun.venus.sextile" not in ids
    assert "aspect.mercury.venus.sextile" in ids and "aspect.mercury.venus.square" not in ids
    assert "aspect.mars.pluto.trine" in ids


def test_entry_ids_file_is_up_to_date():
    assert json.loads(ic.IDS_FILE.read_text())["ids"] == ic.expected_ids()


# --- reading -------------------------------------------------------------------

def test_reads_csv_and_json(tmp_path):
    f = tmp_path / "entries.csv"
    with f.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(row()))
        w.writeheader()
        w.writerow(row(text="Test, with a comma"))
    assert ic.read_entries(f)[0]["text"] == "Test, with a comma"
    j = tmp_path / "entries.json"
    j.write_text(json.dumps([row(lang="hy", text="Փորձ")], ensure_ascii=False), encoding="utf-8")
    assert ic.read_entries(j)[0]["text"] == "Փորձ"


def test_blank_template_rows_are_skipped(tmp_path):
    f = tmp_path / "t.csv"
    f.write_text("id,lang,text,status\nsign.sun.leo,en,,\nsign.sun.virgo,en,Test text.,draft\n", encoding="utf-8")
    assert [r["id"] for r in ic.read_entries(f)] == ["sign.sun.virgo"]


# --- validation ----------------------------------------------------------------

def test_valid_rows_pass():
    errors, warnings = ic.validate([row(), row(lang="hy"), row(id_="retro.mars", status="draft", reviewer="", reviewed_at="")])
    assert errors == [] and warnings == []


@pytest.mark.parametrize("bad,message", [
    (row(id_="sign.sun.lion"), "not in the content plan"),
    (row(lang="fr"), "language"),
    (row(status="ok"), "status"),
    (row(text="   "), "empty text"),
    (row(reviewer=""), "approved entries need a reviewer"),
    (row(reviewed_at=""), "approved entries need a review date"),
    (row(reviewed_at="20-11-2026"), "review date"),
    (row(text="Placeholder text."), "placeholder"),
])
def test_invalid_rows_are_errors(bad, message):
    errors, _ = ic.validate([bad])
    assert any(message in e for e in errors), errors


def test_duplicates_are_errors():
    errors, _ = ic.validate([row(), row(text="Other test text.")])
    assert any("twice" in e for e in errors)


def test_prediction_words_warn_in_english_approved_text():
    _, warnings = ic.validate([row(text="You will always be lucky.")])
    assert any("will" in w and "always" in w for w in warnings)
    _, warnings = ic.validate([row(text="You will always be lucky.", status="draft", reviewer="", reviewed_at="")])
    assert warnings == []  # drafts aren't checked yet
    _, warnings = ic.validate([row(text="Willpower and goodwill.")])
    assert warnings == []  # whole words only


# --- coverage and changes --------------------------------------------------------

def test_coverage_counts_approved_entries_per_language():
    cov = ic.coverage([row(), row(lang="hy"), row(id_="retro.mars", status="draft", reviewer="", reviewed_at="")])
    assert cov == {"hy": 1, "en": 1, "ru": 0}


def test_plan_changes():
    existing = [{"id": "sign.sun.leo", "lang": "en", "text": "Test text.", "status": "approved", "reviewer": "Tester",
                 "reviewed_at": "2026-11-20", "source_notes": None},
                {"id": "sign.sun.virgo", "lang": "en", "text": "Old test.", "status": "draft", "reviewer": None,
                 "reviewed_at": None, "source_notes": None},
                {"id": "retro.mars", "lang": "en", "text": "Gone test.", "status": "draft", "reviewer": None,
                 "reviewed_at": None, "source_notes": None}]
    incoming = [row(), row(id_="sign.sun.virgo", text="New test."), row(id_="sign.moon.leo")]
    plan = ic.plan_changes(existing, incoming)
    assert [r["id"] for r in plan.new] == ["sign.moon.leo"]
    assert [r["id"] for r in plan.changed] == ["sign.sun.virgo"]
    assert plan.unchanged == 1
    assert [(r["id"], r["lang"]) for r in plan.missing] == [("retro.mars", "en")]


def test_template_lists_every_entry_in_every_language():
    out = io.StringIO()
    ic.write_template(out)
    rows = list(csv.DictReader(io.StringIO(out.getvalue())))
    assert len(rows) == 608 * 3
    assert rows[0]["id"] == ic.expected_ids()[0] and {r["lang"] for r in rows[:3]} == {"hy", "en", "ru"}
    assert set(rows[0]) >= {"id", "element", "lang", "text", "status", "reviewer", "reviewed_at", "source_notes"}


def test_large_prune_needs_confirmation(monkeypatch, tmp_path, capsys):
    f = tmp_path / "e.csv"
    f.write_text("id,lang,text,status\n", encoding="utf-8")
    existing = [{"id": i, "lang": "en", "text": "x", "status": "draft", "reviewer": None, "reviewed_at": None,
                 "source_notes": None} for i in ic.expected_ids()[:25]]
    calls = []
    monkeypatch.setattr(ic.Supabase, "all_entries", lambda self: existing)
    monkeypatch.setattr(ic.Supabase, "delete", lambda self, rows: calls.append(len(rows)))
    monkeypatch.setattr(ic.Supabase, "upsert", lambda self, rows: None)
    monkeypatch.setenv("SUPABASE_URL", "https://example.invalid")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "fake")
    monkeypatch.setattr("sys.argv", ["import_content.py", str(f), "--apply", "--prune"])
    with pytest.raises(SystemExit, match="would delete 25"):
        ic.main()
    assert calls == []
    monkeypatch.setattr("sys.argv", ["import_content.py", str(f), "--apply", "--prune", "--confirm-prune"])
    ic.main()
    assert calls == [25]
