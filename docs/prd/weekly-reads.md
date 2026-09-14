# Weekly reads — running log

Newest first. One entry per Search Console reading. Append only: never edit a past entry, never
start a second analysis document. If an entry turns out to be wrong, the correction goes in the
next entry and names the one it corrects.

Source: `data/query-history.json` (query dimension) and `data/indexation-history.json` (page
dimension), written by `query-performance.yml` and `indexation-alarm.yml`. Method:
`michikanji-weekly-read` skill.

---

## 2026-08-24 — meaning lookups do not click, at any position

**Window:** 2026-07-25 → 2026-08-21 · **readings in trend:** 4
**Status:** ACT

**Log started late.** This is the first entry; readings 2026-08-02 through 2026-08-24 went
unlogged. The entry was written on 2026-09-12 against the newest reading present in the local
clone. The 2026-08-31 and 2026-09-07 readings exist on `origin/main` and have not been pulled —
every number below is three weeks old and should be re-checked after a pull.

**Last week's action:** none on record — the log did not exist.

### Numbers

| | This reading | Δ across window |
|---|---|---|
| Impressions (query dim.) | 40,304 | +48.9% |
| Clicks (query dim.) | 1,124 | +8.3% |
| Site CTR | 2.79% | 3.84% → 2.79% |
| Stroke-order pillar clicks | 362 | −23.5% |
| /kanji/* CTR (page dim.) | 0.30% | 0.24% → 0.30% |
| Indexed proxy | 850 / 1,913 | −9 |

```
PILLARS  (top-25 queries only — floors, not site totals)
  pillar               imp  clicks     CTR    pos   Δclicks    Δpos
  -----------------------------------------------------------------
  Stroke order       3,240     362  11.17%   4.02    -23.5%   +0.36
  Brand                591      51   8.63%   2.50    -37.0%   -0.52
  Printables           610      31   5.08%   7.40       new       —
  Level lists          972      20   2.06%   9.36     +0.0%   -0.22
  Head / generic     4,338      81   1.87%   8.11   +170.0%   +0.07
  Meaning lookup     3,008       7   0.23%   8.20   +133.3%   -0.19

  Top-25 clicks 552 of 1124 site clicks (49.11% covered). Δpos: negative is better.

ROMAJI SUBSYSTEM  (progress tracker — never a pass/fail)
  clicks 84 → 67   impressions 2,331 → 7,615   position 10.27 → 8.64
```

### What changed

This entry exists because of a targeted investigation into the `/kanji/*` CTR, not a routine read,
so it carries one finding beyond the table.

**Classifying the top-25 by query intent, the same way, across all five readings:**

| reading | resource | meaning lookup | head/generic | brand |
|---|---|---|---|---|
| 2026-08-02 | 9.15% @ 5.20 | 0.13% @ 8.19 | 1.53% @ 7.99 | 13.23% @ 3.05 |
| 2026-08-03 | 9.40% @ 5.10 | 0.12% @ 8.39 | 1.55% @ 7.91 | 13.85% @ 3.02 |
| 2026-08-10 | 8.95% @ 5.65 | 0.13% @ 8.50 | 1.54% @ 7.92 | 14.72% @ 2.76 |
| 2026-08-17 | 7.81% @ 6.13 | 0.09% @ 8.12 | 1.51% @ 7.88 | 11.28% @ 2.65 |
| 2026-08-24 | 8.10% @ 6.00 | 0.23% @ 8.20 | 1.76% @ 7.75 | 8.63% @ 2.50 |

Head/generic and meaning-lookup sit at the **same position band** (7.75–8.50) and differ by a factor
of ten on CTR, every reading. At the 2026-08-24 reading the Wilson intervals do not overlap:
lookup [0.11%, 0.48%], head [1.40%, 2.23%]. Position is therefore not what separates them — intent
is. Within the lookup class itself there is no visible position effect across 5.8 → 9.9
(`migi kanji` 0.45% @ 5.84; `day kanji` 0.00% @ 7.04; `samurai kanji` 0.00% @ 9.93).

The romaji subsystem is doing exactly what it was built to do on the impression side (2,312 →
7,615) and nothing at all on the click side. That is not a failure of the implementation; it is
the query class it unlocked being a class that does not click.

Two SERP checks (`pws=0`, US/EN, 2026-09-12) support the same reading and correct one standing
belief:

- For `day kanji` MichiKanji is the **4th organic result** with an accurate, well-formed snippet
  Google is not rewriting, above WaniKani's and nihongoichiban's. It took 0 clicks from 207
  impressions (95% upper bound 1.82%). An image pack and a People-also-ask block sit above it.
- For `michi kanji` the result that ranks is still the **homepage**, not `/kanji/道`, which does not
  appear in the top 20. The motivating failure recorded in `scripts/check-query-performance.ts` is
  unfixed six weeks after the romaji shipped, and the brand pillar's 8.63% is therefore a brand
  match, not evidence that a detail page converts at position 2.5.

### Guardrails

- `[HIGH] STROKE_ORDER_EROSION` — cluster clicks 473 → 362 (−23.5%), position 3.66 → 4.02. Largest
  click pillar, still falling. Untouched by this investigation and still the biggest
  revenue-at-risk item.
- `[HIGH] DETAIL_PAGE_INTENT` — 0.30% at position 9.68. Confirmed, but the guardrail's stated cause
  ("the pages do not answer above the fold") is not what the evidence shows. `/kanji/日` answers
  fully above the fold today, and still takes no clicks. The cause is that Google answers first.
- `[MED ] CTR_SLIDE` — three readings running. Fully explained by impression mix shifting toward
  the lookup class; the converting classes held flat.
- `[MED ] WATCHED_QUERY_STALL` — `hi kanji` 132 impressions, 0 clicks, position 8.35.

### Action

Stop spending on the meaning-lookup class and get the query×page join out of Search Console, so
the next move is chosen on which characters rank 4–6 on **resource-intent** phrasings rather than
on guesswork. Blocked today: `aristides.nakos@gmail.com` is not a user on the
`sc-domain:michikanji.com` property.

Changes if — a meaning-lookup query landing on a detail page is ever seen above 1.5% CTR, or a
resource-intent phrasing at a character level (`how to write 日`, `日 practice sheet`) shows up in
the query×page data converting no better than the lookup class. Either result kills the split this
entry is built on.

---
