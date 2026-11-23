from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
GYUMRI = {"geonames_id": 616635, "name": "Gyumri", "lat": 40.7894, "lon": 43.8475, "tz": "Asia/Yerevan"}


def req(**over):
    body = {"date": "1992-08-14", "time": "14:30", "time_confidence": "exact",
            "place": GYUMRI, "house_system": "placidus"}
    body.update(over)
    return client.post("/charts/calculate", json=body)


def test_exact_chart_shape():
    r = req()
    assert r.status_code == 200
    data = r.json()
    assert set(data) == {"meta", "time", "bodies", "angles", "houses", "aspects",
                         "stelliums", "balance", "warnings", "aspects_uncertain"}
    assert data["meta"]["engine"].startswith("ameesi-engine")
    assert data["meta"]["swisseph"] and data["meta"]["tzdata"]
    assert data["time"]["utc"] == "1992-08-14T10:30Z"  # Armenia, summer 1992: UTC+4
    assert len(data["bodies"]) == 13 and len(data["houses"]) == 12
    assert set(data["angles"]) == {"asc", "mc", "dsc", "ic"}


def test_whole_sign_request():
    data = req(house_system="whole_sign").json()
    assert data["meta"]["house_system_used"] == "whole_sign"


def test_dst_gap_returns_no_chart():
    ny = {"name": "New York", "lat": 40.71, "lon": -74.01, "tz": "America/New_York"}
    data = req(date="2021-03-14", time="02:30", place=ny).json()
    assert data["time"]["dst_ambiguity"]["kind"] == "gap"
    assert data["bodies"] == []
    assert data["warnings"][0]["code"] == "needs_confirmation"


def test_override_resolves_ambiguity():
    ny = {"name": "New York", "lat": 40.71, "lon": -74.01, "tz": "America/New_York"}
    data = req(date="2021-03-14", time="02:30", place=ny, utc_offset_override=-300).json()
    assert data["time"]["offset_source"] == "user_override"
    assert len(data["bodies"]) == 13
    assert "utc_offset_overridden" in [w["code"] for w in data["warnings"]]


def test_validation_errors():
    assert req(time=None).status_code == 422
    assert req(date="1700-01-01").status_code == 422
    assert req(place={**GYUMRI, "tz": "Mars/Olympus"}).status_code == 422



def test_unknown_time_has_no_houses_or_angles():
    data = req(time=None, time_confidence="unknown").json()
    assert data["houses"] is None and data["angles"] is None
    assert all(b["house"] is None for b in data["bodies"])
    assert data["time"]["local"] == "1992-08-14T12:00"
    assert data["time"]["confidence"] == "unknown"
    assert not any(s["kind"] == "house" for s in data["stelliums"])


def moon_of(data):
    return next(b for b in data["bodies"] if b["id"] == "moon")


def test_unknown_time_flags_moon_on_sign_change_day():
    yerevan = {"name": "Yerevan", "lat": 40.18, "lon": 44.51, "tz": "Asia/Yerevan"}
    # 2000-01-03: the Moon moves from Scorpio into Sagittarius during the day
    data = req(date="2000-01-03", time=None, time_confidence="unknown", place=yerevan).json()
    assert moon_of(data)["uncertain"]
    assert not any(b["uncertain"] for b in data["bodies"] if b["id"] != "moon")
    # 2000-01-02: the Moon stays in Scorpio all day
    data = req(date="2000-01-02", time=None, time_confidence="unknown", place=yerevan).json()
    assert not moon_of(data)["uncertain"]


def test_approximate_time_reports_midpoint_with_flags():
    data = req(time=None, time_confidence="approximate",
               time_window={"from": "12:00", "to": "16:00"}).json()
    assert data["time"]["local"] == "1992-08-14T14:00"
    assert data["time"]["confidence"] == "approximate"
    assert data["time"]["window"] == {"from": "12:00", "to": "16:00"}
    assert data["angles"]["asc"]["uncertain"]  # 4 hours always moves the Ascendant's sign
    assert isinstance(data["aspects_uncertain"], list)


def test_approximate_window_must_be_in_order():
    assert req(time_confidence="approximate", time_window={"from": "16:00", "to": "12:00"}).status_code == 422


def test_pre_1970_births_get_a_soft_warning():
    codes = [w["code"] for w in req(date="1965-05-01").json()["warnings"]]
    assert "historical_offset" in codes
    assert "historical_offset" not in [w["code"] for w in req().json()["warnings"]]
    # an offset set by hand is the user's own correction: no warning
    assert "historical_offset" not in [w["code"] for w in req(date="1965-05-01", utc_offset_override=240).json()["warnings"]]


def test_health_reports_versions():
    data = client.get("/health").json()
    assert data["status"] == "ok"
    assert data["engine"].startswith("ameesi-engine") and data["swisseph"] and data["tzdata"]
    assert "places_db" in data


def test_request_log_never_contains_birth_data(caplog):
    """CLAUDE.md rule 6: no dates, times or places in logs."""
    import logging
    with caplog.at_level(logging.INFO, logger="ameesi.requests"):
        client.get("/places", params={"q": "Leninakan", "lang": "hy"})
        req(place={**GYUMRI, "name": "Gyumri"})
    logged = " ".join(r.getMessage() for r in caplog.records if r.name == "ameesi.requests")
    assert "/places" in logged and "/charts/calculate" in logged  # requests are logged...
    for secret in ("Leninakan", "q=", "1992", "14:30", "Gyumri", "40.78", "Asia/Yerevan"):
        assert secret not in logged  # ...but never their birth data
