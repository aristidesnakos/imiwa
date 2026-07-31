# Phase 0 findings — example sentences

**Date**: 2026-07-31 · **Status**: Phase 0 complete · **Companion**: [`example-sentences-system.md`](./example-sentences-system.md) (the PRD), [`example-sentences-phase0-coverage.md`](./example-sentences-phase0-coverage.md) (generated coverage tables)

Phase 0 was specified as blocking and no-user-facing-output: *"how many of our kanji
does Tatoeba actually cover?"* It is answered below, along with three of the PRD's
five open questions, which the same investigation resolved.

Reproduce with:

```bash
npx tsx --tsconfig tsconfig.json scripts/sentences/corpus.ts     # parser self-check
npx tsx --tsconfig tsconfig.json scripts/sentences/coverage.ts   # regenerates the tables
npx tsx --tsconfig tsconfig.json scripts/sentences/coverage.ts --kanji 暑
```

Dumps are fetched to a gitignored `.tatoeba-cache/`, never vendored (resolves
open question #4). Corpus vintage: **2026-07-25**.

---

## 1. Coverage verdict — supply is not the constraint

At the realistic shipping tier (has an English translation, 8–60 characters, no
kanji more than one level above target), **kanji with ≥3 usable candidates**:

| Phase | Level | Covered | Median candidates per kanji |
|---|---|---|---|
| 1 | N5 | 81 / 82 — **99%** | 429 |
| 2 | N4 | 171 / 171 — **100%** | 800 |
| 3 | N3 | 380 / 380 — **100%** | 410 |
| 4 | N2 | 256 / 259 — **99%** | 130 |
| 5 | N1 | 743 / 1,004 — **74%** | 15 |

**Phases 1–4 pass their coverage gate outright.** The PRD anticipated coverage
thinning as kanji get rarer and staged the rollout defensively; that caution was
warranted only for N1, where **159 kanji have zero candidates** and will never
have any.

The medians are the more important number. At 400–800 candidates per N5–N3
kanji, **the binding constraint is not supply, it is review capacity.** The PRD's
100%-human-review bar for Phases 1–2 means ~253 kanji × 3 sentences ≈ **760
sentences to read and adjudicate**. That, not corpus coverage, is what sets the
Phase 1 timeline — and it means the selection step's job is ranking a large
candidate pool well, not scraping together enough sentences.

**Recommendation for open question #1 (3 or 5 sentences per kanji):** 3 for
Phases 1–2. Supply supports 5 comfortably, but review cost scales linearly and
we have no accuracy data yet. Revisit at the Phase 2 gate with a measured reject
rate.

**Recommendation for Phase 5 (N1):** ship partial, per the PRD's own allowance.
The 159 zero-coverage kanji are overwhelmingly jinmeiyō name characters (侯 弔
朔 瑳 笙 脩 …) — see §5, which argues they should not be in the dictionary at all.

### What the quality filters cost

Each additional filter, at ≥3 candidates, total across all levels:

| filter | kanji covered |
|---|---|
| contains the kanji | 1,660 (88%) |
| + has an English translation | 1,634 (86%) |
| + length 8–60 chars | 1,632 (86%) |
| + ≤1 level harder | 1,631 (86%) |
| + all kanji known and ≤ target | 1,524 (80%) |
| + owned, non-orphan | 1,418 (75%) |
| + JP owner declares native | 1,336 (70%) |

**The PRD's step-1 pre-filter is more expensive than it reads.** "Prefer JP
sentence owned by a self-declared native speaker" costs 16 percentage points,
and it is a weak signal for the price: only **660 users** declare native Japanese
(against 30,790 for English), and the declaration is per-user, self-reported and
unverified.

Worse, **40.2% of Japanese sentences are orphaned** — and **99.65% of those
orphans are unadopted `Tanaka Corpus` imports**, a curated textbook-derived
corpus, not abandoned junk. Filtering on ownership discards a large, decent
subset for a reason that does not apply to it.

**Recommendation:** treat native-ownership and audio as *ranking* signals, not
*exclusion* filters. Exclude only on the objective criteria (no translation, bad
length, level mismatch). This is a change to the PRD's step 1.

---

## 2. The level filter cannot use JLPT data — resolved by using our own

The PRD's step 3 says to score candidates against "a JLPT vocabulary/grammar
frequency list". **No such list can be licensed.**

- The JLPT has published no vocabulary lists since the 2010 redesign. EDRDG
  states it plainly in the KANJIDIC docs: *"No official kanji lists are
  available for the new levels."*
- Every list in circulation — Jisho's JLPT tags, `jlpt-vocab-api`,
  `Bluskyo/JLPT_Vocabulary`, `stephenmk/yomitan-jlpt-vocab`, the Kaggle and
  HuggingFace sets — traces to one personal reconstruction, **tanos.co.uk**,
  which shows "© Jonathan Waller" and **no licence grant on any page**. The
  MIT/CC-BY badges downstream are void as to the data: you cannot license out
  what you were never licensed.

Under our standing provenance rule that is a grey zone, so it is excluded.

**Resolution: proxy complexity from `lib/constants/*-kanji.ts`.** We already own
a level assignment for 1,896 characters. A sentence is treated as no harder than
its hardest kanji. Zero licence exposure, self-consistent with the rest of the
site.

**Stated honestly, this is a floor and not a level model** — it captures nothing
about grammar, and a sentence of only N5 kanji can still use N2 grammar. If we
later want a real complexity model, the clean path is **JMdict frequency bands
(`nf01`–`nf48`) + KANJIDIC2 `<grade>` + the published Lee & Hasebe jReadability
regression**, all cleanly licensed — but note EDRDG's unusual condition: an
acknowledgement must appear **on each screen** displaying content derived from
their files. That is a site-wide footer change, so it is a decision, not a
detail.

**Excluded, do not reopen:** Tanos and everything derived from it, WaniKani
(ToS forbids reproduction), Kanshudo (no redistribution), BCCWJ and 日本語教育語彙表
(research/education only, no commercial grant), Leipzig (NC).

---

## 3. Tatoeba attribution — comply with the strict reading (open question #5)

Tatoeba's own sources conflict. The FAQ permits project-level credit only and
endorses Clozemaster's form by name. The Terms of Use §6.2 and §6.5 and the
CC BY 2.0 FR legal code require **crediting the individual author**.

**Resolution: credit both the project and the per-sentence contributor.**
Reasoning: Tatoeba does not own the sentences and cannot waive contributors'
rights on their behalf; the licence is the *French* port and Tatoeba is a French
association, where *droit de paternité* is inalienable. The strict reading costs
one extra column and satisfies the permissive reading simultaneously, so there
is no reason to take the risk.

Required per sentence pair displayed:

> 猫だ！ — *Cat!*
> JP [#8858176](https://tatoeba.org/en/sentences/show/8858176) by **moxy** ·
> EN [#6581103](https://tatoeba.org/en/sentences/show/6581103) by **rul** ·
> [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/)

Plus a site-wide credits page naming Tatoeba, the licences, our selection
methodology, and an explicit reservation of rights over our own commentary.

**Three findings that change the plan:**

1. **Our contrast notes stay proprietary.** CC BY 2.0 FR Art. 4 expressly
   excludes the surrounding *Collective Work* from the licence. This holds only
   while sentence text stays **structurally separate and unmodified** — if we
   interleave commentary into the sentence, it becomes a derivative work and the
   analysis changes. The PRD's no-modification rule is load-bearing for more
   than honesty.
2. **Do not ship Tatoeba audio.** It carries per-recording licences including
   CC BY-NC and CC BY-NC-ND, and 74,041 recordings have an empty licence field
   meaning "may not be reused outside Tatoeba". NC is fatal to a paid tier. Text
   has no NC option; audio does. Use audio only as an internal quality signal.
3. **Our ToS needs a carve-out.** A blanket proprietary-content clause would
   breach the licence as applied to the sentences. A login paywall is fine; DRM
   is not.

Japanese licence composition is effectively constant: of 248,821 Japanese
sentences, exactly **two** are CC0 (both are sentences *about* Creative Commons).
The PRD's per-side licence modelling is still correct — a CC0 Japanese sentence
with a CC BY English translation is a live case, and the reverse is impossible —
but the JP side is CC BY 2.0 FR in practice.

---

## 4. Tokenizer — `@sglkc/kuromoji`, with a known accuracy ceiling

For word-boundary detection and token-level furigana readings. Build-time only,
so no runtime bundle cost.

`lindera-wasm-ipadic-nodejs` produces byte-identical output and is actively
maintained, but it broke its JS API twice in three months and has ~295
downloads/month; kuromoji is frozen but has 1.28M and the furigana-alignment
ecosystem. Both ship the same frozen IPADIC 2.7.0 dictionary, so *the readings
are identical* — this is a maintenance-risk choice, not a quality one, and
switching later is a ~20-line adapter.

Licence note: IPADIC is the custom **NAIST-2003** licence (not BSD, as is often
claimed). Redistribution is permitted with the copyright notice retained.

**Reading accuracy ceiling is ~95–97%, and the failure modes are known:**
`一人`→イチニン, `行った`→オコナッタ, `一日中`→イチ・ニチ・チュウ, `人気`→ニンキ,
and null readings on rare kanji. **These are exactly what human review must gate
on** — they are silent, plausible-looking errors, which is the worst kind for a
site whose claim is accuracy. Recommend the validation CI check flag any token
with a null reading rather than letting it render.

---

## 5. Unplanned finding: the kanji dictionary is mis-composed

This is not about sentences, and it is probably the most valuable thing Phase 0
surfaced.

- **1,278 distinct kanji** appear in the Japanese corpus but are in **none** of
  our five level files.
- **211 of them appear in 100+ corpus sentences.**
- **139 of the 1,896 kanji we teach appear in zero corpus sentences**, and 409
  appear in fewer than ten.
- **結 — which we do not teach — appears in more sentences (2,267) than 1,799 of
  the 1,896 kanji we do teach.**

The most-used omissions are core vocabulary, not edge cases:

| kanji | sentences | | kanji | sentences |
|---|---:|---|---|---:|
| 結 | 2,267 | | 経 | 981 |
| 発 | 2,242 | | 張 | 831 |
| 住 | 1,769 | | 可 | 810 |
| 約 | 1,287 | | 案 | 793 |
| 俺 | 983 | | 遠 | 740 |

Meanwhile the N1 list contains 瑳, 笙, 脩, 晟, 柾 — jinmeiyō *name* characters
that appear on no JLPT list and in zero corpus sentences.

**Why this matters beyond this feature.** Every missing kanji is a missing page,
and these are high-search-volume characters — 住 and 発 are core N5/N4
vocabulary that learners actively look up. Against roadmap P4-2 ("differentiate
the kanji page template"), adding ~200 genuinely common kanji is a larger and
cheaper traffic win than deepening the 1,896 pages we already have, and it is
independent of the sentence pipeline.

**Recommended as its own work item**, sized from the ranked gap list in
[`example-sentences-phase0-coverage.md`](./example-sentences-phase0-coverage.md).

---

## Changes this implies for the PRD

1. **Step 1** — demote native-ownership and audio from exclusion filters to
   ranking signals; stop excluding orphans (they are Tanaka Corpus).
2. **Step 3** — replace "JLPT vocabulary/grammar frequency list" with the
   own-dictionary complexity proxy, and record why.
3. **Open question #1** — 3 sentences per kanji for Phases 1–2.
4. **Open question #4** — resolved: fetch, cache in `.tatoeba-cache/`, commit
   only curated output.
5. **Open question #5** — resolved: per-contributor attribution, strict reading.
6. **New constraint** — no Tatoeba audio; ToS carve-out required before Phase 1
   ships.
7. **Phase 5 (N1)** — expect ~74% coverage at best; treat partial as success.
8. **Open question #2 remains the real gate.** Coverage is solved; review
   capacity is not. 760 sentences at 100% review is the Phase 1–2 cost.
