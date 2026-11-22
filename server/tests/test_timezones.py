from datetime import date, time

from app.timezones import resolve_local


def test_yerevan_soviet_era_offset():
    # 1985: Moscow time +1 → UTC+4, with summer time UTC+5
    r = resolve_local(date(1985, 1, 15), time(12, 0), "Asia/Yerevan")
    assert r["utc_offset_minutes"] == 240 and r["dst_ambiguity"] is None
    r = resolve_local(date(1985, 7, 15), time(12, 0), "Asia/Yerevan")
    assert r["utc_offset_minutes"] == 300


def test_dst_gap_is_not_guessed():
    # 2021-03-14 02:30 does not exist in New York
    r = resolve_local(date(2021, 3, 14), time(2, 30), "America/New_York")
    assert r["dst_ambiguity"]["kind"] == "gap"
    assert len(r["dst_ambiguity"]["candidates_utc"]) == 2


def test_dst_overlap_is_not_guessed():
    # 2021-11-07 01:30 happens twice in New York
    r = resolve_local(date(2021, 11, 7), time(1, 30), "America/New_York")
    assert r["dst_ambiguity"]["kind"] == "overlap"
    assert r["dst_ambiguity"]["candidates_utc"] == ["2021-11-07T05:30Z", "2021-11-07T06:30Z"]


def test_override_wins_and_is_marked():
    r = resolve_local(date(2021, 3, 14), time(2, 30), "America/New_York", override_minutes=-300)
    assert r["utc"] == "2021-03-14T07:30Z"
    assert r["offset_source"] == "user_override"
    assert r["dst_ambiguity"] is None
