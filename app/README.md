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

Copy `.env.example` to `.env` and fill in the Supabase project URL and publishable key
(Supabase → Project Settings → API keys). Restart `npx expo start` after changing it.

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
- [x] Fonts: Ameesi Sans, Ameesi Serif and Ameesi Glyphs in `assets/fonts`, merged from Noto by
      `scripts/build_fonts.py` (React Native can't fall back between custom fonts, and Noto Sans Armenian has
      no digits). SIL Open Font License 1.1.
- [x] Chart wheel: signs, houses, axes, aspect lines (gold harmonious, rose tense, dashed if uncertain),
      tap a planet to highlight it and see its placement and aspects
- [x] Tap-to-explain bottom sheet with placeholder texts: tap a planet on the wheel, or any planet, angle,
      aspect or stellium in the list. Shows the entries for that element (`src/content/entryIds.ts`, per
      docs/content-spec.md), the astrological basis with content ids, the symbolic framing line, uncertainty
      notices and related placements. Half height, drag or tap the handle for full, scrim or back to close.
- [x] Content from Supabase (`src/content/live.tsx`, `src/content/sync.ts`): approved entries for the user's
      language, cached on the device, refreshed at most daily and on a language change. Needs `app/.env`
      (copy `.env.example`); without it, or with `EXPO_PUBLIC_CONTENT_SOURCE=placeholder`, placeholders show.
- [ ] Houses tappable on the wheel (sheet already supports them)
- [x] Profiles (saved on the phone): your own plus one more free, consent for someone else's, edit (drops the
      saved chart and recalculates), delete with confirmation, export as JSON; saved charts open offline.
      Chart and Profiles tabs.
- [ ] Cloud backup of profiles for signed-in accounts (anonymous sign-in is enabled in Supabase)
- [x] Onboarding: language, symbolic note (FR-13), then your birth details with 18+; a check step shows the
      resolved time zone, local time and UTC before the chart (FR-01)
- [x] Settings in the Profiles tab: language, house system (recalculates saved charts), About with source code
      link and license notices (FR-17), delete all my data
