# Golden charts

Reference charts with known correct results. The engine must match each within 1 arcminute (0.0167°).
Two tests run per row: positions (`test_golden_positions`) and the UTC offset astro.com used against
our time zone data (`test_golden_utc_offset_matches_tzdata`, which flags disputed historical offsets).

## Use made-up births

These charts test calculation accuracy only, so they don't need to be real people. Invented births
avoid consent and privacy questions in this public repository. (Real births need the person's consent,
or must be public figures rated AA on Astro-Databank.)

## The first 10

| id | Place | Local date and time | What it tests |
| --- | --- | --- | --- |
| yerevan-1975 | Yerevan | 1975-01-15 08:20 | Soviet winter, UTC+4 |
| gyumri-1985 | Gyumri (Leninakan) | 1985-07-10 21:45 | Soviet summer time, UTC+5 |
| vanadzor-1988 | Vanadzor (Kirovakan) | 1988-11-03 05:10 | Soviet era |
| yerevan-1984-switch | Yerevan | 1984-09-30 01:30 | Night of a clock change (still UTC+5) |
| yerevan-1992 | Yerevan | 1992-01-20 14:00 | Early independence, UTC+3 (often disputed) |
| yerevan-1996 | Yerevan | 1996-07-15 12:00 | The year without summer time, UTC+4 |
| yerevan-2012 | Yerevan | 2012-06-01 10:00 | After summer time ended |
| tromso-1990 | Tromsø, Norway | 1990-12-21 12:00 | Above 66°: Placidus fails; Ascendant and MC still compared |
| buenos-aires-1970 | Buenos Aires | 1970-05-05 03:15 | Southern hemisphere |
| moscow-2000-leap | Moscow | 2000-02-29 18:40 | Leap day |

Later: more Soviet-era Armenian births, Stepanakert in 1993 and 2013 (the periods when Baku and
Yerevan clocks differed; we use Yerevan time there), and dates around every Armenian clock change.

## How to add a chart

1. On astro.com, open "Extended chart selection" and enter the birth. Settings: **tropical**,
   **Placidus** houses, **true node** (not mean). Use a guest name such as "Golden 1".
2. Open the chart's position table ("Additional tables" or the list beside the drawing) and copy it,
   including the line with "Univ.Time" and the place's coordinates (for example "40n11, 44e31").
3. Run the converter and paste the table, then press Ctrl-D:

   ```
   cd server && source .venv/bin/activate
   python scripts/golden_add.py --id yerevan-1975 --label "Yerevan, Soviet winter" \
       --date 1975-01-15 --time 08:20 --place Yerevan --tz Asia/Yerevan
   ```

   It shows astro.com's positions next to ours with the difference in arcminutes. If the paste has no
   coordinates or Univ.Time, add `--lat 40.1833 --lon 44.5167` and `--utc-offset 240`.
4. If the numbers look right, run the same command with `--write` to append the row, then `pytest`.
5. If a body is more than 1′ off, don't change the tolerance. Check the astro.com settings
   (true node, Placidus) and the UTC offset first, then tell Claude which chart and body differ.
