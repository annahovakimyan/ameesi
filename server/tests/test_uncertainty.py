from datetime import datetime, timedelta, timezone

from app import engine as e
from app.uncertainty import flag_uncertain, moon_changes_sign

YEREVAN = (40.1811, 44.5136)


def chart_at(utc):
    return e.calculate(utc, *YEREVAN, "placidus")


def test_stable_window_flags_nothing_but_moving_points():
    t = datetime(2000, 1, 1, 12, 0, tzinfo=timezone.utc)
    samples = [chart_at(t), chart_at(t)]
    flagged = flag_uncertain(samples[0], samples)
    assert not any(b["uncertain"] for b in flagged["bodies"].values())
    assert not any(a["uncertain"] for a in flagged["angles"].values())
    assert not any(h["uncertain"] for h in flagged["houses"])
    assert flagged["aspects_uncertain"] == []


def test_ascendant_sign_change_is_flagged():
    # The Ascendant moves through a sign in about 2 hours, so a 4-hour window must change it.
    t = datetime(2000, 1, 1, 8, 0, tzinfo=timezone.utc)
    samples = [chart_at(t + timedelta(minutes=5 * i)) for i in range(49)]
    flagged = flag_uncertain(samples[24], samples)
    assert flagged["angles"]["asc"]["uncertain"]
    assert flagged["houses"][0]["uncertain"]
    # Slow planets change house as the cusps rotate past them
    assert any(b["uncertain"] for b in flagged["bodies"].values())


def test_body_flagged_when_sign_changes():
    base = chart_at(datetime(2000, 1, 1, 12, 0, tzinfo=timezone.utc))
    other = {**base, "bodies": {**base["bodies"], "moon": {**base["bodies"]["moon"], "sign": "aries"}}}
    if base["bodies"]["moon"]["sign"] == "aries":
        other["bodies"]["moon"]["sign"] = "taurus"
    flagged = flag_uncertain(base, [base, other])
    assert flagged["bodies"]["moon"]["uncertain"]
    assert not flagged["bodies"]["sun"]["uncertain"]


def test_aspect_appearing_in_window_is_listed():
    base = chart_at(datetime(2000, 1, 1, 12, 0, tzinfo=timezone.utc))
    extra = {"a": "venus", "b": "pluto", "type": "trine"}
    other = {**base, "aspects": base["aspects"] + [{**extra, "exact_angle": 120, "separation": 120,
                                                   "orb": 0, "nearly_exact": True}]}
    flagged = flag_uncertain(base, [base, other])
    assert flagged["aspects_uncertain"] == [extra]


def test_moon_sign_change_detection():
    base = chart_at(datetime(2000, 1, 1, 12, 0, tzinfo=timezone.utc))
    assert not moon_changes_sign(base, base)
    moved = {**base, "bodies": {**base["bodies"], "moon": {**base["bodies"]["moon"], "sign": "x"}}}
    assert moon_changes_sign(base, moved)
