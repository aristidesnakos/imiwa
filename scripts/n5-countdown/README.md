# N5 Countdown — generator

The paid product, and the free pack, are **generated**, not authored. This folder is
the source of truth; the PDFs are build output. If you find yourself editing a PDF,
or retyping a reading into a layout file, stop — the bug is here.

## Why it lives in the repo

`schedule.py` parses `lib/constants/n5-kanji.ts` directly. That file is the single
source of readings and meanings for the whole site, and it changes: commit `ff30967`
(31 Jul 2026) added 暑 and took N5 from 81 characters to 82. The Gumroad PDF had been
built before that and was never rebuilt, so for a month the "complete" free pack was
missing a character while every piece of copy confidently said 81. Nothing caught it
because the mistake was self-consistent.

Keeping the generator beside the data it reads is the fix: when the kanji list moves,
the thing that turns it into paper moves with it, in the same commit, under review.

## The three programs

| file | reads | writes | what it is |
|---|---|---|---|
| `schedule.py` | `lib/constants/n5-kanji.ts` | `schedule.json` | the plan: which characters in which week, and every review date |
| `book.py` | `schedule.json` | `N5-Countdown-sample.pdf` | the paid book's four page types |
| `freepack.py` | `schedule.json` | `MichiKanji-N5-Kanji-Practice-Sheets.pdf` | the free pack — a port of `app/api/kanji-sheets/route.ts` |

Run in that order. `schedule.py` first, always: the other two read its output.

```bash
pip install playwright && playwright install chromium
python3 schedule.py && python3 book.py && python3 freepack.py
```

Stroke diagrams come from KanjiVG over jsDelivr and are cached in `svg/` (gitignored),
so only the first run needs the network.

## Rules the code encodes, and why

**The even split leads; semantic groups bend to it.** `allocate()` cuts the ordered
list into near-equal runs and snaps each cut to a group boundary only when one sits
within ±2. The obvious alternative — walk the groups, start a new week when the
current one is full — was tried first and produced 2 kanji in week 1 and 13 in week
12. That puts the heaviest load on a reader who has three weeks left and no slack,
and asks almost nothing in the week the habit is being formed. Backwards.

**No review date may fall on or after test day.** Week 12's +21 landed on 7 December,
the day *after* the exam, on 7 of 82 sheets. `review_slots()` clamps the last touch to
Saturday 5 December and relabels it "Final pass". Any change to `TEACHING_WEEKS` or
`TEST_DATE` must be re-checked against this.

**Ghost and live strokes are styled inline, not by a stylesheet rule.** A
`.strokes svg path { stroke: … }` rule coloured both groups and every stroke-order
diagram rendered as four identical characters. The inline styling in `stroke_steps()`
looks redundant; it is not.

**The free pack keeps the plainer layout on purpose.** `freepack.py` is a port of the
site's own sheet route, not a reskin of `book.py`. The free pack *is* the site's sheet,
collected — if it drifts, it stops being what the page promises. And regenerating the
freebie in the Countdown's layout would hand away the only visible reason to pay. The
difference between free and paid is dated sequencing, not typography.

**Never mirror Tan.** `transform: scaleX(-1)` flips the 探 on the headband into a
broken glyph. Re-lay out around the pose instead.

## What the sample is, and is not

`N5-Countdown-sample.pdf` is four pages — cover, one week opener, one kanji sheet,
tracker. It proves the four page *types*. The finished book is one cover + 14 week
openers + 82 kanji sheets + one tracker, about 98 pages.

## Known gap before this can be sold

**Vocabulary: closed 25 Aug 2026** — see the content-layer section below.
**Sentences: still open.** `data/sentences/published/N5.json` is `[]`; the queue has 8
reviewed-ready candidates per character and nobody has worked it. 82 accepted sentences
is the remaining gate.

## Attribution

Stroke data is KanjiVG © Ulrich Apel, CC BY-SA 3.0. Share-alike, so the credit has to
travel on every sheet that carries a diagram — not on a colophon at the back.

## The content layer — vocabulary and sentences

Added 25 Aug 2026. Both layers fail to nothing: no word block if there is no
word, no sentence block if no human has accepted a sentence. Neither prints a
placeholder, for the same reason `ExampleSentencesSection` renders nothing on
the site — an empty state advertises a gap the reader would not otherwise
notice, and on a page someone paid for it reads as unfinished rather than
sparse.

| file | reads | writes | needs network |
|---|---|---|---|
| `build_vocab.py` | `JMdict_e`, `lib/constants/n5-kanji.ts`, `schedule.json`, `n5-vocab-rejects.json` | `n5-vocab.json` | yes, once |
| `content.py` | `n5-vocab.json`, `data/sentences/published/N5.json` | — | no |

```bash
curl -O http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz && gunzip JMdict_e.gz
python3 build_vocab.py --jmdict JMdict_e --kanji ../../lib/constants/n5-kanji.ts \
        --schedule schedule.json --rejects n5-vocab-rejects.json --out n5-vocab.json
```

`n5-vocab.json` is committed (~55 kB) so the book builds offline and so a
dictionary refresh shows up as a reviewable diff rather than as a silent change
in what 82 pages say.

### Nothing Japanese is authored anywhere in this folder

Words are verbatim JMdict with their entry sequence attached. Sentences are
verbatim Tatoeba with their sentence ids. Readings and meanings are verbatim
`lib/constants/n5-kanji.ts`. The generator selects and lays out; it never
writes Japanese. That is a product rule first — unreviewed readings in front of
paying learners is the failure this book cannot survive — and a licence
position second: CC BY-SA 4.0's ShareAlike triggers on *modification*, so
reproducing entries unmodified keeps our own material out of scope. Rewriting a
gloss to fit a column would forfeit that. Never do it; drop the word instead.

### The four selection gates

1. **Containment** — every kanji in the word is one of the 82 this book
   teaches. A learner can therefore write every word on the page using only
   characters they have been taught. It costs real words (日曜日 dies on 曜) and
   the trade is correct: a word you cannot write is a reading exercise.
2. **Frequency** — JMdict's own `ke_pri` tags, no outside list. Outside JLPT
   frequency lists are unofficial scrapes with no grant — the Tanos pattern.
3. **Usability** — archaic, obsolete, rare, slang, vulgar, derogatory and
   "usually written in kana" entries are dropped.
4. **Schedule awareness** — words whose *other* kanji are already taught by
   this sheet's week rank first. This is the one rule that cannot exist without
   the schedule, and it is why this vocabulary is not the vocabulary a
   dictionary page would show.

### Five bugs worth not rediscovering

Each of these produced plausible output and no error.

- **`ke_pri` vs `re_pri`.** Priority is tagged per *spelling* and per *reading*.
  じゅういち carries news1/nf01, so pooling the reading's tags onto the entry's
  headwords marked 一一 a top-500 word and printed 「一一 (じゅういち) eleven」
  on the sheet for 一. Same mechanism produced ３千 and 一九. Use `ke_pri` only.
- **`misc` pooled across senses.** JMdict's 先生 has "teacher" as sense 1 and
  later senses tagged archaic and jocular. A union over senses marked the whole
  entry archaic and dropped the most important word containing 先 — invisibly,
  because a dropped word looks like a word that was never a candidate. Gate on
  the first sense, which is the only one printed.
- **`misc` codes vs expanded text.** JMdict_e resolves its entities, so a misc
  element reads `"archaic"`, never `"arch"`. A filter written against the code
  list matches nothing and reports no error. Gate 3 was inert for four runs.
- **`'verb' in 'adverb (fukushi)'`** is true. A substring test promoted every
  adverb to a core part of speech, which is how 大いに ("very") beat 大きい
  ("big") to the first slot on the sheet for 大. Match POS by prefix.
- **nfXX is newspaper frequency.** It ranks 円高, 白書, 出土, 大半 and 二百十日
  above 高い, 書く, 出る, 大きい and 百 — and all five led their sheets. `ichi1`
  (Ichimango, general vocabulary) is the learner-frequency signal and leads
  absolutely; the newspaper band only orders what is left.

### `n5-vocab-rejects.json` is a decision log, not a config file

It lives in its own file for the reason `data/sentences/decisions/` is separate
from `data/sentences/queue/`: **refreshing the dictionary must never destroy a
human judgement.** A word struck because its only gloss was "second week's
memorial services" stays struck through the next JMdict release. `preferred` is
the mirror — 先生 and 先月 tie on every signal JMdict carries, and only a person
knows which one a learner needs first.

Striking a word is *selection*. It edits no Japanese and adds none.

### Sentences come from `published/`, never from `queue/`

`data/sentences/queue/N5.json` holds 8 scored, tokenized candidates for each of
the 82 characters. Taking rank 1 and shipping is the wrong move: the ranker
scores naturalness, level and length and cannot see that a sentence is a poor
demonstration of the character it was chosen for. `target-kanji-unused` exists
as a reject reason in `lib/sentences/types.ts` because that failure was common
enough to need a name.

`published/N5.json` is `[]` today, so the book currently ships with no sentence
block. `--sentences=queue` renders the candidates for review and stamps every
one of them UNREVIEWED on the page. `--mode full` refuses to run with it.

**Do not remove that stamp and do not make `queue` the default.**

### Attribution is per page, not per book

Three licences, three obligations, all discharged in the footer of the sheet
that carries the material:

| source | licence | why it must be on the page |
|---|---|---|
| KanjiVG | CC BY-SA 3.0 | share-alike; the credit travels with the diagram |
| JMdict | CC BY-SA 4.0 | EDRDG requires the acknowledgement "on each screen display"; a page that can be printed alone must carry it alone |
| Tatoeba | CC BY 2.0 FR | per *contributor* — Tatoeba does not own the sentences and cannot waive its contributors' attribution |

That last row is why `sentence_credit()` names a person rather than the project,
and why licence is read per side: a CC0 Japanese sentence paired with a CC BY
English translation is a real case in the corpus. A null contributor is common
and expected (40.2% are unadopted Tanaka Corpus imports) and renders as project
credit alone, never as "unknown".

One consequence for the storefront: **CC BY-SA 4.0 §2(a)(5)(iii) forbids
applying Effective Technological Measures to the licensed material.** A
watermark or a stamped buyer name is fine — it restricts nothing. A
download-disabled, stream-only delivery would not be.

### Layout notes

Stroke diagrams are sized to fit one row rather than fixed, so the block is the
same height for a 4-stroke character and a 13-stroke one. Fixed sizes wrapped to
a second row above ten strokes, which pushed the review boxes off the bottom of
the sheet for 電 — and made page height depend on the character, so no two
sheets aligned in a 98-page book.

The reading-type mark (`on` / `kun` / `special`) is the one thing on a
vocabulary row that is ours rather than JMdict's, so it sits in its own margin
column and never mixes into the gloss text. Interleaving our annotation with
licensed text is exactly what would turn the entry into Adapted Material.


## The print book — `kdpbook.py`, `kdpcover.py`, `audit_print.py`

Added 25 Aug 2026. This is the thing that gets **sold**; `book.py` is now the
free lead magnet and `freepack.py` is unchanged.

| file | reads | writes |
|---|---|---|
| `kdpbook.py --mode full` | `schedule.json`, `n5-vocab.json`, `svg/` | `N5-Practice-print-interior.pdf` (198pp) |
| `kdpcover.py` | the interior PDF, `public/assets/tan-brush.png` | `N5-Practice-cover.pdf` (17.6959 x 11.25in) |
| `audit_print.py` | both PDFs | nothing; exits non-zero on a violation |

```bash
python3 kdpbook.py --mode full && python3 kdpcover.py && python3 audit_print.py
```

Run the audit every time. Do not upload a file it has not passed.

### Two pages per character, and the parity invariant

Every character is a **facing spread**: reference on the verso, all writing on
the recto. The reader looks left and writes right, the reference never goes
under their hand, and every square sits on a page where the gutter is on the
left — which matters because KDP will not spiral-bind and the book does not lie
flat.

That only works if reference pages land on **even** page numbers. Page 1 is a
recto, so every block between spreads must be an even number of pages: front
matter 4, each week `2 + 2n` (opener, n spreads, week review), back matter 2.
`main()` asserts it. Add one page anywhere and every spread after it straddles a
page turn instead of facing — invisible in a one-page-at-a-time PDF viewer,
obvious and unfixable in print.

The interior went from 99 pages to 198 this way. 99 was thin against a 173-page
comparable, and page count is the currency this category compares on; two pages
per character is what the comparable spends, and it buys 132 writing squares per
character instead of 60.

### Undated is enforced, not intended

`schedule.json` carries `start`, `end` and `days_to_test` for every week.
`kdpbook.py` reads none of them, and `assert_undated()` greps the finished HTML
for ISO dates, month names, weekday names and any year outside the licence
notices, refusing to emit a PDF if it finds one. It has already caught prose
("useful to find out on a Sunday"). A dated book is worthless the day after the
test and an Amazon listing keeps its reviews forever, so this is the one mistake
that cannot be corrected after launch.

### Four print failures that produced a valid-looking file

Each of these left a PDF that opened fine and was wrong.

- **Chromium rounds a millimetre page box up to a whole device pixel.** The
  interior came out 8.513 x 11.013in; the cover, 0.014in wide. Declare page
  boxes in **inches**, and for the cover re-place the render into an exact
  MediaBox with `show_pdf_page`.
- **A decorative element overflowed the cover page box by 1.1in**, and Chromium
  scaled the *entire cover down 5.7%* to fit. The file was still exactly the
  right size — but every fold had moved half an inch, which prints the spine
  text across the back cover. `.panel { overflow:hidden }` is load-bearing.
  Check `scrollWidth` with the **viewport set to the page box**: scrollWidth is
  floored at the viewport width, so a wider viewport hides the overflow, and
  `getBoundingClientRect` is no substitute — it reports the unclipped box of an
  element `overflow:hidden` has already contained.
- **Table borders stroke ON the box edge**, so half the line sits outside it. The
  inside margin measured 0.739in against KDP's 0.75in requirement for a 151-300
  page book. `M_IN` is 19.6mm, not the 19.05mm that 0.75in converts to.
- **`overflow:hidden` clips silently.** The week-13 sheet ran 82 cells at 10
  across, overflowed, and printed 80. "All eighty-two, once" was a lie for one
  build and nothing said so.
- **A margin audit is not a collision audit.** Every element sat comfortably
  inside the trim while `REVIEW` printed on top of the running credit line on all
  82 practice pages. Distance to the paper edge is a different question from
  distance to the next thing on the page, and only the first was being asked.
  `audit_overlap()` now checks type against type and rules against type, with a
  1.5mm near-miss floor. Two exclusions keep it from drowning in false positives:
  grid glyphs (text inside cells that legitimately share a row) and spans sharing
  a baseline (full-width CJK punctuation carries far more side bearing than
  advance width, so 「）」 and the 「、」 after it overlap as boxes while reading
  perfectly).

### The KanjiVG year was never 2026

Every KanjiVG file carries `Copyright (C) 2009/2010/2011 Ulrich Apel.` — checked
verbatim against all 82 N5 files and a 23-character sample across the rest of the
corpus, 105 of 105 identical. The project README gives no years at all. The site
said 2009-2012, then 2009-2026 in five places; both were wrong, and the second
was worse, because CC BY-SA 3.0 4(c) makes that notice the thing we are required
to keep intact. Fixed in `e8f31fd`. The notice is reproduced in full on the
book's copyright page.

### Attribution is per page on a loose SHEET, and per book in a BOOK

Different obligations, because different media — and conflating them put 164
pages of small print under the practice grids for one build.

`freepack.py` and `app/api/kanji-sheets/route.ts` **must keep their per-sheet
credit.** A single practice sheet leaves the site as a loose page with no
colophon attached to it, so a credit anywhere else does not travel with the work.

`kdpbook.py` must not. A 198-page perfect-bound book cannot be separated from its
copyright page, and both licences ask for credit appropriate to the medium:

- **CC BY-SA 3.0 §4(c)** requires copyright notices be kept intact and says the
  credit "may be implemented in any reasonable manner", "reasonable to the medium
  or means You are utilizing". KanjiVG's own notice asks to be attributed "in
  your own copyright header" — which is precisely what a copyright page is.
- **EDRDG's "on each screen display"** clause — cited by an earlier version of
  this README as the reason for per-page credit — applies specifically to
  **web-based dictionary servers**. For apps EDRDG accepts an About screen; for
  software packages, the documentation. A printed book has no screens; its front
  matter is the analogue. EDRDG's own suggested acknowledgement wording is
  printed verbatim on page 2, read from `n5-vocab.json` so it cannot drift.

Page 2 therefore carries KanjiVG's notice in full, the link, the statement that
our per-stroke renderings are themselves CC BY-SA 3.0, and EDRDG's
acknowledgement. Nothing else in the book carries a credit line.
**Do not "tidy" the free sheets to match.**

### Geometry, for when the page count changes

Spine width is `pages x 0.002252in` (white paper), so **the cover file is only
valid for one interior**. `kdpcover.py` reads the page count out of the rendered
interior rather than taking it as a constant, and renders its two sample cards
from that same PDF, so a cover cannot show a page the book no longer contains.

### The review boxes are in the header, not at the foot

They were at the foot and collided with the running credit line. The empty right
end of the ORDER row looks like the obvious home for them and is not: it is wide
open at 4 strokes and completely full at 14. The header block is the same height
on all 82 sheets whatever the stroke count.

### The title, subtitle and series name live in three files

KDP matches the cover against the listing, so the subtitle string is duplicated
in `kdpbook.py` (title page), `kdpcover.py` (front cover subhead) and the Amazon
listing. Edit all three together. `SERIES` is likewise set in both generators.
