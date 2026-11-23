# Content loading spec

Interpretation texts are private. They live in the `ameesi-content` repository and in a Supabase table; this public repository only contains the code that loads them.

## Source

Supabase project `ameesi` (eu-west-1), table `public.entries` (schema in the private repo's `schema.sql`,
applied as migration `create_entries`). Besides the columns below it has `reviewer`, `reviewed_at`,
`source_notes` and `updated_at`; `version` increases automatically when `text` or `status` changes.
Anonymous sign-in is enabled for the app.

| Column | Meaning |
| --- | --- |
| `id` | Entry id, e.g. `sign.sun.leo`, `house.mars.07`, `aspect.sun.moon.square` |
| `lang` | `hy`, `en` or `ru` |
| `text` | The explanation |
| `status` | Only `approved` rows are readable by the app (row-level security) |
| `version` | Increases when the text changes |

The app uses the Supabase URL and **publishable** key (public by design), from `app/.env`. The secret
(service) key is never in the app or this repository; only the content pipeline uses it. Row-level security
lets the app read approved rows only, and the app has no insert, update or delete rights.

## Behaviour

1. On first launch, after the language is chosen, download all approved entries for that language (`select id, text, version from entries where lang = :lang`). About 600 rows, under 200 KB.
2. Store them on the device (SQLite or MMKV) so explanations work offline.
3. On later launches, at most once a day, fetch rows with a newer `version` and update the cache.
4. When the language changes, download that language.
5. Show only entries approved in the user's language (PRD FR-06). If an element has no approved entry in that language, show its facts and astrological basis without an explanation; never fall back to another language and never show drafts. At launch every element must have an approved entry in Armenian, English and Russian (PRD gate G2).

## Mapping chart data to entry ids

| Chart element | Entry id |
| --- | --- |
| Planet in sign | `sign.<planet>.<sign>` |
| Planet in house | `house.<planet>.<NN>` (two digits) |
| Ascendant / Midheaven in sign | `angle.asc.<sign>`, `angle.mc.<sign>` |
| North Node in sign / house | `node.sign.<sign>`, `node.house.<NN>` |
| Chiron in sign / house | `chiron.sign.<sign>`, `chiron.house.<NN>` |
| Aspect | `aspect.<a>.<b>.<type>` with planets in the order Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto |
| Retrograde | `retro.<planet>` |
| Element / modality | `element.<fire|earth|air|water>`, `modality.<cardinal|fixed|mutable>` |
| Stellium | `stellium.sign.<sign>`, `stellium.house.<NN>` |
| Basics (what a planet, sign, house, aspect or angle is) | `basic.planet.<planet>`, `basic.sign.<sign>`, `basic.house.<NN>`, `basic.aspect.<type>`, `basic.angle.<ascendant|midheaven|descendant|ic>` |

## Tests

Use a small fake set of entries (for example "Test text for sign.sun.leo") in fixtures. Never copy real texts into tests.

## Importing entries

`server/scripts/import_content.py` checks entries and loads them into Supabase. It never stores texts in this
repository; it reads a CSV or JSON export of the private workbook.

1. Start from the template: `python scripts/import_content.py --template blank.csv` gives every entry in the
   content plan (`content/entry-ids.json`, 608 per language) in hy, en and ru, with a plain-English `element`
   column. Columns: `id, element, lang, text, status, reviewer, reviewed_at, source_notes`.
2. Fill in texts and statuses in the workbook and export it as CSV. Rows with empty text are skipped.
3. Check and preview (writes nothing): `python scripts/import_content.py entries.csv`. It refuses unknown ids,
   duplicates, empty or placeholder texts, and approved entries without a reviewer and review date; it warns
   about "will", "always" and "destined" in English approved texts; it reports approved coverage per language.
4. With `SUPABASE_URL` and `SUPABASE_SECRET_KEY` set in your shell (never in a file in this repository), the
   preview also compares with Supabase. Add `--apply` to write new and changed entries. `--prune` also deletes
   entries that aren't in the file; more than 20 deletions also need `--confirm-prune`.

The app checks that every id it can show is in `content/entry-ids.json`; regenerate that file with
`--write-ids` if the content plan changes.
