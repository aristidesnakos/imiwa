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
counts down to, and cannot be re-cut once Amazon has listed it. Spacing is kept
as intervals — +1, +3, +7, +21 days from whenever the reader starts — which
delivers the same schedule without an expiry date.

**No fold strip.** It was a workaround for a loose sheet: you cannot fold a
strip under on a perfect-bound page, and on verso pages it would land in the
gutter. Readings and meaning move into a dictionary-style header, which is both
what a printed reference book does and what "kanji dictionary" and
"<word> kanji" searches are asking for.

**Mirrored margins.** Recto pages take the gutter on the left, verso on the
right. KDP's inside margin for a 100-300pp book is 0.625-0.75in; this uses
0.75in inside and 0.5in outside throughout, so nothing to write on ever falls
into the spine.

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
PW, PH = 215.9, 279.4
M_IN, M_OUT, M_TOP, M_BOT = 19.05, 12.7, 15.0, 14.0
WORK = PW - M_IN - M_OUT          # 184.15mm of usable width


def stroke_paths(char):
    """The stroke <path>s only, in order, stripped of ids.

    Reads the StrokePaths group by name rather than taking every <path>: the
    file also carries a StrokeNumbers group, and grabbing both would be right
    by accident today and wrong the moment a variant adds one. Ids go because
    each path is emitted twice per step and duplicate ids are invalid SVG.
    """
    p = HERE / 'svg' / f'{ord(char):05x}.svg'
    if not p.exists():
        return []
    raw = re.sub(r'<!--.*?-->', '', p.read_text(), flags=re.S)
    m = re.search(r'<g id="kvg:StrokePaths_[^"]*"[^>]*>(.*?)\n</g>', raw, re.S)
    body = m.group(1) if m else raw
    return [re.sub(r'\s(?:id|kvg:type)="[^"]*"', '', x)
            for x in re.findall(r'<path[^>]*?/>', body)]


def stroke_steps(paths, row_mm, cap=20.0):
    """One diagram per stroke, sized to fit a single row.

    Ghost and live strokes are styled inline. A `.strokes svg path` rule in the
    stylesheet would colour both groups identically and every diagram would
    render as the same finished character — which is exactly how the first
    draft of the countdown looked.
    """
    ghost = ('fill="none" stroke="#E2EADD" stroke-width="5.5" '
             'stroke-linecap="round" stroke-linejoin="round"')
    live = (f'fill="none" stroke="{INK}" stroke-width="5.5" '
            'stroke-linecap="round" stroke-linejoin="round"')
    n = len(paths) or 1
    size = min(cap, (row_mm - 2.0 * n) / n)
    return [(f'<svg style="width:{size:.2f}mm;height:{size:.2f}mm" '
             f'viewBox="0 0 109 109"><g {ghost}>{"".join(paths)}</g>'
             f'<g {live}>{"".join(paths[: i + 1])}</g></svg>')
            for i in range(n)]


CSS = f"""
@page {{ size: {PW}mm {PH}mm; margin: 0; }}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:'Noto Sans CJK JP',sans-serif; color:{INK}; background:#fff; }}
.serif {{ font-family:'Noto Serif CJK JP',serif; }}

.page {{ width:{PW}mm; height:{PH}mm; position:relative;
         page-break-after:always; background:#fff; overflow:hidden;
         padding:{M_TOP}mm {M_OUT}mm {M_BOT}mm {M_IN}mm; }}
/* Recto pages carry the gutter on the left, verso on the right. Page 1 is a
   recto, so odd children are recto. Nothing writable sits in the spine. */
.page:nth-child(even) {{ padding-left:{M_OUT}mm; padding-right:{M_IN}mm; }}

/* ── running foot ─────────────────────────────────────────────────────── */
.foot {{ position:absolute; left:{M_IN}mm; right:{M_OUT}mm; bottom:6.5mm;
         font-size:6.5pt; color:#9A8878; line-height:1.45; }}
.page:nth-child(even) .foot {{ left:{M_OUT}mm; right:{M_IN}mm; }}
.foot .row {{ display:flex; justify-content:space-between; gap:5mm; }}
.pn {{ font-weight:700; color:#7A6858; }}

/* ── cover ────────────────────────────────────────────────────────────── */
.cover {{ display:flex; flex-direction:column; justify-content:center; text-align:center; }}
.cover .kicker {{ font-size:10pt; letter-spacing:.22em; text-transform:uppercase;
                  color:{TERRA_INK}; font-weight:700; }}
.cover h1 {{ font-size:40pt; line-height:1.06; margin-top:9mm; }}
.cover h1 em {{ font-style:normal; color:{TERRA_INK}; }}
.cover .sub {{ font-size:13pt; color:#6E5C4E; margin-top:7mm; line-height:1.6; }}

/* ── set opener ───────────────────────────────────────────────────────── */
.set-num {{ font-size:11pt; letter-spacing:.2em; text-transform:uppercase;
            color:{TERRA_INK}; font-weight:700; }}
.rule {{ height:2px; background:{TERRA_INK}; width:52px; border-radius:2px; margin:5mm 0 6mm; }}
.set-theme {{ font-size:24pt; }}
.chars {{ display:flex; flex-wrap:wrap; gap:3.5mm; margin-top:8mm; }}
.chip {{ width:19mm; height:19mm; border:1.4px solid {SAGE_DEEP}; border-radius:3mm;
         display:flex; align-items:center; justify-content:center; font-size:22pt; }}
.howto {{ margin-top:12mm; border-top:1px solid {SAGE_DEEP}; padding-top:6mm;
          font-size:11pt; line-height:1.75; color:#5C4A3C; max-width:150mm; }}
.howto b {{ color:{INK}; }}

/* ── character sheet ──────────────────────────────────────────────────── */
h3.lbl {{ font-size:8.5pt; letter-spacing:.14em; text-transform:uppercase;
          color:{TERRA_INK}; font-weight:700; margin-bottom:2.5mm; }}
h3.lbl span {{ color:#9A8878; font-weight:400; letter-spacing:0; text-transform:none; }}

/* Stroke order leads, and it is the largest thing on the page. A quarter of
   the site's search clicks come from this one intent. */
.strokes {{ border:1.2px solid {SAGE_DEEP}; border-radius:2mm; padding:4mm; }}
.strokes .row {{ display:flex; gap:2mm; flex-wrap:nowrap; align-items:center; }}
.strokes svg {{ border:1px dashed {SAGE_DEEP}; border-radius:1.5mm; flex:0 0 auto; }}

.head {{ display:flex; gap:7mm; align-items:flex-start; margin-top:5mm;
         border-bottom:1px solid {SAGE_DEEP}; padding-bottom:4mm; }}
.head .glyph {{ font-size:44pt; line-height:.95; font-family:'Noto Serif CJK JP',serif; }}
.head .meta {{ flex:1; padding-top:0.5mm; }}
.head .mean {{ font-size:14pt; line-height:1.3; }}
.head .rd {{ font-size:10pt; color:#5C4A3C; margin-top:3mm; line-height:1.7; }}
.head .rd b {{ color:{TERRA_INK}; font-size:8pt; letter-spacing:.1em;
               text-transform:uppercase; margin-right:2mm; }}
.head .num {{ text-align:right; font-size:9pt; color:#8A7666; white-space:nowrap; }}
.head .num b {{ display:block; font-size:19pt; color:{INK}; line-height:1.1; }}

.band {{ margin-top:4mm; }}
table.grid {{ border-collapse:collapse; }}
table.grid td {{ border:1px solid {SAGE_DEEP}; height:15mm; width:15mm; position:relative;
                 text-align:center; vertical-align:middle;
                 font-family:'Noto Serif CJK JP',serif; font-size:20pt; }}
table.grid td::before {{ content:''; position:absolute; left:50%; top:1mm; bottom:1mm;
                         border-left:1px dashed #DCE6D6; }}
table.grid td::after {{ content:''; position:absolute; top:50%; left:1mm; right:1mm;
                        border-top:1px dashed #DCE6D6; }}
.trace td {{ color:#CBD9C2; }}
.write td.model {{ color:#CBD9C2; }}
.memory td {{ background:#F6F2EA; }}

.words {{ margin-top:4mm; }}
.words .w {{ display:flex; align-items:baseline; gap:4mm; padding:1.4mm 0;
             border-bottom:1px dotted {SAGE_DEEP}; font-size:10.5pt; }}
.words .jp {{ font-family:'Noto Serif CJK JP',serif; font-size:15pt; min-width:26mm; }}
.words .rdg {{ color:#7A6858; font-size:10pt; min-width:26mm; }}
.words .en {{ flex:1; color:#5C4A3C; font-size:10pt; }}
/* The reading-type mark is ours, not JMdict's, so it sits in its own column
   and never mixes into the licensed gloss text. */
.words .ty {{ font-size:7.5pt; color:{SAGE_DEEP}; letter-spacing:.08em;
              text-transform:uppercase; width:14mm; text-align:right; }}

/* Intervals, not dates: the same spacing, with no expiry. */
.review {{ margin-top:4.5mm; border-top:1px solid {SAGE_DEEP}; padding-top:4mm;
           display:flex; gap:7mm; align-items:center; }}
.review .t {{ font-size:8.5pt; letter-spacing:.14em; text-transform:uppercase;
              color:{TERRA_INK}; font-weight:700; }}
.slot {{ display:flex; gap:2mm; align-items:center; font-size:10pt; color:#5C4A3C; }}
.slot .b {{ width:5mm; height:5mm; border:1.3px solid {SAGE_DEEP}; border-radius:1mm; }}

/* ── tracker & index ──────────────────────────────────────────────────── */
h2.pt {{ font-size:24pt; margin-top:2mm; }}
.grid82 {{ display:grid; grid-template-columns:repeat(10,1fr); gap:3mm; margin-top:8mm; }}
.cellk {{ aspect-ratio:1; border:1.2px solid {SAGE_DEEP}; border-radius:2mm;
          display:flex; align-items:center; justify-content:center; font-size:14pt;
          font-family:'Noto Serif CJK JP',serif; }}
.lede {{ font-size:11pt; color:#5C4A3C; margin-top:5mm; max-width:150mm; line-height:1.6; }}
.idx {{ column-count:4; column-gap:7mm; margin-top:6mm; font-size:8.5pt; }}
.idx .r {{ break-inside:avoid; display:flex; gap:2mm; align-items:baseline;
           padding:0.9mm 0; border-bottom:1px dotted #E4EADF; }}
.idx .c {{ font-family:'Noto Serif CJK JP',serif; font-size:11.5pt; width:7mm; }}
.idx .m {{ flex:1; color:#5C4A3C; }}
.idx .p {{ color:#9A8878; }}
"""

CREDIT_KVG = 'Stroke data: KanjiVG &copy; Ulrich Apel &middot; CC BY-SA 3.0'


def foot(page_no, left=''):
    return (f'<div class="foot"><div class="row"><span>{left}</span>'
            f'<span class="pn">{page_no}</span></div>'
            f'<div class="row"><span>{CREDIT_KVG}</span><span></span></div></div>')


def cover_page():
    return f"""<div class="page cover">
  <div class="kicker">MichiKanji</div>
  <h1 class="serif">N5 Kanji<br><em>Stroke Order &amp; Writing Practice</em></h1>
  <div class="sub">All 82 JLPT N5 characters &mdash; every stroke, in order,<br>
    with grids to write on and the words that use them.</div>
</div>"""


def set_page(w, page_no):
    chips = ''.join(f'<div class="chip serif">{c}</div>' for c in w['new'])
    return f"""<div class="page">
  <div class="set-num">Set {w['week']} of 14</div>
  <div class="rule"></div>
  <h2 class="set-theme serif">{w['theme']}</h2>
  <div class="chars">{chips}</div>
  <div class="howto">
    <b>Work through the set one character at a time.</b> Follow the stroke order
    first &mdash; the order is not decoration, it is what makes the character
    come out the right shape and what lets you read someone else&rsquo;s
    handwriting later.<br><br>
    <b>Then come back.</b> Each sheet has four review boxes: tick them one day,
    three days, one week and three weeks after you first wrote the character.
    Those gaps are the whole method. Writing a character twenty times today
    does less than writing it four times across three weeks.
  </div>
  {foot(page_no, f"Set {w['week']} &middot; {w['theme']}")}
</div>"""


def kanji_page(k, w, page_no, index_no):
    paths = stroke_paths(k['kanji'])
    steps = stroke_steps(paths, WORK - 8)

    def band(rows, cols=12, model='none'):
        out = []
        for _ in range(rows):
            cells = []
            for c in range(cols):
                if model == 'all':
                    cells.append(f'<td>{k["kanji"]}</td>')
                elif model == 'first' and c == 0:
                    cells.append(f'<td class="model">{k["kanji"]}</td>')
                else:
                    cells.append('<td></td>')
            out.append('<tr>' + ''.join(cells) + '</tr>')
        return ''.join(out)

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

    slots = ''.join(f'<div class="slot"><div class="b"></div>{lab}</div>'
                    for lab in ('+1 day', '+3 days', '+7 days', '+21 days'))

    credit2 = VOCAB_CREDIT if words else ''
    return f"""<div class="page">
  <div class="strokes"><h3 class="lbl">Stroke order
    <span>&mdash; {len(paths)} strokes</span></h3>
    <div class="row">{''.join(steps)}</div></div>

  <div class="head">
    <div class="glyph">{k['kanji']}</div>
    <div class="meta">
      <div class="mean">{k['meaning']}</div>
      <div class="rd"><b>On</b><span lang="ja">{k['on'] or '&mdash;'}</span></div>
      <div class="rd"><b>Kun</b><span lang="ja">{k['kun'] or '&mdash;'}</span></div>
    </div>
    <div class="num"><b>{index_no}</b>of 82</div>
  </div>

  <div class="band"><h3 class="lbl">Trace <span>&mdash; follow the grey</span></h3>
    <table class="grid trace">{band(1, model='all')}</table></div>

  <div class="band"><h3 class="lbl">Copy <span>&mdash; model in the first square</span></h3>
    <table class="grid write">{band(3, model='first')}</table></div>

  <div class="band"><h3 class="lbl">From memory
    <span>&mdash; cover the top of the page</span></h3>
    <table class="grid memory">{band(1)}</table></div>

  {words_html}

  <div class="review"><div class="t">Review</div>{slots}</div>

  <div class="foot"><div class="row">
      <span>Set {w['week']} &middot; {w['theme']}</span><span class="pn">{page_no}</span></div>
    <div class="row"><span>{CREDIT_KVG}</span><span></span></div>
    <div class="row"><span>{credit2}</span><span></span></div>
  </div>
</div>"""


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

    Page numbers come from the real pagination, not from `3 + i`: set openers
    sit between the sheets, so the sheets are not contiguous and a naive offset
    is wrong for every character after the first set.

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


def paginate():
    """The full book's page numbers, computed without rendering anything.

    The sample uses these too, so a sampled sheet carries the number it would
    carry in the finished book and the index is truthful on both.
    Returns (char_page, char_index, total_pages).
    """
    char_page, char_index = {}, {}
    n = 2                                  # page 1 is the cover
    for i, k in enumerate(DATA['kanji']):
        char_index[k['kanji']] = i + 1
    for w in DATA['plan']:
        n += 1                             # the set opener
        for c in w['new']:
            char_page[c] = n
            n += 1
    return char_page, char_index, n + 1     # + tracker, index


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mode', choices=['sample', 'full'], default='sample')
    ap.add_argument('--out', default=None)
    a = ap.parse_args()

    by_char = {k['kanji']: k for k in DATA['kanji']}
    week_of = {c: w for w in DATA['plan'] for c in w['new']}
    char_page, char_index, total = paginate()

    pages = [cover_page()]
    if a.mode == 'sample':
        w = DATA['plan'][2]
        picks = ['時', '年', '月', '午', '半']
        pages.append(set_page(w, char_page[w['new'][0]] - 1))
        for c in picks:
            pages.append(kanji_page(by_char[c], w, char_page[c], char_index[c]))
        # One dense character, to prove the layout at 13 strokes.
        pages.append(kanji_page(by_char['電'], week_of['電'],
                                char_page['電'], char_index['電']))
        pages.append(tracker_page(total - 1))
        pages.append(index_page(total, char_page))
        default_out = 'N5-Practice-print-sample.pdf'
    else:
        n = 2
        for w in DATA['plan']:
            pages.append(set_page(w, n)); n += 1
            for c in w['new']:
                pages.append(kanji_page(by_char[c], w, n, char_index[c])); n += 1
        pages.append(tracker_page(n)); n += 1
        pages.append(index_page(n, char_page))
        default_out = 'N5-Practice-print-interior.pdf'

    out_pdf = HERE / (a.out or default_out)
    html = ('<!doctype html><html><head><meta charset="utf-8">'
            f'<style>{CSS}</style></head><body>' + ''.join(pages) + '</body></html>')
    (HERE / 'kdp-render.html').write_text(html)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        await pg.goto(f'file://{HERE / "kdp-render.html"}')
        await pg.wait_for_timeout(900)
        await pg.pdf(path=str(out_pdf), width=f'{PW}mm', height=f'{PH}mm',
                     print_background=True,
                     margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
        await b.close()
    print(f'{len(pages)} pages -> {out_pdf.name}   (full book paginates to {total})')


if __name__ == '__main__':
    asyncio.run(main())
