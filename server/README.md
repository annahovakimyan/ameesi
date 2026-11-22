# Calculation server

Turns birth details into chart data. The spec is `docs/engine-spec.md`, so start there.

## Run

```
cd server && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest                         # unit, API and golden tests
uvicorn app.main:app --reload  # http://localhost:8000/docs
```

## Layout

- `app/engine.py`: all astrology (positions, houses, aspects, stelliums, balance). Full precision.
- `app/timezones.py`: local time → UTC. Refuses to guess in DST gaps and overlaps.
- `app/models.py`: request validation.
- `app/main.py`: FastAPI routes. Rounds to 0.01° for the response.
- `ephe/`: Swiss Ephemeris data files (1800–2399) from github.com/aloistr/swisseph, © Astrodienst AG, AGPL. See `ephe/LICENSE`.

## Status

- [x] Exact birth time: bodies, Placidus/Whole Sign houses, polar fallback, aspects, stelliums, balance
- [x] DST gap/overlap detection and `utc_offset_override`
- [ ] Approximate time (5-minute sampling, `uncertain` flags, `aspects_uncertain`): returns 501 for now
- [ ] Unknown time (noon chart, no houses, Moon sign-change flag): returns 501 for now
- [ ] Golden charts in `tests/golden/charts.csv` (the tests are written; they skip until rows are added)
- [ ] `GET /places`
