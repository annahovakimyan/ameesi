# Ameesi app

React Native (Expo SDK 58), TypeScript, Android first. The app only displays what the
calculation server returns; it never calculates astrology (see CLAUDE.md).

## Run

```
cd server && source .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0   # in one terminal
cd app && npm install && npx expo start                                         # in another
```

The app talks to `EXPO_PUBLIC_API_URL` (default `http://10.0.2.2:8000`, which is your computer's
localhost as seen from the Android emulator). On a real phone, set it to your computer's LAN address,
for example `EXPO_PUBLIC_API_URL=http://192.168.1.20:8000 npx expo start`.

```
npm test             # unit and screen tests
npm run typecheck
npm run generate     # after design/tokens.json or content/glossary.json changes
```

## Layout

- `src/generated/`: tokens and glossary terms, generated from `design/tokens.json` and
  `content/glossary.json` by `scripts/generate.mjs`. Never edit by hand; a test fails if they're stale.
- `src/theme.ts`: colours, spacing, radii and text styles, all from tokens.
- `src/i18n/`: `term()` for astrology terms (glossary), `t()` for interface strings.
- `src/api/`: server types and client.
- `src/birthForm.ts`: birth form validation and the request sent to the server.
- `src/screens/`: birth input, chart list.

## Status

- [x] Birth input: date, exact / approximate / unknown time, place search with former names, 18+ check
- [x] Clock-change confirmation (the user picks the right UTC offset)
- [x] Chart list: bodies, angles, aspects, stelliums, elements and modalities, uncertain flags
- [ ] Fonts (Noto Sans / Serif Armenian): system font for now
- [ ] Chart wheel
- [ ] Tap-to-explain bottom sheet (needs content loading from Supabase, build step 4)
- [ ] Profiles (saved charts)
- [ ] House system setting (Placidus is always used for now)
