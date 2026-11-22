from datetime import date, datetime, time

import pytest

from app import engine
from app.timeutil import resolve_local_time

GYUMRI = dict(lat=40.7894, lon=43.8475, tz="Asia/Yerevan")


def chart(**kw):
    args = dict(birth_date=date(1992, 8, 14), birth_time=time(14, 30), time_confidence="exact",
                time_window=None, **GYUMRI)
    args.update(kw)
    return engine.calculate(**args)


# ---------- helpers ----------

@pytest.mark.parametrize("lon,sign", [(0, "aries"), (29.999, "aries"), (30.0, "taurus"),
                                      (359.99, "pisces"), (360.0, "aries"), (-1, "pisces")])
def test_sign_boundaries(lon, sign):
    assert engine.sign_of(lon) == sign


@pytest.mark.parametrize("a,b,sep", [(359, 2, 3), (10, 190, 180), (350, 170, 180), (0, 90, 90), (45, 45, 0)])
def test_separation_wraps(a, b, sep):
    assert engine.separation(a, b) == pytest.approx(sep)


def test_house_assignment_across_aries_point():
    cusps = [350 + 30 * i for i in range(12)]  # house 1 starts at 350
    assert engine.house_of(355, cusps) == 1
    assert engine.house_of(5, cusps) == 1
    assert engine.house_of(20, cusps) == 2
    assert engine.house_of(349.99, cusps) == 12


# ---------- aspects and orbs ----------

def _pos(**lons):
    base = {p: {"lon": 0.0, "lat": 0, "speed": 1} for p in engine.PLANETS}
    spread = {p: 13.0 * i + 1 for i, p in enumerate(engine.PLANETS)}  # nothing aspected by default
    for p in engine.PLANETS:
        base[p]["lon"] = spread[p] * 7.3 % 360
    for k, v in lons.items():
        base[k]["lon"] = v
    return base


def _aspect(pos, a, b):
    return next((x for x in engine.find_aspects(pos) if {x["a"], x["b"]} == {a, b}), None)


@pytest.mark.parametrize("sep,expected", [(7.9, "conjunction"), (8.1, None), (125.0, "trine"),
                                          (127.1, None), (95.0, "square"), (65.0, "sextile"), (65.1, None)])
def test_orbs_without_luminaries(sep, expected):
    pos = _pos(mars=100.0, jupiter=100.0 + sep)
    a = _aspect(pos, "mars", "jupiter")
    assert (a["type"] if a else None) == expected


@pytest.mark.parametrize("sep,expected", [(9.9, "conjunction"), (10.1, None), (66.9, "sextile"), (129.0, "trine")])
def test_luminary_bonus(sep, expected):
    pos = _pos(sun=200.0, saturn=200.0 + sep)
    a = _aspect(pos, "sun", "saturn")
    assert (a["type"] if a else None) == expected


def test_nearly_exact_flag():
    pos = _pos(mars=10.0, saturn=100.8)
    a = _aspect(pos, "mars", "saturn")
    assert a["type"] == "square" and a["nearly_exact"] is True


def test_no_aspects_to_nodes_or_chiron():
    r = chart()
    names = {x["a"] for x in r["aspects"]} | {x["b"] for x in r["aspects"]}
    assert names <= set(engine.PLANETS)


# ---------- stelliums ----------

def test_stellium_needs_three_planets_and_ignores_nodes():
    placements = {n: {"sign": "aries", "house": None} for n in engine.BODY_ORDER}
    others = [s for s in engine.SIGNS if s != "leo"]
    for i, p in enumerate(engine.PLANETS):
        placements[p]["sign"] = others[i]
    placements["sun"]["sign"] = placements["moon"]["sign"] = "leo"
    assert not any(s["where"] == "leo" for s in engine.find_stelliums(placements))
    placements["mercury"]["sign"] = "leo"
    st = [s for s in engine.find_stelliums(placements) if s["where"] == "leo"]
    assert st and set(st[0]["members"]) == {"sun", "moon", "mercury"}
    assert all("north_node" not in s["members"] for s in engine.find_stelliums(placements))


# ---------- whole chart ----------

def test_exact_chart_shape():
    r = chart()
    assert r["time"]["utc"] == "1992-08-14T10:30Z" and r["time"]["utc_offset_minutes"] == 240
    assert [b["id"] for b in r["bodies"]] == engine.BODY_ORDER
    assert len(r["houses"]) == 12 and set(r["angles"]) == {"asc", "mc", "dsc", "ic"}
    assert r["meta"]["swisseph"] and r["meta"]["tzdata"] and r["meta"]["engine"]
    sun = next(b for b in r["bodies"] if b["id"] == "sun")
    assert sun["sign"] == "leo" and 21 < sun["sign_deg"] < 23


def test_south_node_opposite_north_node():
    r = chart()
    nn = next(b for b in r["bodies"] if b["id"] == "north_node")
    sn = next(b for b in r["bodies"] if b["id"] == "south_node")
    assert engine.separation(nn["lon"], sn["lon"]) == pytest.approx(180, abs=1e-6)


def test_angles_are_opposite():
    r = chart()
    a = r["angles"]
    assert engine.separation(a["asc"]["lon"], a["dsc"]["lon"]) == pytest.approx(180, abs=1e-3)
    assert engine.separation(a["mc"]["lon"], a["ic"]["lon"]) == pytest.approx(180, abs=1e-3)


def test_retrograde_from_speed():
    r = chart()
    sat = next(b for b in r["bodies"] if b["id"] == "saturn")
    assert sat["retrograde"] is True and sat["speed"] < 0


def test_whole_sign_cusps_start_at_zero_degrees():
    r = chart(house_system="whole_sign")
    assert all(h["cusp_lon"] % 30 == pytest.approx(0, abs=1e-6) for h in r["houses"])
    assert r["houses"][0]["sign"] == r["angles"]["asc"]["sign"]


def test_polar_fallback():
    r = chart(lat=69.65, lon=18.96, tz="Europe/Oslo")  # Tromsø
    assert r["meta"]["house_system_used"] == "whole_sign"
    assert any(w["code"] == "placidus_polar_fallback" for w in r["warnings"])


def test_balance_counts_ten_planets():
    b = chart()["balance"]
    assert b["fire"] + b["earth"] + b["air"] + b["water"] == 10
    assert b["cardinal"] + b["fixed"] + b["mutable"] == 10


# ---------- time handling ----------

def test_dst_gap_is_not_guessed():
    # Europe/Berlin clocks jumped from 02:00 to 03:00 on 2021-03-28.
    r = engine.calculate(birth_date=date(2021, 3, 28), birth_time=time(2, 30), time_confidence="exact",
                         time_window=None, lat=52.52, lon=13.40, tz="Europe/Berlin")
    assert r["time"]["dst_ambiguity"]["kind"] == "skipped"
    assert r["bodies"] == [] and r["warnings"][0]["code"] == "needs_confirmation"


def test_dst_overlap_is_not_guessed():
    rt = resolve_local_time(datetime(2021, 10, 31, 2, 30), "Europe/Berlin")
    assert rt.utc is None and rt.ambiguity["kind"] == "repeated"
    assert len(rt.ambiguity["candidates_utc"]) == 2


def test_soviet_era_armenia_offset_comes_from_tzdata():
    # Values from the IANA database; disputed histories are checked with golden charts and the manual override.
    assert resolve_local_time(datetime(1985, 1, 15, 12, 0), "Asia/Yerevan").offset_minutes == 240
    assert resolve_local_time(datetime(1985, 7, 15, 12, 0), "Asia/Yerevan").offset_minutes == 300  # Soviet summer time
    assert resolve_local_time(datetime(1992, 1, 15, 12, 0), "Asia/Yerevan").offset_minutes == 180


def test_override_offset_is_marked():
    r = chart(utc_offset_override=180)
    assert r["time"]["offset_source"] == "override" and r["time"]["utc"] == "1992-08-14T11:30Z"


def test_unknown_time_hides_houses_and_angles():
    r = chart(birth_time=None, time_confidence="unknown")
    assert r["houses"] is None and r["angles"] is None
    assert all(b["house"] is None for b in r["bodies"])


def test_unknown_time_flags_moon_when_it_changes_sign():
    # The Moon entered Pisces around 06:00 UTC on 1992-08-14 in this chart's sky; find a day where it changes sign.
    flagged = False
    for day in range(1, 8):
        r = chart(birth_date=date(1992, 8, day), birth_time=None, time_confidence="unknown")
        moon = next(b for b in r["bodies"] if b["id"] == "moon")
        flagged |= moon["uncertain"]
    assert flagged  # the Moon changes sign every 2-3 days


def test_approximate_time_flags_changes_in_window():
    r = chart(birth_time=None, time_confidence="approximate", time_window={"from": "12:00", "to": "16:00"})
    assert r["angles"]["asc"]["uncertain"] is True  # the Ascendant moves through about two signs in 4 hours
    assert r["time"]["local"] == "1992-08-14T14:00"
    narrow = chart(birth_time=None, time_confidence="approximate", time_window={"from": "14:29", "to": "14:31"})
    assert narrow["angles"]["asc"]["uncertain"] is False


def test_bad_input_raises():
    with pytest.raises(engine.EngineError):
        chart(time_confidence="sometimes")
    with pytest.raises(engine.EngineError):
        chart(birth_time=None)
