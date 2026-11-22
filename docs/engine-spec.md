# Calculation server spec (Phase 1)

The server turns birth details into chart data. It is the only place astrology is calculated. Phase 1 is done when every golden chart in `tests/golden/` matches within tolerance.

## Stack

- Python 3.12, FastAPI, Uvicorn.
- `pyswisseph` (imported as `swisseph`), AGPL.
- Swiss Ephemeris data files in `server/ephe/`: `sepl_18.se1` (planets), `semo_18.se1` (Moon) and `seas_18.se1` (asteroids). **Chiron needs `seas_18.se1`**; without it Chiron fails. These cover 1800–2399. Get them from the official Swiss Ephemeris repository (github.com/aloistr/swisseph, `ephe/` folder) and keep their copyright notice.
- Time zones: Python `zoneinfo` with the `tzdata` package. Record `tzdata.IANA_VERSION` in every chart.
- Place search: GeoNames `cities500` plus alternate names, loaded into SQLite for now. Attribution required (CC BY 4.0).

## Endpoints

### `POST /charts/calculate`

Request:

```json
{
  "date": "1992-08-14",
  "time": "14:30",
  "time_confidence": "exact",
  "time_window": null,
  "place": {"geonames_id": 616635, "name": "Gyumri", "lat": 40.7894, "lon": 43.8475, "tz": "Asia/Yerevan"},
  "house_system": "placidus",
  "utc_offset_override": null
}
```

- `time_confidence`: `exact` | `approximate` | `unknown`. For `approximate`, `time_window` is `{"from": "13:00", "to": "15:00"}`. For `unknown`, `time` is ignored.
- `house_system`: `placidus` | `whole_sign`.
- `utc_offset_override`: minutes east of UTC (for example `240`), only when the user corrects a disputed historical offset. Mark it in the response.

Response (shape; values illustrative):

```json
{
  "meta": {
    "engine": "ameesi-engine 0.1.0",
    "swisseph": "2.10.03",
    "tzdata": "2026a",
    "zodiac": "tropical",
    "house_system_requested": "placidus",
    "house_system_used": "placidus",
    "node": "true",
    "calculated_at": "2026-11-22T12:00:00Z"
  },
  "time": {
    "local": "1992-08-14T14:30",
    "utc": "1992-08-14T10:30Z",
    "utc_offset_minutes": 240,
    "offset_source": "tzdata",
    "confidence": "exact",
    "dst_ambiguity": null
  },
  "bodies": [
    {"id": "sun", "lon": 142.21, "lat": 0.0, "speed": 0.96, "sign": "leo", "sign_deg": 22.21,
     "house": 10, "retrograde": false, "on_cusp": false, "uncertain": false}
  ],
  "angles": {"asc": {"lon": 212.0, "sign": "scorpio", "sign_deg": 2.0}, "mc": {...}, "dsc": {...}, "ic": {...}},
  "houses": [{"house": 1, "cusp_lon": 212.0, "sign": "scorpio"}],
  "aspects": [{"a": "sun", "b": "moon", "type": "square", "exact_angle": 90, "separation": 97.2, "orb": 7.2, "nearly_exact": false}],
  "stelliums": [{"kind": "sign", "where": "leo", "members": ["sun", "mercury", "venus"]}],
  "balance": {"fire": 4, "earth": 2, "air": 1, "water": 3, "cardinal": 3, "fixed": 5, "mutable": 2},
  "warnings": [{"code": "placidus_polar_fallback", "message": "..."}]
}
```

Rules:

- Body ids: `sun moon mercury venus mars jupiter saturn uranus neptune pluto north_node south_node chiron`.
- Signs: lower-case English ids (`aries` … `pisces`); the app translates them with the glossary.
- `lon` in degrees 0–360, rounded to 0.01 in the response, full precision internally.
- `retrograde` = speed in longitude below 0.
- `house`: assign by exact longitude against cusps. `on_cusp` = within 1° of a cusp (information only).
- `south_node` = `north_node` + 180°. True node only.
- Aspects only between the ten planets. Orb = |separation − exact angle|. Allowed orb: 8 (conjunction, opposition), 7 (square, trine), 5 (sextile), +2 if the Sun or Moon is one of the pair. `nearly_exact` = orb ≤ 1°. If two aspect types qualify, keep the one with the smaller orb.
- Stelliums: 3+ of the ten planets in one sign, and separately 3+ in one house.
- `balance`: count the ten planets by element and modality.
- Unknown time: calculate at local noon, return no `houses`, no `angles`, `house: null` for every body, and set `uncertain: true` on the Moon if it changes sign between 00:00 and 23:59 local that day.
- Approximate time: sample every 5 minutes across the window. Set `uncertain: true` on any body, angle or house placement whose sign or house changes in the window, and list aspects that appear or disappear in `aspects_uncertain`. Report the chart for the window's midpoint, with the flags.
- Polar latitudes: if Placidus fails (swisseph returns an error or nonsense above about 66°), recalculate with Whole Sign, set `house_system_used: "whole_sign"` and add a `placidus_polar_fallback` warning.
- DST gaps and overlaps: if the local time doesn't exist (clocks jumped forward) or happens twice (clocks went back), don't guess. Return `dst_ambiguity` with the two candidate UTC times and a `needs_confirmation` warning; the app asks the user.

### `GET /places?q=lenin&lang=hy`

Returns up to 10 matches: `geonames_id`, display name in the requested language, former names that matched, country, lat, lon, IANA time zone. Must find Gyumri for "Leninakan", Vanadzor for "Kirovakan", and Armenian and Russian spellings (Գյումրի, Гюмри).

## Swiss Ephemeris calls (reference)

- Julian day: `swe.julday(y, m, d, hour_utc_decimal)`.
- Planets: `swe.calc_ut(jd, swe.SUN … swe.PLUTO, swe.FLG_SWIEPH | swe.FLG_SPEED)`; Chiron `swe.CHIRON`; true node `swe.TRUE_NODE`.
- Houses: `swe.houses_ex(jd, lat, lon, b'P')` for Placidus, `b'W'` for Whole Sign. Returns cusps and ascmc (Asc = ascmc[0], MC = ascmc[1]).
- Call `swe.set_ephe_path('server/ephe')` once at startup and fail loudly if the files are missing.

## Tests

1. **Unit tests** (`server/tests/`): sign boundaries (29.99° vs 30.00°), angle normalisation (359° + 2°), cusp assignment, node opposition, every orb threshold including the Sun/Moon +2°, stellium membership, DST gap detection, unknown-time behaviour.
2. **Golden charts** (`tests/golden/charts.csv`): each row is a birth with expected positions from astro.com, computed with the same settings (tropical, Placidus, true node). Tolerance: 1 arcminute (0.0167°) for planets, angles and cusps. Start with 10, including at least 3 births in Soviet-era Armenia (before 1991) and 1 above 66° latitude.
3. Every change to the engine, ephemeris files or tzdata re-runs all tests.

## Done for Phase 1

- [ ] `POST /charts/calculate` returns the shape above for exact, approximate and unknown times
- [ ] `GET /places` finds former Soviet names in three languages
- [ ] All unit tests pass
- [ ] 10 golden charts pass within 1 arcminute (100 by the end of Phase 1)
- [ ] Engine, Swiss Ephemeris and tzdata versions appear in every response
