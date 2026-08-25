"""
kdpbook.py — the print interior. Undated, stroke-order-led, KDP 8.5x11.

WHY THIS IS A SECOND GENERATOR AND NOT A FLAG ON book.py
────────────────────────────────────────────────────────
`book.py` emits the dated countdown, which is now the free lead magnet: a
handful of pages with real dates on them, regenerated per cohort. This emits
the thing that gets sold: an undated reference-and-practice book with no expiry.

They differ in the three things that matter most on a page — whether dates
exist, where the gutter is, and what leads — so one file with an `if print:`
running through every function would be harder to read than two. Both read the
same `schedule.json` and the same `n5-vocab.json`; the character order is the
shared asset, the packaging is not.

WHAT CHANGED FROM THE COUNTDOWN, AND WHY
────────────────────────────────────────
**Stroke order leads, and it is large.** 277 of ~1,100 search clicks in the
28 days to 21 Aug 2026 came from the "kanji stroke order" cluster, at average
position 3.9 — a quarter of all traffic from one intent. Nobody searched for a
study plan. The page now opens with what the audience is actually asking for.

**No dates anywhere.** A dated book is worth nothing the day after the test it
counts down to, and cannot be re-cut once Amazon has listed it. `schedule.json`
carries `start`, `end` and `days_to_test` for every week and this generator
reads NONE of them — only `week`, `theme` and `new`. `assert_undated()` at the
bottom greps the finished HTML for a year, a month name and an ISO date and
refuses to emit a PDF if it finds one. The weeks survive as ordinals, which is
what "start 14 weeks before your test date" needs and all it needs.

**No fold strip.** It was a workaround for a loose sheet: you cannot fold a
strip under on a perfect-bound page, and on verso pages it would land in the
gutter. Readings and meaning move into a dictionary-style header, which is both
what a printed reference book does and what "kanji dictionary" and
"<word> kanji" searches are asking for.

WHY EVERY CHARACTER IS A TWO-PAGE SPREAD
────────────────────────────────────────
The single-sheet build came to 99 pages against a 173-page comparable, and page
count is the currency buyers compare in this category. Doubling it by padding
would have been obvious and cheap-looking. Instead each character now takes a
facing pair:

    verso (left)  reference — stroke order, dictionary header, trace, words
    recto (right) practice  — copy and from-memory grids, review boxes

That is 2 pages per character, which is exactly what the comparable spends, and
it buys three things padding would not. The reader looks left and writes right,
so the reference never disappears under their hand. All 96 practice squares sit
on a recto, where the gutter is on the LEFT and a right-handed writer's hand is
nowhere near the spine — this book is perfect-bound and will not lie flat.
And 108 squares per character instead of 60 is the thing a writing workbook is
actually bought for.

THE PARITY INVARIANT — DO NOT BREAK IT
──────────────────────────────────────
A spread only works if the reference page is always a verso. Page 1 is a recto,
so reference pages must land on even numbers and practice pages on odd ones.
That holds only if every block between them has an EVEN length:

    front matter        4 pages
    each week           2 + 2n  (opener, n spreads, week review) — even for any n
    back matter         2 pages

`paginate()` computes the numbers and `main()` asserts the parity before
rendering. Adding one page anywhere silently flips every spread in the rest of
the book from facing to straddling a page turn, and it is invisible in a PDF
viewer that shows one page at a time — which is why it is an assert and not a
comment.

Weeks 13 and 14 teach no new characters (`new` is empty): they are the full
review week and the test week. They still emit two pages each, so the invariant
does not care.

KDP will not print a spiral binding, so the book is perfect-bound and will not
lie flat. That is why every writing grid is set on the OUTER two-thirds of the
page: the reader's hand never has to fight the spine.
"""

import argparse
import asyncio
import json
import pathlib
import re
from playwright.async_api import async_playwright

import content

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
DATA = json.loads((HERE / 'schedule.json').read_text())
VOCAB, VOCAB_CREDIT = content.load_vocab(HERE / 'n5-vocab.json')

SAGE, SAGE_DEEP = '#C0D8B4', '#9CB49C'
TERRA_INK = '#9B3A26'
INK = '#3E2F26'

# KDP 8.5x11 in millimetres, with the inside margin on the gutter side.
# 0.75in inside is KDP's requirement for a 151-300 page book, which this is.
PW, PH = 215.9, 279.4                 # 8.5 x 11in, in mm, for internal layout maths
# The page box itself is declared in INCHES, not in these millimetres. Chromium
# rounds a mm page size up to a whole device pixel and emitted 8.513 x 11.013in
# -- 0.34mm over trim on both axes, which KDP either rejects or silently scales,
# and a silently scaled interior throws every margin out by the same amount.
PW_IN, PH_IN = '8.5in', '11in'
# 19.6mm inside, not the 19.05mm that 0.75in converts to exactly. Table borders
# are stroked ON the box edge, so half the 1px line sits outside it and the
# measured inside margin came out at 0.739in -- under KDP's 0.75in requirement
# for a 151-300 page book by 0.28mm. Half a millimetre of headroom costs nothing:
# the widest thing on any page is the 180mm writing grid and 183.6mm remains.
M_IN, M_OUT, M_TOP, M_BOT = 19.6, 12.7, 15.0, 14.0
WORK = PW - M_IN - M_OUT          # 184.15mm of usable width

CELL = 15.0                       # writing square, mm
COLS = 12                         # 12 x 15mm = 180mm, inside the 184.15mm work width

TITLE = 'N5 Kanji: Stroke Order &amp; Writing Practice'
# The Amazon series name. Set once here so the title page, the copyright page and
# the listing cannot drift apart -- KDP matches the cover against the listing.
SERIES = 'MichiKanji Stroke Order Workbooks'


def stroke_paths(char):
    """The stroke <path>s only, in order, stripped of ids.

    Reads the StrokePaths group by name rather than taking every <path>: the
    file also carries a StrokeNumbers group, and grabbing both would be right
    by accident today and wrong the moment a variant adds one. Ids go because
    each path is emitted twice per step and duplicate ids are invalid SVG.

    The comment strip here is not the licence bug that was fixed in
    `lib/stroke-order.ts` and `app/api/kanji-sheets/route.ts`. Those two ship
    the SVG itself to a reader, so the notice has to travel inside the file.
    This one throws the file away and keeps only path geometry, and the
    notice is reproduced in full on the copyright page and credited on every
    page that carries a diagram.
    """
    p = HERE / 'svg' / f'{ord(char):05x}.svg'
    if not p.exists():
        return []
    raw = re.sub(r'<!--.*?-->', '', p.read_text(), flags=re.S)
    m = re.search(r'<g id="kvg:StrokePaths_[^"]*"[^>]*>(.*?)\n</g>', raw, re.S)
    body = m.group(1) if m else raw
    return [re.sub(r'\s(?:id|kvg:type)="[^"]*"', '', x)
            for x in re.findall(r'<path[^>]*?/>', body)]


def stroke_steps(paths, avail_w, avail_h, cap, rows=None, weight=5.5, gap=2.0):
    """One diagram per stroke, wrapped to whichever row count draws them largest.

    Ghost and live strokes are styled inline. A `.strokes svg path` rule in the
    stylesheet would colour both groups identically and every diagram would
    render as the same finished character — which is exactly how the first
    draft of the countdown looked.

    The row count is SEARCHED, not fixed, because the binding constraint flips
    with stroke count. One row of 14 diagrams is limited by the page width and
    comes out at 24mm; three rows of 5 are limited by the block height and come
    out at 31mm. Fixing the rows at one — or at two — leaves the densest
    characters smallest, which is backwards: 語, 読 and 聞 at 14 strokes are
    precisely the ones a reader bought a stroke-order book to see.

    The block reserves `avail_h` for every character and centres the rows in it,
    so a 3-stroke page and a 14-stroke page are the same height and the sheets
    align through the book. Sizing the block to its content instead was the
    earlier bug: it made page height depend on the character, and a fixed 24mm
    cap overflowed the LOW stroke counts rather than the high ones, because 4
    diagrams at 24mm draw a taller row than 13 at 11.
    """
    ghost = (f'fill="none" stroke="#E2EADD" stroke-width="{weight}" '
             'stroke-linecap="round" stroke-linejoin="round"')
    live = (f'fill="none" stroke="{INK}" stroke-width="{weight}" '
            'stroke-linecap="round" stroke-linejoin="round"')
    n = len(paths) or 1

    def size_for(r):
        per = -(-n // r)                                   # ceil
        return min(cap,
                   (avail_w - gap * (per - 1)) / per,
                   (avail_h - gap * (r - 1)) / r)

    if rows:
        best = rows
    else:
        best = max(range(1, 4), key=size_for)
    per = -(-n // best)
    size = size_for(best)
    svgs = [(f'<svg style="width:{size:.2f}mm;height:{size:.2f}mm" '
             f'viewBox="0 0 109 109"><g {ghost}>{"".join(paths)}</g>'
             f'<g {live}>{"".join(paths[: i + 1])}</g></svg>')
            for i in range(n)]
    return ''.join(f'<div class="srow">{"".join(svgs[i:i + per])}</div>'
                   for i in range(0, n, per))


CSS = f"""
@page {{ size: {PW_IN} {PH_IN}; margin: 0; }}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:'Noto Sans CJK JP',sans-serif; color:{INK}; background:#fff; }}
.serif {{ font-family:'Noto Serif CJK JP',serif; }}

.page {{ width:{PW_IN}; height:{PH_IN}; position:relative;
         page-break-after:always; background:#fff; overflow:hidden;
         padding:{M_TOP}mm {M_OUT}mm {M_BOT}mm {M_IN}mm; }}
/* Recto pages carry the gutter on the left, verso on the right. Page 1 is a
   recto, so odd children are recto. Nothing writable sits in the spine. */
.page:nth-child(even) {{ padding-left:{M_OUT}mm; padding-right:{M_IN}mm; }}

/* ── running foot ─────────────────────────────────────────────────────── */
.foot {{ position:absolute; left:{M_IN}mm; right:{M_OUT}mm; bottom:10mm;
         font-size:6.5pt; color:#9A8878; line-height:1.45; }}
.page:nth-child(even) .foot {{ left:{M_OUT}mm; right:{M_IN}mm; }}
.foot .row {{ display:flex; justify-content:space-between; gap:5mm; }}
.pn {{ font-weight:700; color:#7A6858; }}

/* ── front matter ─────────────────────────────────────────────────────── */
.title-pg {{ display:flex; flex-direction:column; justify-content:center; text-align:center; }}
.title-pg .kicker {{ font-size:10pt; letter-spacing:.22em; text-transform:uppercase;
                     color:{TERRA_INK}; font-weight:700; }}
.title-pg h1 {{ font-size:38pt; line-height:1.08; margin-top:9mm; }}
.title-pg h1 em {{ font-style:normal; color:{TERRA_INK}; }}
.title-pg .sub {{ font-size:13pt; color:#6E5C4E; margin-top:7mm; line-height:1.6; }}
.title-pg .series {{ margin-top:16mm; font-size:9.5pt; letter-spacing:.14em;
                     text-transform:uppercase; color:#8A7666; }}
.title-pg .dom {{ margin-top:3mm; font-size:10pt; color:{TERRA_INK}; }}

.legal {{ font-size:8.5pt; line-height:1.62; color:#5C4A3C; }}
.legal h2 {{ font-size:11pt; color:{INK}; margin:0 0 4mm; }}
.legal h3 {{ font-size:8.5pt; color:{TERRA_INK}; letter-spacing:.1em;
             text-transform:uppercase; margin:6mm 0 2mm; }}
.legal p {{ margin-bottom:3mm; }}
.legal pre {{ font-family:'Noto Sans CJK JP',sans-serif; font-size:7.5pt;
              line-height:1.5; white-space:pre-wrap; color:#6E5C4E;
              border-left:2px solid {SAGE_DEEP}; padding-left:3mm; margin-bottom:3mm; }}

.prose h2.pt {{ font-size:24pt; margin-top:2mm; }}
.prose p {{ font-size:10.5pt; line-height:1.72; color:#5C4A3C; margin-top:4mm;
            max-width:160mm; }}
.prose b {{ color:{INK}; }}
.prose h3 {{ font-size:9pt; letter-spacing:.12em; text-transform:uppercase;
             color:{TERRA_INK}; font-weight:700; margin-top:8mm; }}
.steps {{ margin-top:5mm; }}
.steps .s {{ display:flex; gap:5mm; align-items:baseline; margin-top:4mm;
             font-size:10.5pt; line-height:1.65; color:#5C4A3C; max-width:160mm; }}
.steps .s .n {{ font-family:'Noto Serif CJK JP',serif; font-size:15pt;
                color:{TERRA_INK}; width:9mm; flex:0 0 auto; }}

/* ── week opener ──────────────────────────────────────────────────────── */
.set-num {{ font-size:11pt; letter-spacing:.2em; text-transform:uppercase;
            color:{TERRA_INK}; font-weight:700; }}
.rule {{ height:2px; background:{TERRA_INK}; width:52px; border-radius:2px; margin:5mm 0 6mm; }}
.set-theme {{ font-size:22pt; line-height:1.25; }}
.chars {{ display:flex; flex-wrap:wrap; gap:3.5mm; margin-top:8mm; }}
.chip {{ width:19mm; height:19mm; border:1.4px solid {SAGE_DEEP}; border-radius:3mm;
         display:flex; align-items:center; justify-content:center; font-size:22pt; }}
.howto {{ margin-top:12mm; border-top:1px solid {SAGE_DEEP}; padding-top:6mm;
          font-size:10.5pt; line-height:1.75; color:#5C4A3C; max-width:158mm; }}
.howto b {{ color:{INK}; }}

/* ── shared sheet furniture ───────────────────────────────────────────── */
h3.lbl {{ font-size:8.5pt; letter-spacing:.14em; text-transform:uppercase;
          color:{TERRA_INK}; font-weight:700; margin-bottom:2.5mm; }}
h3.lbl span {{ color:#9A8878; font-weight:400; letter-spacing:0; text-transform:none; }}

/* Stroke order leads, and it is the largest thing on the reference page.
   A quarter of the site's search clicks come from this one intent. */
.strokes {{ border:1.2px solid {SAGE_DEEP}; border-radius:2mm; padding:4mm 4mm 3mm; }}
.strokes .box {{ height:96mm; display:flex; flex-direction:column;
                 justify-content:center; gap:2mm; }}
.srow {{ display:flex; gap:2mm; flex-wrap:nowrap; align-items:center; }}
.strokes svg {{ border:1px dashed {SAGE_DEEP}; border-radius:1.5mm; flex:0 0 auto; }}

.head {{ display:flex; gap:7mm; align-items:flex-start; margin-top:6mm;
         border-bottom:1px solid {SAGE_DEEP}; padding-bottom:4mm; }}
.head .glyph {{ font-size:46pt; line-height:.95; font-family:'Noto Serif CJK JP',serif; }}
.head .meta {{ flex:1; padding-top:0.5mm; }}
.head .mean {{ font-size:15pt; line-height:1.3; }}
.head .rd {{ font-size:10pt; color:#5C4A3C; margin-top:3mm; line-height:1.7; }}
.head .rd b {{ color:{TERRA_INK}; font-size:8pt; letter-spacing:.1em;
               text-transform:uppercase; margin-right:2mm; }}
.head .num {{ text-align:right; font-size:9pt; color:#8A7666; white-space:nowrap; }}
.head .num b {{ display:block; font-size:19pt; color:{INK}; line-height:1.1; }}

.band {{ margin-top:5mm; }}
table.grid {{ border-collapse:collapse; }}
table.grid td {{ border:1px solid {SAGE_DEEP}; height:{CELL}mm; width:{CELL}mm;
                 position:relative; text-align:center; vertical-align:middle;
                 font-family:'Noto Serif CJK JP',serif; font-size:29pt; }}
table.grid td::before {{ content:''; position:absolute; left:50%; top:1mm; bottom:1mm;
                         border-left:1px dashed #CFDDC6; }}
table.grid td::after {{ content:''; position:absolute; top:50%; left:1mm; right:1mm;
                        border-top:1px dashed #CFDDC6; }}
.trace td {{ color:#CBD9C2; }}
.write td.model {{ color:#CBD9C2; }}
.memory td {{ background:#F6F2EA; }}

.words {{ margin-top:7mm; }}
.words .w {{ display:flex; align-items:baseline; gap:4mm; padding:4mm 0;
             border-bottom:1px dotted {SAGE_DEEP}; font-size:11pt; }}
.words .jp {{ font-family:'Noto Serif CJK JP',serif; font-size:17pt; min-width:28mm; }}
.words .rdg {{ color:#7A6858; font-size:10.5pt; min-width:28mm; }}
.words .en {{ flex:1; color:#5C4A3C; font-size:10.5pt; }}
/* The reading-type mark is ours, not JMdict's, so it sits in its own column
   and never mixes into the licensed gloss text. */
.words .ty {{ font-size:7.5pt; color:{SAGE_DEEP}; letter-spacing:.08em;
              text-transform:uppercase; width:14mm; text-align:right; }}

/* ── practice page ────────────────────────────────────────────────────── */
.phead {{ display:flex; align-items:center; gap:5mm; border-bottom:1px solid {SAGE_DEEP};
          padding-bottom:3.5mm; }}
.phead .g {{ font-family:'Noto Serif CJK JP',serif; font-size:24pt; line-height:1; }}
.phead .m {{ font-size:11.5pt; flex:1; }}
.phead .r {{ font-size:8.5pt; color:#7A6858; line-height:1.5; text-align:right; }}
.mini {{ margin-top:4mm; }}
.mini .srow {{ gap:1.6mm; }}
.mini svg {{ border:1px dashed #DDE7D7; border-radius:1mm; flex:0 0 auto; }}

/* Intervals, not dates: the same spacing, with no expiry. */
.review {{ margin-top:6mm; border-top:1px solid {SAGE_DEEP}; padding-top:4mm;
           display:flex; gap:7mm; align-items:center; }}
.review .t {{ font-size:8.5pt; letter-spacing:.14em; text-transform:uppercase;
              color:{TERRA_INK}; font-weight:700; }}
.slot {{ display:flex; gap:2mm; align-items:center; font-size:10pt; color:#5C4A3C; }}
.slot .b {{ width:5mm; height:5mm; border:1.3px solid {SAGE_DEEP}; border-radius:1mm; }}

/* ── week review ──────────────────────────────────────────────────────── */
.rev-row {{ display:flex; align-items:center; gap:4mm; margin-top:3.5mm; }}
.rev-row .cue {{ width:44mm; font-size:10pt; color:#5C4A3C; line-height:1.35; }}
.rev-row .cue b {{ display:block; font-size:7.5pt; color:{SAGE_DEEP};
                   letter-spacing:.08em; text-transform:uppercase; }}
.rev-cells {{ display:flex; gap:0; }}
.rev-cells .c {{ width:17mm; height:17mm; border:1px solid {SAGE_DEEP};
                 margin-left:-1px; position:relative; }}
.rev-cells .c::before {{ content:''; position:absolute; left:50%; top:1mm; bottom:1mm;
                         border-left:1px dashed #CFDDC6; }}
.rev-cells .c::after {{ content:''; position:absolute; top:50%; left:1mm; right:1mm;
                        border-top:1px dashed #CFDDC6; }}

.all82 {{ display:grid; grid-template-columns:repeat(12,1fr); gap:2mm; margin-top:5mm; }}
.all82 .u {{ text-align:center; }}
.all82 .sq {{ aspect-ratio:1; border:1px solid {SAGE_DEEP}; border-radius:1mm;
              position:relative; }}
.all82 .sq::before {{ content:''; position:absolute; left:50%; top:1mm; bottom:1mm;
                      border-left:1px dashed #CFDDC6; }}
.all82 .sq::after {{ content:''; position:absolute; top:50%; left:1mm; right:1mm;
                     border-top:1px dashed #CFDDC6; }}
.all82 .cap {{ font-size:5pt; color:#8A7666; line-height:1.15; margin-top:0.8mm;
               height:4.6mm; overflow:hidden; }}

/* ── tracker & index ──────────────────────────────────────────────────── */
h2.pt {{ font-size:24pt; margin-top:2mm; }}
.grid82 {{ display:grid; grid-template-columns:repeat(10,1fr); gap:3mm; margin-top:8mm; }}
.cellk {{ aspect-ratio:1; border:1.2px solid {SAGE_DEEP}; border-radius:2mm;
          display:flex; align-items:center; justify-content:center; font-size:14pt;
          font-family:'Noto Serif CJK JP',serif; }}
.lede {{ font-size:11pt; color:#5C4A3C; margin-top:5mm; max-width:158mm; line-height:1.6; }}
.idx {{ column-count:4; column-gap:7mm; margin-top:6mm; font-size:8.5pt; }}
.idx .r {{ break-inside:avoid; display:flex; gap:2mm; align-items:baseline;
           padding:0.9mm 0; border-bottom:1px dotted #E4EADF; }}
.idx .c {{ font-family:'Noto Serif CJK JP',serif; font-size:11.5pt; width:7mm; }}
.idx .m {{ flex:1; color:#5C4A3C; }}
.idx .p {{ color:#9A8878; }}
"""

CREDIT_KVG = 'Stroke data: KanjiVG &copy; 2009&ndash;2011 Ulrich Apel &middot; CC BY-SA 3.0'

# Reproduced from the header of every KanjiVG file. CC BY-SA 3.0 4(c) asks that
# copyright notices be kept intact; this is where the book keeps them.
KVG_NOTICE = """Copyright (C) 2009/2010/2011 Ulrich Apel.
This work is distributed under the conditions of the Creative Commons
Attribution-Share Alike 3.0 Licence. This means you are free:
* to Share - to copy, distribute and transmit the work
* to Remix - to adapt the work

Under the following conditions:
* Attribution. You must attribute the work by stating your use of KanjiVG in
  your own copyright header and linking to KanjiVG's website
  (http://kanjivg.tagaini.net)
* Share Alike. If you alter, transform, or build upon this work, you may
  distribute the resulting work only under the same or similar license to this
  one."""


def foot(page_no, left='', extra=''):
    rows = (f'<div class="row"><span>{left}</span>'
            f'<span class="pn">{page_no}</span></div>')
    if extra:
        rows += f'<div class="row"><span>{extra}</span><span></span></div>'
    return f'<div class="foot">{rows}</div>'


# ── front matter ──────────────────────────────────────────────────────────

def title_page():
    return f"""<div class="page title-pg">
  <div class="kicker">MichiKanji</div>
  <h1 class="serif">N5 Kanji<br><em>Stroke Order &amp; Writing Practice</em></h1>
  <!-- Same string as the cover subhead and the Amazon subtitle. Edit all three. -->
  <div class="sub">All 82 JLPT N5 Characters &mdash; Stroke Order Diagrams,<br>
    Writing Grids, and the Words That Use Them</div>
  <div class="series">{SERIES} &middot; Book 1</div>
  <div class="dom">michikanji.com</div>
</div>"""


def copyright_page(page_no):
    """The page that makes "I own the copyright" a true statement on the KDP form.

    The book is a Collection under CC BY-SA 3.0 §1 — "a work that constitutes a
    Collection will not be considered an Adaptation" — and §4(b) scopes
    ShareAlike to Adaptations, so the compilation, the layout, the schedule and
    the prose are ours and all-rights-reserved. What is NOT ours is said here in
    the same breath, because the honest version is also the one that survives a
    complaint: the diagrams are Apel's, our numbered per-stroke renderings of
    them are Adaptations and therefore CC BY-SA 3.0, and the words are JMdict's.
    """
    return f"""<div class="page">
  <div class="legal">
    <h2 class="serif">{TITLE}</h2>
    <p>{SERIES} &middot; Book 1 &middot; First edition</p>
    <p>Published by MichiKanji &middot; michikanji.com</p>

    <h3>Copyright</h3>
    <p>Compilation, selection and sequence of characters, page design, writing
      grids, review structure and all explanatory text &copy; 2026 MichiKanji.
      All rights reserved. No part of this compilation may be reproduced in any
      form without written permission, except as noted below for the
      third-party material it incorporates.</p>

    <h3>Stroke diagrams &mdash; KanjiVG</h3>
    <p>The stroke-order diagrams are generated from the KanjiVG project
      (<span>kanjivg.tagaini.net</span>), used under the Creative Commons
      Attribution-ShareAlike 3.0 licence
      (<span>creativecommons.org/licenses/by-sa/3.0/</span>). KanjiVG's notice
      is reproduced in full:</p>
    <pre>{KVG_NOTICE}</pre>
    <p>The per-stroke sequences printed in this book are adaptations of that
      material and are themselves offered under the Creative Commons
      Attribution-ShareAlike 3.0 licence. Nothing in this book restricts any
      right you hold in the KanjiVG material under that licence.</p>

    <h3>Vocabulary &mdash; JMdict</h3>
    <p>The words, readings and English glosses are reproduced without
      modification from JMdict, property of the Electronic Dictionary Research
      and Development Group, used under the Creative Commons
      Attribution-ShareAlike 4.0 licence
      (<span>www.edrdg.org/edrdg/licence.html</span>). Selection and ordering of
      the entries are ours; the entries themselves are unaltered.</p>

    <h3>A note on what this book is not</h3>
    <p>This book is not affiliated with, endorsed by, or connected to the Japan
      Foundation or Japan Educational Exchanges and Services, who administer the
      Japanese-Language Proficiency Test. &ldquo;JLPT&rdquo; is used here only to
      describe the level of the characters covered. The official test content is
      not published, and the character list in this book is compiled from public
      sources.</p>
  </div>
  {foot(page_no)}
</div>"""


def how_to_page(page_no):
    """The one page that has to carry the 14-week plan without a single date."""
    return f"""<div class="page prose">
  <div class="set-num">How to use this book</div><div class="rule"></div>
  <h2 class="pt serif">Fourteen weeks, starting whenever you start</h2>
  <p>There are no dates in this book, and that is deliberate. The JLPT is sat
    twice a year and you might be working towards either sitting, or towards no
    test at all. So the plan is counted in weeks, not days of the calendar:
    <b>find your test date, count back fourteen weeks, and start there.</b> If
    you have less time than that, run two weeks at once &mdash; the order still
    holds.</p>
  <h3>The shape of the fourteen weeks</h3>
  <p>Weeks 1 to 12 teach the 82 characters, four to nine at a time, grouped so
    that characters you will meet together are learned together. Week 13 is a
    pass over all 82. Week 14 is the week of your test, and there is nothing new
    in it on purpose.</p>
  <h3>Each character takes two facing pages</h3>
  <div class="steps">
    <div class="s"><span class="n serif">左</span><span>The <b>left-hand page</b>
      is for reading, and nothing on it is written on. Stroke order first and
      large, then the meaning and readings, then two or three real words that use
      the character &mdash; every one of them written only with characters this
      book teaches, so you can write the whole word by the end.</span></div>
    <div class="s"><span class="n serif">右</span><span>The <b>right-hand page</b>
      is for writing, and it stays open beside the left one. Trace the grey
      first, then copy from the model, then cover the left page and write from
      memory. Every square in this book is on a right-hand page for one reason:
      the book is bound rather than spiralled, and on a right-hand page your
      writing hand travels away from the spine instead of over it.</span></div>
  </div>
  <h3>The four boxes at the bottom of the writing page</h3>
  <p>Tick them <b>one day, three days, one week and three weeks</b> after you
    first write the character. Those gaps are the whole method, and they are the
    reason this is a fourteen-week book rather than a fortnight of cramming.
    Writing a character twenty times today does less than writing it four times
    across three weeks &mdash; that is not an opinion about study habits, it is
    the one finding about memory that has survived a century of retesting.</p>
  <p>The intervals are counted from <b>the day you write it</b>, not from any
    date printed here. Two people starting this book six months apart both get
    the same schedule.</p>
  {foot(page_no, 'How to use this book')}
</div>"""


def why_page(page_no):
    return f"""<div class="page prose">
  <div class="set-num">Before you start</div><div class="rule"></div>
  <h2 class="pt serif">Why stroke order is worth the trouble</h2>
  <p>Stroke order looks like etiquette and is actually engineering. Written in
    the right order, a character comes out with the proportions your eye already
    expects, because the order is what puts each stroke in the space the last one
    left. Written in the wrong order, the same strokes drift &mdash; the shape is
    almost right, which is the hardest kind of wrong to fix later.</p>
  <p>It also decides what you can read. Japanese handwriting joins and abbreviates
    strokes in the order they were made, so a reader who knows the order can
    follow a shortcut they have never seen before. A reader who does not, cannot.
    And every kanji dictionary that is not a search box is indexed by stroke
    count and radical, both of which you get for free once the order is a habit.</p>
  <h3>Two rules cover most of it</h3>
  <div class="steps">
    <div class="s"><span class="n serif">一</span><span><b>Top to bottom, left to
      right.</b> When a character stacks, the top part is finished before the
      bottom starts. When it sits side by side, the left is finished first.</span></div>
    <div class="s"><span class="n serif">十</span><span><b>Horizontal before
      vertical</b> when they cross. 十 is the whole rule in two strokes: the
      sideways one, then the upright.</span></div>
  </div>
  <p>The exceptions are worth learning one at a time rather than in a list, which
    is what the diagram at the top of every left-hand page is for. Follow it once,
    trace the row underneath it, and you will not need it again for that
    character.</p>
  <h3>How to hold the page</h3>
  <p>Write the square at a size you would actually use &mdash; the grids here are
    15mm, roughly what a Japanese practice notebook uses, and the dotted cross is
    there to show you where the middle is, not to be traced. If a character is
    coming out lopsided, it is almost always because a stroke crossed the centre
    line that should have stopped short of it.</p>
  {foot(page_no, 'Before you start')}
</div>"""


# ── week pages ────────────────────────────────────────────────────────────

def week_page(w, page_no):
    chips = ''.join(f'<div class="chip serif">{c}</div>' for c in w['new'])
    n = len(w['new'])
    if n:
        body = f"""<div class="chars">{chips}</div>
  <div class="howto">
    <b>Work through the week one character at a time.</b> Follow the stroke order
    first &mdash; the order is not decoration, it is what makes the character come
    out the right shape and what lets you read someone else&rsquo;s handwriting
    later.<br><br>
    <b>Then come back.</b> Each writing page has four review boxes: tick them one
    day, three days, one week and three weeks after you first wrote the character.
    Those gaps are the whole method.<br><br>
    <b>End the week on the review page</b> at the end of this section, where the
    only prompt is the meaning. If a character will not come back from its meaning
    alone, it is not learned yet, and that is a useful thing to find out with
    weeks in hand rather than in an exam hall.
  </div>"""
    else:
        body = f"""<div class="howto" style="margin-top:8mm;border-top:none;padding-top:0">
    <b>No new characters this week.</b> Everything in it you have already met.
    Turn the page and work the review sheet: the prompt is the meaning, the page
    is blank, and what comes back without help is what you actually know.
  </div>"""
    return f"""<div class="page">
  <div class="set-num">Week {w['week']} of 14</div>
  <div class="rule"></div>
  <h2 class="set-theme serif">{w['theme']}</h2>
  {body}
  {foot(page_no, f"Week {w['week']}")}
</div>"""


def ref_page(k, w, page_no, index_no):
    """Verso. Reading only.

    Nothing on this page is written on, which is not an aesthetic choice. On a
    verso the gutter is on the RIGHT, so a right-handed writer's hand rests over
    the spine of a book that will not lie flat. Every square in this book is
    therefore on a recto, and the front matter tells the reader exactly that:
    left page reads, right page writes. A trace band lived here in the first
    build and quietly contradicted the instructions four pages earlier.
    """
    paths = stroke_paths(k['kanji'])
    steps = stroke_steps(paths, WORK - 8, 92.0, cap=46.0)

    words = VOCAB.get(k['kanji']) or []
    words_html = ''
    if words:
        rows = ''.join(
            f'<div class="w"><div class="jp" lang="ja">{x["word"]}</div>'
            f'<div class="rdg" lang="ja">{x["reading"]}</div>'
            f'<div class="en">{x["gloss"][0]}</div>'
            f'<div class="ty">{x["reading_type"]}</div></div>' for x in words)
        words_html = (f'<div class="words"><h3 class="lbl">Words that use it'
                      f'<span> &mdash; each written with characters in this book</span>'
                      f'</h3>{rows}</div>')

    credit2 = VOCAB_CREDIT if words else ''
    return f"""<div class="page">
  <div class="strokes"><h3 class="lbl">Stroke order
    <span>&mdash; {len(paths)} strokes</span></h3>
    <div class="box">{steps}</div></div>

  <div class="head">
    <div class="glyph">{k['kanji']}</div>
    <div class="meta">
      <div class="mean">{k['meaning']}</div>
      <div class="rd"><b>On</b><span lang="ja">{k['on'] or '&mdash;'}</span></div>
      <div class="rd"><b>Kun</b><span lang="ja">{k['kun'] or '&mdash;'}</span></div>
    </div>
    <div class="num"><b>{index_no}</b>of 82</div>
  </div>

  {words_html}

  <div class="foot"><div class="row">
      <span>Week {w['week']} &middot; {k['kanji']} &middot; write it on the facing page</span>
      <span class="pn">{page_no}</span></div>
    <div class="row"><span>{CREDIT_KVG}</span><span></span></div>
    <div class="row"><span>{credit2}</span><span></span></div>
  </div>
</div>"""


def practice_page(k, w, page_no, index_no):
    """Recto. Every writable square in the book is on a page like this one.

    The gutter is on the left here, so a right hand travels away from the spine
    across all twelve columns. The compact stroke row at the top is not a
    duplicate of the facing page for its own sake: it is at the height the eye
    is already at, so checking the order mid-character does not mean looking
    away from the square being written.
    """
    paths = stroke_paths(k['kanji'])
    mini = stroke_steps(paths, WORK - 4, 12.0, cap=11.0, rows=1, weight=6.5)

    def band(rows, model=None):
        out = []
        for r in range(rows):
            cells = []
            for c in range(COLS):
                if model == 'all':
                    cells.append(f'<td>{k["kanji"]}</td>')
                elif model == 'first' and r == 0 and c == 0:
                    cells.append(f'<td class="model">{k["kanji"]}</td>')
                else:
                    cells.append('<td></td>')
            out.append('<tr>' + ''.join(cells) + '</tr>')
        return ''.join(out)

    slots = ''.join(f'<div class="slot"><div class="b"></div>{lab}</div>'
                    for lab in ('+1 day', '+3 days', '+7 days', '+21 days'))

    return f"""<div class="page">
  <div class="phead">
    <div class="g">{k['kanji']}</div>
    <div class="m">{k['meaning']}</div>
    <div class="r">On {k['on'] or '&mdash;'}<br>Kun {k['kun'] or '&mdash;'}</div>
    <div class="r" style="text-align:right"><b>{index_no}</b> of 82<br>Week {w['week']}</div>
  </div>

  <div class="mini"><h3 class="lbl">Order <span>&mdash; {len(paths)} strokes</span></h3>
    {mini}</div>

  <div class="band"><h3 class="lbl">Trace <span>&mdash; follow the grey</span></h3>
    <table class="grid trace">{band(2, model='all')}</table></div>

  <div class="band"><h3 class="lbl">Copy <span>&mdash; model in the first square</span></h3>
    <table class="grid write">{band(5, model='first')}</table></div>

  <div class="band"><h3 class="lbl">From memory
    <span>&mdash; cover the left-hand page</span></h3>
    <table class="grid memory">{band(4)}</table></div>

  <div class="review"><div class="t">Review</div>{slots}</div>

  <div class="foot"><div class="row">
      <span>Week {w['week']} &middot; {k['kanji']}</span><span class="pn">{page_no}</span></div>
    <div class="row"><span>{CREDIT_KVG}</span><span></span></div>
  </div>
</div>"""


def week_review_page(w, page_no, by_char):
    """Verso, at the end of every week. The prompt is the meaning, nothing else."""
    rows = ''.join(
        f'<div class="rev-row"><div class="cue"><b>{i + 1}</b>'
        f'{re.split(r"[;,]", by_char[c]["meaning"])[0].strip()}</div>'
        f'<div class="rev-cells">{"".join("<div class=c></div>" for _ in range(8))}</div></div>'
        for i, c in enumerate(w['new']))
    return f"""<div class="page">
  <div class="set-num">Week {w['week']} review</div><div class="rule"></div>
  <h2 class="pt serif">From the meaning alone</h2>
  <div class="lede">Cover the character pages. Write each one from its meaning
    only. What comes back without help is learned; what does not is this
    week&rsquo;s real homework, and it is a much shorter list than the whole
    week.</div>
  {rows}
  {foot(page_no, f"Week {w['week']} review")}
</div>"""


def all82_review_page(w, page_no):
    cells = ''.join(
        f'<div class="u"><div class="sq"></div>'
        f'<div class="cap">{re.split(r"[;,]", k["meaning"])[0].strip()}</div></div>'
        for k in DATA['kanji'])
    return f"""<div class="page">
  <div class="set-num">Week {w['week']} review</div><div class="rule"></div>
  <h2 class="pt serif">All eighty-two, once</h2>
  <div class="lede">One square each, in the order you learned them, prompted by
    meaning alone. Do it in one sitting if you can &mdash; the point is to find
    the ten or fifteen that have gone soft, not to be perfect.</div>
  <div class="all82">{cells}</div>
  {foot(page_no, f"Week {w['week']} review")}
</div>"""


def test_week_page(w, page_no):
    return f"""<div class="page prose">
  <div class="set-num">Week {w['week']}</div><div class="rule"></div>
  <h2 class="pt serif">The week of the test</h2>
  <p>Nothing new goes in this week. If a character is not there by now it will
    not arrive in six days, and the attempt costs you the ones that are.</p>
  <h3>What is worth doing</h3>
  <div class="steps">
    <div class="s"><span class="n serif">一</span><span>Work the list you built on
      the Week 13 review page, and only that list. Ten characters written four
      times each is a better week than eighty-two written once.</span></div>
    <div class="s"><span class="n serif">二</span><span>Read the words on the
      left-hand pages rather than writing them. The reading sections of the test
      are worth more marks than any writing you will do, and the words in this
      book were chosen because they are the frequent ones.</span></div>
    <div class="s"><span class="n serif">三</span><span>Write by hand at least once
      the day before. Not to learn anything &mdash; to arrive with the motion
      already warm.</span></div>
  </div>
  <h3>Afterwards</h3>
  <p>This book does not expire. The characters here are the foundation of every
    level above N5, and the same fourteen weeks run again at N4 with the next
    set. If you found the stroke-order pages the useful part, that is the part
    the next book is built around too.</p>
  <p style="margin-top:10mm"><b>michikanji.com</b> &mdash; every character in this
    book has a page with animated stroke order, and the practice sheets are free
    to print.</p>
  {foot(page_no, f"Week {w['week']}")}
</div>"""


# ── back matter ───────────────────────────────────────────────────────────

def tracker_page(page_no):
    cells = ''.join(f'<div class="cellk">{k["kanji"]}</div>' for k in DATA['kanji'])
    return f"""<div class="page">
  <div class="set-num">Progress</div><div class="rule"></div>
  <h2 class="pt serif">82 characters, one page</h2>
  <div class="lede">Colour a square in when you can write the character from its
    meaning alone, with the page covered. This is the only progress report that
    matters &mdash; not how many pages you have filled, but how many characters
    come back without help.</div>
  <div class="grid82">{cells}</div>
  {foot(page_no, 'Progress')}
</div>"""


def index_page(page_no, char_page):
    """Every character with the page it is on.

    Page numbers come from the real pagination, not from an offset: week openers
    and week review pages sit between the spreads, so the reference pages are not
    contiguous and any arithmetic shortcut is wrong for every character after the
    first week.

    Only the first clause of the meaning is printed — 電 is "electricity;
    electric powered", which wraps to two lines and breaks the column rhythm.
    """
    rows = ''.join(
        f'<div class="r"><span class="c serif">{k["kanji"]}</span>'
        f'<span class="m">{re.split(r"[;,]", k["meaning"])[0].strip()}</span>'
        f'<span class="p">{char_page.get(k["kanji"], "")}</span></div>'
        for k in DATA['kanji'])
    return f"""<div class="page">
  <div class="set-num">Index</div><div class="rule"></div>
  <h2 class="pt serif">Every character, by page</h2>
  <div class="idx">{rows}</div>
  {foot(page_no, 'Index')}
</div>"""


# ── pagination ────────────────────────────────────────────────────────────

FRONT = 4          # title, copyright, how to use, why stroke order
BACK = 2           # tracker, index


def paginate():
    """Page numbers for the whole book, computed without rendering anything.

    Returns (char_ref_page, char_index, total_pages). The sample uses these too,
    so a sampled sheet carries the number it would carry in the finished book and
    the index is truthful on both.
    """
    char_page, char_index = {}, {}
    for i, k in enumerate(DATA['kanji']):
        char_index[k['kanji']] = i + 1
    n = FRONT + 1                          # first week opener
    for w in DATA['plan']:
        n += 1                             # the week opener
        for c in w['new']:
            char_page[c] = n               # reference page (verso)
            n += 2                         # + practice page (recto)
        n += 1                             # the week review page
    return char_page, char_index, n + BACK - 1


def assert_undated(html):
    """Refuse to emit a book with a date in it.

    `schedule.json` carries `start`, `end` and `days_to_test` for every week, and
    the whole product decision rests on none of them reaching paper: a book with
    6 December 2026 printed in it is worthless on 7 December and the Amazon
    listing keeps its reviews forever. This is cheap and it is the one mistake
    that cannot be corrected after launch.
    """
    text = re.sub(r'<[^>]+>', ' ', html)
    bad = []
    months = ('January|February|March|April|May|June|July|August|September'
              '|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec')
    for pat, why in ((r'\b20\d\d-\d\d-\d\d\b', 'ISO date'),
                     (rf'\b({months})\b\.?\s+\d{{1,2}}\b', 'month and day'),
                     (rf'\b\d{{1,2}}\s+({months})\b', 'day and month'),
                     (r'\b(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\b', 'weekday')):
        for m in re.finditer(pat, text):
            bad.append(f'{why}: {m.group(0)!r}')
    # A year is allowed only in the copyright line and the KanjiVG notice.
    years = [m.group(0) for m in re.finditer(r'\b(19|20)\d\d\b', text)]
    allowed = {'2026', '2009', '2010', '2011', '3.0', '4.0'}
    bad += [f'year: {y!r}' for y in years if y not in allowed]
    if bad:
        raise SystemExit('UNDATED CHECK FAILED:\n  ' + '\n  '.join(sorted(set(bad))))


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mode', choices=['sample', 'full'], default='sample')
    ap.add_argument('--out', default=None)
    a = ap.parse_args()

    by_char = {k['kanji']: k for k in DATA['kanji']}
    week_of = {c: w for w in DATA['plan'] for c in w['new']}
    char_page, char_index, total = paginate()

    def week_block(w, n):
        """opener + n spreads + one review page. Always an even number of pages."""
        out = [week_page(w, n)]
        n += 1
        for c in w['new']:
            out.append(ref_page(by_char[c], w, n, char_index[c]))
            out.append(practice_page(by_char[c], w, n + 1, char_index[c]))
            n += 2
        if not w['new']:
            out.append(all82_review_page(w, n) if w['week'] == 13
                       else test_week_page(w, n))
        else:
            out.append(week_review_page(w, n, by_char))
        return out, n + 1

    if a.mode == 'sample':
        # One of every page type, carrying its real page number.
        w = DATA['plan'][2]
        picks = ['時', '午']
        pages = [title_page(), copyright_page(2), how_to_page(3), why_page(4)]
        pages.append(week_page(w, char_page[w['new'][0]] - 1))
        for c in picks:
            pages.append(ref_page(by_char[c], w, char_page[c], char_index[c]))
            pages.append(practice_page(by_char[c], w, char_page[c] + 1, char_index[c]))
        # 語 is the densest character in the set at 14 strokes.
        pages.append(ref_page(by_char['語'], week_of['語'],
                              char_page['語'], char_index['語']))
        pages.append(practice_page(by_char['語'], week_of['語'],
                                   char_page['語'] + 1, char_index['語']))
        pages.append(week_review_page(w, char_page[w['new'][-1]] + 2, by_char))
        pages.append(all82_review_page(DATA['plan'][12], total - 3))
        pages.append(test_week_page(DATA['plan'][13], total - 2))
        pages.append(tracker_page(total - 1))
        pages.append(index_page(total, char_page))
        default_out = 'N5-Practice-print-sample.pdf'
    else:
        pages = [title_page(), copyright_page(2), how_to_page(3), why_page(4)]
        n = FRONT + 1
        for w in DATA['plan']:
            block, n = week_block(w, n)
            pages += block
        pages.append(tracker_page(n)); n += 1
        pages.append(index_page(n, char_page))
        assert n == total, f'pagination disagrees: walked {n}, computed {total}'
        # The spread only works if reference pages are versos. Page 1 is a recto,
        # so a reference page must be even and its practice page odd.
        for c, p in char_page.items():
            assert p % 2 == 0, f'{c}: reference page {p} is a recto, not a verso'
        assert len(pages) == total, f'{len(pages)} pages emitted, {total} expected'
        assert total % 2 == 0, f'{total} pages is odd; KDP prints in leaves'
        default_out = 'N5-Practice-print-interior.pdf'

    out_pdf = HERE / (a.out or default_out)
    html = ('<!doctype html><html><head><meta charset="utf-8">'
            f'<style>{CSS}</style></head><body>' + ''.join(pages) + '</body></html>')
    assert_undated(html)
    (HERE / 'kdp-render.html').write_text(html)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        await pg.goto(f'file://{HERE / "kdp-render.html"}')
        await pg.wait_for_timeout(1200)
        await pg.pdf(path=str(out_pdf), width=PW_IN, height=PH_IN,
                     print_background=True,
                     margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
        await b.close()
    print(f'{len(pages)} pages -> {out_pdf.name}   (full book paginates to {total})')


if __name__ == '__main__':
    asyncio.run(main())
