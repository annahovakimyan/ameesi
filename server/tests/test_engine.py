from datetime import datetime, timezone

import pytest

from app import engine as e

J2000 = datetime(2000, 1, 1, 12, 0, tzinfo=timezone.utc)
YEREVAN = (40.1811, 44.5136)
TROMSO = (69.6496, 18.9560)


# --- sign boundaries and angle maths -------------------------------------

@pytest.mark.parametrize("lon,sign,deg", [
    (0.0, "aries", 0.0),
    (29.99, "aries", 29.99),
    (30.0, "taurus", 0.0),
    (359.99, "pisces", 29.99),
    (360.0, "aries", 0.0),
])
def test_sign_boundaries(lon, sign, deg):
    assert e.sign_of(lon) == sign
    assert e.sign_deg(lon) == pytest.approx(deg)


def test_normalise_wraps():
    assert e.norm(359 + 2) == pytest.approx(1)
    assert e.norm(-1) == pytest.approx(359)


def test_separation_is_shortest_arc():
    assert e.separation(359, 1) == pytest.approx(2)
    assert e.separation(10, 200) == pytest.approx(170)


# --- house assignment ----------------------------------------------------

CUSPS = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320]  # house 1 crosses 0°


@pytest.mark.parametrize("lon,house", [
    (350.0, 1), (359.9, 1), (0.0, 1), (19.99, 1), (20.0, 2), (349.99, 12), (175.0, 7),
])
def test_house_assignment(lon, house):
    assert e.house_of(lon, CUSPS) == house


def test_on_cusp_within_one_degree():
    assert e.on_cusp(20.9, CUSPS)
    assert e.on_cusp(19.1, CUSPS)
    assert not e.on_cusp(21.1, CUSPS)


# --- aspects and orbs ----------------------------------------------------

@pytest.mark.parametrize("a,b,sep,expected", [
    ("venus", "mars", 8.0, "conjunction"),
    ("venus", "mars", 8.01, None),
    ("venus", "mars", 172.0, "opposition"),
    ("venus", "mars", 171.99, None),
    ("venus", "mars", 97.0, "square"),
    ("venus", "mars", 97.01, None),
    ("venus", "mars", 113.0, "trine"),
    ("venus", "mars", 112.99, None),
    ("venus", "mars", 65.0, "sextile"),
    ("venus", "mars", 65.01, None),
    # +2° when the Sun or Moon is involved
    ("sun", "mars", 10.0, "conjunction"),
    ("sun", "mars", 10.01, None),
    ("moon", "mars", 99.0, "square"),
    ("moon", "mars", 99.01, None),
    ("sun", "moon", 67.0, "sextile"),
    ("sun", "moon", 67.01, None),
])
def test_orb_thresholds(a, b, sep, expected):
    found = e.aspect_between(a, b, sep)
    assert (found["type"] if found else None) == expected


def test_nearly_exact():
    assert e.aspect_between("venus", "mars", 91.0)["nearly_exact"]
    assert not e.aspect_between("venus", "mars", 91.01)["nearly_exact"]


def test_aspects_only_between_ten_planets():
    lons = {b: 0.0 for b in e.BODIES}  # everything conjunct
    pairs = {(x["a"], x["b"]) for x in e.find_aspects(lons)}
    assert len(pairs) == 45  # 10 choose 2
    assert not any(p in ("north_node", "south_node", "chiron") for pair in pairs for p in pair)


# --- stelliums and balance -----------------------------------------------

def test_stellium_by_sign_excludes_nodes_and_chiron():
    # Aries holds Moon, Mars + nodes and Chiron: only 2 planets, so no stellium
    signs = dict(zip(e.PLANETS, ["leo", "aries", "leo", "virgo", "aries",
                                 "taurus", "gemini", "cancer", "libra", "scorpio"]))
    signs.update({"north_node": "aries", "south_node": "aries", "chiron": "aries"})
    assert e.find_stelliums(signs, houses=None) == []


def test_stellium_three_planets():
    signs = {p: s for p, s in zip(e.PLANETS, ["leo", "leo", "leo", "virgo", "aries",
                                              "taurus", "gemini", "cancer", "libra", "scorpio"])}
    houses = {p: h for p, h in zip(e.PLANETS, [10, 10, 11, 11, 11, 1, 2, 3, 4, 5])}
    assert e.find_stelliums(signs, houses) == [
        {"kind": "sign", "where": "leo", "members": ["sun", "moon", "mercury"]},
        {"kind": "house", "where": 11, "members": ["mercury", "venus", "mars"]},
    ]


def test_balance_counts_ten_planets():
    signs = {p: "aries" for p in e.PLANETS}
    signs["north_node"] = "taurus"
    b = e.balance(signs)
    assert b["fire"] == 10 and b["cardinal"] == 10 and b["earth"] == 0
    assert sum(b[k] for k in ("fire", "earth", "air", "water")) == 10


# --- full calculation ----------------------------------------------------

def test_sun_at_j2000():
    chart = e.calculate(J2000, *YEREVAN, "placidus")
    sun = chart["bodies"]["sun"]
    assert sun["lon"] == pytest.approx(280.37, abs=0.01)
    assert sun["sign"] == "capricorn"


def test_all_bodies_present_and_node_opposition():
    chart = e.calculate(J2000, *YEREVAN, "placidus")
    assert list(chart["bodies"]) == e.BODIES
    n, s = chart["bodies"]["north_node"]["lon"], chart["bodies"]["south_node"]["lon"]
    assert e.norm(s - n) == pytest.approx(180)


def test_retrograde_flag_follows_speed():
    chart = e.calculate(J2000, *YEREVAN, "placidus")
    for body in chart["bodies"].values():
        assert body["retrograde"] == (body["speed"] < 0)


def test_twelve_houses_and_every_body_has_a_house():
    chart = e.calculate(J2000, *YEREVAN, "placidus")
    assert len(chart["houses"]) == 12
    assert chart["houses"][0]["cusp_lon"] == pytest.approx(chart["angles"]["asc"]["lon"])
    assert all(1 <= b["house"] <= 12 for b in chart["bodies"].values())
    assert e.norm(chart["angles"]["dsc"]["lon"] - chart["angles"]["asc"]["lon"]) == pytest.approx(180)


def test_whole_sign_cusps_start_at_sign_boundaries():
    chart = e.calculate(J2000, *YEREVAN, "whole_sign")
    assert chart["house_system_used"] == "whole_sign"
    assert all(h["cusp_lon"] % 30 == pytest.approx(0) for h in chart["houses"])


def test_placidus_polar_fallback():
    chart = e.calculate(J2000, *TROMSO, "placidus")
    assert chart["house_system_used"] == "whole_sign"
    assert [w["code"] for w in chart["warnings"]] == ["placidus_polar_fallback"]


def test_no_fallback_in_yerevan():
    chart = e.calculate(J2000, *YEREVAN, "placidus")
    assert chart["house_system_used"] == "placidus"
    assert chart["warnings"] == []


def test_works_in_a_fresh_thread():
    """Swiss Ephemeris settings are per thread; FastAPI uses worker threads."""
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(1) as pool:
        chart = pool.submit(e.calculate, J2000, *YEREVAN, "placidus").result()
    assert chart["bodies"]["chiron"]["lon"] >= 0  # Chiron needs seas_18.se1; raises if files unused
