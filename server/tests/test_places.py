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
    previous = app.dependency_overrides.get(places.get_db_path)
    app.dependency_overrides[places.get_db_path] = lambda: tmp_path / "nope.sqlite"
    try:
        assert TestClient(app).get("/places", params={"q": "Gyumri"}).status_code == 503
    finally:
        # Restore, not clear: later tests in this module still need the fixture database.
        if previous:
            app.dependency_overrides[places.get_db_path] = previous
        else:
            app.dependency_overrides.pop(places.get_db_path, None)


@pytest.mark.parametrize("raw,norm", [
    ("Aleksandropol’", "aleksandropol"), ("GYUMRI", "gyumri"), ("Kümri", "kumri"),
    ("Ёлкино", "елкино"), ("Saint-Petersburg", "saint petersburg"), ("Գյումրի", "գյումրի"),
])
def test_normalise(raw, norm):
    assert places.normalise(raw) == norm


def test_overrides_replace_display_names(client, monkeypatch):
    monkeypatch.setattr(places, "OVERRIDES", {GYUMRI: {"names": {"en": "Gyumri (test)"}},
                                              828264: {"names": {"en": "Shirak (test)"}}})
    p = search(client, "Gyumri")[0]
    assert p["name"] == "Gyumri (test)" and p["region"] == "Shirak (test)"
    assert search(client, "Gyumri", "ru")[0]["name"] == "Гюмри"  # other languages unchanged


def test_override_changes_country(client, monkeypatch):
    monkeypatch.setattr(places, "OVERRIDES", {SPB: {"country_code": "AM"}})
    p = next(p for p in search(client, "Leningrad") if p["geonames_id"] == SPB)
    assert p["country_code"] == "AM" and p["country"] == "Armenia"


def test_override_file_is_valid():
    overrides, regions = places.load_overrides()
    for gid, o in overrides.items():
        assert isinstance(gid, int)
        assert set(o) <= {"names", "country_code", "tz", "_what"}
        assert set(o.get("names", {})) <= set(places.LANGS)
    for r in regions:
        assert set(r) <= {"id", "_what", "admin1", "places", "names", "tz"}
        assert r.get("names") in (None, "armenian")


# --- country files: villages under 500 people --------------------------------

YAGHDAN, MARTAKERT, HADRUT, STEPANAKERT, SHUSHI, OUTSIDE = 616070, 587379, 148105, 146970, 147105, 584544
BERDZOR, IVANYAN, HORADIZ = 147625, 147774, 148003


def test_small_village_from_country_file(client):
    assert ids(search(client, "Yaghdan"))[0] == YAGHDAN
    assert ids(search(client, "Յաղդան", "hy"))[0] == YAGHDAN


def test_place_in_both_files_appears_once(client):
    assert ids(search(client, "Gyumri")).count(GYUMRI) == 1


# --- Nagorno-Karabakh: Armenian names in every language, Armenian time ----------

@pytest.mark.parametrize("q,gid,lang,name", [
    ("Martakert", MARTAKERT, "en", "Martakert"),
    ("Мартакерт", MARTAKERT, "ru", "Мартакерт"),
    ("Hadrut", HADRUT, "ru", "Гадрут"),
    ("Khankendi", STEPANAKERT, "en", "Stepanakert"),
    ("Ханкенди", STEPANAKERT, "ru", "Степанакерт"),
    ("Stepanakert", STEPANAKERT, "hy", "Ստեփանակերտ"),
    ("Shusha", SHUSHI, "en", "Shushi"),
])
def test_karabakh_places_show_armenian_names(client, q, gid, lang, name):
    p = next(p for p in search(client, q, lang) if p["geonames_id"] == gid)
    assert p["name"] == name


def test_karabakh_keeps_country_and_uses_armenian_time(client):
    p = search(client, "Stepanakert")[0]
    assert p["country_code"] == "AZ" and p["country"] == "Azerbaijan"
    assert p["tz"] == "Asia/Yerevan"


def test_shown_name_is_not_repeated_as_a_former_name(client):
    # GeoNames marks "Stepanakert" historic; it's the shown name, so it isn't listed as "formerly".
    p = search(client, "Stepanakert")[0]
    assert all(f["name"] != "Stepanakert" for f in p["former_names_matched"])


def test_transliterations_are_searchable_but_never_shown(client):
    # Yaghdan has a Russian name (Ягдан); a transliteration of Յաղդան is "Яхдан"
    assert ids(search(client, "Яхдан", "ru"))[0] == YAGHDAN
    assert search(client, "Яхдан", "ru")[0]["name"] == "Ягдан"


@pytest.mark.parametrize("q,gid,lang,name", [
    ("Lachin", BERDZOR, "en", "Berdzor"),
    ("Лачин", BERDZOR, "ru", "Бердзор"),
    ("Berdzor", BERDZOR, "hy", "Բերձոր"),
    ("Khojaly", IVANYAN, "en", "Ivanyan"),
    ("Ходжалы", IVANYAN, "ru", "Иванян"),
    ("Ivanyan", IVANYAN, "hy", "Իվանյան"),
])
def test_artsakh_beyond_the_old_oblast(client, q, gid, lang, name):
    p = next(p for p in search(client, q, lang) if p["geonames_id"] == gid)
    assert p["name"] == name and p["tz"] == "Asia/Yerevan"


def test_split_district_village_east_of_the_line_unchanged(client):
    # Horadiz (Fuzuli district) stayed on the Azerbaijani side of the 1994-2020 line
    p = next(p for p in search(client, "Horadiz") if p["geonames_id"] == HORADIZ)
    assert p["tz"] == "Asia/Baku" and p["name"] == "Horadiz"


def test_shahumyan_armenian_names_but_baku_time(client):
    # Former Shahumyan district: Armenian names; Azerbaijan held it from mid-1992, so Baku time stays
    p = next(p for p in search(client, "Ashaghi Aghjakand") if p["geonames_id"] == 587201)
    assert p["name"] == "Shahumyan" and p["tz"] == "Asia/Baku"
    assert next(p for p in search(client, "Ashaghi Aghjakand", "hy") if p["geonames_id"] == 587201)["name"] == "Շահումյան"


def test_rest_of_azerbaijan_unchanged(client):
    p = search(client, "Zumurxan")[0]
    assert p["geonames_id"] == OUTSIDE and p["tz"] == "Asia/Baku" and p["name"] == "Zümürxan"


@pytest.mark.parametrize("lang,name,region", [("hy", "Գյումրի", "Շիրակ"), ("ru", "Гюмри", None), ("en", "Gyumri", "Shirak")])
def test_one_place_by_id_in_a_language(client, lang, name, region):
    r = client.get(f"/places/{GYUMRI}", params={"lang": lang})
    assert r.status_code == 200
    p = r.json()
    assert p["geonames_id"] == GYUMRI and p["name"] == name and p["tz"] == "Asia/Yerevan"
    if region:
        assert p["region"] == region
    assert p["former_names_matched"] == []


def test_one_place_applies_region_rules(client):
    assert client.get(f"/places/{STEPANAKERT}", params={"lang": "en"}).json()["name"] == "Stepanakert"
    assert client.get(f"/places/{STEPANAKERT}", params={"lang": "en"}).json()["tz"] == "Asia/Yerevan"


def test_unknown_place_is_404(client):
    assert client.get("/places/999999999", params={"lang": "en"}).status_code == 404
