import pytest

from scripts.golden_add import ParseError, parse_dms, parse_paste, utc_offset_minutes

# Short invented snippets in the layouts astro.com uses. Positions are made up.
TABLE = """
Planet positions
Sun        Leo        22°14' 5"    in house 9
Moon       Pisces      2°47'30"
Mercury    Leo         6° 4'12"
Venus      Virgo       8°49'
Mars       Gemini     12°23'34"
Jupiter    Virgo      17°48'51"
Saturn     Aquarius   14°36'40" r
Uranus     Capricorn  14°39'58" r
Neptune    Capricorn  16°40'49" r
Pluto      Scorpio    20°12'22"
True Node  Sagittarius 29°25'47" r
Chiron     Leo        14°26' 6"
Ascendant  Scorpio    28°33'13"
MC         Virgo      13° 7'21"
Univ.Time: 10:30   Sid. Time: 12:49
Gyumri, ARM  40n47, 43e51
"""

COMPACT = """Sun 22le14'05  Moon 2pi47  Mercury 6le04  Venus 8vi49  Mars 12ge23  Jupiter 17vi48
Saturn 14aq36  Uranus 14cp39  Neptune 16cp40  Pluto 20sc12  True Node 29sg25  Chiron 14le26
AC 28sc33  MC 13vi07"""


def test_full_table():
    r = parse_paste(TABLE)
    assert r.positions["sun"] == pytest.approx(120 + 22 + 14 / 60 + 5 / 3600)
    assert r.positions["moon"] == pytest.approx(330 + 2 + 47 / 60 + 30 / 3600)
    assert r.positions["north_node"] == pytest.approx(240 + 29 + 25 / 60 + 47 / 3600)
    assert r.positions["asc"] == pytest.approx(210 + 28 + 33 / 60 + 13 / 3600)
    assert r.positions["mc"] == pytest.approx(150 + 13 + 7 / 60 + 21 / 3600)
    assert r.missing == []
    assert r.ut == "10:30"
    assert r.lat == pytest.approx(40 + 47 / 60) and r.lon == pytest.approx(43 + 51 / 60)


def test_compact_astro_style():
    r = parse_paste(COMPACT)
    assert r.positions["sun"] == pytest.approx(142 + 14 / 60 + 5 / 3600)
    assert r.positions["venus"] == pytest.approx(150 + 8 + 49 / 60)
    assert r.positions["asc"] == pytest.approx(238 + 33 / 60)
    assert r.missing == []


def test_south_and_west_coordinates():
    r = parse_paste("Buenos Aires, ARG 34s36, 58w27\nSun Taurus 14°10'")
    assert r.lat == pytest.approx(-(34 + 36 / 60)) and r.lon == pytest.approx(-(58 + 27 / 60))


def test_missing_bodies_are_listed():
    r = parse_paste("Sun Leo 22°14'")
    assert "moon" in r.missing and "chiron" in r.missing and "sun" not in r.missing


def test_mean_node_is_refused():
    with pytest.raises(ParseError, match="mean node"):
        parse_paste("Mean Node Sagittarius 28°10'")


@pytest.mark.parametrize("text,deg", [("22°14'05\"", 22 + 14 / 60 + 5 / 3600), ("22° 4'", 22 + 4 / 60),
                                       ("0°00'", 0.0), ("29°59'59\"", 29 + 59 / 60 + 59 / 3600)])
def test_parse_dms(text, deg):
    assert parse_dms(text) == pytest.approx(deg)


@pytest.mark.parametrize("local,ut,minutes", [
    ("14:30", "10:30", 240), ("01:15", "21:15", 240), ("20:00", "23:00", -180), ("03:15", "06:15", -180),
])
def test_utc_offset_from_univ_time(local, ut, minutes):
    assert utc_offset_minutes(local, ut) == minutes
