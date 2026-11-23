# Calculation server

Turns birth details into chart data. The spec is `docs/engine-spec.md`, so start there.

## Run

```
cd server && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest                         # unit, API and golden tests
python scripts/build_places.py # once: downloads GeoNames (~220 MB), builds data/places.sqlite (~30 s)
uvicorn app.main:app --reload  # http://localhost:8000/docs
```

## Deploy

**Easiest: Render, no Docker on your computer.** `render.yaml` at the repository root describes the service.
In Render: New → Blueprint → connect the GitHub repository → choose the branch → Apply. The first build takes
about 10 minutes (it downloads GeoNames). Then copy the service's address (https://….onrender.com) into
`app/.env` as `EXPO_PUBLIC_API_URL` and restart Expo with `npx expo start -c`. On the free plan the server
sleeps after a while; the first request afterwards takes up to a minute.

**Anywhere else with Docker:**

```
docker build -t ameesi-server .          # from server/; downloads GeoNames and builds the place database
docker run -p 8000:8000 ameesi-server    # honours $PORT, as most hosts set it
```

The image compiles pyswisseph in a build stage (PyPI has no prebuilt Linux wheel), keeps only the
packages, the place database, the ephemeris files and the code, and runs as a non-root user. `GET /health`
reports versions and whether the place database is present, for the host's health checks.

Logs never contain birth data (CLAUDE.md rule 6): uvicorn's access log is off (it includes query strings
such as `?q=Leninakan`), and the app logs only method, path, status and duration. Keep `--no-access-log`
if you change the start command. Point the app at the deployed URL with `EXPO_PUBLIC_API_URL`.

## Layout

- `app/engine.py`: all astrology (positions, houses, aspects, stelliums, balance). Full precision.
- `app/uncertainty.py`: flags for approximate and unknown birth times.
- `app/places.py`: place search (`GET /places`). Armenia ranks first; former names are matched and reported.
- `app/timezones.py`: local time → UTC. Refuses to guess in DST gaps and overlaps.
- `app/models.py`: request validation.
- `app/main.py`: FastAPI routes. Rounds to 0.01° for the response.
- `data/`: built place database and raw downloads (git-ignored). Place data © GeoNames (geonames.org), CC BY 4.0; the app must show this attribution.
- `ephe/`: Swiss Ephemeris data files (1800–2399) from github.com/aloistr/swisseph, © Astrodienst AG, AGPL. See `ephe/LICENSE`.

## Status

- [x] Exact birth time: bodies, Placidus/Whole Sign houses, polar fallback, aspects, stelliums, balance
- [x] DST gap/overlap detection and `utc_offset_override`
- [x] Approximate time: 5-minute sampling across the window, `uncertain` flags on bodies, angles and house cusps, `aspects_uncertain`
- [x] Unknown time: local-noon chart, no houses or angles, Moon flagged if it changes sign that day
- [ ] Golden charts in `tests/golden/charts.csv` (the tests are written; they skip until rows are added)
- [x] `GET /places`: former Soviet names, Armenian/English/Russian spellings, display names in the requested language
- [x] Every village in Armenia, Azerbaijan and Georgia (GeoNames country files), not only places over 500 people
- [x] Docker image, `/health`, request logs without birth data
- [x] Region rules in `app/place_overrides.json`: Nagorno-Karabakh shows Armenian place names in every language
      (`app/translit.py` where GeoNames has none) and uses Armenian time
