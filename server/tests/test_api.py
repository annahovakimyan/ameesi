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
                         "stelliums", "balance", "warnings"}
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


def test_unimplemented_confidence_is_explicit():
    assert req(time_confidence="unknown").status_code == 501
