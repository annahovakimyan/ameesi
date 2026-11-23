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

To look at screens in a browser (no phone needed): `npx expo start --web`. The date picker
doesn't work on web; use the Android emulator or a phone for the birth form.

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
- `src/wheel/geometry.ts`: wheel drawing maths (screen angles, spacing close glyphs). Display only.
- `src/components/ChartWheel.tsx`: the wheel (react-native-svg). Taps pick the nearest planet glyph,
  because close planets' 48 px targets would overlap; screen readers get one labelled element per planet.
- `src/screens/`: birth input, chart (wheel / list).

## Status

- [x] Birth input: date, exact / approximate / unknown time, place search with former names, 18+ check
- [x] Clock-change confirmation (the user picks the right UTC offset)
- [x] Chart list: bodies, angles, aspects, stelliums, elements and modalities, uncertain flags
- [ ] Fonts (Noto Sans / Serif Armenian): system font for now
- [x] Chart wheel: signs, houses, axes, aspect lines (gold harmonious, rose tense, dashed if uncertain),
      tap a planet to highlight it and see its placement and aspects
- [x] Tap-to-explain bottom sheet with placeholder texts: tap a planet on the wheel, or any planet, angle,
      aspect or stellium in the list. Shows the entries for that element (`src/content/entryIds.ts`, per
      docs/content-spec.md), the astrological basis with content ids, the symbolic framing line, uncertainty
      notices and related placements. Half height, drag or tap the handle for full, scrim or back to close.
- [ ] Real texts: replace `placeholderSource()` in `src/content/source.tsx` with the Supabase-backed cache (build step 4)
- [ ] Houses tappable on the wheel (sheet already supports them)
- [ ] Profiles (saved charts)
- [ ] House system setting (Placidus is always used for now)
