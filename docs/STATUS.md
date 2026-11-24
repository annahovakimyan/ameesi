# Ameesi: status and handoff

Last updated 24 November 2026. Read this with `CLAUDE.md` at the start of a new chat.

## Where things stand

| Area | State |
| --- | --- |
| Calculation server (`server/`) | Done: exact, approximate and unknown times; DST confirmation; polar fallback; golden-chart tests. |
| Place search | Done: GeoNames with former Soviet names (Leninakan → Gyumri); Artsakh rules in `server/app/place_overrides.json`. |
| Deployment | Live on Render at **https://ameesi.onrender.com** from `main` (`render.yaml`, `server/Dockerfile`). Free plan: sleeps after ~15 min idle, wakes in up to a minute. |
| App (`app/`) | Version 0.2.0. Birth input (exact-minute time), wheel, list, tap-to-explain sheet (placeholder texts), profiles, onboarding, settings, Start-here tour, share card, logo and icons. 165 Jest tests pass. |
| Content | Supabase project set up; `scripts/import_content.py` ready. Real explanation texts not written or imported yet (placeholders show). |
| Design | Warm "Pomegranate Cosmos" palette in `design/tokens.json`; ornaments in `app/src/components/Ornaments.tsx`; Notion design-system page updated. |
| Logo | Sources in `design/logo/source/`. Rebuild everything with `node app/scripts/split_logo.cjs design/logo` then `node app/scripts/build_logo.mjs` (both need Playwright's Chromium). Logo is all rights reserved, not AGPL (`design/logo/LICENSE.md`). |
| PRD | FR-11 updated 24 Nov 2026: the share card shows the wheel and the three tightest aspects. |

## Open problem: locations don't load on the founder's phone

**Symptom:** in Expo Go the app ends up on the sample chart and place search shows no results.

**Ruled out:**
- The server works. `/health`, `/places?q=Gyumri&lang=en` and Armenian or Russian queries answer correctly.
- There is no `app/.env` on the Mac, so `API_URL` falls back to `https://ameesi.onrender.com` (`app/src/api/client.ts`).
- React Native's `URLSearchParams` builds the query string correctly.

**Cause found (24 Nov 2026):** the Mac's checkout was on the old `engine-exact-time` branch (`c6526a1`), 12 commits behind `main`. That code predates `f5ab630`, which made the app use the live server by default, so `git pull` said "Already up to date" and the phone kept running old code. Fix: `git switch main && git pull`, then restart Expo as in step 2 below. Confirm on the phone, then delete this section. Original notes follow.

**Most likely cause:** the phone is running an old JavaScript bundle, or a different Expo project. That would explain why none of the recent changes appear: no new logo on the first screen, no "Searching…" message, no error line. Check these first:
1. In the project folder (`/Users/ahovakimyan/Desktop/Claude/Ameesi/ameesi`), `git log --oneline -1` should show this commit or later.
2. Stop every running `expo start`. Then in `app/` run `npm install` and `npx expo start -c`. In Expo Go, remove the project from "Recently opened" and scan the new QR code.
3. The first screen should show the gold sun logo. If it doesn't, the phone is still on old code.
4. With current code in development, a failed connection shows its address and error under the place field (`lastNetworkError` in `client.ts`). A screenshot of that line identifies the cause.
5. Open https://ameesi.onrender.com/health in the phone's browser to rule out the phone's own network.

## Decisions to keep (from earlier chats)

- DST-ambiguous times: return no chart until the user picks the offset.
- Karabakh/Artsakh: Armenian place names in every language; country as GeoNames gives it. Armenian time across Artsakh's 1994–2020 extent; Khojaly is shown as "Ivanyan" and Fuzuli as "Varanda". Shahumyan (Goranboy) gets Armenian names on Baku time. The areas captured in 1993 stay on Yerevan time.
- Only approved entries in the user's language are shown (content-spec follows the PRD).
- Golden charts are made-up births entered with the converter.
- The founder asked to work autonomously: commit and push each finished piece to `main`.

## Waiting on the founder

- Fix the phone problem above, then test the full flow on the phone.
- Write and import the explanation content (Supabase); share the Notion review page with reviewers.
- Create a free Expo (EAS) account to build an installable APK. The icon and splash screen only show in an installed build, not in Expo Go.
- Later: Ameesi Plus billing; consider Render's paid Starter plan (~$7 a month) so the server never sleeps.
