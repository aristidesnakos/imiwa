# Kanji parts pilot — "same part, same sound"

**Status:** decided 2026-10-01, to be revisited and started **Tuesday 2026-10-13**. Nothing is built.
A scheduled task (`kanji-parts-pilot-gate`) runs the Oct 13 gate and spike and reports; it builds nothing.

## Decision in one paragraph

Do not build a mnemonic app or a WaniKani competitor. Add one small, factual, server-rendered
feature: a hub page listing the most frequent kanji **parts** grouped into families, plus a short
"built from" block on a pilot set of kanji pages. The lead idea is **phonetic families** — kanji that
share a part *and* a reading (青 → せい in 清 晴 情 静 請 精) — because our data already carries the
onyomi, so the claim is derivable and checkable by a validator rather than authored by hand.

## Why (what the r/LearnJapanese thread settled)

Source: "Sorting kanji to learn by parts", r/LearnJapanese, ~2026-09-18, ~900 upvotes, ~100 comments.
Read in full on 2026-10-01.

- **The space is saturated.** jpdb (free, full composition tree), Kanji Study, Midori, thekanjimap.com,
  WaniKani, RTK and KanjiDamage all decompose kanji. "Basically every kanji database does this." We
  cannot win on decomposition; we can only add something derived, free and indexable at the N5 level.
- **Parts help beginners with shape, not meaning.** Defenders use parts to tell similar kanji apart and
  to chunk memory; nobody credible says they let you guess meaning (estimates: ~10% of kanji). Our N5
  audience is the group that benefits.
- **Only the top ~10–50 parts matter.** Most parts occur in one or two kanji; ~220 is the most any
  commenter learned. A page per part would be thin, so there are none in this pilot.
- **Folk etymology is a credibility landmine.** The post's 青 = "king with a hat + moon" drew about ten
  corrections: 青 is 生 + 丹, and it is the *sound* part of 清/晴/情. Whatever we publish must not
  present a memory story as history.
- **Sound parts are the underrated half.** Several commenters distinguish parts that carry meaning from
  parts that carry sound (形声). That is the part we can verify from our own data.
- **Pick reusable composites.** WaniKani's granular splits (3–5 pieces) are criticised against jpdb's
  reusable composites (2 pieces). Prefer the latter.

## What the data spike on 2026-10-01 found

Ran KanjiVG over the N5 list (80 of 82 kanji; 北 and 校 returned a jsDelivr 403, retry later).

- KanjiVG decomposes by stroke geometry. 青 → `龶` + `月`, 情 → `忄` + `青`(`龶` `月`). `龶` is the "king
  with a hat" and is not a learner-facing part.
- The raw output is full of meaningless pieces: `丿 丨 丶 乙 𠂉 一`. **KanjiVG output cannot be shown
  as-is. It needs a curated allowlist of parts**, or a different source (KRADFILE, below).
- Within N5 only about ten recurring parts are worth teaching: 日 口 木 亻 言 土 門 囗 彳 夕. N5 alone
  is too small for a hub; the hub has to span all five levels.
- KanjiVG does give a hierarchy (飲 → 飠 left + 欠 right), which KRADFILE does not.

## Gate on Oct 13 — do not start the build unless this passes

1. `git fetch`; read the last entries of `data/query-history.json` and `data/indexation-history.json`
   (Monday Oct 12 readings exist by then). The organic push of 2026-09-28/29 is being judged on the
   same window, and this pilot would confound it, so the gate asks: **did the requested pages stay
   indexed, and is the image-search/clicks baseline holding or rising?**
2. If requested pages fell back to "Crawled - currently not indexed", **stop**. The fix is page quality
   on existing kanji pages, not new features; defer this pilot and say so.
3. The owner reads Search Console (account ari@languagestutor.app) and confirms; the weekly scripts
   read Web only, so Image numbers must come from GSC by hand.

## Phase 1 — data spike (read-only, in a worktree, no repo commit needed)

Goal: decide whether there are enough strong families to justify a hub page.

1. **Source choice.** Compare KanjiVG against KRADFILE/RADKFILE (EDRDG, the same body as KANJIDIC,
   which `app/tos/page.tsx` already credits) on 青, 情, 清, 晴, 校, 語, 飲 and ~20 more. Check the
   KRADFILE licence terms and the exact attribution wording **before** using it; do not assume.
   Read `docs/prd/content-source-licence-investigation.md` first. Trace data to its original author and
   exclude grey-licence sources (see memory `content-provenance-rule`). Do not copy WaniKani, RTK,
   KanjiDamage or jpdb mnemonic text — those are proprietary.
2. **Part allowlist.** Build the curated list of teachable parts (drop stroke fragments), keeping
   reusable composites and dropping ones that only appear once.
3. **Compute families across N5–N1.** For each allowlisted part, list the kanji containing it
   (resolving each character to its lowest level, as everywhere else in this repo). For every member,
   derive its onyomi through `lib/romaji/readings.ts` (never from the raw reading fields) and find the
   reading the family shares.
4. **Classify** each part as *sound* (members share an onyomi), *meaning* (氵 water, 忄 heart, 言
   speech: members share a semantic field), or neither.

**Proposed go/no-go thresholds** (defaults to confirm or change on Oct 13):

- Go if there are **at least 10 sound families with 3 or more members**, each sharing an onyomi in at
  least **75%** of members, across N5–N1 combined.
- Otherwise the hub is not worth a URL. Fall back to the "built from" block on a few pages with no hub,
  or drop the pilot.

Deliverable: a table in `docs/3rdVersion/` or the scratchpad listing every candidate family, its
members, the shared reading, the agreement rate and the proposed class. The owner reviews it — he is
the Japanese reviewer, and review capacity, not code, is the binding constraint.

## Phase 2 — build (only if Phase 1 clears the threshold)

### Data
- `lib/parts/families.ts`: a typed, committed, hand-curated file (the output of Phase 1, reviewed), not
  runtime-derived. Types live in `lib/parts/types.ts` and are imported with `import type` only, so no
  kanji data array reaches a client bundle (the `/kanji` Lighthouse byte budget is an `error`).
- **Static imports, not `fs`** — same rule as `lib/sentences/published.ts` and `lib/stories/index.ts`.
- Relative imports in anything `scripts/` will run under tsx.

### Hub page `/kanji/parts`
- `app/kanji/parts/page.tsx`, a static route beside `[character]` like `/kanji/n5` and `/kanji/n5/quiz`
  (a static segment can; a dynamic `[level]` cannot).
- Server-rendered, **no client JavaScript**. Parts grouped as "same part, same sound" and "same meaning
  part". Each member links to its kanji page with `prefetch={false}` (many links, heavy routes).
- Heading phrased as something a person would search, per the page conventions. Palette tokens only
  (`pnpm validate:palette`); fill/ink pairs for coloured text.
- Sitemap: add one entry to `STATIC_PAGES` in `app/sitemap.xml/route.ts` with a real `lastmod`.
  Priority ~0.8. **That is the only sitemap change in this pilot: +1 URL.**
- JSON-LD: a `CollectionPage`/`ItemList` of kanji pages, canonical `www` host via `lib/seo/site.ts`;
  extend `scripts/validate-schema.ts`, and assert that every ItemList entry is a prerendered kanji page.
- Lighthouse: add `/kanji/parts` to `lighthouserc.js` so it matches exactly one `assertMatrix` entry;
  baseline on measured local runs, not paper numbers.

### "Built from" block on pilot kanji pages (≤15 kanji, chosen from the families)
- A server component with no client boundary, using `SECTION_BAND` / `SECTION_HEADING` from
  `components/kanji/section.ts`; renders `null` for every non-pilot kanji (no heading, no empty state),
  like `ExampleSentencesSection`.
- Content: the parts, the sibling kanji sharing the sound, and the shared reading. **No mnemonic story in
  the pilot.** If stories are added later they are labelled "a memory aid, not the history of the
  character", and rendered structurally separate from licensed data (our commentary must not become
  Adapted Material).
- `/kanji/.+` is gated at 440 kB total transfer against a 363 kB baseline; the block is text, so it
  must stay inside that.
- **Do not bump `KANJI_CONTENT_LAST_MODIFIED`** — only a handful of pages change, and it is global.

### Validator: `pnpm validate:parts`
Add it, and run it in the kanji-data CI job. It asserts:
- every part is on the allowlist and no stroke fragment (丿 丨 丶 乙 𠂉 龶…) is shown;
- every family member exists in the level lists and resolves to its lowest level;
- each family's claimed shared reading is recomputed from the data through `lib/romaji/readings.ts` and
  meets the agreement threshold, so the page cannot claim a sound relationship the data denies;
- every pilot kanji has a hub entry and every hub entry links to a prerendered page;
- any copy that tells a story carries the memory-aid label, and no copy claims an etymology.

### Licence and credits
- KanjiVG credit already travels site-wide. If KRADFILE/RADKFILE is used, add it to the EDRDG paragraph
  in `app/tos/page.tsx` and re-read `app/privacy-policy/page.tsx`'s claim list.
- Update `CLAUDE.md` with the new subsystem and the validator in the same change.

## Content rules

- A part is described by what the data shows: "contains 青; read せい like 青". Never "originally
  meant…" without a cited source.
- Distinguish sound parts from meaning parts, and say so on the page.
- The owner reviews every reading and every sentence of copy before it ships.

## Measurement

- Request indexing for `/kanji/parts` from the owner's daily queue (~10/day).
- Judge **four weeks after ship**, from the Monday readings: is the hub indexed, does it have impressions
  for part-based queries ("kanji with the same part", "kanji that sound the same", the part names), and
  do the pilot kanji pages move versus unchanged neighbours. `check-query-performance` already classifies
  queries against our own search keys; confirm it will capture these before relying on it.
- DataFast: the hub's pageviews and clicks into kanji pages, using the `is:Google` referrer filter.
- **Kill criteria:** hub not indexed after four weeks despite a request, or no impressions after that
  window → fold the content into the existing pages or remove it. Do not add per-part pages to rescue it.

## Out of scope

A study app, SRS or flashcards; per-part or per-kanji generated pages; frequency-by-manga tooling (the
thread's original idea); stroke-order diagram changes; any change to the kanji search; a separate
domain or product.

## Open decisions for Oct 13

1. Go/no-go thresholds (10 families, 75% agreement) — confirm or change.
2. Source: KanjiVG with a curated allowlist, or KRADFILE, or both.
3. Hub scope: all five levels, or N5+N4 only (N3–N1 pages are mostly unindexed, so the links add little
   until those pages are).
4. Pilot kanji set (≤15) and who reviews: the owner.
5. Whether to ship before or after the first N4 list-page decision (`level-pages-and-zero-click-review.md` §3).

## References

- `docs/3rdVersion/level-pages-and-zero-click-review.md` — level-page strategy and the N4–N1 sourcing question.
- `docs/prd/content-source-licence-investigation.md` — read before adding any content source.
- `lib/kanjivg.ts`, `lib/romaji/readings.ts`, `components/kanji/section.ts`, `app/sitemap.xml/route.ts`,
  `scripts/validate-schema.ts`, `lighthouserc.js`.
