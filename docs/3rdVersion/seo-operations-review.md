# SEO operations review — measurement, automation, and the kanji-data redundancy

_Reviewed 2026-08-02, against `c204e36` (the romaji subsystem)._

Two questions were asked of this repo: is the kanji data redundant in a way that will hurt us, and
do we have the right scripts and scheduled actions to tell whether the SEO work is actually
working. They have different answers. The redundancy is real but currently harmless and cheap to
make permanently safe. The measurement story has a hard blocker that means **we cannot presently
answer "did the romaji work?" at all** — and would not have been able to even if we waited a month.

---

## 1. The blocker: the Search Console API was switched off — RESOLVED 2026-08-02

**Resolved.** The API was enabled and `indexation-alarm.yml` dispatched successfully the same day.
Reading #1 is committed in `ff7d8a2`:

| Taken on | Window | Pages w/ impressions | Impressions | Clicks | Sitemap URLs |
|---|---|---|---|---|---|
| 2026-08-02 | 2026-07-03 → 2026-07-30 | **903** | 66,727 | 1,771 | 1,906 |

The window closes on 2026-07-30 — three days before the romaji work shipped — so this is a clean
pre-romaji baseline with no contamination at all, which is better than the "one day of overlap"
the analysis below expected. The next scheduled run (Mon 2026-08-04 07:00 UTC) is the first that can
detect a change.

Two things worth carrying forward from the numbers: 903 of 1,906 submitted URLs earned an
impression, so roughly **half the sitemap is not being served to anyone** — that is the headroom the
whole SEO effort is aiming at, and it is now a measured quantity rather than a hunch. And clicks
already run at 1,771 against 66,727 impressions (~2.7% CTR), which is the figure the romaji title
work should move first: a better-matched title changes CTR before it changes impressions.

The original finding is kept below for the record.

### Original finding

`indexation-alarm.yml` has run exactly once, on 2026-07-30, by manual dispatch. It failed in 25
seconds:

```
"Google Search Console API has not been used in project 130306809947 before or it is disabled."
reason: SERVICE_DISABLED   status: PERMISSION_DENIED
```

The service account and the `GSC_SERVICE_ACCOUNT_KEY` secret are both fine. What is missing is one
click: the Search Console API is not enabled on the Google Cloud project the key belongs to.

Consequences, in order of how much they matter:

- `data/indexation-history.json` contains `"readings": []`. **There is no baseline.** The romaji
  work shipped on 2026-08-02 with nothing recorded before it.
- The first scheduled run is Monday 2026-08-03 07:00 UTC and will fail the same way, opening an
  alarm issue that describes a credential problem we do not have.
- `pnpm check-indexation` and `pnpm check-index-status` both fail locally for the same reason —
  they share `scripts/lib/google-service-account-auth.ts` and the same project.

**Action (Ari, ~2 minutes, cannot be done from here):** open
<https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=130306809947>,
click Enable, wait a few minutes, then `gh workflow run indexation-alarm.yml`. That records reading
#1. Because the metric uses a rolling 28-day window, the reading taken this week is *still a usable
pre-romaji baseline* — Google has had one day of the new titles at most, against 27 days of the old
ones. If we wait two more weeks the baseline is contaminated and the question becomes unanswerable.

This is the highest-leverage item in this document by a wide margin. Everything else is
improvement; this is the difference between having data and not.

---

## 2. What the scheduled automation covers, and the two holes

Seven workflows exist and, apart from the one above, they run and pass. The scheduled ones:

| Workflow | Cadence | Status | What it tells us |
|---|---|---|---|
| `indexnow-submit.yml` | Daily 06:00 UTC | Working | Bing/Yandex/Naver/Seznam have the changed URLs |
| `indexation-alarm.yml` | Mon 07:00 UTC | **Failing** | Would tell us the indexed-page trend |
| `announcements-status.yml` | Daily 07:00 UTC | Working | Announcement queue health |

And the PR gates: `lighthouse-ci.yml` (byte budgets), `schema-check.yml` (JSON-LD),
`sentences-check.yml`, `announcements-check.yml`.

That is a genuinely good set. The gaps are specific.

### Hole 1 — `validate:romaji` is in no workflow at all

```
$ grep -rn "validate:romaji\|lib/romaji" .github/
(no matches)
```

The romaji subsystem is the newest and most rule-dense thing in the repo — gemination, `っち` → `tch`,
the ei/ii carve-out, moraic `n`, two annotation dialects, katakana folding — and its 72-case
validator plus the 3,586-reading leakage sweep runs only when someone remembers to type it. Every
other subsystem with a contract has a workflow guarding it; this one does not, and it is the one
whose output goes straight into `<title>`, JSON-LD and the H1.

The failure mode is quiet and public: a rule change that lets `（`  through puts `ひと（つ）`-shaped
text into a page title, which is exactly the defect this work already fixed once in
`Article.mainEntity.alternateName`.

It runs in seconds and needs no build. It belongs in `schema-check.yml` as a second step, or in its
own small workflow, triggered on `lib/romaji/**`, `lib/constants/*-kanji.ts`,
`lib/seo/kanji-optimization.ts` and `scripts/validate-romaji.ts`.

### Hole 2 — nothing measures the thing we actually changed

`check-indexation.ts` counts *distinct pages with at least one impression*. That is the right alarm
for a catastrophic deindexing, and its header argues that case well. But it cannot answer the
question this quarter's work raises, because the question is not about page count:

> Did `/kanji/道` start ranking for "michi kanji"?

That is a **query-dimension** question, and the same Search Console API endpoint already being
called (`searchanalytics.query`) answers it directly with `dimensions: ['query']` or
`['page','query']` — same credentials, same auth helper, no new quota class, no new secret. We are
one script away from measuring the actual hypothesis, and that script can reuse essentially all of
`check-indexation.ts`'s scaffolding: the auth, the window/lag arithmetic, the append-only history
file, the commit-back step, the alarm-issue pattern.

Proposed: `scripts/check-query-performance.ts` + a weekly workflow, recording per-query impressions,
clicks and average position for a curated watchlist — the romaji forms of our highest-value
characters (`michi kanji`, `mizu kanji`, `hi kanji`, `kokoro kanji`, …), plus the aggregate average
position of `/kanji/*` pages. Appended to `data/query-history.json`, same append-only discipline.

This is the "once a week, just to confirm things have improved" job. It is not the same job as the
indexation alarm — that one asks *are we still in the index*, this one asks *is the work paying off*
— and conflating them would weaken both. Run it Monday 08:00 UTC, an hour after the alarm, so they
never contend.

**Built 2026-08-02** as `scripts/check-query-performance.ts` + `.github/workflows/query-performance.yml`
(Mondays 08:00 UTC, an hour after the indexation alarm so the two never contend or race on a rebase).
Three design decisions are worth recording, because each one was a trap:

1. **The watchlist is the corpus.** Rather than hand-maintaining a list of queries to watch, the
   script classifies every query Search Console returns against the 1,853 distinct romaji search keys
   `romajiSearchKeys()` derives from our own data. The watchlist can never drift from the corpus,
   and it surfaces romaji queries nobody thought to watch for.
2. **A stoplist, because 16 romaji keys are also common English words.** Measured, not guessed:
   `to no so on in an me he do go you man sun ten` (plus single-char `a`/`i`) are all legitimate
   romaji readings — 十 is `to`, 野 is `no`, 御 is `on`. A naive "any token is a romaji key" rule
   would classify *"how to write kanji"* and *"kanji for sun"* as romaji hits, and the headline
   number would be a large, flat, meaningless figure. So the script records two: a **strict** count
   requiring a non-stoplisted romaji token *and* a kanji-context word (the literal shape of "michi
   kanji"), and a **loose** count for context. Strict is the headline. If loose ever grows much
   faster than strict, our targeting assumption is too narrow and the rule needs widening — that
   divergence is itself the signal.
3. **It never goes red for a disappointing number.** It records a trend; it does not judge one. The
   only issue it opens is a dead-man's switch for the job failing to run at all — same reasoning as
   `announcements-status.yml`. A red X for "the SEO work has not paid off yet" is how you train
   people to ignore a signal.

It also happens to answer two of the open questions for free:

- **Macron vs doubled** (`kō` vs `kou`): if GSC reports impressions on both spellings against the
  same page, Google is diacritic-folding and the question is closed. If only one appears, we have
  our answer and a reason to change the title.
- **Kunrei-shiki** (`si`/`ti`/`tu`): the deferred decision was "revisit only if search logs show
  them." This *is* the search log. Add a few kunrei spellings to the watchlist and the question
  answers itself in a month.

---

## 3. The kanji-data redundancy

The concern is well-founded, but the file count understates it and misplaces the risk.

### What is actually duplicated

**The `KanjiData` interface is declared seven times.** Six are byte-identical copies at the top of
each `lib/constants/*-kanji.ts`. The seventh, in `lib/seo/kanji-optimization.ts:17`, shares the name
but **not the shape** — it adds `level: string`. Two different types with one name, and consumers
pick whichever they happened to import. That is worse than a plain duplicate: it is a name collision
that TypeScript cannot warn about, and it is why `lib/linking/kanji-links.ts` and
`components/kanji/RelatedKanjiSection.tsx` both write `KanjiData & { level: string }` by hand — they
are reconstructing the seventh type from the first.

**The five-list merge is hand-rolled six times, three different ways.** Every consumer imports all
five level lists and re-implements "flatten to one lookup, lowest level wins":

| Site | Mechanism | Lowest-level-wins? |
|---|---|---|
| `app/kanji/[character]/page.tsx:35` | concat N5→N1, `.find` | yes, by order |
| `app/kanji/KanjiSearchClient.tsx:36` | Map N5→N1, `if (!has)` guard | yes, by guard |
| `components/kanji/PopularKanjiLinks.tsx:26` | `add()` N5→N1 | yes, by guard |
| `app/kanji/review/ReviewClient.tsx:30` | Map N1→N5, overwrite | yes, by reverse order |
| `app/api/kanji-sheets/route.ts:18` | Map N1→N5, overwrite | yes, by reverse order |
| `app/sitemap.xml/route.ts:46` | plain concat, no dedup | **no dedup at all** |

Plus `app/page.tsx:17` and `app/kanji/page.tsx:12`, which compute the total as a **sum of lengths**
rather than a distinct count.

### Is it broken today? No. Is that luck? Yes.

Measured across all six files right now:

```
sum of lengths:        1896
distinct characters:   1896
cross-list duplicates: 0
within-list duplicates: 0
NON_JLPT overlapping JLPT: 0
```

All six implementations agree — because the data happens to be clean. The moment one character is
added to two lists, they diverge: the sitemap emits a duplicate URL, the homepage inflates its
count, and the six lookups still agree with each other only by coincidence of ordering.

And the data has not always been clean. `scripts/find-duplicates.js`, `scripts/cleanup-duplicates.js`
and `scripts/fix-n2-duplicates.js` exist precisely because duplicates were introduced and had to be
swept out by hand. Those scripts are one-off `.js` files, wired to nothing, excluded from
`tsconfig.json`, and parse the constants files with regexes over source text. Nothing runs them.

**So the real finding is not "six copies of a type." It is: an invariant that six call sites depend
on is enforced nowhere, and the repo's own history says it has been violated before.**

### Recommended fix, in the order that gets the most safety soonest

1. **A validator, first.** `scripts/validate-kanji-data.ts` + `pnpm validate:kanji-data`, asserting:
   no duplicate character within a list, none across lists, `NON_JLPT` disjoint from the JLPT
   levels, every entry has a non-empty `kanji` and `meaning`, and at least one of `onyomi`/`kunyomi`
   (45 entries have no onyomi, 737 no kunyomi, 39 neither — that last group should be an explicit
   allowlist, not a silent pass). Wire it into the same workflow as `validate:romaji`. This makes
   the six copies *safe* without touching a single one of them, and it retires the three one-off
   `.js` scripts, which should then be deleted.

2. **One type, canonically.** Move `KanjiData` to `lib/constants/kanji-types.ts`; the six constants
   files import and re-export it, and `lib/seo/kanji-optimization.ts`'s variant becomes
   `KanjiData & { level: string }` — or better, an exported `KanjiWithLevel` that
   `kanji-links.ts`, `RelatedKanjiSection.tsx` and `kanji-sheets/route.ts` all use instead of
   re-declaring the intersection. Type-only, zero runtime bytes, zero bundle risk.

3. **One merge, carefully.** A `lib/constants/all-kanji.ts` exporting a single canonical
   `ALL_KANJI` array and `KANJI_BY_CHARACTER` map would collapse six implementations into one and
   fix the sitemap's missing dedup.

   **This one carries real bundle risk and must not be done casually.** Five routes
   (`app/free-resources/kanji-sheets/n{1..5}-sheets/page.tsx`) currently import *one* level list
   each. Routing them through a barrel that pulls all five would add the other four lists to those
   bundles — and `/kanji` has roughly 44 kB of headroom against a Lighthouse byte budget that is a
   hard CI `error`, derived byte-identically across 27 runs. Do this behind `pnpm analyze`, keep the
   per-level named exports available for the sheet pages, and let the byte budget be the referee.
   If it costs bytes, ship steps 1 and 2 and leave the merge duplicated but validated — that is a
   perfectly good resting place.

4. **`lib/constants/non-jlpt-kanji.ts` has zero importers.** 102 entries, 12 kB, referenced only by
   a comment in `scripts/sentences/kanji-inventory.ts`. It will drift from the other five and
   silently mean nothing. Either wire it in or delete it; the validator in step 1 should not be
   written to pretend it is live data.

---

## 2a. The first query reading, and what it changes

Dispatched 2026-08-02 immediately after merge — deliberately, because the whole lesson of §1 is
that an undispatched scheduled workflow sits broken and looks fine. It succeeded on the first run
and recorded a reading for `2026-07-03 → 2026-07-30`, the same pre-romaji window as the indexation
baseline.

```
total (query dim)   2,984 queries   26,684 impressions   1,028 clicks   3.85% CTR
romajiStrict          237 queries    2,312 impressions      82 clicks   pos 10.16
romajiLoose           249 queries    2,350 impressions      85 clicks   pos 10.12
kanji detail pages                  38,670 impressions      97 clicks   pos 10.48
```

Four things fall out of it, in ascending order of how much they should change what we do next.

**The strict filter is well calibrated.** Strict and loose differ by 12 queries out of 249. The
stoplist did essentially all the work and the kanji-context requirement removed almost nothing,
which is the outcome we wanted: precision bought cheaply, not by throwing away half the signal.

**"michi kanji" cannot be the success metric, because it is also our brand.** It shows 597
impressions, 79 clicks, position 3.05 — *before* the romaji work shipped. MichiKanji is the product
name, so this query is irreducibly part brand-seeking and part 道-seeking and no amount of care
separates them. The original analysis read the homepage ranking for "michi kanji" as the bug; for
the brand half of that traffic, the homepage ranking there is simply correct.

**But the hypothesis survives, on a cleaner query.** `kanji michi` — same intent, reversed word
order, no brand reading available — sits at **290 impressions, 0 clicks, position 7.4**. Zero. And
every other romaji query on the watchlist is at zero impressions: `mizu kanji`, `hi kanji`,
`kokoro kanji`, `kou kanji`, `ko kanji`, with `yama kanji` at 7 impressions and position 53. That is
a clean, uncontaminated baseline and `kanji michi` is the single best test case we have: if the
romaji work does anything at all, that 0 should move.

**The finding that reframes the project: the kanji pages are being seen and not clicked.** 38,670
impressions against 97 clicks is a **0.25% CTR** at an average position of 10.5. Site-wide CTR is
3.85%. (Those two come from different API dimensions — Search Console omits anonymised queries from
the query dimension, which is why 26,684 < 38,670 — so treat the *gap* as directional rather than as
a precise ratio. It is far too large to be a dimension artefact.)

This inverts the working assumption. We have been treating this as a discovery problem — pages Google
does not know about. It is substantially a **SERP-appeal** problem: Google is already showing these
pages tens of thousands of times a month and almost nobody clicks. That makes three things much more
valuable than they looked an hour ago, and all three are already on this list:

- the romaji titles (item 4's subject — they change what the searcher sees, which is what moves CTR),
- the raw KANJIDIC meanings that put `road-way` in a title (§4, item 6),
- and the **38 empty pages** in §3a, which are the most extreme form of this exact failure.

Compare against `kanji stroke order`: 2,514 impressions, 353 clicks, position 3.3 — a 14% CTR. When
the page matches the query, this site converts perfectly well. The kanji detail pages are not
converting because of what they say, not because of where they rank.

## 3a. Found while building the validator: 38 pages that are a bare character

Writing `validate:kanji-data` turned up a defect nobody was looking for. **38 N1 entries have an
empty `meaning` AND empty `onyomi` AND empty `kunyomi`:**

```
芙 芳 茂 莉 菊 菖 萌 蒔 蓄 蓉 蕉 蛮 融 衰 衷 褒 訴 診 詐 詢 諄 謹 輔 輝
迭 逐 逓 逝 還 那 郁 酔 酬 酵 醸 釈 銘 鋳
```

A 39th, 舜, has a meaning but no readings. These are committed as `{ kanji: "芙", onyomi: "",
kunyomi: "", meaning: "" }` — so `/kanji/芙` prerenders as a character, a stroke diagram, and
nothing else. No meaning in the H1, no readings, no romaji, and a title generated from an empty
meaning string.

This matters more than the count suggests, for three reasons:

1. **They are not obscure characters.** 菊, 輝, 融, 衰, 訴, 診, 酔, 酵, 銘, 蓄 are common N1 kanji
   with real search demand. 輝 alone is extremely common in names.
2. **They are fully published.** All 38 are prerendered, listed in `sitemap.xml`, counted in the
   1,906 submitted URLs, and actively pushed to Bing/Yandex/Naver by the daily IndexNow job. We are
   asking search engines to index 38 empty pages.
3. **They are thin content pointed at our own quality signal.** The baseline says 903 of 1,906 pages
   earn an impression. These 38 are certainly in the silent half, and unlike most of that half they
   are not waiting on discovery — they are waiting on content that does not exist.

The validator does **not** fail on them, deliberately: a hard failure would mean it could never be
switched on. Instead both sets are enumerated as explicit, committed allowlists (`NO_MEANING_ALLOWED`
and the readings allowlist) that behave as a ratchet — a *new* empty entry is a hard failure, and an
allowlisted character that gains its missing field is reported as a stale entry to delete. The lists
can only shrink.

Filling them in is Ari-review work, not something to generate: these need correct Japanese readings
and an English gloss, and inventing them would be worse than leaving them blank. It is roughly an
hour of focused work for a meaningful indexation return, and it is the highest-value hour on this
list after item 4. Until then, consider whether these 38 should be excluded from `sitemap.xml` —
telling Google about a page we know is empty is a cost with no upside.

## 4. The other open questions, and how to close them

Beyond the two the query script answers for free:

- **`keywords` meta is inert for Google.** Nothing to measure, no reason to keep tuning it. Cap the
  effort here and move it into visible text and JSON-LD. Closed by decision, not by data.
- **FAQ answers are not extractable.** `"How do you write 道?"` → `"Use the interactive animation on
  this page."` An AI Overview cannot quote that. The fix needs stroke counts, which are derivable at
  build time from the KanjiVG paths already proxied through `app/api/kanji-svg/[hex]/route.ts`.
  Worth noting `/free-resources/kanji-sheets/**` copy already promises "stroke count" — so this
  closes a copy/reality gap as well as an SEO one.
- **Reverse queries (`michi` → 道/途/路/径) have no home.** `getRelatedKanji` relates by meaning, not
  by reading. Grouping by shared romaji key is now cheap, since `romajiSearchKeys()` exists. Whether
  that becomes a `/reading/michi` page type is a bigger call — new route, new sitemap entries — and
  should wait until the query data shows reverse-query demand is real.
- **Romaji is not wired into search.** One-line predicate change at `KanjiSearchClient.tsx:161`,
  but it moves romaji derivation into the client bundle, which is the cost the current design
  deliberately avoided. Measure with `pnpm analyze` before committing. Fold the query through
  `katakanaToHiragana` at the same time — searching `へん` currently misses `片`, because 137 onyomi
  are stored in katakana and 1,714 in hiragana with no rule behind which.
- **Meanings are raw KANJIDIC dumps.** `getPrimaryMeaning` puts the hyphenation artifact
  `"road-way"` into the H1, title and breadcrumb of our own brand character. Hand-fixing 道 is a
  five-minute change; the full pass over 1,896 glosses is gated on review capacity, and any
  editorial rewrite has to render structurally separate from the licensed gloss or it becomes
  Adapted Material — see `docs/prd/content-source-licence-investigation.md`.

---

## Priority order

| # | Task | Effort | Who | Status |
|---|---|---|---|---|
| 1 | Enable the Search Console API, dispatch `indexation-alarm.yml`, record baseline | 2 min | Ari | **done 2026-08-02 — 903 pages** |
| 2 | Put `validate:romaji` in CI | 15 min | either | **done — `kanji-data-check.yml`** |
| 3 | `validate-kanji-data.ts` + CI; delete the three one-off dup scripts | 1 h | either | **done** |
| 5 | Canonical `KanjiData` / `KanjiWithLevel` type | 30 min | either | **done** |
| 4 | `check-query-performance.ts` + weekly workflow | 2–3 h | either | **done — first reading pending** |
| 3a | Fill in the 38 empty entries (or drop them from the sitemap) | ~1 h | **Ari (Japanese review)** | **new — see §3a** |
| 6 | Fix 道's meaning by hand | 5 min | Ari (Japanese review) | open |
| 7 | Stroke counts from KanjiVG → extractable FAQ answers | half day | either | open |
| 8 | Merge consolidation, behind `pnpm analyze` | half day | either | open |

1 and 4 are the ones that turn this from a project we believe is working into one we can prove is
working. 2 and 3 are the ones that stop it quietly breaking.

With 1, 2, 3 and 5 landed, the remaining measurement gap is entirely item 4: we can now detect a
deindexing cliff and we can no longer silently corrupt the data, but we still cannot see whether
`/kanji/道` ranks for "michi kanji". That is the next build, and it should be pointed at the live
API now that the credentials demonstrably work.
