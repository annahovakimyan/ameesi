# Ameesi calculation server

Calculates natal charts with the Swiss Ephemeris. The only place in Ameesi where astrology is calculated. Spec: `docs/engine-spec.md`.

## Run

```
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest                         # 45 tests; golden charts run once tests/golden/charts.csv has real rows
uvicorn app.main:app --reload  # then open http://127.0.0.1:8000/docs
```

## What's done (Phase 1, part 1)

- `POST /charts/calculate` for exact, approximate and unknown birth times
- Sun to Pluto, true North Node, South Node, Chiron; Placidus and Whole Sign houses; polar fallback
- Aspects with the agreed orbs (plus 2° for the Sun and Moon), stelliums, element and modality balance
- Daylight-saving gaps and overlaps are returned for confirmation, never guessed; manual UTC offset override
- Positions cross-checked against an independent library (PyEphem): within 0.7 arcminutes for all planets, 1930–2030

## Still to do

- `GET /places` (GeoNames search with former Soviet names)
- Golden charts from astro.com in `tests/golden/charts.csv`
- Deployment

## Files

- `app/engine.py`: all calculations
- `app/timeutil.py`: local time to UTC with the IANA time-zone database
- `app/main.py`: the web API
- `ephe/`: Swiss Ephemeris data files (planets, Moon, asteroids for Chiron), © Astrodienst AG, used under the AGPL
