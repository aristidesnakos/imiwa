# JLPT level pages and the zero-click problem — where search value still is

_Researched 2026-09-24, against `9326327`, using the Search Console readings committed through
2026-09-21 (latest window 2026-08-22 → 2026-09-18)._

Two questions were asked. The narrow one: when someone clicks a JLPT level on `/kanji`, should they
go to a dedicated page for that level instead of a filtered view of the all-kanji page? The broad
one: now that AI answers resolve many searches on the results page, which topics still bring people
to the site, and how does it add value in a way that lasts?

- **Level pages: yes, starting with N5.** Level-list queries are one of the few intents here where
  impressions still turn into clicks, and no page is built to rank for them. Giving each list its
  own page exposes two data problems (§3): about 310 standard kanji have no page at all, and the
  level lists trace back to a competitor's copyrighted PDFs. N5 can ship now. N2 and N1 should wait
  for the fix.
- **Lasting value is in things people have to *use*** (stroke order, printables, practice, complete
  lists, the Tan stories) **rather than facts they can *read*** in an AI answer. The ~1,900
  character pages carry 85% of impressions and earn 11% of clicks.

---

## 1. The data: the site is growing, and its clicks are concentrated

### 1.1 Clicks grew, and impressions grew faster

| 28-day window ending | Site impressions | Site clicks | `/kanji/…` impressions | `/kanji/…` clicks | Rest impressions | Rest clicks |
|---|---|---|---|---|---|---|
| 2026-07-30 | 66,727 | 1,771 | 38,670 | 97 | 28,057 | 1,674 |
| 2026-09-18 | 432,177 | 2,680 | 367,140 | 293 | 65,037 | 2,387 |

Site totals come from `data/indexation-history.json` and the `/kanji/…` aggregate is `kanjiPages` in
`data/query-history.json`. Both are page-dimension rows, and "rest" is the difference.

Clicks rose 51%. Impressions rose 6.5×, almost all of it on the character pages. The rise started in
the window ending 2026-08-21 and accelerated from the one ending 2026-09-04. CTR fell from 2.7% to
0.6% as a result, but no clicks were lost.

Google reports AI Overview and AI Mode appearances in the Performance report, under the Web search
type. It also says both features "may use a 'query fan-out' technique — issuing multiple related
searches". That fits the machine-shaped queries now at the top of the list:

| Query | Impressions | Clicks | Position |
|---|---|---|---|
| `父、 stroke order` | 21,541 | 0 | 7.4 |
| `父` | 5,128 | 0 | 9.8 |
| `difference in meaning of 漏, 泄, 洩 kanji` | 328 (545 on 08-02) | 0 | 9.9 |

The title template (`lib/seo/kanji-optimization.ts:101`) cannot produce `父、`, so that query comes
from outside the site, and ~770 impressions a day for one exact string is not a person. Whatever the
mechanism, **CTR is no longer a usable health metric for this site.** Track clicks instead.

### 1.2 Where the clicks come from, by intent

The table below covers every query that has appeared in any weekly top-25 list (51 queries over nine
readings). Each query is taken at its most recent reading and classified by intent:

| Intent | Queries | Impressions | Clicks | CTR | Avg position |
|---|---|---|---|---|---|
| Brand (`michi kanji`) | 1 | 641 | 65 | 10.1% | 2.4 |
| Stroke order and practice (`kanji stroke order`, `kanji practice sheets`) | 11 | 6,823 | 446 | 6.5% | 5.6 |
| Level lists (`n5 kanji`, `kanji list`, `kanji chart`) | 6 | 3,044 | 54 | 1.8% | 8.7 |
| Generic head terms (`kanji`, `japanese kanji`, `kanji dictionary`) | 6 | 18,709 | 190 | 1.0% | 8.3 |
| Character lookups (`mizu kanji`, `time kanji`, `victory in japanese`) | 24 | 9,664 | 11 | 0.1% | 8.1 |
| Machine-shaped (table above) | 3 | 26,997 | 0 | 0% | 7.9 |

Classification rules, applied in order:

1. A `、`, a bare `父`, or "difference in meaning" → machine-shaped.
2. `stroke|practice|sheet` → stroke order and practice.
3. `n1`–`n5`, `jlpt`, `list` or `chart` → level lists.
4. `michi kanji` or `michikanji` → brand.
5. The bare head terms, and anything containing "dictionary" → generic.
6. Everything else → character lookup.

This is a sample of the heaviest queries, so read it as directional.

- **Character lookups are answered on the results page.** They get a sixteenth of the level-list CTR
  at a slightly *better* position. This confirms the call in `docs/prd/weekly-reads.md:96` and `:103`
  ("Google answers first", "Stop spending on the meaning-lookup class"), now with two more weeks of
  data.
- **Level-list queries are held back by ranking, not by AI answers.** People click them when they
  can see them.
- **Stroke order does most of the work.** `kanji stroke order` alone has 2,279 impressions, 307
  clicks and position 3.3, the site's single largest source of clicks.

### 1.3 The level queries

| Query | 2026-08-02 reading | Latest appearance in the top 25 |
|---|---|---|
| `n5 kanji` | 652 imp / 13 clicks / pos 9.3 | 1,110 / 23 / 8.8 (09-21) |
| `kanji n5` | 224 / 3 / 9.6 | 462 / 10 / 8.9 (09-21) |
| `n5 kanji list` | 199 / 4 / 10.9 | 273 / 7 / 9.5 (08-31) |
| `n4 kanji` | 124 / 1 / 8.0 | not in the top 25 since |

Demand is rising, and the site sits at the bottom of page one with no page built for the query.
`docs/prd/strategy-forecast.md:155` sized an N5 cluster push at 3–5 days of work for +30–80 clicks a
month. These rows are the baseline to measure a level page against.

---

## 2. Level pages: yes, N5 first

### 2.1 How level browsing works today

- **The tabs change no URL.** They are component state (`useState<JLPTLevel>('ALL')` at
  `app/kanji/KanjiSearchClient.tsx:149`), so selecting N5 creates nothing to index, link, share or
  restore with Back.
- **One title covers everything.** `/kanji` aims a single title at every level at once, plus
  "dictionary" and "stroke order" (`app/kanji/page.tsx:39`).
- **The crawlable index is collapsed.** Below the grid, an index grouped by level sits inside a
  closed `<details>`, with one anchor per level (`app/kanji/page.tsx:77`, `:86`).
- **The homepage links to those anchors.** Both the "Start with N5 basics" button and the five level
  cards point there (`app/page.tsx:106`, `:182`).

Here is what a visitor gets, as observed on production on 2026-09-24 at a desktop viewport. Clicking
the N5 card lands on `/kanji#level-N5` with the **All** tab active and the `<details>` still closed.
The page is scrolled to 1,114px of 4,658, mid-grid, where N5 and N4 cards run together. The anchor
itself sits at 4,186px, inside the closed element. The level the visitor chose is lost.

On the character pages, the breadcrumb runs Home › Kanji Dictionary › 水
(`app/kanji/[character]/page.tsx:300`) and the JLPT badge is plain text (`:392`). Neither has a level
page to point at.

### 2.2 Why a page, not a better filter

- **It targets an intent that still gets clicks** (§1.2), for queries where the site ranks around 9
  with no page built for them (§1.3).
- **List intent resists AI answers.** An AI Overview can say "N5 has about 80 kanji", but it cannot
  be the list someone studies from, prints and ticks off. Seer Interactive found AI Overviews on 36%
  of informational queries, 8% of commercial and 5% of transactional.
- **It fixes the homepage path** described in §2.1, which is broken today whatever happens with SEO.
- **It gives ~1,900 pages a parent.** Each character page's badge and breadcrumb (Home › Kanji ›
  JLPT N5 › 水) can link to its level. Today those internal links have nowhere to go.
- **It is lighter than `/kanji`.** A server-rendered list skips the client grid on the site's
  worst-performing route (P3-8, `docs/3rdVersion/performance-and-seo-roadmap.md:624`).

### 2.3 What ranking level pages ship

| | JLPTsensei N5 | kanjilibrary.com N5 | What MichiKanji can ship |
|---|---|---|---|
| URL | `/jlpt-n5-kanji-list/` | `/kanji/n5/` | `/kanji/n5` |
| Count | 80 | 79 | 82 today |
| Per kanji | kanji, on, kun, meaning, link | kanji, meaning, link | kanji, meaning, readings with romaji, link to stroke order |
| Printable | PDF, members only | none | free sheets with no signup (the generator exists) |
| Practice | Patreon e-book, flashcards | quiz link | a per-level quiz or review (new) |
| Reading | none | none | the N5-only Tan stories |
| Explains its list | no | no | can (§3.2) |

In results for "jlpt n5 kanji list", the listed N5 sets ran to 79, 80, 100, "100+" and 112 kanji.
The JLPT has published no official lists since 2010, and none of these pages explains the spread.
These results came from a web search index, not from Google's own ranking.

### 2.4 Shape

- **Routes.** Use five static folders, `app/kanji/n5/page.tsx` through `n1`, each importing exactly
  one level list, which is the pattern the kanji-sheets routes already follow. Static segments take
  precedence over `[character]`, as `/kanji/review` and `/kanji/progress` already do. A dynamic
  `[level]` segment cannot sit beside `[character]`.
- **Rendering.** Make them server components with no data arrays in the client bundle, and render
  readings through `lib/romaji/readings.ts`, never from raw fields. Add the pages to
  `lighthouserc.js`; N1's 1,007 rows are the case to budget for.
- **Content, in order:**
  1. The list: kanji, meaning, readings with romaji, and a link. Order it as a learning sequence
     rather than bare frequency.
  2. The level's free printable.
  3. Practice for that level.
  4. For N5 only: the Tan stories and the workbook.
  5. Newsletter signup.
  6. A short note on how the list was built (§3.2).
- **Wiring.**
  - The `/kanji` tabs become links to the level pages.
  - The homepage button and cards point at the level pages.
  - The character-page badge links to its level, and the breadcrumb gains a level step.
  - Add five `STATIC_PAGES` entries in `app/sitemap.xml/route.ts:15`.
  - `/kanji` stays as the all-levels hub and search.
- **Structured data.** Add BreadcrumbList. Skip FAQ content aimed at AI answers (§4.3).
- **The sheets pages keep their own intent.** `/free-resources/kanji-sheets/n5-sheets` targets
  worksheet searches, so keep the titles distinct and link both ways.

**How this fits with printables.** `strategy-forecast.md:153` sizes "lean into printables" at +100–200
clicks a month, above the N5 push at +30–80. Ship the N5 page first anyway:

- It is smaller: 3–5 days against 1–2 weeks.
- It fixes a broken path today.
- It gives the printables work a level structure to hang on.

Then go straight to printables (§4.2).

---

## 3. Two problems to settle before N3–N1 get pages

### 3.1 About 310 standard kanji have no page

The source lists the constants were built from (§3.2) were kept in `docs/kanji-list/` until they were
removed on 2026-09-24. Compared with them:

| Level | Source list | Site list | Source kanji in no site list |
|---|---|---|---|
| N5 | 80 | 82 | 0 |
| N4 | 167 | 171 | 2: 住, 発 |
| N3 | 370 | 385 | 4: 放, 約, 経, 遠 |
| N2 | 374 | 261 | 216 |
| N1 | 1,207 | 1,007 | 93 |

Source counts are distinct CJK characters in each PDF's text, so a stray header character can move a
figure by one or two. On production, `/kanji/水` returns 200, while `/kanji/個`, `億`, `保`, `倍`,
`住`, `発`, `鏡` and `障` all return 404.

N2 is also a different set, not just a smaller one. 104 of the source's N1 kanji sit in the site's
N2, and only 140 of the site's 261 N2 kanji are in the source's N2.

How it happened, from `git log` on the constants:

- `n2-kanji.ts` arrived with 341 distinct characters in `61958c9` (2025-10-20), already short of the
  source. `f8a3a20` ("fix: deduplicate kanji data…", 2025-10-21) then removed 92. About a dozen
  single-character additions since have brought it to 261.
- `n1-kanji.ts` arrived with 1,007 characters in `33962e4` (2025-10-23, "complete N1 kanji
  integration with 1007 unique characters"), against a source of about 1,207.

`pnpm validate:kanji-data` could not have caught this. It checks that the data is consistent (no
duplicates, one code point per entry, readings present), not that it is complete.

For level pages, this means an "N2 kanji list (261)" next to competitors' ~370 would look broken,
because it is. N5 is complete. N4 and N3 need six characters added.

### 3.2 Where the level lists came from

- **The N5–N2 PDFs were JLPTsensei's.** They were the owner's personal study material, never meant to
  be published, and were removed from the repo on 2026-09-24. Each was titled "N5 Kanji List -
  JLPTsensei.com" (and so on), and every page carried "© 2023 by JLPTsensei.com". They had been
  committed on 2025-10-20 together with the N2 list. The N5–N3 PDFs held 617 characters between
  them, and the site's lists contain all but six.
- **The N1 PDF was unattributed.** `JLPTN1-Kanji-A4-bw.pdf`, removed with the others, carried no
  attribution, and its origin is unknown.
- **The method doc cites the same sources.** It lists jlptsensei.com and tanos.co.uk among its
  "reliable sources" (`docs/learnings/systematic-kanji-completion-approach.md:28-29`).
- **The provenance rule was never applied to the kanji lists.** It was recorded on 2026-07-31
  (`1f898de`) for the sentence pipeline, and it excludes tanos.co.uk and everything derived from it
  as a source of level data. Its principle is that a source with no explicit licence grant is excluded
  (`docs/prd/example-sentences-system.md:372`). It was never applied back to
  `lib/constants/n*-kanji.ts`.
- **The lists are already public.** They appear in the badge on every character page, in the
  `/kanji` index and in that page's meta description. A level page does not create the exposure, but
  it does make the list the point of the page.

One candidate clean basis is KANJIDIC2, which the licence investigation already counts under the
EDRDG grant (`docs/prd/content-source-licence-investigation.md:53`). For each character it carries
the pre-2010 JLPT level (1–4), the school grade and a frequency rank. Mapping four old levels onto
N5–N1 needs a stated rule, because old level 2 spans today's N3 and N2, and the result needs review.
Nobody has measured how closely it would land on today's lists. Publishing the rule would also give
the level pages something no competitor offers: an honest answer to why N5 lists run from 79 to 112
kanji.

A related obligation is already owed. EDRDG's licence requires its acknowledgement "on each screen
display". The comment at `app/layout.tsx:126-133` says the footer "will carry" it, but nothing
renders it today, even though the 55 KANJIDIC-imported reading entries are live. Any level work based
on KANJIDIC2 makes the acknowledgement unavoidable.

This is the owner's decision. Nothing here is legal advice.

---

## 4. Adding value sustainably

### 4.1 The principle

Build things people have to *use*, not facts they can *read*. The evidence points the same way from
three directions:

- **On this site** (§1.2): lookups convert at 0.1%, level lists 1.8%, stroke order and practice
  6.5%, brand 10.1%.
- **Seer Interactive** (2026-04-24; 53 brands, 2.43 billion impressions):
  - Organic CTR on queries with an AI Overview fell from 3.19% (Jan 2025) to 1.31% (Dec 2025), then
    recovered to 2.36% (Feb 2026). Queries without one ran at 3.82%.
  - AI Overviews appear on 95.4% of comparison queries, 85.9% of question-format queries, 36% of
    informational, 8% of commercial and 5% of transactional queries.
  - On informational queries, pages cited inside an Overview earned 2.07% CTR, against 0.94% for
    pages that were not cited.
- **Pew Research** (2025-07-22; browsing data from 900 US adults, March 2025): people clicked a
  result on 8% of visits that showed an AI summary and on 15% of visits without one. They clicked a
  source cited inside the summary on 1%.

### 4.2 In order

| # | Move | Why | Notes |
|---|---|---|---|
| 1 | Unblock the newsletter | It is the one channel search can't take away, and it cannot send while `postalAddress` is `null` (`config.ts:68`). | The procedure is `docs/runbooks/newsletter.md`. |
| 2 | N5 level page | §2. | 3–5 days (`strategy-forecast.md:155`). |
| 3 | Printables as landing pages | `kanji practice sheets`: 358 imp / 17 clicks / pos 6.1. `kanji practice`: 672 / 25 / 7.6. Downloads are transactional intent, where AI Overviews appear least (5%, Seer). JLPTsensei also puts its PDFs behind a membership. | Already recommended in `strategy-forecast.md:172`, sized at +100–200 clicks/mo. |
| 4 | Practice per level | Stroke order is the top click source. A level quiz or writing drill can't be answered in a snippet. | `/kanji/review` only reviews what a visitor has marked learned. There is no per-level entry point. |
| 5 | The Travels of Tan | It is the only content nobody else has, and the reason to come back and to subscribe. | A brand and product play, not a traffic play (`strategy-forecast.md:129`). |
| 6 | Complete and re-source the lists | See §3. The N4–N1 level pages come after this. | Needs the owner's review. |

### 4.3 What to stop

- **Optimising for character-lookup queries.** This was already decided (`weekly-reads.md:103`), and
  the newer data only strengthens it. The character pages remain the site's backbone and still serve
  stroke-order searches, so quality work on them is still worth doing. Just don't expect lookup
  queries to produce clicks.
- **"Difference between X and Y" pages and FAQ-shaped content.** AI Overviews appear most on
  comparison and question-format queries (95.4% and 85.9%). Look-alike kanji are worth building only
  as a practice tool.
- **A generic explainer blog.** P4-1 (`performance-and-seo-roadmap.md:665`) aims `/blog` at queries
  like "how to learn kanji radicals" and "JLPT N5 study plan". Those are question-format
  informational queries, the class most exposed to AI answers. The N5 study plan would work better as
  a usable, printable sequence on the N5 page.

---

## 5. Measurement

- **Report clicks, not CTR.** Break clicks out by the intent classes in §1.2, so the level-page and
  printables work can be read directly.
- **Get the query×page join.** It is still blocked until the owner's account is added to the Search
  Console property (`weekly-reads.md:105`). Until then, nobody knows which URL ranks for `n5 kanji`
  today.
- **Check the generative-AI performance report** in Search Console (announced June 2026). It should
  show how much of the impression surge comes from AI Overviews and AI Mode.
- **Optionally, flag machine-shaped queries** in `scripts/check-query-performance.ts`, so one repeated
  string can't dominate the top-queries list.
- **Use §1.3 as the baseline** for the N5 page.

## 6. What this review could not check

- **On-site behaviour.** The DataFast API returned 403 because the account has no API access, so
  there is no data on how many visitors use the level tabs.
- **Google's own results pages.** They served a CAPTCHA to the browser. The competitor observations
  therefore come from a different search index, and whether an AI Overview appears for each query was
  not observed directly.
- **Learner demand from Reddit.** The search index returned no Reddit threads.
- **Which URL ranks for which query.** This is blocked by the query×page join (§5).

## 7. Status — what has shipped against this review

_Updated 2026-09-24._

**Milestone 1 — reachability (N5 list page and level wiring).**

- `/kanji/n5` is live: the 82 N5 kanji in the teaching order of `lib/levels/n5-sequence.ts`, with
  meanings, readings in kana and romaji, the free N5 pack, the book, the Tan stories and a signup
  form. It is a server component (192 kB script and 270 kB total on Lighthouse's mobile run) with
  its own budget in `lighthouserc.js`.
- `lib/levels/index.ts` decides where a link to a level goes: the list page if one exists, otherwise
  `/kanji?level=Nx`. Only N5 has a page, per §3. Giving another level a page means registering it
  there and adding its route folder.
- Wiring (§2.4):
  - The homepage button and level cards use the registry.
  - `/kanji` keeps its level in the URL; old `#level-Nx` links still resolve.
  - Every N5 character page gains a "JLPT N5 kanji" breadcrumb step, and every character page gets a
    level badge link and previous/next navigation through its level.
  - The footer links the list site-wide, and the sitemap lists it.
- `validate:kanji-data` asserts that the sequence covers the N5 list exactly once and in the data
  file's order. `validate:schema` deep-checks every registered level page, and each list entry must
  be a prerendered kanji page.
- Fixed along the way:
  - The EDRDG acknowledgement §3.2 said was owed.
  - `/kanji` is back under its script budget: 394 → 239 kB, TBT ~1.1 s → 62 ms, CLS 0.87 → 0 locally.
  - The homepage no longer ships the dictionary (First Load JS 194 → 142 kB), which cut ~57 kB of
    script from every page that prefetches `/`.
  - The N4 and N3 badge contrast failure.
  - Default buttons had no hover state.
  - Related-kanji cards had no surface.
  - Stroke diagrams were blank until Play was pressed.

**Milestone 2 — printables as landing pages (§4.2 #3).**

- `/free-resources/kanji-sheets` is rewritten as the landing page for "kanji practice sheets":
  - title "Free Kanji Practice Sheets — Printable JLPT N5–N1 Worksheets"
  - the free N5 pack first, then per-level cards linking to both the sheets and the list
  - counts taken from the data (it used to say N5 had "~100")
- `/api/kanji-sheets?characters=` prints up to 20 kanji as one document, one sheet each. The N5
  sheets page and the N5 list print a whole theme group at once. Sheets are now cached for a day
  (P3-3).

**Milestone 3 — practice per level (§4.2 #4).**

- `/kanji/n5/quiz` offers three question types (meaning, reading with romaji, kanji for a meaning),
  on all 82 kanji or any group. Missed kanji link to their pages. Correct answers can be marked
  learned, which feeds the existing SRS review.
- Each group on `/kanji/n5` links to its own quiz.
- `scripts/validate-quiz.ts` runs in CI and asserts exactly one right answer for every kanji and
  question type.

**Milestone 5 — the newsletter (§4.2 #1).**

- The pending compliance work shipped with the postal address the owner supplied on 2026-09-24. It
  covers:
  - `config.business` and the CAN-SPAM line in every episode email's footer
  - the privacy policy rewritten for the product that exists
  - the Saturday send schedule and the Friday checks on the signup path
- The weekly send stays a deliberate manual step (`docs/runbooks/newsletter.md`). Nothing in code
  blocks it now.

**Still open, and whose call it is.**

- §3: completing and re-sourcing the N4–N1 lists. This is the owner's decision, and the N4–N1 list
  pages wait on it.
- §5: the query×page join still needs the owner's account on the Search Console property.
  `check-query-performance` gains clicks-by-intent reporting in its own milestone.

## Sources

- Seer Interactive, "AIO Impact on Google CTR: 2026 Update", 2026-04-24 —
  https://www.seerinteractive.com/insights/aio-impact-on-google-ctr-2026-update
- Pew Research Center, "Google users are less likely to click on links when an AI summary appears in
  the results", 2025-07-22 —
  https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/
- Google Search Central, "AI features and your website" —
  https://developers.google.com/search/docs/appearance/ai-features
- Google Search Central Blog, "Introducing Search Generative AI performance reports in Search
  Console", June 2026 — https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports
- JLPTsensei, "JLPT N5 Kanji List" — https://jlptsensei.com/jlpt-n5-kanji-list/
- kanjilibrary.com, "JLPT N5 Kanji List (79 kanji)" — https://kanjilibrary.com/kanji/n5/
- Internal: `data/query-history.json`, `data/indexation-history.json`, the `docs/kanji-list/` PDFs
  (removed 2026-09-24), and the docs cited inline.
