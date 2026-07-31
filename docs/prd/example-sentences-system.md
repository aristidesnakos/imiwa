# Product Requirements Document: Kanji Example Sentences

## Document Info
- **Version**: 0.2 (revised — Aozora cut, rollout staged)
- **Created**: 2026-07-31
- **Revised**: 2026-07-31
- **Status**: Proposed
- **Owner**: TBD

> **Changes from v0.1** are summarised at the bottom of this document. The two
> structural changes: Aozora Bunko is cut entirely, and the rollout is staged
> per JLPT level behind a coverage gate rather than shipped corpus-wide.

---

## Problem Statement

User feedback: kanji pages show meaning/readings/stroke order but no example sentences, so learners can't see a kanji used in context. Requirements from that feedback:

1. Sentences must be **accurate** — correct readings, natural grammar, correct kanji usage.
2. Sentences must be **realistic** — not stilted textbook filler.
3. Where useful, show how **near-synonyms** differ (e.g. 暑い vs 熱い — both "hot," different kanji, different context).
4. There's an SEO angle if sentences can be attributed to **real, citable sources** rather than presented as generic/AI-written filler.

This doc proposes: where sentences come from, how they're vetted, how they're
modelled and stored, how the feature rolls out, and — since the ask was
specifically "when do we need a database" — the concrete conditions that would
justify one.

---

## Non-negotiable: the provenance rule

Everything below follows from one rule, and it is the rule that makes the
authority claim honest:

> **Every sentence we publish is a real sentence, written by a person, taken
> verbatim from a source whose licence unambiguously permits our use, and
> attributed to that source. If provenance or licence is ambiguous, we do not
> ship the sentence — we do not attempt to reason our way into a grey zone.**

Three consequences, stated explicitly so nobody re-litigates them later:

- **We do not generate sentences.** Not by hand, not by LLM. A generated
  sentence cannot carry "from the Tatoeba corpus," and that attribution is the
  entire differentiator. An LLM's role is *selection and flagging*, never
  authorship.
- **We do not modify sentences.** No orthography normalisation, no
  simplification, no "cleaning up." A modified sentence is no longer the source's
  sentence and the attribution becomes a lie.
- **We do not translate.** The English must come from the source alongside the
  Japanese, authored by a person. If a source gives us Japanese but no English,
  that source is unusable — see below.

---

## Sourcing Strategy

### Sole source: Tatoeba

- Large, sentence-aligned JP↔EN corpus, open-licensed, and already the de facto
  source most Japanese-learning tools (Jisho, WaniKani community lists, etc.)
  use for example sentences — a well-worn pattern, not a novel legal risk.
- **Critically: both sides are human-authored.** The Japanese sentence and its
  English translation are each written by a Tatoeba contributor. This is what
  lets the provenance rule hold with no carve-outs — we never have to originate
  text.
- Good coverage for common vocabulary, which maps to N5–N3. Coverage thins as
  kanji get rarer; see the coverage gate below.
- Weakness: quality is uneven since it's crowd-contributed (some sentences are
  stiff, translation-first, or written by learners). Needs a filtering pass, not
  blind ingestion — but Tatoeba ships the metadata to do most of that filtering
  mechanically. See "Vetting pipeline."

**Licence handling — the Japanese sentence and the English translation are
separate objects with separate authors and potentially separate licences.**
Tatoeba's corpus is predominantly CC BY 2.0 FR but is not uniform (some
sentences are CC0). The ingestion script must read the licence and contributor
per sentence ID, not assume a corpus-wide value, and the data model stores
provenance for each side independently. Before the first batch ships, confirm
against Tatoeba's current terms whether project-level attribution suffices or
per-contributor credit is required, and record the answer in this doc.

### Excluded sources, and why

Recording these so the decision isn't quietly reopened:

| Source | Why excluded |
|---|---|
| **Aozora Bunko** | Two independent disqualifiers. (a) *No English.* Aozora is Japanese-only, so every sentence would need a translation we author — a direct violation of the provenance rule, and one we'd be publishing under a famous author's name. (b) *Licence is not uniformly clean.* "70 years post mortem" is not a usable blanket test: Japan's 2018 extension from 50→70 years was **non-retroactive**, there is a wartime addition (戦時加算) for some Allied-national authors, Aozora hosts non-public-domain works under rights-holder permission with per-work conditions, and Aozora credits its own 入力・校正 transcription volunteers. Determining status is per-work legal work with a real error rate. Grey zone → excluded. |
| **LLM-generated sentences** | Cannot carry a source attribution. Defeats the entire premise. |
| **Textbook / commercial dictionary examples** | Copyrighted. Not available to us. |
| **Scraped web sentences** | Unknown provenance and licence by definition. |

**What this costs us, stated honestly:** v0.1 pitched "暑い appears in
夏目漱石's こころ (1914)" as the headline SEO play. That play is gone. The
differentiator is now (a) correct, verifiable attribution where competitors show
unattributed examples, (b) high-quality furigana, and (c) the near-synonym
contrast notes — which are original editorial work and, as argued in the SEO
section, are the stronger asset anyway.

### Vetting pipeline

Ordered cheapest-first, so the expensive passes run on a small candidate set.

1. **Metadata pre-filter (free, do this first).** Tatoeba's exports carry
   quality signals that beat any heuristic we'd invent: contributor username,
   whether the sentence is owned/adopted rather than orphaned, contributor
   language skill level (native vs. learner), presence of recorded audio, and
   tags. Prefer: JP sentence owned by a self-declared native speaker, EN
   translation owned by a native English speaker, has audio. This is a stronger
   accuracy signal than an LLM pass and costs nothing. The ingestion script must
   verify the exact export files and field names against Tatoeba's current
   downloads page rather than trusting this description.
2. **Candidate pull.** For each target kanji, pull sentences where it appears in
   a common word, not a rare compound.
3. **Level filtering.** Score candidates against a JLPT vocabulary/grammar
   frequency list so sentence complexity roughly matches the kanji's assigned
   level — a sentence for an N5 kanji shouldn't need N2 grammar to parse.
4. **Reading / dictionary cross-check.** Verify the reading used against JMdict
   (or similar). Multi-reading kanji (生 has ~15 readings) and homophone pairs
   (暑い/熱い) are exactly where "accurate" breaks if unchecked. This pass also
   produces the token-level furigana data (see Data Model).
5. **LLM-assisted scoring, never authoring.** An LLM pass flags naturalness,
   register, and translation-accuracy problems on real candidates. It may
   **reject or re-rank**. It may never rewrite, and it may never emit text that
   reaches the page.
6. **Human review.** See "Accuracy bar" below — this is not a rubber stamp and
   its rate is defined per phase, not left open.
7. **Contrast pass.** For kanji with a well-known near-synonym confusion, select
   or pair one corpus sentence per side and write a contrast note. The note is
   ours and is labelled as ours; the sentences remain corpus-sourced.

### Accuracy bar

The v0.1 phrase "spot-check a sample" is too loose for a claim of authority.
Concretely:

- **Phases 1–2 (N5, N4): 100% human review.** ~250 kanji, a few hundred
  sentences. This is tractable, and it's how we calibrate whether the automated
  passes are trustworthy. Reviewer records accept/reject per sentence.
- **Phase 3+ (N3 and up): sampled review, rate set by the measured Phase 1–2
  reject rate.** If the automated pipeline's output was ≥98% accepted at 100%
  review, a 20% sample is defensible. If it was 85%, it isn't, and the pipeline
  gets fixed before the phase ships. **The sample rate is an output of the
  earlier phases, not a guess made now.**
- Every sentence carries its review status in the data (see model). Unreviewed
  sentences are not publishable — a sentence is either reviewed or it was
  auto-accepted under a measured-and-recorded policy, and the record says which.
- A reported-inaccurate sentence gets removed first and adjudicated second.

---

## Rollout Phases

Staged per JLPT level. Each phase is gated: **it ships only if the coverage
check passes and the previous phase's accuracy held.**

### Phase 0 — Coverage analysis (blocking, no user-facing output)

Before any further spec work, answer the question the size math in v0.1 never
asked: *how many of our kanji does Tatoeba actually cover?*

Run the ingestion script's steps 1–3 against all 1,896 kanji and produce a
histogram: for each kanji, how many candidate sentences survive the metadata
pre-filter and level filter. Deliverable is a table of "kanji with ≥3 usable
candidates" per JLPT level.

This determines everything downstream, including whether phases 4–5 are viable
at all. It is cheap — a dump download and a script — and it should happen before
UX work starts.

### Phase 1 — N5 (82 kanji)

Prove the whole pipeline end-to-end on the smallest, best-covered level. Ship
sentences, furigana rendering, attribution UI, the validation CI check, and the
report-a-problem path. 100% human review. Measure before proceeding.

### Phase 2 — N4 (171 kanji)

Same bar. Confirms the pipeline generalises. After this phase, set the Phase 3+
sampling rate from measured data.

### Phase 3 — N3 (380 kanji)
### Phase 4 — N2 (259 kanji)
### Phase 5 — N1 (1,004 kanji)

Each gated on Phase 0's coverage numbers for that level. **It is an acceptable
and expected outcome that a later phase ships with partial coverage, or does not
ship at all.** Rare N1 kanji will not have good corpus sentences, and inventing
them is exactly what the provenance rule forbids. A kanji page with no sentence
section is strictly better than one with a fabricated sentence.

**Not in scope for any phase:** the 102 kanji in `lib/constants/non-jlpt-kanji.ts`.
`NON_JLPT_KANJI` is defined but never imported into
`app/kanji/[character]/page.tsx`, so those kanji have no detail pages today.
Wiring them up is separate work.

---

## Data Model

Kept separate from the existing `KanjiData` shape in `lib/constants/*.ts` —
sentences are additive content, not a property of the kanji dictionary entry, and
separate files mean the curation pipeline never merge-conflicts with the kanji
dictionary files (which are actively edited; recent commits add kanji one at a
time).

**Storage format: JSON under `data/sentences/`, not TypeScript literals.** A
large TypeScript object literal with union-typed fields is slow to type-check and
slow for the JS engine to parse; JSON is faster on both counts and the shape is
validated by the ingestion script and the CI check rather than by `tsc`. A thin
typed loader in `lib/sentences/` provides the `ExampleSentence[]` type at the
boundary. (`n1-kanji.ts` is already 100KB as a TS literal; an N1 sentence file
would be an order of magnitude larger.)

```typescript
// lib/sentences/types.ts

/**
 * One token of the sentence. This is what makes furigana renderable: a
 * whole-sentence kana string CANNOT be aligned back to the kanji spans it
 * corresponds to, so ruby markup cannot be derived from it. Segmentation
 * happens once, in the pipeline, not at render time.
 */
export interface Token {
  surface: string;            // "今日"
  reading?: string;           // "きょう" — omitted for kana-only/punctuation tokens
}

export interface SentenceSource {
  /** Tatoeba sentence ID for this side. */
  sentenceId: number;
  /** Contributor username, or null if the sentence is orphaned/unowned. */
  contributor: string | null;
  /** Read per-sentence from the corpus, not assumed corpus-wide. */
  license: "CC BY 2.0 FR" | "CC0 1.0";
  url: string;                // https://tatoeba.org/en/sentences/show/<id>
}

export type ReviewStatus =
  | { kind: "human-reviewed"; reviewer: string; date: string }
  | { kind: "auto-accepted"; policy: string };  // e.g. "phase-3-sample-20pct"

export interface ExampleSentence {
  id: string;                 // "tatoeba-1234" — stable, source-traceable

  /**
   * EVERY dictionary kanji this sentence usefully demonstrates, not just one.
   * A sentence is stored ONCE and indexed under each entry, so 今日は暑いです
   * serves 今, 日 and 暑 without triplicating the row.
   */
  kanji: string[];

  /** Per-kanji focus: which word carries which kanji in this sentence. */
  targets: {
    kanji: string;            // "暑"
    word: string;             // "暑い"
    reading: string;          // "あつい"
  }[];

  japanese: string;           // full sentence, VERBATIM from source
  tokens: Token[];            // segmentation + readings, for furigana rendering
  english: string;            // translation, VERBATIM from source

  /** Sentence complexity, independent of any kanji's own level. */
  level: "N5" | "N4" | "N3" | "N2" | "N1" | "above-N1";

  /** Japanese and English are separately authored and separately licensed. */
  source: {
    japanese: SentenceSource;
    english: SentenceSource;
  };

  /** Quality signals carried through from the corpus, for auditability. */
  signals: {
    japaneseByNativeSpeaker: boolean;
    englishByNativeSpeaker: boolean;
    hasAudio: boolean;
  };

  review: ReviewStatus;
}
```

Contrast notes are **their own entity**, keyed by the word pair — the 暑い/熱い
distinction is a property of the pair, not of any sentence that happens to use
one of them. Attaching it to sentences (as v0.1 did) duplicates the note across
every sentence for that kanji and lets copies drift apart.

```typescript
// lib/sentences/types.ts

export interface ContrastPair {
  id: string;                 // "atsui-hot"
  sharedReading?: string;     // "あつい" — present when the confusion is homophony
  members: {
    word: string;             // "暑い"
    kanji: string;            // "暑"
    gloss: string;            // "hot (ambient / weather only)"
    exampleSentenceId: string; // must resolve to a real ExampleSentence
  }[];
  /**
   * Original editorial content — ours, not the corpus's. Labelled as our
   * explanation in the UI so the provenance line stays honest.
   */
  note: string;
}
```

---

## Validation (CI)

The provenance rule is only worth as much as its enforcement. Add a
`pnpm validate:sentences` script alongside the existing
`scripts/validate-schema.ts`, wired into CI like the existing `schema-check.yml`
workflow. It must fail the build on any of:

- A `kanji` entry that does not literally occur in the sentence's `japanese`.
- A `tokens` array whose concatenated `surface` values don't reconstruct
  `japanese` exactly. (This is the check that catches silent corruption of a
  verbatim source sentence.)
- Any `reading` containing non-kana characters.
- A duplicate `id`, or a `kanji` reference not present in the kanji dictionary.
- A missing/unknown `license`, or a missing `review` record.
- A `ContrastPair` whose `exampleSentenceId` doesn't resolve.

---

## Performance Architecture: static-first, no DB

Follows the pattern already established for kanji data (`lib/constants/*-kanji.ts`,
statically imported, prerendered per `docs/mvp/simplified-architecture.md` and
`app/kanji/[character]/page.tsx`): flat files, `generateStaticParams`,
`revalidate: 86400`. Sentences slot into the same model — new files, same
pattern, no new infrastructure.

- `data/sentences/n5.json`, `n4.json`, … one file per level, mirroring the
  kanji constants layout.
- Kanji detail pages resolve sentences at build time. No runtime fetch, no
  client-side loading state, no DB round trip. Pages stay 100% static HTML.
- This is deliberately *unlike* the SVG CDN-proxy pattern
  (`app/api/kanji-svg/[hex]/route.ts`) — that exists because stroke SVGs are
  third-party assets we don't own. Sentences are first-party curated content, so
  there's no reason to introduce a fetch.

### What actually constrains this (and what doesn't)

v0.1 argued from gzipped transfer size. **That's the wrong metric: in a
static-first design the corpus never ships to a client at all.** Nothing is
gzipped and sent. The real constraints are three, none of which bind at Phase 1
scale (~82 kanji, a few hundred sentences, ~200KB):

1. **Server bundle size.** `dynamicParams = true` means `/kanji/[character]` has
   a serverless function, and anything the route imports is traced into it. At
   full corpus scale (single-digit MB) this is well inside Vercel's limits, but
   it is the number to watch, not transfer size.
2. **Build time and memory** across 1,896 prerenders. Measure at each phase
   boundary; the staged rollout gives natural checkpoints.
3. **Page weight against the existing Lighthouse gate.** `lighthouserc.js` holds
   `/kanji/<char>` at 260 kB script / 440 kB total (baselines 228 kB / 363 kB),
   and already flags LCP ~3s on that template as known debt. The rendered
   sentence block is small, **but the client/server boundary matters**: if
   sentences are rendered by a Client Component, the data is serialised into the
   RSC payload *in addition to* the HTML, paying for it twice.
   **Requirement: the sentence section renders in a Server Component.** Any
   interactivity (furigana toggle, show/hide translation) must be a small client
   island receiving only what it needs — or be done in CSS.

**Read volume was never going to be the reason to reach for a database here.**
Static files + Vercel's CDN serve this at effectively unlimited scale, the same
way the rest of the site already works.

### Correction: `revalidate` does not give content freshness here

The existing comment in `app/kanji/[character]/page.tsx` says revalidation lets
"a content change ship without a full rebuild." That is not true for bundled
constants: ISR re-runs the render against the *same* compiled data, so a
sentence correction still requires a redeploy. This doesn't change the
architecture, but it does mean the time-to-fix for a reported-bad sentence is
"time to merge and deploy," which is worth knowing — and it strengthens trigger
#1 below rather than weakening it.

---

## When to actually reach for a database

The trigger is never "too much data to serve fast." It's one of these:

1. **Non-engineer editorial workflow.** If a content/QA person needs to add,
   correct, or approve sentences through a UI without touching git and waiting
   for a PR + deploy, a static file can't satisfy that. Given the correction
   above — bad sentences can only be pulled by redeploying — this is the trigger
   most likely to fire in practice, and it's about the *write/edit* path, not
   serving reads. That's a lightweight CMS or a Postgres-backed admin (Vercel
   Marketplace / Neon).
2. **User-generated writes.** A "submit your own sentence" or "upvote" feature
   has no static equivalent. Note that *report an inaccurate sentence* does
   **not** need a DB — but it also isn't free: reusing
   `app/api/feedback/route.ts` means adapting a route that currently requires a
   `rating` field, caps messages at 500 chars, and rate-limits to 2 submissions
   per 10 minutes per IP. Workable, but it's a small change, not a no-op.
3. **Corpus outgrows a client-side index.** If this becomes general sentence
   search ("find sentences using causative + て-form") rather than per-kanji
   lookup, a client-side index (FlexSearch/MiniSearch) covers tens of thousands
   of sentences comfortably. Only past roughly 50k–100k sentences, or with
   server-side faceted filtering, does it become a DB/search problem.

None are true for the scope here. **Recommendation: build static-first;
revisit when #1 or #2 becomes a real roadmap item** — the trigger is "who edits
this and how," not sentence-serving performance.

---

## SEO Treatment

The literary-citation angle is gone with Aozora. What remains is real, but it
needs to be aimed correctly.

### The duplicate-content problem (address this first)

Tatoeba sentences appear verbatim on Jisho, Weblio, Tanoshii, Reverso and many
scraped sites. Publishing the same sentences makes that page section
**non-unique**, and attribution earns no ranking credit for duplicated corpus
text. Adding sentences alone is not an SEO win — it's a UX win with SEO-neutral
or slightly negative content characteristics.

What makes the pages differentiated:

- **Contrast notes** — original editorial content, written by us, existing
  nowhere else. This is the actual SEO asset, and it should be treated as the
  headline deliverable rather than an optional field.
- **Furigana quality** — token-aligned ruby is genuinely better than what most
  competitors render.
- **Honest attribution** — a trust signal for readers; treat its SEO value as
  secondary.

### Contrast pairs deserve their own URLs

"difference between 暑い and 熱い" is a recurring query with clear intent. As a
fragment on `/kanji/暑` it competes with that page's primary intent (stroke
order / meaning) and is unlikely to rank for the comparison query. Give pairs
dedicated pages — e.g. `/compare/暑い-vs-熱い` — with the kanji pages linking
into them. This also fits the existing internal-linking work
(`docs/2ndVersion/internal-linking-system.md`).

### Structured data — expectations corrected

- v0.1 proposed `citation`/`Quotation` markup. **Google has no rich result for
  `Quotation`**; it will not change SERP appearance. Add it if we want
  semantically correct markup, but do not count it as an SEO deliverable.
- Note also that the page's existing `FAQPage` block is largely inert: Google
  restricted FAQ rich results to authoritative government and health sites in
  August 2023. Worth knowing before extending that pattern by analogy.
- The genuinely useful structured-data move is on the **contrast pages**, where
  a focused `FAQPage`/`Article` around a real question ("What's the difference
  between 暑い and 熱い?") matches actual query intent.

### Re-indexing after each phase

Each phase materially changes content on already-indexed pages.
`KANJI_CONTENT_LAST_MODIFIED` (`lib/seo/site.ts:48`, currently `'2026-06-14'`)
drives both `Article.dateModified` and sitemap `lastmod`, and it is deliberately
hand-maintained. **Bump it once per phase**, at the phase's ship commit — not
per sentence edit, and never automatically, for the reason documented in that
file. Then trigger the existing `indexnow-submit` workflow for the affected
URLs.

---

## UX (to be specified before Phase 1)

Not designed yet; flagged so it isn't discovered late. Phase 1 needs decisions on:

- Placement on the kanji page relative to stroke order, readings, and
  `RelatedKanjiSection` — and its effect on the template's existing ~3s LCP.
- How many sentences render expanded vs. collapsed; mobile treatment.
- Furigana display: always on, toggle, or on-tap. (Affects whether a client
  island is needed at all — see the Server Component requirement above.)
- Attribution line placement and wording — visible enough to be honest,
  quiet enough not to dominate.
- **Empty state.** Phase 0 will confirm that some kanji have no usable
  sentences. Decide whether the section is omitted entirely (preferred) or shows
  a placeholder. It must never look broken.
- Where the report-a-problem affordance lives.

---

## Success Metrics

Defined per phase, measured with the existing datafast analytics integration:

- **Accuracy (primary):** reported-inaccurate rate per 1,000 sentence
  impressions. Target: near-zero. Any confirmed inaccuracy is a P1.
- **Engagement:** time on `/kanji/<char>` and scroll depth to the sentence
  section, before vs. after Phase 1.
- **Coverage:** % of the phase's kanji that shipped with ≥3 sentences.
- **SEO (from Phase 1, read at Phase 3):** impressions/clicks on kanji detail
  pages, and separately on contrast pages once they exist. Judge the contrast
  pages on their own queries, not blended into the kanji-page numbers.

---

## Open Questions

Reduced to what is genuinely undecided. (v0.1's furigana question is resolved —
no component exists in the codebase, one must be built, and the token-level data
model above is what makes it possible.)

1. Sentences per kanji — 3 or 5? Phase 0's coverage histogram may answer this by
   showing what's actually available.
2. Who performs human review for Phases 1–2, and are they qualified to judge
   Japanese naturalness? The 100% review bar is only meaningful if the reviewer
   is. If no qualified reviewer is available, that is a blocker on Phase 1, not
   a detail.
3. Where does the ingestion script live — `scripts/`, alongside the existing
   `tsx`-run scripts? It must be **re-runnable per-kanji**, since the dictionary
   grows one kanji at a time.
4. Do we vendor the Tatoeba dump, or fetch it at ingestion time and commit only
   the curated output? (Leaning: fetch, commit output only.)
5. Confirm Tatoeba's current attribution requirement — project-level credit vs.
   per-contributor credit — and record the answer here before Phase 1 ships.

---

## Changelog

### v0.2 (2026-07-31)

**Cut:**
- **Aozora Bunko removed entirely.** It required us to author English
  translations (violating the no-authoring rule, under a famous author's byline)
  and its public-domain status is a per-work legal determination with grey
  zones. Both are disqualifying. The "as seen in [novel]" SEO angle is dropped
  with it.
- Orthography normalisation removed — it modified verbatim source text.

**Added:**
- Explicit provenance rule as a standing constraint, with an
  excluded-sources table so the decision isn't reopened.
- Staged rollout N5 → N1, each phase coverage-gated, with a blocking Phase 0
  coverage analysis. Explicitly permits later phases shipping partial or not at
  all.
- Concrete accuracy bar: 100% review for Phases 1–2, later sampling rate derived
  from measured data rather than guessed.
- CI validation requirements, UX section, success metrics.
- Tatoeba metadata pre-filter as the first and cheapest quality pass.

**Corrected:**
- **Data model:** whole-sentence `reading` replaced with a `tokens` array —
  the original could not produce furigana, since a kana string can't be aligned
  back to kanji spans. `kanji` is now an array (a sentence serves several kanji
  without duplication). Per-side source/licence/contributor. Added `review`
  status and corpus quality `signals`. `contrasts` promoted out of
  `ExampleSentence` into its own `ContrastPair` entity.
- **Storage:** JSON + typed loader instead of large TypeScript literals.
- **Size argument:** gzipped transfer size is irrelevant when the corpus never
  reaches a client; replaced with the constraints that actually bind (server
  bundle, build time, Lighthouse budget, Server Component requirement). v0.1's
  "15 sentences/kanji ≈ 6MB" was also arithmetically wrong (≈12MB).
- **`revalidate`:** noted that ISR does not refresh bundled data, so fixes
  require a redeploy.
- **SEO:** added the duplicate-content risk (corpus sentences are shared with
  every competitor); promoted contrast notes to the headline asset and gave them
  dedicated URLs; corrected the `Quotation` expectation (no Google rich result)
  and noted the existing `FAQPage` block is largely inert post-Aug-2023.
- **Repo facts:** 1,896 kanji have detail pages, not ~2,000 (N5 82, N4 171,
  N3 380, N2 259, N1 1,004). N2 is 259, not "~370." `NON_JLPT_KANJI` (102) is
  defined but unwired and out of scope. Reusing `app/api/feedback/route.ts`
  needs adaptation (required `rating`, 500-char cap, 2-per-10-min rate limit).
