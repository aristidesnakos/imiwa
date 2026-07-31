# Licence investigation — etymology and dictionary entries

**Date**: 2026-07-31 · **Status**: complete, one decision open · **Companion**:
[`example-sentences-phase0-findings.md`](./example-sentences-phase0-findings.md) (Tatoeba/sentences),
[`example-sentences-system.md`](./example-sentences-system.md) (the PRD)

Triggered by the target page structure:

> kanji → **etymology** → **dictionary related entries** → example sentences

Three of those four layers do not exist today. `KanjiData` is four fields
(`kanji, onyomi, kunyomi, meaning`). This document asks, for each new layer,
*what can we legally source it from* — under the same provenance rule that
governs the sentence work.

---

## 0. Finding first: we have a live compliance gap, today

`components/sections/Footer.tsx:124-145` carries a correct KanjiVG attribution —
copyright © 2009-2012 Ulrich Apel, CC BY-SA 3.0.

**That footer does not render on the kanji detail pages.** `Footer` is imported by
`app/page.tsx`, `app/not-found.tsx`, `app/subscribed/page.tsx`, `app/advertise/page.tsx`
and the `free-resources/*` pages. It is **not** in `app/layout.tsx` and **not** in
`app/kanji/[character]/page.tsx`.

So the attribution is absent from the ~1,900 pages that actually display the
licensed work. `StrokeOrderViewer` renders KanjiVG SVGs on every one of them,
served through `app/api/kanji-svg/[hex]/route.ts`.

CC BY-SA 3.0 §4(c) requires attribution "in any reasonable manner… at least as
prominent as" other credits, on the copies you distribute. A credit on a
different page of the site is a weak position.

**This is not a new-feature problem. It is an existing bug, and it is one line to
fix** — put `<Footer />` in `app/layout.tsx` (or in the kanji page) and remove the
per-page imports. Every source below has the same requirement, so fixing this
also unblocks everything else. **Do this first, independently of any content work.**

---

## 1. Dictionary related entries — solved: JMdict

For "words that use this kanji" (日 → 日本, 日曜日, 毎日), the source is **JMdict**,
from the Electronic Dictionary Research and Development Group.

| | |
|---|---|
| Licence | **CC BY-SA 4.0** |
| Commercial use | **Explicitly permitted.** "there is NO restriction placed on commercial use of the files. The files can be bundled with software and sold for whatever the developer wants to charge." |
| Agreement needed | None. "No contract or agreement needs to be signed in order to use the files." |
| Covered files | JMDICT, EDICT, ENAMDICT, COMPDIC, **KANJIDIC2**, KANJIDIC, KANJD212, **RADKFILE**, **KRADFILE** |

Source: [edrdg.org/edrdg/licence.html](https://www.edrdg.org/edrdg/licence.html)

This is a clean grant — better than Tatoeba's, because it is unambiguous and
commercial use is addressed head-on rather than inferred.

### The one hard condition

> "the acknowledgement must be made **on each screen display**, e.g. in the form of
> a message at the foot of the screen or page."

A site-wide footer satisfies this exactly. See §0 — we need that fix anyway.

### ShareAlike does not contaminate our commentary

The live question is whether CC BY-SA 4.0's ShareAlike term forces our own
etymology notes and contrast notes to become CC BY-SA.

**It does not, provided we keep JMdict data structurally separate and unmodified —
but the reasoning is *not* the same as the Tatoeba one, and the difference matters.**

CC BY 2.0 FR protects us with an **express carve-out**: Art. 4 excludes the
surrounding Collective Work from the licence. **CC BY-SA 4.0 has no such clause —
it does not define or even use the word "Collection" anywhere in its legal code.**
The 4.0 rewrite dropped the 2.0/3.0 "Collective Work" machinery.

The protection instead comes from how ShareAlike is *scoped*. §3(b) opens: "if You
Share **Adapted Material** You produce, the following conditions also apply." And
§1(1) defines Adapted Material as material "derived from or based upon the Licensed
Material and in which the Licensed Material is **translated, altered, arranged,
transformed, or otherwise modified** in a manner requiring permission."

So: reproduce JMdict entries **unmodified**, and no Adapted Material is produced;
no Adapted Material, no ShareAlike trigger. Our surrounding prose was never
derived from JMdict, so it is not caught either.

**This is a narrower shelter than the Tatoeba one.** It depends entirely on
"unmodified" holding, where CC BY 2.0 FR would have protected the collective work
regardless. Note the word "arranged" sits inside the Adapted Material definition —
so aggressive restructuring of JMdict entries is a live risk in a way that
restructuring Tatoeba sentences is not. Keep transformations to selection and
presentation, not rewriting.

One architectural rule protects both sources:

> **Rule: licensed third-party content renders in its own component, verbatim,
> with its own attribution line. Our editorial voice never interleaves with it.**

Break that rule — weave our gloss into a JMdict definition, or annotate inside a
Tatoeba sentence — and both analyses flip to Adapted Material simultaneously.

Sources: [CC FAQ](https://creativecommons.org/faq/), [CC BY-SA 4.0 legal code](https://creativecommons.org/licenses/by-sa/4.0/legalcode)

**Recommendation: adopt JMdict.** Get the ShareAlike/Collection reading confirmed
by counsel in the same pass as the ToS carve-out — it is the identical question
asked twice, so it is one review, not two.

---

## 2. Etymology — no dataset survives the provenance rule

**KANJIDIC2 has no etymology field.** It carries codepoints, radicals, grade,
stroke count, frequency, readings, meanings, query codes and variants. Character
origin is not among them. So the EDRDG grant, clean as it is, does not reach
this layer.

Every candidate that does carry etymology fails:

| Source | Licence as advertised | Why it fails |
|---|---|---|
| **Kanjium** | CC BY-SA 4.0 | Its origin data is **images from chineseetymology.org**. See below — the upstream grant is missing, so the downstream badge is void as to that data. Its *other* data (pitch accent, composition/IDC) is fine and separately sourced. |
| **hanziyuan.net / chineseetymology.org** (Richard Sears) | none | "Copyright © 1994-2017 Richard Sears… All rights received." No licence, no terms page, no redistribution grant. Contact-the-author only. |
| **Kanjimori** | unstated | "Public distributions of the data are currently unavailable while Kanjimori is under development." Nothing to license yet. |
| **Kanji Alive** | CC BY 4.0 | Clean licence, but the dataset is readings/meanings/radicals/stroke/audio — it is not an etymology corpus, and the announcement notes undisclosed "exceptions due to copyright restrictions." |
| **Wiktionary** | CC BY-SA 3.0/4.0 | Usable in principle, but see §2.1 — it is the wrong choice for three independent reasons. |
| **Outlier Linguistics, Henshall, 漢字源** | commercial | No redistribution grant. Excluded. |

**This is the Tanos pattern again** (findings §2): a well-maintained downstream
package wearing an open badge over data its upstream never granted. Kanjium is
honest about it — it names chineseetymology.org as the source — which is exactly
how we caught it. Check the upstream every time.

### 2.1 Why not Wiktionary, even though it is licensed

Wiktionary's kanji etymologies are real and CC BY-SA. Three reasons to decline:

1. **ShareAlike on the thing we most want to own.** Etymology copy is prose, not
   data. Reusing it means our etymology section *is* Adapted Material and must be
   CC BY-SA — the one layer where §1's separation rule cannot help us, because
   there is no separation between "their content" and "our voice" when the
   content *is* voice. Rewriting it enough to escape adaptation is
   indistinguishable in effort from writing it (see §2.2).
2. **It is duplicate content.** The PRD already concedes this problem for Tatoeba
   sentences ("The duplicate-content problem (address this first)"). Wiktionary
   etymology is on Wiktionary, Jisho, and every scraper downstream of them.
   Copying it adds a section that ranks for nothing.
3. **Quality is uneven and unattributed per-entry.** Some entries are excellent;
   some are folk etymology. Verifying them costs about what writing them costs.

### 2.2 Recommendation: write etymology ourselves

**Etymological facts are not copyrightable.** That 日 is a pictograph of the sun,
that 明 combines 日 and 月, that 校 is 木 + 交 phonetic — these are facts about the
world. Copyright protects the *expression* of facts, not the facts
([Feist v. Rural Telephone](https://copyrightalliance.org/faqs/whats-not-protected-by-copyright-law/),
499 U.S. 340). We may read Henshall, Outlier and Wiktionary as *references*,
verify against them, and write our own prose — provided we write, not paraphrase
closely.

This turns the weakest layer into the strongest:

- **Zero licence exposure**, and no third-party acknowledgement burden.
- **Fully proprietary** — because we authored it, and it was never derived from
  anyone's licensed material. That is the whole argument, and it is the strongest
  of the three on this page.

  **Do not reach for the Collective Work reasoning here.** An earlier draft of
  this document justified etymology's status "under the same Art. 4 / Collection
  reasoning that shelters our contrast notes." That was wrong on the route, even
  though the conclusion holds. Art. 4 belongs to **CC BY 2.0 FR**, which governs
  Tatoeba sentences. The licensed data sitting *next to* etymology prose is
  **RADKFILE, CC BY-SA 4.0 — which has no Collection concept at all** (§1).
  Invoking Art. 4 for this layer cites a shelter that does not cover it.

  The distinction is not academic. Art. 4 protects the collective work
  unconditionally; the CC BY-SA 4.0 route protects us **only while the licensed
  material stays unmodified**. Our own authorship is unconditional, so lead with
  it — and keep the RADKFILE component data verbatim and structurally separate
  regardless, which §1's architectural rule already requires.
- **It is the differentiator.** Findings §3 already identified original commentary
  as the real SEO asset. Etymology written by us is unique content on ~1,900
  pages; etymology copied from Wiktionary is duplicate content on ~1,900 pages.

**The cost is editorial, and it is the same cost as the sentence review.** ~1,900
kanji of original writing is not a sprint. It stages exactly like the sentences do
— N5 (82) first, gated on the same reviewer.

**Structural component data is a separate question and is free.** RADKFILE/KRADFILE
(EDRDG, same grant as §1) gives radical and component decomposition — 校 = 木 + 交
— as *data*, with no prose. That is the scaffold; our writing is the flesh. Use both.

---

## 3. Consolidated licence surface

If we adopt §1 and §2.2, the site's third-party content obligations are:

| Source | Layer | Licence | Obligation |
|---|---|---|---|
| KanjiVG | stroke diagrams | CC BY-SA 3.0 | attribution — **currently broken, see §0** |
| JMdict | dictionary entries | CC BY-SA 4.0 | per-screen acknowledgement |
| RADKFILE/KRADFILE | components | CC BY-SA 4.0 | per-screen acknowledgement |
| Tatoeba | example sentences | CC BY 2.0 FR | per-contributor + project credit |
| IPADIC (build-time) | tokenizer dictionary | NAIST-2003 | retain copyright notice |
| **our etymology** | **etymology** | **proprietary** | **none** |

All four display obligations are satisfied by **one site-wide footer** plus the
per-sentence attribution line already specified in findings §3. That footer must
render on `/kanji/[character]` — which is §0.

### Terms of Service — required carve-out

A blanket "all content on this site is proprietary" clause would breach three
licences at once. The ToS needs to say, in substance:

1. Kanji stroke diagrams derive from KanjiVG (CC BY-SA 3.0).
2. Dictionary entries and component data derive from EDRDG files (CC BY-SA 4.0).
3. Example sentences derive from Tatoeba contributors (CC BY 2.0 FR), and are
   reproduced unmodified; rights remain with the individual contributors named.
4. **Everything else — our etymology, contrast notes, selection, arrangement,
   design and code — is ours and is reserved.**
5. A login paywall over the collection is permitted; **DRM on the licensed
   components is not** — CC BY-SA 4.0 **§2(a)(5)(iii)**: "You may not offer or
   impose any additional or different terms or conditions on, or apply any
   Effective Technological Measures to, the Licensed Material if doing so
   restricts exercise of the Licensed Rights by any recipient."

Point 4 is what makes the business defensible, and point 5 is the constraint on
how a paid tier can be built. Both need counsel sign-off before Phase 1 ships.

---

## 4. Decided: components first, prose later

The open question was whether to accept the editorial cost of writing etymology
prose up front (§2.2), or ship the structural component data only
(RADKFILE: 校 = 木 + 交) and backfill prose later.

**Decided 2026-07-31: components first, prose later.** Component decomposition
ships immediately for all ~1,900 kanji — it is licensed, free, and needs no
review — and our written etymology backfills per JLPT level on the same phase
gates as the sentences.

The reasoning is review capacity, not licensing. Both options are legally clean.
But ~1,900 kanji of original prose is the same kind of cost as the 760 sentences
awaiting review, drawn on the same single reviewer. Shipping components first
means the etymology layer is real on every page from day one and never gates a
phase.

Consequence worth stating: **the components-only state is the common case for a
long time**, not a degraded placeholder. It deserves real design, not an empty
state. Recorded in the PRD's UX section.

---

## Changelog

### v0.2 (2026-07-31)
- §2.1, §2.2 — **corrected a wrong legal route.** v0.1 justified our etymology's
  proprietary status via the CC BY 2.0 FR Art. 4 Collective Work carve-out. That
  carve-out governs Tatoeba, not the RADKFILE data adjacent to etymology, which
  is CC BY-SA 4.0 and has no Collection concept (§1). The conclusion was right,
  the route was wrong, and the route matters: Art. 4 is unconditional where the
  CC BY-SA 4.0 shelter holds only while licensed material stays unmodified. The
  real argument is simpler — we authored it.
- §4 — resolved from open question to decision.

### v0.1 (2026-07-31)
Initial investigation. Resolves the etymology and dictionary-entry sourcing
questions raised by the target page structure.
