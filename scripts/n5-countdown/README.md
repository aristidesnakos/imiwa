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

Every kanji sheet has room reserved for 2–3 high-frequency vocabulary words and one
example sentence, and that space is currently empty. `data/sentences/published/N5.json`
is `[]` and there is no vocabulary source in the repo. Do not fill it by hand —
unreviewed readings in front of paying learners is the one failure this product cannot
survive. Wire up a licensed source (JMdict, or work the Tatoeba review queue) and the
layout takes it without a redesign.

## Attribution

Stroke data is KanjiVG © Ulrich Apel, CC BY-SA 3.0. Share-alike, so the credit has to
travel on every sheet that carries a diagram — not on a colophon at the back.
