# Ameesi

Ameesi is an Android app (React Native, Expo) that calculates a user's natal chart accurately and explains every element in plain Armenian, English or Russian. Users tap any planet, house or aspect to read a short reviewed explanation. AI chat comes later (v1.1), not now.

The founder builds this part-time (10 hours a week) with Claude. Keep solutions simple, explain what you change, and prefer small, testable steps.

## Source documents

- PRD: Notion page "PRD" (Ameesi). Key rules are repeated below; ask before contradicting the PRD.
- Design system: Notion page "Ameesi Design System: Pomegranate Cosmos". Tokens are in `design/tokens.json`.
- Calculation server spec: `docs/engine-spec.md`. Read it before touching `server/`.
- Explanations: kept in a separate **private** repository (`ameesi-content`) and served from Supabase. They are never committed here. See `docs/content-spec.md`. Terms (planet, sign and house names in three languages): `content/glossary.json`.

## Repository layout

```
app/          React Native (Expo) app, TypeScript
server/       Python 3.12, FastAPI, pyswisseph: chart calculation and place search
content/      glossary.json only (interpretation texts live in the private ameesi-content repo)
design/       tokens.json (from the design system; don't hand-edit)
docs/         specs
tests/golden/ reference charts with known correct results
```

## Non-negotiable rules

1. **License: AGPL-3.0.** Ameesi uses Swiss Ephemeris under the AGPL, so the whole repository is public and AGPL. Only add dependencies with compatible licenses (MIT, BSD, Apache-2.0, ISC, AGPL/GPL). Check the license before adding any package.
2. **No secrets in the repository.** API keys and database passwords go in environment variables or `.env` files that are git-ignored.
3. **The app never calculates astrology.** All positions, houses, aspects and stelliums come from the server. The app only displays them.
4. **Accuracy is tested.** Every engine change runs the golden chart tests (`tests/golden/`). Never change a tolerance to make a test pass.
5. **No predictions.** No text anywhere says what will happen, when, or how likely. Explanations come only from approved entries loaded from Supabase for the user's language.
6. **No birth data in analytics or logs.** Log chart IDs, never dates, times or places.
7. **Design tokens only.** Colours, font sizes, spacing and radii come from `design/tokens.json`. Never hard-code a hex value or a size in a component.
8. **Never commit interpretation texts.** They belong to the private `ameesi-content` repository. Don't paste them into code, tests, fixtures or screenshots; tests use short fake texts.

## Product rules the code must follow

- Zodiac: tropical. Bodies: Sun to Pluto, true North Node (South Node exactly opposite), Chiron. No Lilith.
- Houses: Placidus by default, Whole Sign selectable. Above the polar circles, where Placidus fails, fall back to Whole Sign and say so.
- Aspects: conjunction 0°, sextile 60°, square 90°, trine 120°, opposition 180°, between the ten planets only. Orbs 8° (conjunction, opposition), 7° (square, trine), 5° (sextile), plus 2° when the Sun or Moon is involved.
- Stellium: 3 or more of the ten planets in one sign, or in one house. Nodes, Chiron and angles excluded.
- Birth time confidence: `exact`, `approximate` (with a window) or `unknown`. Unknown: no houses, no angles, Moon flagged if it changes sign that day.
- Languages: Armenian (default), English, Russian. Use glossary terms; Armenian uses the traditional planet names (Փայլածու, Արուսյակ, Հրատ, Լուսնթագ, Երևակ).
- Users must be 18+. No account needed before the first chart.
- Launch market: Armenia only.

## Current status

See `docs/STATUS.md`: what's done, the open phone/location problem, decisions from earlier chats, and what's waiting on the founder. Live server: https://ameesi.onrender.com.

## Build order

1. Calculation server (`docs/engine-spec.md`). Done; deployed on Render.
2. Place search with former Soviet names (Leninakan finds Gyumri). Done.
3. App: birth input, chart wheel, tap-to-explain bottom sheet, list view, profiles. Done (v0.2.0); **now: get it working on the founder's phone**.
4. Content loading from Supabase in three languages (offline cache); Ameesi Plus purchase; share card.
5. Closed test on Google Play (12+ testers for 14 days).

## How to work

- Before coding, restate the task in one or two sentences and list the files you'll touch.
- Write tests first for engine logic; run them before saying a task is done.
- Keep each change small enough to review in a few minutes.
- When something in the spec is unclear or seems wrong astrologically, stop and ask rather than guess.

## Commands

```
# server
cd server && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest                       # unit + golden tests
uvicorn app.main:app --reload

# app
cd app && npm install && npx expo start
```
