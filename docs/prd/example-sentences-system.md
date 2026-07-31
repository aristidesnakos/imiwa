# Product Requirements Document: Kanji Page Content — Etymology, Dictionary Entries, Example Sentences

## Document Info
- **Version**: 0.3 (Phase 0 complete; scope widened to the full page hierarchy)
- **Created**: 2026-07-31
- **Revised**: 2026-07-31
- **Status**: Proposed — Phase 0 complete, Phase 1 blocked on the legal items in
  "Legal blockers"
- **Owner**: Ari Nakos (also the reviewer — see Review Capacity)

> **Changes from v0.2** are summarised at the bottom. The structural change: this
> is no longer a sentences-only PRD. The kanji page hierarchy has been decided as
> **kanji → etymology → dictionary related entries → example sentences**, and the
> licence investigation resolved sourcing for the two new middle layers. Phase 0
> ran and its findings are folded in throughout.

**Companion documents** (read alongside; they are the evidence this doc rests on):
- [`example-sentences-phase0-findings.md`](./example-sentences-phase0-findings.md) — Phase 0 results
- [`example-sentences-phase0-coverage.md`](./example-sentences-phase0-coverage.md) — generated coverage tables
- [`content-source-licence-investigation.md`](./content-source-licence-investigation.md) — licence analysis for etymology and dictionary entries
- `lib/sentences/types.ts` — **the authoritative data contract.** Where this doc
  and that file disagree, the file wins and this doc is wrong.

---

## Problem Statement

User feedback: kanji pages show meaning/readings/stroke order but no example sentences, so learners can't see a kanji used in context. Requirements from that feedback:

1. Sentences must be **accurate** — correct readings, natural grammar, correct kanji usage.
2. Sentences must be **realistic** — not stilted textbook filler.
3. Where useful, show how **near-synonyms** differ (e.g. 暑い vs 熱い — both "hot," different kanji, different context).
4. There's an SEO angle if sentences can be attributed to **real, citable sources** rather than presented as generic/AI-written filler.

Working on that feedback surfaced a larger gap. A kanji page that jumps straight
from "here is the character" to "here is a sentence" skips the two steps a
learner actually needs in between: *what is this character made of*, and *what
words does it appear in*. So the target page hierarchy is now:

> **kanji → etymology → dictionary related entries → example sentences**

Only the first layer exists today. `KanjiData` is four fields
(`kanji, onyomi, kunyomi, meaning`). This document covers all four layers: where
each one's content comes from, how it's vetted, how it's modelled and stored, how
the feature rolls out, and — since the original ask was specifically "when do we
need a database" — the concrete conditions that would justify one.

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

### The companion rule: structural separation (new in v0.3)

The provenance rule was written for honesty. The licence investigation showed it
is also the thing that keeps our own writing proprietary — and that it now has to
cover three licensed sources, not one:

> **Rule: licensed third-party content renders in its own component, verbatim,
> with its own attribution line. Our editorial voice never interleaves with it.**

Break that rule — weave our gloss into a JMdict definition, or annotate inside a
Tatoeba sentence — and *both* licence analyses below flip to "we produced a
derivative work" simultaneously. This is an architectural constraint on the
components, not a style preference. It is why the etymology prose and the
dictionary entries are separate sections rather than one blended "about this
character" block.

---

## The page: four layers

The order is not cosmetic. Each layer is one step further from the character
itself, so the page reads as a widening context: *what it is → what it's made of
→ what words it lives in → what sentences those words live in.*

| # | Layer | Content | Source | Licence | Exists today |
|---|---|---|---|---|---|
| 1 | **Kanji** | character, primary meaning, onyomi, kunyomi, stroke order animation | `lib/constants/*-kanji.ts` (ours) + KanjiVG | ours / CC BY-SA 3.0 | **yes** |
| 2 | **Etymology** | component decomposition (校 = 木 + 交), then our written origin prose | RADKFILE/KRADFILE (EDRDG) + **our writing** | CC BY-SA 4.0 / **proprietary** | no |
| 3 | **Dictionary related entries** | words that use this kanji (日 → 日本, 日曜日, 毎日) with readings and glosses | JMdict (EDRDG) | CC BY-SA 4.0 | no |
| 4 | **Example sentences** | JP/EN sentence pairs with token-aligned furigana | Tatoeba | CC BY 2.0 FR | no |

**"Related Kanji" is not layer 3.** `RelatedKanjiSection`
(`components/kanji/RelatedKanjiSection.tsx`, fed by `lib/linking/kanji-links.ts`)
shows semantically-similar **characters** — 暑 → 熱, 温, 冷. Layer 3 shows
**words containing this character**. Different data, different purpose, both keep
their place: the internal-linking grid stays where it is, below the four layers,
because it is navigation rather than content. When both are on the page, their
headings must be distinguishable — "Words using 日" for layer 3, "Related Kanji"
for the grid. Two sections both called "related" on one page is a UX bug waiting
to be reported.

### Render order on `/kanji/[character]`

Against the current template (`app/kanji/[character]/page.tsx`):

1. Breadcrumb, H1 (character + primary meaning), JLPT badge — unchanged
2. Stroke order animation ‖ Meaning & Readings grid — unchanged
3. **Etymology** — components row, then prose if we've written it
4. **Words using this kanji** — JMdict entries
5. **Example sentences** — Tatoeba pairs, with per-sentence attribution
6. Contrast-note link, where a `ContrastPair` exists for a word on this page
7. Tan mascot accent → `RelatedKanjiSection` → `AdBanner` → `CTASection` — unchanged

Our proprietary content (etymology prose, contrast note) sits **above** the
licensed content. That is the right order pedagogically and also the right order
for search: the unique text is the part worth indexing, and it should not be
below 400 words of corpus text that appears on Jisho and Weblio too.

### Degradation — how each layer behaves with no data

The governing rule: **a layer with no data is omitted entirely.** No placeholder,
no "no data available", no empty heading. The minimum viable page is exactly the
page we ship today, which is already a good page. Every layer is additive and
every layer is independently optional.

| Layer | When it's missing | Behaviour |
|---|---|---|
| Components (2a) | kanji absent from RADKFILE | omit the components row; prose (if any) still renders |
| Etymology prose (2b) | not yet written — **the default state for most of the 1,896 kanji for a long time** | render components alone; the section still has a reason to exist |
| Both of layer 2 | neither available | omit the Etymology section |
| Dictionary entries (3) | no JMdict entry passes the common-word filter | omit the section |
| Sentences (4) | no reviewed sentence — **159 N1 kanji will never have one** (Phase 0 §1) | omit the section |
| Contrast link (6) | no pair covers a word on this page — the normal case | omit |

This is not a hypothetical. Phase 0 confirmed 160 kanji have zero usable sentence
candidates (159 N1, 1 N2: 坑), and etymology prose will lag sentences by
construction. **A kanji page with no sentence section is strictly better than one
with a fabricated sentence** — and a page with components but no prose is
strictly better than a page with prose we didn't verify.

### Performance note on the layered page

All four layers render in **Server Components**. The template already carries
known LCP debt (~3s, flagged in `lighthouserc.js`), and three new sections make
that worse if any of them ships as a Client Component — the data would be
serialised into the RSC payload *in addition to* the HTML, paying for it twice.
See "Performance Architecture" for the full constraint set. Interactivity
(furigana toggle, expand/collapse) is a small client island or CSS, never a
client-rendered section.

---

## Sourcing Strategy

### Layer 4 — example sentences: Tatoeba (sole source)

- Large, sentence-aligned JP↔EN corpus, open-licensed, and already the de facto
  source most Japanese-learning tools (Jisho, WaniKani community lists, etc.)
  use for example sentences — a well-worn pattern, not a novel legal risk.
- **Critically: both sides are human-authored.** The Japanese sentence and its
  English translation are each written by a Tatoeba contributor. This is what
  lets the provenance rule hold with no carve-outs — we never have to originate
  text.
- Coverage is **not** the constraint. Phase 0 measured 99–100% of kanji covered
  at ≥3 usable candidates for N5–N2, with medians of 130–800 candidates per
  kanji. See "Rollout Phases — Phase 0 (complete)".
- Weakness: quality is uneven since it's crowd-contributed. Needs a filtering and
  ranking pass, not blind ingestion. See "Vetting pipeline."

**Licence handling — the Japanese sentence and the English translation are
separate objects with separate authors and potentially separate licences.**
The ingestion script reads licence and contributor per sentence ID, and the data
model stores provenance for each side independently. Phase 0 measured the actual
composition: of 248,821 Japanese sentences, exactly **two** are CC0 (both are
sentences *about* Creative Commons). So the JP side is CC BY 2.0 FR in practice —
but the per-side modelling stays, because a CC0 JP / CC BY EN pair is a live case
and the reverse is impossible.

**Attribution — resolved (was open question #5).** Tatoeba's own sources
conflict: its FAQ permits project-level credit only and endorses Clozemaster's
form by name, while its Terms of Use §6.2/§6.5 and the CC BY 2.0 FR legal code
require crediting the individual author. **We credit both the project and the
per-sentence contributor.** Tatoeba does not own the sentences and cannot waive
contributors' rights on their behalf; the licence is the *French* port and
Tatoeba is a French association, where *droit de paternité* is inalienable. The
strict reading costs one extra field and satisfies the permissive reading
simultaneously. Required form, per sentence pair displayed:

> 猫だ！ — *Cat!*
> JP [#8858176](https://tatoeba.org/en/sentences/show/8858176) by **moxy** ·
> EN [#6581103](https://tatoeba.org/en/sentences/show/6581103) by **rul** ·
> [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/)

A null contributor is **common and expected** — 40.2% of Japanese sentences are
unadopted Tanaka Corpus imports. Null renders as project-level credit alone, not
as a missing-data error.

Plus a site-wide credits page naming Tatoeba, the licences, our selection
methodology, and an explicit reservation of rights over our own commentary.

**No Tatoeba audio, ever.** Per-recording licences include CC BY-NC and
CC BY-NC-ND, and 74,041 recordings have an empty licence field meaning "may not
be reused outside Tatoeba". NC is fatal to a paid tier. Text has no NC option;
audio does. Audio presence is an internal **ranking signal only** and never
ships.

### Layer 3 — dictionary related entries: JMdict

**Source: JMdict**, from the Electronic Dictionary Research and Development
Group. This is a cleaner grant than Tatoeba's:

| | |
|---|---|
| Licence | **CC BY-SA 4.0** |
| Commercial use | **Explicitly permitted.** "there is NO restriction placed on commercial use of the files. The files can be bundled with software and sold for whatever the developer wants to charge." |
| Agreement needed | None. "No contract or agreement needs to be signed in order to use the files." |
| Covered files | JMDICT, EDICT, ENAMDICT, COMPDIC, KANJIDIC2, KANJIDIC, KANJD212, **RADKFILE**, **KRADFILE** |

Source: [edrdg.org/edrdg/licence.html](https://www.edrdg.org/edrdg/licence.html)

**The one hard condition:** the acknowledgement "must be made **on each screen
display**, e.g. in the form of a message at the foot of the screen or page."

**This is now satisfiable, and it wasn't a week ago.** The licence investigation
§0 found that `<Footer />` — which carries our KanjiVG attribution — was imported
per-page and was **not** on `/kanji/[character]`. Around 1,900 pages displayed
KanjiVG SVGs with the CC BY-SA 3.0 credit sitting on a different page. That was a
live compliance gap, not a new-feature problem. **Fixed today:** `<Footer />` now
renders from `app/layout.tsx`. The EDRDG and Tatoeba acknowledgement lines still
have to be *added* to it before layers 3 and 4 ship — see "Legal blockers".

#### ShareAlike: the analysis, precisely

The live question is whether CC BY-SA 4.0's ShareAlike term forces our own
etymology prose and contrast notes to become CC BY-SA. **It does not — but the
reasoning is *not* the same as the Tatoeba one, and the difference is the whole
point.**

- **CC BY 2.0 FR (Tatoeba) protects us with an express carve-out.** Art. 4
  excludes the surrounding *Collective Work* from the licence. Our commentary
  sitting next to a Tatoeba sentence is sheltered by the licence text itself.
- **CC BY-SA 4.0 (EDRDG) has no such clause.** It does not define or even use the
  word "Collection" anywhere in its legal code — the 4.0 rewrite dropped the
  2.0/3.0 "Collective Work" machinery entirely.
- **The protection instead comes from how ShareAlike is scoped.** §3(b) opens:
  "if You Share **Adapted Material** You produce, the following conditions also
  apply." §1(1) defines Adapted Material as material "derived from or based upon
  the Licensed Material and in which the Licensed Material is **translated,
  altered, arranged, transformed, or otherwise modified** in a manner requiring
  permission."
- So: reproduce JMdict entries **unmodified** → no Adapted Material is produced →
  no ShareAlike trigger. Our surrounding prose was never derived from JMdict, so
  it isn't caught either.

**This is a narrower shelter than the Tatoeba one, and it is conditional.** It
depends entirely on "unmodified" holding, where CC BY 2.0 FR would have protected
the collective work regardless. Note that the word **"arranged" sits inside the
Adapted Material definition** — so aggressive restructuring of JMdict entries is
a live risk in a way that restructuring Tatoeba sentences is not.

Concretely, for layer 3 that means:

- **Permitted:** choosing *which* entries to show (selection), how many, and
  their visual presentation — typography, layout, ordering of the entry list.
- **Not permitted without triggering ShareAlike:** rewriting or shortening a
  gloss, merging senses, re-ordering senses *within* an entry, blending our own
  gloss into theirs, or "improving" a definition.
- Selection filter: common words only, via JMdict's own frequency markers
  (`ichi`/`news`/`spec` tags and `nf01`–`nf48` bands). Cap at a small number per
  kanji. The cap is a UX and page-weight decision, not a licence one.

**Correction to the licence investigation §2.2.** That section says our etymology
is "protected under the same Art. 4 / Collection reasoning that shelters our
contrast notes." That is wrong as written for the etymology layer, because the
neighbouring licensed content there is RADKFILE — an **EDRDG CC BY-SA 4.0** file,
which has no Art. 4 and no Collection concept. The correct reasoning for
etymology is the §1 reasoning above: our prose is not derived from RADKFILE, and
RADKFILE's component lists are reproduced unmodified, so no Adapted Material
exists and ShareAlike never engages. Same conclusion, different route — and the
route matters, because the §1 route is conditional on "unmodified" and the Art. 4
route isn't.

### Layer 2 — etymology: components now, our own prose later

**Decision (was the licence investigation's one open item): ship component
decomposition immediately as data; backfill our own written prose per JLPT
level, on the same phase gates as the sentences.**

#### 2a. Components — RADKFILE/KRADFILE, ship first

校 = 木 + 交. Free, cleanly licensed under the same EDRDG grant as JMdict, covers
the full jōyō set and beyond, and requires no writing. It is a real section on
day one — just a thin one. Rendered as data with no prose, so nothing about it
can be wrong.

#### 2b. Prose — ours, written by us, backfilled per level

**No etymology dataset is licensable.** Every candidate fails:

| Source | Licence as advertised | Why it fails |
|---|---|---|
| **KANJIDIC2** | CC BY-SA 4.0 | **Has no etymology field.** Codepoints, radicals, grade, strokes, frequency, readings, meanings, query codes, variants. Character origin is not among them. The clean EDRDG grant simply doesn't reach this layer. |
| **Kanjium** | CC BY-SA 4.0 | Its origin data is **images from chineseetymology.org**. The upstream grant is missing, so the downstream badge is void as to that data. (Its pitch-accent and composition data is separately sourced and is fine.) |
| **hanziyuan.net / chineseetymology.org** (Richard Sears) | none | "Copyright © 1994-2017 Richard Sears… All rights received." No licence, no terms page, no redistribution grant. |
| **Kanjimori** | unstated | "Public distributions of the data are currently unavailable while Kanjimori is under development." Nothing to license yet. |
| **Kanji Alive** | CC BY 4.0 | Clean licence, wrong dataset — readings/meanings/radicals/stroke/audio, not etymology. Announcement notes undisclosed "exceptions due to copyright restrictions." |
| **Wiktionary** | CC BY-SA 3.0/4.0 | Licensed, but declined — see below. |
| **Outlier Linguistics, Henshall, 漢字源** | commercial | No redistribution grant. |

**This is the Tanos pattern again** (Phase 0 §2): a well-maintained downstream
package wearing an open badge over data its upstream never granted. Kanjium is
honest about it — it names chineseetymology.org as its source, which is exactly
how we caught it. **Check the upstream every time.**

**Why not Wiktionary, even though it is licensed.** Three independent reasons:

1. **ShareAlike lands on the one thing we most want to own.** Etymology copy is
   prose, not data. Reusing it makes our etymology section *itself* Adapted
   Material, which must then be CC BY-SA. This is the one layer where no
   separation shelter helps, because there is no line between "their content" and
   "our voice" when the content *is* voice.
2. **It is duplicate content.** We already concede this problem for Tatoeba
   sentences. Wiktionary etymology is on Wiktionary, Jisho, and every scraper
   downstream of them. Copying it adds a section that ranks for nothing.
3. **Quality is uneven and unattributed per entry.** Some entries are excellent;
   some are folk etymology. Verifying them costs about what writing them costs.

**Why writing it ourselves is legitimate.** Etymological *facts* are not
copyrightable. That 日 is a pictograph of the sun, that 明 combines 日 and 月,
that 校 is 木 + 交 phonetic — these are facts about the world. Copyright protects
the *expression* of facts, not the facts ([Feist v. Rural
Telephone](https://copyrightalliance.org/faqs/whats-not-protected-by-copyright-law/),
499 U.S. 340). We may read Henshall, Outlier and Wiktionary as **references**,
verify against them, and write our own prose — **provided we write, not
paraphrase closely.** That proviso is the whole safety margin; close paraphrase
of a distinctive Wiktionary sentence is infringement wearing a hat.

**This makes etymology the proprietary differentiator.** Zero licence exposure,
no third-party acknowledgement burden, and unique text on ~1,900 pages where
every competitor has either nothing or the same Wiktionary paste. See "SEO
Treatment".

**The cost is editorial and it is the same cost as the sentence review, borne by
the same person.** ~1,900 kanji of original writing is not a sprint. It stages
exactly like the sentences do — N5 (82) first, on the same gate, with the same
reviewer. See "Review Capacity" for why that is now the binding constraint on the
whole PRD rather than a footnote.

### Excluded sources, and why

Recording these so decisions aren't quietly reopened.

| Source | Layer | Why excluded |
|---|---|---|
| **Aozora Bunko** | sentences | Two independent disqualifiers. (a) *No English.* Aozora is Japanese-only, so every sentence would need a translation we author — a direct violation of the provenance rule, and one we'd be publishing under a famous author's name. (b) *Licence is not uniformly clean.* "70 years post mortem" is not a usable blanket test: Japan's 2018 extension from 50→70 years was **non-retroactive**, there is a wartime addition (戦時加算) for some Allied-national authors, Aozora hosts non-public-domain works under rights-holder permission with per-work conditions, and Aozora credits its own 入力・校正 transcription volunteers. Determining status is per-work legal work with a real error rate. Grey zone → excluded. |
| **LLM-generated sentences** | sentences | Cannot carry a source attribution. Defeats the entire premise. |
| **Textbook / commercial dictionary examples** | sentences | Copyrighted. Not available to us. |
| **Scraped web sentences** | sentences | Unknown provenance and licence by definition. |
| **Tatoeba audio** | sentences | Per-recording NC / NC-ND / blank licences. Fatal to a paid tier. Ranking signal only. |
| **tanos.co.uk and everything derived from it** (Jisho JLPT tags, `jlpt-vocab-api`, `Bluskyo/JLPT_Vocabulary`, `stephenmk/yomitan-jlpt-vocab`, the Kaggle/HuggingFace sets) | level filter | One personal reconstruction showing "© Jonathan Waller" with **no licence grant on any page**. The MIT/CC-BY badges downstream are void as to the data: you cannot license out what you were never licensed. |
| **WaniKani** | level filter | ToS forbids reproduction. |
| **Kanshudo** | level filter | No redistribution grant. |
| **BCCWJ, 日本語教育語彙表** | level filter | Research/education only, no commercial grant. |
| **Leipzig corpora** | level filter | NC. |
| **Kanjium origin data, chineseetymology.org, Kanjimori, Wiktionary, Henshall, Outlier, 漢字源** | etymology | See the etymology table above. |

**What excluding Aozora costs us, stated honestly:** v0.1 pitched "暑い appears in
夏目漱石's こころ (1914)" as the headline SEO play. That play is gone. As of v0.3
the differentiator is (a) **our own etymology prose** — original content on
~1,900 pages, (b) correct, verifiable attribution where competitors show
unattributed examples, (c) high-quality furigana, and (d) the near-synonym
contrast notes.

---

## Vetting pipeline (layer 4)

Ordered cheapest-first, so the expensive passes run on a small candidate set.
**Steps 1 and 3 changed in v0.3 as a direct result of Phase 0.**

1. **Metadata pre-filter — corrected.** v0.2 said to *prefer* JP sentences owned
   by a self-declared native speaker with recorded audio, treating those as
   filters. Phase 0 measured what that costs and it is a bad trade:
   - "JP owner declares native" costs **16 percentage points** of coverage, and
     it is a weak signal for the price — only **660 users** declare native
     Japanese (against 30,790 for English), self-reported and unverified.
   - **40.2% of Japanese sentences are orphaned**, and **99.65% of those orphans
     are unadopted Tanaka Corpus imports** — a curated textbook-derived corpus,
     not abandoned junk. Filtering on ownership discards a large, decent subset
     for a reason that does not apply to it.

   **Rule: native-ownership, ownership itself, and audio are *ranking* signals,
   never *exclusion* filters.** Exclude only on objective criteria: no English
   translation, length outside 8–60 characters, level mismatch. `isTanaka` is
   carried through in `QualitySignals` precisely so the ranker can treat Tanaka
   provenance as neutral-to-positive rather than as missing ownership.
2. **Candidate pull.** For each target kanji, pull sentences where it appears in
   a common word, not a rare compound.
3. **Level filtering — replaced.** v0.2 said to score against "a JLPT
   vocabulary/grammar frequency list." **No such list can be licensed.** The JLPT
   has published no vocabulary lists since the 2010 redesign — EDRDG states it
   plainly in the KANJIDIC docs: *"No official kanji lists are available for the
   new levels."* Every list in circulation traces to tanos.co.uk, which carries
   no licence grant. Under the provenance rule that is a grey zone, so it is out.

   **Resolution: proxy complexity from our own dictionary.** We already own a
   level assignment for 1,896 characters (`lib/constants/*-kanji.ts`). A sentence
   is treated as no harder than its hardest *known* kanji; kanji absent from our
   dictionary are tolerated rather than treated as maximally hard. Zero licence
   exposure, self-consistent with the rest of the site.

   **Stated honestly, this is a floor and not a level model.** It captures
   nothing about grammar — a sentence of only N5 kanji can still use N2 grammar.
   It also inherits our dictionary's composition problems (see "Dictionary
   composition"): 1,278 kanji that appear in the corpus are in none of our level
   files, so "unknown kanji" is common and must be handled leniently, not scored
   as N1. The chosen shipping tier does exactly that — it is the
   "≤1 level harder, unknown kanji ok" row in the coverage tables.

   If we later want a real complexity model, the clean path is JMdict frequency
   bands (`nf01`–`nf48`) + KANJIDIC2 `<grade>` + the published Lee & Hasebe
   jReadability regression. **Note that the licence obstacle to this is now
   gone:** Phase 0 deferred it partly because EDRDG's per-screen acknowledgement
   meant a site-wide footer change, and we're paying that cost anyway for JMdict.
   What remains is scope, not licence — it is a Phase 3+ option, not a Phase 1
   one.
4. **Reading / dictionary cross-check.** Verify the reading used against JMdict.
   Multi-reading kanji (生 has ~15 readings) and homophone pairs (暑い/熱い) are
   exactly where "accurate" breaks if unchecked. This pass also produces the
   token-level furigana data (see Data Model).
5. **LLM-assisted scoring, never authoring.** An LLM pass flags naturalness,
   register, and translation-accuracy problems on real candidates. It may
   **reject or re-rank**. It may never rewrite, and it may never emit text that
   reaches the page.
6. **Human review.** See "Accuracy bar" and "Review tooling" — this is not a
   rubber stamp and its rate is defined per phase, not left open.
7. **Contrast pass.** For kanji with a well-known near-synonym confusion, select
   or pair one corpus sentence per side and write a contrast note. The note is
   ours and is labelled as ours; the sentences remain corpus-sourced, in their
   own component, unmodified.

### Tokenizer — `@sglkc/kuromoji`, with a known accuracy ceiling

Word-boundary detection and token-level furigana readings. Build-time only, so no
runtime bundle cost.

`lindera-wasm-ipadic-nodejs` produces byte-identical output and is actively
maintained, but it broke its JS API twice in three months and has ~295
downloads/month; kuromoji is frozen but has 1.28M and the furigana-alignment
ecosystem. Both ship the same frozen IPADIC 2.7.0 dictionary, so **the readings
are identical** — this is a maintenance-risk choice, not a quality one, and
switching later is a ~20-line adapter.

Licence note: IPADIC is the custom **NAIST-2003** licence (not BSD, as is often
claimed). Redistribution is permitted with the copyright notice retained. It is
build-time only, so it never ships to a client.

**Reading accuracy ceiling is ~95–97%, and the failure modes are known:**
`一人`→イチニン, `行った`→オコナッタ, `一日中`→イチ・ニチ・チュウ, `人気`→ニンキ,
and null readings on rare kanji. **These are exactly what human review must gate
on** — they are silent, plausible-looking errors, which is the worst kind for a
site whose claim is accuracy. This is why `Token.readingUnknown` exists in the
data contract and why CI fails on any of them reaching publish.

### Accuracy bar

The v0.1 phrase "spot-check a sample" is too loose for a claim of authority.
Concretely:

- **Phases 1–2 (N5, N4): 100% human review.** 253 kanji × 3 sentences ≈ **760
  sentences** to read and adjudicate. This is tractable, and it's how we calibrate
  whether the automated passes are trustworthy.
- **Phase 3+ (N3 and up): sampled review, rate set by the measured Phase 1–2
  reject rate — and by the reject-*reason* distribution, not just the rate.** If
  the pipeline's output was ≥98% accepted at 100% review, a 20% sample is
  defensible. If it was 85%, it isn't, and the pipeline gets fixed before the
  phase ships. **The sample rate is an output of the earlier phases, not a guess
  made now.**
- Every sentence carries its review status in the data. Unreviewed sentences are
  not publishable — a sentence is either reviewed or it was auto-accepted under a
  measured-and-recorded policy, and the record says which.
- A reported-inaccurate sentence gets removed first and adjudicated second.

**Etymology prose has its own bar and it is simpler:** every line we publish is
verified against at least two independent references before it ships, and the
section is omitted until it is. There is no sampling tier — we are the author, so
there is no upstream to sample.

---

## Legal blockers

Owner-actionable, and **Phase 1 does not ship until these are closed.** Promoted
to its own section in v0.3 because in v0.2 they were scattered as asides and one
of them (the missing footer) turned out to be a live breach nobody had noticed.

### B1. Terms of Service carve-out — required before Phase 1

`app/tos/page.tsx` exists. A blanket "all content on this site is proprietary"
clause would breach three licences at once. The ToS needs to say, in substance:

1. Kanji stroke diagrams derive from **KanjiVG** (CC BY-SA 3.0).
2. Dictionary entries and component data derive from **EDRDG files** (JMdict,
   RADKFILE/KRADFILE; CC BY-SA 4.0).
3. Example sentences derive from **Tatoeba contributors** (CC BY 2.0 FR), are
   reproduced unmodified, and rights remain with the individual contributors
   named on each sentence.
4. **Everything else — our etymology, contrast notes, selection, arrangement,
   design and code — is ours and is reserved.**
5. A login paywall over the collection is permitted; **DRM on the licensed
   components is not.**

Point 4 is what makes the business defensible. Point 5 is B3.

### B2. Counsel sign-off — one review, not two

Two questions that look different and are the same question:

- Does CC BY 2.0 FR Art. 4's Collective Work carve-out shelter our commentary
  sitting alongside Tatoeba sentences?
- Does CC BY-SA 4.0's Adapted Material scoping (§3(b) + §1(1)) shelter our
  commentary sitting alongside unmodified JMdict/RADKFILE data, given that 4.0
  has **no** Collection carve-out?

Both reduce to: *does structural separation without modification keep our prose
outside the licence?* **Send them together.** The answer determines whether the
proprietary-content position in B1 point 4 holds, which is the commercial premise
of the whole content roadmap.

Flag for counsel specifically: the word **"arranged"** in the CC BY-SA 4.0
Adapted Material definition, and whether our selection-and-presentation of JMdict
entries stays clear of it.

### B3. DRM constraint on any paid tier

CC BY-SA 4.0 **§2(a)(5)(iii)**: "You may not offer or impose any additional or
different terms or conditions on, or apply any Effective Technological Measures
to, the Licensed Material if doing so restricts exercise of the Licensed Rights
by any recipient." CC BY 2.0 FR carries a parallel restriction.

**A login paywall is fine. Encryption, obfuscation, or copy-prevention applied to
the licensed components is not.** This constrains how a paid tier can be built,
and it is cheaper to know now than after building one. Combined with the audio
exclusion (NC is fatal to a paid tier), the rule is: the paid tier gates *access*,
never *the licensed bits themselves*.

### B4. Footer acknowledgements — one line each, before the layer ships

`<Footer />` now renders site-wide from `app/layout.tsx` (fixed today). It
currently carries **only** the KanjiVG attribution. Before layers 3 and 4 ship it
needs:

- an **EDRDG** acknowledgement (JMdict, RADKFILE/KRADFILE, CC BY-SA 4.0) —
  required "on each screen display," which is precisely why this must be in the
  layout footer and not on a credits page alone;
- a **Tatoeba** project-level credit, alongside the per-sentence contributor
  credits rendered in the sentence component itself.

Plus the credits page described under layer 4. **The site-wide footer satisfies
all four display obligations**; nothing else needs a per-page change.

### Consolidated licence surface

| Source | Layer | Licence | Obligation | Status |
|---|---|---|---|---|
| KanjiVG | stroke diagrams | CC BY-SA 3.0 | attribution on each display | **satisfied** (footer moved to layout today) |
| JMdict | dictionary entries | CC BY-SA 4.0 | per-screen acknowledgement | B4 |
| RADKFILE/KRADFILE | components | CC BY-SA 4.0 | per-screen acknowledgement | B4 |
| Tatoeba | example sentences | CC BY 2.0 FR | per-contributor + project credit | B4 + per-sentence line |
| IPADIC | tokenizer dictionary (build-time) | NAIST-2003 | retain copyright notice | pipeline only, never shipped |
| **our etymology** | **etymology prose** | **proprietary** | **none** | — |
| **our contrast notes** | **contrast pages** | **proprietary** | **none** | — |

---

## Rollout Phases

Staged per JLPT level. Each phase is gated: **it ships only if the coverage check
passes and the previous phase's accuracy held.** From v0.3 each phase covers
three layers, not one.

### Phase 0 — Coverage analysis: **COMPLETE**

Full results in
[`example-sentences-phase0-findings.md`](./example-sentences-phase0-findings.md)
and [`example-sentences-phase0-coverage.md`](./example-sentences-phase0-coverage.md).
Corpus vintage **2026-07-25**; dumps fetched to a gitignored `.tatoeba-cache/`
and never vendored (resolves open question #4). Reproduce with:

```bash
npx tsx --tsconfig tsconfig.json scripts/sentences/corpus.ts     # parser self-check
npx tsx --tsconfig tsconfig.json scripts/sentences/coverage.ts   # regenerates the tables
npx tsx --tsconfig tsconfig.json scripts/sentences/coverage.ts --kanji 暑
```

Kanji with **≥3 usable candidates** at the shipping tier (has an English
translation, 8–60 characters, no kanji more than one level above target):

| Phase | Level | Covered | Median candidates per kanji |
|---|---|---|---|
| 1 | N5 | 81 / 82 — **99%** | 429 |
| 2 | N4 | 171 / 171 — **100%** | 800 |
| 3 | N3 | 380 / 380 — **100%** | 410 |
| 4 | N2 | 256 / 259 — **99%** | 130 |
| 5 | N1 | 743 / 1,004 — **74%** | 15 |

**Phases 1–4 pass their coverage gate outright.** v0.2 anticipated coverage
thinning as kanji get rarer and staged the rollout defensively; that caution was
warranted **only for N1**.

**The medians are the more important number.** At 130–800 candidates per kanji
for N5–N2, the binding constraint is not supply — it is review capacity. The
selection step's job is *ranking a large pool well*, not scraping together enough
sentences. This inverts the assumption v0.2 was built on.

### Review Capacity — the actual constraint

Phase 0's most consequential finding, and it now has a second claimant:

- **760 sentences** to read and adjudicate for Phases 1–2 at 100% review.
- **253 kanji of original etymology prose** for the same two phases.
- **One person does both** (open question #2, resolved: the owner is the
  qualified Japanese reviewer).

This is a real risk and it is stated here rather than buried: the two
workstreams compete for the same hours, and the sentence review is the one with a
hard gate in front of Phase 2. **Mitigation: component data (layer 2a) ships
without any review cost at all**, so the etymology section can exist from Phase 1
with prose backfilled asynchronously. If prose falls behind, the section degrades
to components-only rather than blocking the phase — that is the whole reason
"components first, prose later" was chosen over "write it all first."

Sequencing recommendation: sentences gate the phase; etymology prose does not.

### Phase 1 — N5 (82 kanji)

Prove all four layers end-to-end on the smallest, best-covered level. Ship:

- layer 2a component decomposition for all 82,
- layer 2b etymology prose for as many as are written (target: all 82),
- layer 3 JMdict entries,
- layer 4 sentences with furigana rendering and per-contributor attribution,
- the review dashboard, the validation CI check, and the report-a-problem path,
- the footer acknowledgements (B4) and the ToS carve-out (B1).

3 sentences per kanji (resolves open question #1 — supply supports 5 comfortably,
but review cost scales linearly and we have no accuracy data yet). 100% human
review. **Measure before proceeding**, and measure the reject-*reason*
distribution, not just the rate.

### Phase 2 — N4 (171 kanji)

Same bar. Confirms the pipeline generalises. After this phase, set the Phase 3+
sampling rate from measured data, and revisit 3-vs-5 sentences per kanji with a
real reject rate in hand.

### Phase 3 — N3 (380 kanji)
### Phase 4 — N2 (259 kanji)

Both pass their coverage gate (100% and 99%). The gate on these is accuracy and
review capacity, not supply.

### Phase 5 — N1 (1,004 kanji)

**Expect ~74% coverage at best and treat partial as success.** 159 N1 kanji have
zero usable candidates and will never have any — they are overwhelmingly jinmeiyō
*name* characters (侯 弔 朔 瑳 笙 脩 …) that appear on no JLPT list and in zero
corpus sentences. Their pages ship with layers 1–3 and no sentence section, per
the degradation rules.

**It is an acceptable and expected outcome that a later phase ships with partial
coverage.** Inventing sentences is exactly what the provenance rule forbids.

**Not in scope for any phase:** the 102 kanji in
`lib/constants/non-jlpt-kanji.ts`. `NON_JLPT_KANJI` is defined but never imported
into `app/kanji/[character]/page.tsx`, so those kanji have no detail pages today
and there is nowhere to render a section for them. Wiring them up is separate
work. `scripts/sentences/kanji-inventory.ts` excludes them for the same reason.

---

## Data Model

**`lib/sentences/types.ts` is authoritative.** This section describes the shape
and the *reasoning*; the file describes the truth. v0.2 printed the full type
definitions here and they have since drifted — that duplication is removed in
v0.3 rather than repeated and allowed to rot.

Kept separate from the existing `KanjiData` shape in `lib/constants/*.ts` —
this content is additive, not a property of the kanji dictionary entry, and
separate files mean the curation pipeline never merge-conflicts with the kanji
dictionary files (which are actively edited; recent commits add kanji one at a
time).

**Storage format: JSON, not TypeScript literals.** A large TypeScript object
literal with union-typed fields is slow to type-check and slow for the JS engine
to parse; JSON is faster on both counts and the shape is validated by the
ingestion script and the CI check rather than by `tsc`. A thin typed loader in
`lib/sentences/` provides the types at the boundary. (`n1-kanji.ts` is already
100KB as a TS literal; an N1 sentence file would be an order of magnitude
larger.)

### Three artefacts, three lifetimes

This is the structural change since v0.2, which modelled only the published
output. Three things build against the contract and nothing else:

| Artefact | Produced by | Type | Lifetime |
|---|---|---|---|
| **Review queue** | `scripts/sentences/select.ts` | `ReviewQueue` / `KanjiQueueEntry` / `SentenceCandidate` | **regenerable and disposable** — re-running selection with a better ranker rebuilds it from the dump |
| **Decision log** | the review dashboard | `DecisionLog` / `ReviewDecision` | **durable, append-mostly, never regenerated** |
| **Published sentences** | `scripts/sentences/publish.ts` | `ExampleSentence[]` | derived — queue ∩ decisions |

**Why the queue and the decisions are separate files.** The obvious design writes
the verdict back onto the candidate row. That works when the source row is the
only copy of the item. Here it is actively harmful: the queue is regenerable, and
a reviewer's ~760 human judgements must survive a regeneration. So decisions are
keyed by the stable Tatoeba **pair** id (`tatoeba-<jpId>-<enId>`, from
`candidateId()`) and live in their own file. Re-running selection never destroys
review work; it just changes which candidates are in front of the reviewer. **A
decision whose candidate has vanished from the queue is retained, not deleted**
(`orphanedDecisions` in the publish step) — it is evidence about the ranker.

This also makes the decision log a genuine audit trail with a timestamp and a
structured reason on every row.

### Key contract points, and why they are what they are

- **`Token.reading` + `Token.readingUnknown`.** A whole-sentence kana string
  CANNOT be aligned back to the kanji spans it corresponds to, so ruby markup
  cannot be derived from it — segmentation happens once, in the pipeline, not at
  render time. Concatenating every `surface` in order MUST reconstruct `japanese`
  exactly; CI enforces it. `readingUnknown` marks the known IPADIC failure mode
  (rare kanji → null reading) so those never render as furigana and never reach
  publish. **New in v0.3.**
- **`SentenceSource.contributor` may be null, and null is normal.** 40.2% of
  Japanese sentences are unadopted Tanaka imports. Null must render as
  project-level credit, never as a missing-data error.
- **`QualitySignals.isTanaka`.** Carried so the ranker can treat Tanaka
  provenance as neutral-to-positive rather than as "unowned." **New in v0.3**,
  and it is the data-model consequence of the step-1 correction.
- **`SentenceCandidate.score` + `scoreBreakdown`.** Human-readable reasons shown
  in the review UI, so the reviewer can see *why* something ranked where it did —
  and so the ranker can be tuned against real disagreements later.
- **`RejectReason` is an enum, not free text.** The distribution is the signal.
  See "Review tooling".
- **`ReviewDecision.readingCorrections`** is keyed by token index and is **the
  only thing a reviewer may edit.** `japanese` and `english` are verbatim source
  text; editing them would break the licence's no-modification posture and make
  the attribution a lie. The UI must not offer to edit them.
- **`ContrastPair`** stays keyed by the word pair, not the sentence — the
  暑い/熱い distinction is a property of the pair, not of any sentence that
  happens to use one of them. Attaching it to sentences (as v0.1 did) duplicates
  the note across every sentence for that kanji and lets copies drift apart. Its
  `note` is original editorial content and **must render structurally separate
  from any licensed sentence text.**

### File layout

```
data/sentences/queue/<level>.json        ReviewQueue     — regenerable
data/sentences/decisions/<level>.json    DecisionLog     — durable, committed
data/sentences/published/<level>.json    ExampleSentence[] — derived, committed
data/sentences/contrast-pairs.json       ContrastPair[]  — hand-authored
```

Only `published/` and `contrast-pairs.json` are imported by the site. The queue
is committed or not at the pipeline's discretion; the decision log **must** be
committed, because it is the irreplaceable artefact.

### Layers 2 and 3 — data model, to be specified in Phase 1

Not modelled yet, deliberately: the sentence contract took three revisions to
settle and the same care is warranted here. What is already decided:

- **Components (2a)** are derived from RADKFILE/KRADFILE at build time and stored
  as a per-kanji component list, reproduced **unmodified**. No prose field.
- **Etymology prose (2b)** is a separate first-party file, ours, with no licence
  metadata — because there is none. It must be structurally separate from the
  component data in both storage and rendering, for the reason in "structural
  separation."
- **Dictionary entries (3)** are a selected subset of JMdict entries per kanji,
  glosses and readings **verbatim**, senses in JMdict's own order. Selection
  metadata (why this entry was chosen — frequency band, tags) is ours and lives
  alongside, not inside, the entry.

---

## Review tooling

Phase 0 established that review capacity — not corpus coverage — is what sets the
Phase 1 timeline. So the review tool is a Phase 1 deliverable, not an afterthought.

**A local review dashboard under `app/admin/` with its write API under
`app/api/admin/sentences/`.**

- **Local-only. It 404s in production.** This is not "hidden" — it does not exist
  in the deployed app. Consequence: it needs no authentication, no session
  handling, and no rate-limiting, because there is no attack surface to protect.
  That is the whole reason for the constraint.
- **Two guards, because the two runtimes fail differently.** A route-handler
  guard returning a 404 response, first statement of every admin handler; and a
  page/layout guard calling `notFound()`, first statement of every admin page.
  Gating only the APIs ships the pages, which then render as broken UI — or leak
  the shape of the tool — against dead endpoints. The page guard is the one that
  is easy to forget, so it is stated as a requirement and not left to care.
- **File-based. No database.** It reads `data/sentences/queue/<level>.json` and
  reads/writes `data/sentences/decisions/<level>.json` through a local route
  handler. Decisions are committed to git like any other content change. See
  "When to actually reach for a database" — this deliberately does *not* trigger
  the editorial-workflow condition, because the reviewer is also the person who
  can run `git commit`.
- **Queue and decisions are separate files** with the lifetimes described above.
  The dashboard must never write into the queue.
- **Structured reject reasons.** Every rejection records a `RejectReason` from
  the fixed set; CI enforces that a rejection has one. The **distribution** is
  the deliverable, because it says *what to fix*:

  | Dominant reason | What it indicts | Consequence |
  |---|---|---|
  | `unnatural-japanese`, `bad-translation`, `inappropriate-content` | the **corpus** | filtering can't fix it; lower the auto-accept ambition, keep the review rate high |
  | `target-kanji-unused`, `too-hard`, `too-simple` | the **ranker** | fixable and cheap — re-rank, regenerate the queue, existing decisions survive |
  | `wrong-reading` | the **tokenizer** | tighten the CI reading checks; this is the IPADIC ceiling showing |

  **This is what determines whether Phase 3+ can lower the review rate**, and it
  is why free-text reasons are not acceptable: a rate alone tells you something is
  wrong, a distribution tells you what.
- **Reviewers may correct token readings only.** `readingCorrections`, keyed by
  token index. `japanese` and `english` are not editable and the UI must not
  present them as editable — not disabled inputs, not an "edit" affordance that
  warns. There is no path to modifying source text, by design.
- **Every decision records reviewer and ISO timestamp.** The log is the evidence
  behind the accuracy claim; if it can't be audited, the claim isn't worth making.

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
- **Any token with `readingUnknown: true` reaching the published set.** *(New in
  v0.3 — this is the IPADIC null-reading failure mode, and it renders as a
  silent, plausible-looking error, which is the worst kind for this site.)*
- Any `reading` containing non-kana characters.
- A duplicate `id`, or a `kanji` reference not present in the kanji dictionary.
- A missing/unknown `license`, or a missing `review` record.
- **A `ReviewDecision` with `verdict: 'rejected'` and no `rejectReason`.** *(New
  in v0.3.)*
- **A published sentence whose `japanese`/`english` differ from the corpus text
  for its source IDs.** *(New in v0.3 — the direct enforcement of "we do not
  modify sentences," and the only check that catches a well-meaning manual fix.)*
- A `ContrastPair` whose `exampleSentenceId` doesn't resolve.

Layers 2–3 get their own checks when their models land; at minimum, that
published JMdict glosses match the source file byte-for-byte, for exactly the
same reason.

---

## Performance Architecture: static-first, no DB

Follows the pattern already established for kanji data (`lib/constants/*-kanji.ts`,
statically imported, prerendered per `docs/mvp/simplified-architecture.md` and
`app/kanji/[character]/page.tsx`): flat files, `generateStaticParams`,
`revalidate: 86400`. All four layers slot into the same model — new files, same
pattern, no new infrastructure.

- One file per level, mirroring the kanji constants layout.
- Kanji detail pages resolve everything at build time. No runtime fetch, no
  client-side loading state, no DB round trip. Pages stay 100% static HTML.
- This is deliberately *unlike* the SVG CDN-proxy pattern
  (`app/api/kanji-svg/[hex]/route.ts`) — that exists because stroke SVGs are
  third-party assets we don't own and don't want to vendor. Sentence, entry and
  etymology data is small, curated, and ours to commit.

### What actually constrains this (and what doesn't)

v0.1 argued from gzipped transfer size. **That's the wrong metric: in a
static-first design the corpus never ships to a client at all.** The real
constraints are three, none of which bind at Phase 1 scale (82 kanji, ~250
sentences, ~200KB):

1. **Server bundle size.** `dynamicParams = true` means `/kanji/[character]` has
   a serverless function, and anything the route imports is traced into it. At
   full corpus scale (single-digit MB) this is well inside Vercel's limits, but
   it is the number to watch, not transfer size. **Three layers instead of one
   moves this up the watch list**, particularly JMdict, which is the largest of
   the three inputs before filtering.
2. **Build time and memory** across 1,896 prerenders. Measure at each phase
   boundary; the staged rollout gives natural checkpoints.
3. **Page weight against the existing Lighthouse gate.** `lighthouserc.js` holds
   `/kanji/<char>` at 260 kB script / 440 kB total (baselines 228 kB / 363 kB),
   and already flags LCP ~3s on that template as known debt. The rendered blocks
   are small individually, **but the client/server boundary matters**: if any of
   them is rendered by a Client Component, the data is serialised into the RSC
   payload *in addition to* the HTML, paying for it twice.
   **Requirement: layers 2, 3 and 4 all render in Server Components.** Any
   interactivity (furigana toggle, show/hide translation, expand entry list) must
   be a small client island receiving only what it needs — or be done in CSS.

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
   correct, or approve content through a UI without touching git and waiting for
   a PR + deploy, a static file can't satisfy that. **v0.3 note: the local review
   dashboard does not fire this trigger**, because the reviewer is the owner and
   can commit. It fires the day someone who cannot run `git commit` needs to
   approve a sentence. Given the correction above — bad sentences can only be
   pulled by redeploying — this remains the trigger most likely to fire in
   practice, and it's about the *write/edit* path, not serving reads. That's a
   lightweight CMS or a Postgres-backed admin (Vercel Marketplace / Neon).
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

None are true for the scope here. **Recommendation: build static-first; revisit
when #1 or #2 becomes a real roadmap item** — the trigger is "who edits this and
how," not serving performance.

---

## SEO Treatment

### The duplicate-content problem (address this first)

**Two of the four layers are duplicate content by construction.** Tatoeba
sentences appear verbatim on Jisho, Weblio, Tanoshii, Reverso and many scraped
sites. JMdict entries appear on Jisho, Takoboto, Yomichan/Yomitan, and everything
else built on EDRDG. Publishing them makes those page sections **non-unique**,
and attribution earns no ranking credit for duplicated text.

Stated plainly: **layers 3 and 4 are UX wins with SEO-neutral-to-negative content
characteristics.** They are worth shipping for learners. They are not the SEO
play, and pretending otherwise leads to measuring the wrong thing.

What actually differentiates the pages:

- **Etymology prose (layer 2b)** — original content, written by us, on up to
  1,900 pages. **This is the volume SEO asset**, and it is the reason "write it
  ourselves" beat "copy Wiktionary" on grounds other than licence. Wiktionary
  etymology on our pages would be duplicate content on 1,900 pages; ours is
  unique content on 1,900 pages.
- **Contrast notes** — original editorial content targeting a specific,
  high-intent query shape. **This is the intent SEO asset.** Fewer pages, better
  queries.
- **Furigana quality** — token-aligned ruby is genuinely better than what most
  competitors render.
- **Honest attribution** — a trust signal for readers; treat its SEO value as
  secondary.

*(v0.2 called contrast notes "the headline deliverable." v0.3 splits that role:
etymology is the volume play, contrast pages are the intent play. They are not
competing — they answer different queries at different scales.)*

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

## UX — remaining open decisions

The page structure, layer order, and degradation behaviour are decided above.
What is still undesigned, and needed before Phase 1 ships:

- How many sentences and dictionary entries render expanded vs. collapsed;
  mobile treatment. (Affects the Lighthouse budget more than anything else here.)
- Furigana display: always on, toggle, or on-tap. (Determines whether a client
  island is needed at all — see the Server Component requirement.)
- Attribution line placement and wording — visible enough to be honest, quiet
  enough not to dominate. Note the per-sentence line is comparatively long
  (two IDs, two usernames, a licence link); it needs a compact treatment that
  still credits the individuals.
- Etymology section presentation when prose is absent — how a components-only
  section reads as complete rather than truncated. **This is the most common
  state and deserves real design attention, not a fallback.**
- Heading wording that keeps layer 3 ("Words using 日") distinct from the
  existing `RelatedKanjiSection` ("Related Kanji").
- Where the report-a-problem affordance lives.

---

## Success Metrics

Defined per phase, measured with the existing datafast analytics integration:

- **Accuracy (primary):** reported-inaccurate rate per 1,000 sentence
  impressions. Target: near-zero. Any confirmed inaccuracy is a P1.
- **Review throughput:** sentences adjudicated per hour, and the reject-reason
  distribution. *(New in v0.3 — this is the number that forecasts every
  subsequent phase, and it is unknown until Phase 1 runs.)*
- **Engagement:** time on `/kanji/<char>` and scroll depth to each new section,
  before vs. after Phase 1.
- **Coverage:** % of the phase's kanji that shipped with ≥3 sentences; separately,
  % with etymology prose.
- **SEO (from Phase 1, read at Phase 3):** impressions/clicks on kanji detail
  pages, and separately on contrast pages once they exist. Judge the contrast
  pages on their own queries, not blended into the kanji-page numbers.
  **Read etymology's contribution against pages that have prose vs. pages that
  have components only** — the staged backfill gives us a natural A/B that we
  should not waste.

---

## Cross-reference: the kanji dictionary is mis-composed

**Not part of this PRD. Recorded here so it does not get lost**, because Phase 0
surfaced it and it is arguably more valuable than the feature that found it.
Full detail in
[`example-sentences-phase0-findings.md`](./example-sentences-phase0-findings.md) §5
and the ranked gap list in
[`example-sentences-phase0-coverage.md`](./example-sentences-phase0-coverage.md).

- **1,278 distinct kanji** appear in the Japanese corpus but are in **none** of
  our five level files.
- **211 of them appear in 100+ corpus sentences.**
- **139 of the 1,896 kanji we teach appear in zero corpus sentences**, and 409
  appear in fewer than ten.
- **結 — which we do not teach — appears in more sentences (2,267) than 1,799 of
  the 1,896 kanji we do teach.** The most-used omissions are core vocabulary:
  発 (2,242), 住 (1,769), 約 (1,287), 経 (981). Meanwhile N1 contains 瑳, 笙, 脩,
  晟, 柾 — jinmeiyō *name* characters on no JLPT list, in zero corpus sentences.

**Why it matters to this PRD even though it is separate work:** the level filter
(step 3) proxies sentence complexity from our own dictionary, so it inherits this
composition directly. A sentence containing 結 scores as "contains an unknown
kanji" even though 結 is core vocabulary. The chosen shipping tier tolerates
unknown kanji for exactly this reason — but that is a workaround, and fixing the
dictionary would make the level model genuinely better as a side effect.

**Why it matters beyond this PRD:** every missing kanji is a missing page, and
these are high-search-volume characters. Against roadmap P4-2 ("differentiate the
kanji page template"), adding ~200 genuinely common kanji is a larger and cheaper
traffic win than deepening the 1,896 pages we already have, and it is independent
of everything in this document.

**Recommended as its own work item.**

---

## Open Questions

Reduced to what is genuinely undecided. Five of v0.2's questions are now closed;
they are listed as resolved rather than deleted, so the reasoning survives.

**Open:**

1. **How many JMdict entries per kanji, and by what frequency cut?** A page-weight
   and UX question, not a licence one — but it interacts with the "arranged"
   caution in B2, so settle the selection rule before counsel review rather than
   after.
2. **Does etymology prose need a per-kanji reference list?** Citing our sources
   strengthens the authority claim, but a visible bibliography on 1,900 pages is
   both design weight and an invitation to compare our prose to its references
   line by line. Judgement call, genuinely unresolved.
3. **Does layer 3 replace or complement `RelatedKanjiSection`?** They are
   different data (words vs. characters) and both are useful, but two "related"
   sections on one page may simply be too much. Decide at Phase 1 design, with
   the real content in front of us.

**Resolved:**

- **#1 (v0.2) — sentences per kanji: 3** for Phases 1–2. Supply supports 5
  comfortably (medians 130–800), but review cost scales linearly and we have no
  accuracy data. Revisit at the Phase 2 gate with a measured reject rate.
- **#2 (v0.2) — who reviews: the owner**, who is qualified to judge Japanese
  naturalness. This closes the question that v0.2 called "a blocker on Phase 1,
  not a detail" — and converts it into the capacity constraint described under
  "Review Capacity," since the same person also writes the etymology prose.
- **#3 (v0.2) — where the pipeline lives: `scripts/sentences/`**, run with `tsx`
  like the existing scripts. Already built: `corpus.ts`, `coverage.ts`,
  `kanji-inventory.ts`, with `select.ts` and `publish.ts` to follow.
  `kanji-inventory.ts` derives the kanji list from the real constants rather than
  hard-coding counts, so per-kanji re-runs stay correct as the dictionary grows.
- **#4 (v0.2) — vendor the dump: no.** Fetch to a gitignored `.tatoeba-cache/`,
  commit only curated output.
- **#5 (v0.2) — Tatoeba attribution: per-contributor *and* project credit**, the
  strict reading. See layer 4 above.
- **Etymology sourcing** (the licence investigation's one open decision):
  components first, our own prose backfilled per level. See layer 2.

---

## Changelog

### v0.3 (2026-07-31)

Phase 0 completed and the licence investigation landed. Scope widened from
example sentences to the full kanji-page content hierarchy.

**Scope:**
- **Retitled and rescoped.** The PRD now covers four page layers —
  kanji → etymology → dictionary related entries → example sentences — not
  sentences alone. New "The page: four layers" section specifies each layer's
  source, licence, render order, and degradation behaviour.
- **New "Legal blockers" section** promoting items that were scattered asides in
  v0.2 into owner-actionable blockers: the ToS carve-out (5 points), a single
  counsel review covering both ShareAlike questions, the DRM constraint on any
  paid tier, and the footer acknowledgements still to be added.
- **New "Review tooling" section** specifying the local-only, file-based review
  dashboard.
- **New "Review Capacity" subsection** naming the binding constraint explicitly.
- **New "Cross-reference: the kanji dictionary is mis-composed"** carrying Phase 0
  §5 forward as separate work that must not be lost.

**Decided:**
- **Etymology: components first, prose later.** RADKFILE/KRADFILE decomposition
  ships as data immediately (free, EDRDG CC BY-SA 4.0, covers the whole
  dictionary); our own written prose backfills per JLPT level on the same phase
  gates as the sentences. No etymology dataset is licensable — Kanjium's origin
  data is unlicensed chineseetymology.org images, Kanjimori is unpublished,
  KANJIDIC2 has no etymology field, and Wiktionary is CC BY-SA (which would make
  our prose Adapted Material) *and* duplicate content. Etymological facts are not
  copyrightable, so we consult references and write our own expression. This makes
  etymology the proprietary differentiator.
- **Dictionary entries: JMdict.** EDRDG, CC BY-SA 4.0, commercial use explicitly
  permitted, no agreement required.
- **Sentences: 3 per kanji** for Phases 1–2.

**Corrected:**
- **Step 1 of the vetting pipeline.** Native-ownership and audio demoted from
  exclusion filters to ranking signals; orphan-filtering dropped entirely. v0.2's
  "prefer a self-declared native owner" costs 16 percentage points of coverage for
  a self-reported, unverified signal, and 99.65% of orphaned Japanese sentences
  are unadopted Tanaka Corpus imports — a curated textbook source, not junk.
- **Step 3 of the vetting pipeline.** "Score against a JLPT vocabulary/grammar
  frequency list" removed: **no such list can be licensed.** Every one in
  circulation traces to tanos.co.uk, which carries no licence grant. Replaced with
  a complexity proxy derived from our own dictionary levels, with its limitations
  stated (it is a floor, not a level model, and it inherits the dictionary's
  composition problems).
- **Phase 0 marked complete** and its results inlined. Coverage is 99–100% for
  N5–N2 and 74% for N1; **supply is not the constraint, review capacity is.** This
  inverts an assumption v0.2 was built on: the selection step's job is ranking a
  large pool, not finding enough sentences.
- **Phase 5 (N1) expectations.** ~74% coverage at best; 159 kanji have zero
  candidates and never will. Partial ship is success.
- **Tatoeba attribution.** v0.2 left this open; resolved to per-contributor *and*
  project credit (the strict reading), because Tatoeba cannot waive contributors'
  rights and the licence is the French port where *droit de paternité* is
  inalienable.
- **Data Model section rewritten.** v0.2 printed full type definitions inline and
  they had already drifted from the code. `lib/sentences/types.ts` is now named as
  authoritative and this section describes shape and reasoning only. Documents the
  three-artefact pipeline (regenerable queue / durable decision log / derived
  published output) and why the decision log must survive queue regeneration —
  none of which existed in v0.2. New contract elements recorded:
  `SentenceCandidate`, `ReviewQueue`, `DecisionLog`, `RejectReason`,
  `readingUnknown`, `isTanaka`, `readingCorrections`, and the pair-based
  `CandidateId`.
- **Validation (CI).** Three new failing conditions: any `readingUnknown` token
  reaching publish, a rejection with no `rejectReason`, and published text that
  differs from the corpus text for its source IDs.
- **SEO.** Duplicate-content risk extended to JMdict entries, which are as shared
  with competitors as Tatoeba sentences are. The "headline asset" role split:
  etymology prose is the *volume* play (unique text on ~1,900 pages), contrast
  pages are the *intent* play. v0.2 assigned that role to contrast notes alone.
- **Correction to the licence investigation §2.2**, recorded in the JMdict
  section: it justifies our etymology's proprietary status via CC BY 2.0 FR
  Art. 4's Collective Work carve-out, but the licensed data adjacent to etymology
  is RADKFILE — **CC BY-SA 4.0, which has no Collection concept at all.** The
  correct reasoning is the Adapted Material one (§3(b) + §1(1)). Same conclusion,
  and the route matters: the correct route is conditional on "unmodified" holding,
  and the word "arranged" sits inside that definition.
- **Compliance status.** The licence investigation §0 found `<Footer />` was not
  rendering on `/kanji/[character]`, so ~1,900 pages displayed KanjiVG under
  CC BY-SA 3.0 with the credit on a different page. **Fixed today** — `<Footer />`
  moved into `app/layout.tsx`. EDRDG and Tatoeba lines still to be added (B4).
- **Structural separation** promoted from an implicit consequence of the
  no-modification rule to a stated architectural rule: licensed content renders in
  its own component, verbatim, with its own attribution; our editorial voice never
  interleaves with it. Breaking it forfeits *both* licence positions at once.
- **Tokenizer recorded** (`@sglkc/kuromoji`, IPADIC 2.7.0 under NAIST-2003, build
  time only) with its ~95–97% reading-accuracy ceiling and known failure modes.
  v0.2 did not mention the tokenizer at all despite the data model depending on
  one.
- **Open questions.** #2 resolved (the owner is the qualified reviewer, which
  converts the Phase 1 blocker into the capacity constraint). #3 resolved
  (`scripts/sentences/`). #4 and #5 resolved from Phase 0. Three new open
  questions added, all design rather than legal.
- **Kanji inventory: 1,896** — unchanged from v0.2, which was already correct
  (N5 82, N4 171, N3 380, N2 259, N1 1,004). Flagging it here because a stale
  **1,893** persists in `docs/3rdVersion/performance-and-seo-roadmap.md` (four
  places, including the sitemap URL count). Fixing that is outside this PRD.

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
  *(Superseded in v0.3 — it was specified as a filter and should be a ranker.)*

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
