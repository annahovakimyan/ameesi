"""Place search over GeoNames (cities500 + alternate names), stored in SQLite.

Data © GeoNames (geonames.org), CC BY 4.0. Build the database with scripts/build_places.py.
"""
import csv
import json
import os
import re
import sqlite3
import sys
import unicodedata
from pathlib import Path

DEFAULT_DB = Path(__file__).resolve().parent.parent / "data" / "places.sqlite"
LANGS = ("hy", "en", "ru")
SEARCH_LANGS = {"", "hy", "hyw", "en", "ru"}  # names searched; "" = no language given
LAUNCH_COUNTRY = "AM"
MAX_RESULTS = 10
MAX_FORMER_NAMES = 3
MIN_QUERY = 2
SCRIPT = {"hy": re.compile(r"[԰-֏]"), "ru": re.compile(r"[Ѐ-ӿ]"),
          "en": re.compile(r"^[\x00-ɏ’ʼ‘]+$")}

OVERRIDES_FILE = Path(__file__).resolve().parent / "place_overrides.json"

csv.field_size_limit(sys.maxsize)


def load_overrides() -> dict[int, dict]:
    raw = json.loads(OVERRIDES_FILE.read_text(encoding="utf-8"))
    return {int(k): v for k, v in raw.items() if not k.startswith("_")}


OVERRIDES = load_overrides()
_APOSTROPHES = str.maketrans("", "", "’'‘ʼ`´ʻ")


def normalise(text: str) -> str:
    """Lower-case, strip accents and apostrophes, treat hyphens as spaces. Ё → Е."""
    text = unicodedata.normalize("NFKD", text.casefold().replace("ё", "е"))
    text = "".join(c for c in text if not unicodedata.combining(c)).translate(_APOSTROPHES)
    text = re.sub(r"[-‐–—_.,()]+", " ", text)
    return " ".join(text.split())


def get_db_path() -> Path:
    return Path(os.environ.get("AMEESI_PLACES_DB", DEFAULT_DB))


# --- build ---------------------------------------------------------------

SCHEMA = """
CREATE TABLE places (geonames_id INTEGER PRIMARY KEY, name TEXT, country_code TEXT,
                     admin1_id INTEGER, lat REAL, lon REAL, tz TEXT, population INTEGER);
CREATE TABLE names (geonames_id INTEGER, lang TEXT, name TEXT, norm TEXT, preferred INTEGER,
                    short INTEGER, historic INTEGER, year_from INTEGER, year_to INTEGER);
CREATE TABLE countries (code TEXT PRIMARY KEY, geonames_id INTEGER, name TEXT);
CREATE TABLE admin1 (code TEXT PRIMARY KEY, geonames_id INTEGER, name TEXT);
"""


def _tsv(path: Path):
    with path.open(encoding="utf-8", newline="") as f:
        for row in csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE):
            if row and not row[0].startswith("#"):
                yield row


def _year(value: str) -> int | None:
    m = re.match(r"\d{3,4}", value or "")
    return int(m.group()) if m else None


def build(raw_dir: Path, out: Path) -> None:
    """Build the SQLite database from the GeoNames files in raw_dir."""
    tmp = out.with_suffix(".tmp")
    tmp.unlink(missing_ok=True)
    con = sqlite3.connect(tmp)
    con.executescript(SCHEMA)

    countries = {r[0]: (int(r[16]), r[4]) for r in _tsv(raw_dir / "countryInfo.txt")}
    admin1 = {r[0]: (int(r[3]), r[1]) for r in _tsv(raw_dir / "admin1CodesASCII.txt")}
    con.executemany("INSERT INTO countries VALUES (?,?,?)", [(c, g, n) for c, (g, n) in countries.items()])
    con.executemany("INSERT INTO admin1 VALUES (?,?,?)", [(c, g, n) for c, (g, n) in admin1.items()])

    places, names = [], []
    for r in _tsv(raw_dir / "cities500.txt"):
        gid, admin = int(r[0]), admin1.get(f"{r[8]}.{r[10]}")
        places.append((gid, r[1], r[8], admin[0] if admin else None,
                       float(r[4]), float(r[5]), r[17], int(r[14] or 0)))
        for n in {r[1], r[2]}:
            names.append((gid, "", n, normalise(n), 0, 0, 0, None, None))
    con.executemany("INSERT INTO places VALUES (?,?,?,?,?,?,?,?)", places)

    wanted = {p[0] for p in places} | {g for g, _ in countries.values()} | {g for g, _ in admin1.values()}
    for r in _tsv(raw_dir / "alternateNamesV2.txt"):
        if r[2] in SEARCH_LANGS and int(r[1]) in wanted:
            names.append((int(r[1]), r[2], r[3], normalise(r[3]), r[4] == "1", r[5] == "1",
                          r[7] == "1", _year(r[8]), _year(r[9])))
        if len(names) > 200_000:
            con.executemany("INSERT INTO names VALUES (?,?,?,?,?,?,?,?,?)", names)
            names.clear()
    con.executemany("INSERT INTO names VALUES (?,?,?,?,?,?,?,?,?)", names)
    con.execute("CREATE INDEX names_norm ON names (norm)")
    con.execute("CREATE INDEX names_id ON names (geonames_id)")
    con.commit()
    con.close()
    tmp.replace(out)


# --- search --------------------------------------------------------------

def _display_name(con, gid: int, lang: str, fallback: str) -> str:
    override = OVERRIDES.get(gid, {}).get("names", {}).get(lang)
    if override:
        return override
    rows = con.execute("SELECT name, preferred, short, historic FROM names "
                       "WHERE geonames_id = ? AND lang = ?", (gid, lang)).fetchall()
    rows = [r for r in rows if not r[3] and SCRIPT[lang].search(r[0])]
    if not rows:
        return fallback
    return min(rows, key=lambda r: (not r[1], not r[2], len(r[0])))[0]


def search(db_path: Path, query: str, lang: str) -> list[dict]:
    q = normalise(query)
    if len(q) < MIN_QUERY:
        return []
    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        rows = con.execute(
            "SELECT n.geonames_id, n.name, n.norm, n.historic, n.year_from, n.year_to, "
            "       p.country_code, p.population "
            "FROM names n JOIN places p USING (geonames_id) "
            "WHERE n.norm >= ? AND n.norm < ?", (q, q + "\U0010ffff")).fetchall()

        best: dict[int, tuple] = {}
        former: dict[int, dict] = {}
        for gid, name, norm, historic, y_from, y_to, country, population in rows:
            # Armenia first (launch market), then exact matches, then bigger places
            key = (country != LAUNCH_COUNTRY, norm != q, -population)
            if gid not in best or key < best[gid]:
                best[gid] = key
            if historic:
                former.setdefault(gid, {})[normalise(name)] = {"name": name, "from": y_from, "to": y_to}
        # A name is former if any entry marks it historic (GeoNames repeats names without the flag).
        # A place matched by a current name lists no former names.
        current = {gid for gid, _, norm, *_ in rows if norm not in former.get(gid, {})}
        top = sorted(best, key=lambda g: best[g])[:MAX_RESULTS]

        results = []
        for gid in top:
            name, cc, admin_id, lat, lon, tz = con.execute(
                "SELECT name, country_code, admin1_id, lat, lon, tz FROM places WHERE geonames_id = ?",
                (gid,)).fetchone()
            cc = OVERRIDES.get(gid, {}).get("country_code", cc)
            c_gid, c_name = con.execute("SELECT geonames_id, name FROM countries WHERE code = ?",
                                        (cc,)).fetchone() or (None, cc)
            region = None
            if admin_id:
                a_name = con.execute("SELECT name FROM admin1 WHERE geonames_id = ?", (admin_id,)).fetchone()
                region = _display_name(con, admin_id, lang, a_name[0] if a_name else None)
            matched = [] if gid in current else sorted(former.get(gid, {}).values(),
                                                       key=lambda f: (f["from"] or 0, f["name"]))[:MAX_FORMER_NAMES]
            results.append({
                "geonames_id": gid,
                "name": _display_name(con, gid, lang, name),
                "former_names_matched": matched,
                "region": region,
                "country": _display_name(con, c_gid, lang, c_name) if c_gid else c_name,
                "country_code": cc,
                "lat": lat, "lon": lon, "tz": tz,
            })
        return results
    finally:
        con.close()
