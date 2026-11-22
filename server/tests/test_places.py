from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import places
from app.main import app

FIXTURES = Path(__file__).parent / "fixtures" / "geonames"
GYUMRI, VANADZOR, SPB = 616635, 616530, 498817


@pytest.fixture(scope="module")
def db(tmp_path_factory):
    path = tmp_path_factory.mktemp("places") / "places.sqlite"
    places.build(FIXTURES, path)
    return path


@pytest.fixture(scope="module")
def client(db):
    app.dependency_overrides[places.get_db_path] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


def search(client, q, lang="en"):
    r = client.get("/places", params={"q": q, "lang": lang})
    assert r.status_code == 200, r.text
    return r.json()["results"]


def ids(results):
    return [p["geonames_id"] for p in results]


@pytest.mark.parametrize("q,expected", [
    ("Leninakan", GYUMRI), ("Ленинакан", GYUMRI), ("Լենինական", GYUMRI),
    ("Kirovakan", VANADZOR), ("Кировакан", VANADZOR), ("Կիրովական", VANADZOR),
    ("Gyumri", GYUMRI), ("Գյումրի", GYUMRI), ("Гюмри", GYUMRI),
    ("Alexandropol", GYUMRI),
])
def test_finds_current_and_former_names(client, q, expected):
    assert ids(search(client, q))[0] == expected


def test_case_punctuation_and_prefix_insensitive(client):
    assert ids(search(client, "GYUM"))[0] == GYUMRI
    assert ids(search(client, "aleksandropol"))[0] == GYUMRI  # stored as "Aleksandropol’"
    assert ids(search(client, "  leninakan "))[0] == GYUMRI


def test_former_name_reported_with_years(client):
    first = search(client, "Leninakan")[0]
    assert {"name": "Leninakan", "from": 1924, "to": 1990} in first["former_names_matched"]


def test_former_names_capped(client):
    assert len(search(client, "Al")[0]["former_names_matched"]) <= 3


def test_current_name_reports_no_former_names(client):
    assert search(client, "Gyumri")[0]["former_names_matched"] == []


@pytest.mark.parametrize("lang,name", [("hy", "Գյումրի"), ("ru", "Гюмри"), ("en", "Gyumri")])
def test_display_name_in_language_is_current_not_former(client, lang, name):
    first = search(client, "Leninakan", lang)[0]
    assert first["name"] == name


def test_result_fields(client):
    p = search(client, "Gyumri")[0]
    assert set(p) == {"geonames_id", "name", "former_names_matched", "region", "country",
                      "country_code", "lat", "lon", "tz"}
    assert p["country_code"] == "AM" and p["country"] == "Armenia" and p["tz"] == "Asia/Yerevan"
    assert p["region"] == "Shirak"
    assert p["lat"] == pytest.approx(40.79, abs=0.01)


def test_country_and_region_translated(client):
    p = search(client, "Gyumri", "ru")[0]
    assert p["country"] == "Армения"


def test_armenia_ranks_first(client):
    # "Lenin" matches Leninakan (Gyumri) and Leningrad (St Petersburg, far bigger)
    result = ids(search(client, "Lenin"))
    assert result[0] == GYUMRI and SPB in result
    # With no Armenian match, the biggest exact match wins
    assert ids(search(client, "Leningrad"))[0] == SPB


def test_at_most_ten_and_unique(client):
    result = ids(search(client, "ye"))
    assert len(result) <= 10 and len(result) == len(set(result))


def test_no_match_is_empty(client):
    assert search(client, "Zzzzqx") == []


def test_bad_requests(client):
    assert client.get("/places", params={"q": "", "lang": "en"}).status_code == 422
    assert client.get("/places", params={"q": "a", "lang": "en"}).status_code == 422
    assert client.get("/places", params={"q": "Gyumri", "lang": "fr"}).status_code == 422


def test_missing_database_is_explicit(tmp_path):
    app.dependency_overrides[places.get_db_path] = lambda: tmp_path / "nope.sqlite"
    try:
        assert TestClient(app).get("/places", params={"q": "Gyumri"}).status_code == 503
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize("raw,norm", [
    ("Aleksandropol’", "aleksandropol"), ("GYUMRI", "gyumri"), ("Kümri", "kumri"),
    ("Ёлкино", "елкино"), ("Saint-Petersburg", "saint petersburg"), ("Գյումրի", "գյումրի"),
])
def test_normalise(raw, norm):
    assert places.normalise(raw) == norm
