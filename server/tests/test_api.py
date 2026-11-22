from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
GYUMRI = {"geonames_id": 616635, "name": "Gyumri", "lat": 40.7894, "lon": 43.8475, "tz": "Asia/Yerevan"}


def test_health():
    with TestClient(app) as c:
        assert c.get("/health").json()["ok"] is True


def test_calculate_exact():
    r = client.post("/charts/calculate", json={"date": "1992-08-14", "time": "14:30", "time_confidence": "exact",
                                              "place": GYUMRI})
    assert r.status_code == 200
    body = r.json()
    assert body["time"]["utc"] == "1992-08-14T10:30Z" and len(body["bodies"]) == 13


def test_calculate_approximate_uses_from_key():
    r = client.post("/charts/calculate", json={"date": "1992-08-14", "time_confidence": "approximate",
                                              "time_window": {"from": "13:00", "to": "15:00"}, "place": GYUMRI})
    assert r.status_code == 200 and r.json()["time"]["confidence"] == "approximate"


def test_validation_errors():
    assert client.post("/charts/calculate", json={"date": "1992-08-14", "time": "25:99", "time_confidence": "exact",
                                                  "place": GYUMRI}).status_code == 422
    bad_tz = dict(GYUMRI, tz="Mars/Olympus")
    assert client.post("/charts/calculate", json={"date": "1992-08-14", "time": "14:30", "time_confidence": "exact",
                                                  "place": bad_tz}).status_code == 422
    assert client.post("/charts/calculate", json={"date": "1992-08-14", "time_confidence": "exact",
                                                  "place": GYUMRI}).status_code == 422
