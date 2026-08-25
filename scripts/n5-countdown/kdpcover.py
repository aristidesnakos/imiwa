"""
build_cover.py — the full-wrap paperback cover, sized from the interior itself.

WHY THE PAGE COUNT IS AN ARGUMENT AND NOT A CONSTANT
────────────────────────────────────────────────────
Spine width is page count x paper thickness, so the cover file is only correct
for one interior. Reading the page count out of the rendered PDF rather than
retyping it means the cover cannot silently go stale when the interior changes:
add a page and the spine moves 0.0023in, KDP rejects the file, and the reason is
not obvious from looking at it.

GEOMETRY (KDP, 8.5x11 paperback, black ink on white paper)
──────────────────────────────────────────────────────────
    spine        = pages x 0.002252in            (white paper)
    cover width  = 0.125 + 8.5 + spine + 8.5 + 0.125
    cover height = 0.125 + 11 + 0.125
    bleed        = 0.125in on top, bottom and the two outside edges
    safe area    = keep text 0.125in inside the trim
    spine text   = allowed at 79+ pages; keep 0.0625in clear of both folds

THE BARCODE BAND
────────────────
KDP prints a 2 x 1.2in barcode on the back cover with an opaque white
background, 0.125in from two edges. Sources disagree about WHICH bottom corner
once the wrap is laid out flat, and being wrong means a barcode printed over the
pitch. The whole bottom 1.6in of the back cover is therefore left empty, which
costs this design nothing and cannot be wrong either way.

TYPE IS SET HERE, NEVER DRAWN BY AN IMAGE MODEL, AND TAN IS NEVER MIRRORED
─────────────────────────────────────────────────────────────────────────
`transform: scaleX(-1)` flips the 探 on his headband into a broken glyph. If a
pose needs to face the other way, the composition moves, not the tanuki.
"""

import asyncio
import base64
import pathlib
import re
import pymupdf
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
INTERIOR = HERE / 'N5-Practice-print-interior.pdf'
TAN = REPO / 'public' / 'assets' / 'tan-brush.png'
BUILD = HERE / '.cover-build'          # sample-card renders, regenerated every run

PAPER = 0.002252          # white paper, inches per page
TRIM_W, TRIM_H = 8.5, 11.0
BLEED = 0.125

PAGES = pymupdf.open(INTERIOR).page_count
SPINE = PAGES * PAPER
CW = BLEED + TRIM_W + SPINE + TRIM_W + BLEED
CH = BLEED + TRIM_H + BLEED
BACK_X = BLEED
SPINE_X = BLEED + TRIM_W
FRONT_X = SPINE_X + SPINE

CREAM, PAPER_W = '#FAF6EE', '#FFFDF8'
SAGE, SAGE_PALE, SAGE_DEEP = '#C0D8B4', '#DCEBD4', '#9CB49C'
TERRA, TERRA_INK = '#CC543C', '#9B3A26'
INK, BODY, MUTED = '#3E2F26', '#4E3E33', '#7A6858'


def b64(path):
    return base64.b64encode(pathlib.Path(path).read_bytes()).decode()


def sample_cards():
    """Render two real interior pages to sit on the front cover.

    Generated from the interior on every run rather than kept as image files,
    because a cover showing a page the book no longer contains is the kind of
    error nobody catches until a printed copy arrives.

    The page is found by its own footer, not by page arithmetic: week openers and
    week review pages sit between the spreads, so no offset is stable. 語 is the
    densest character in the set at 14 strokes, which makes the pair prove the
    layout at its hardest rather than at its easiest.
    """
    BUILD.mkdir(exist_ok=True)
    doc = pymupdf.open(INTERIOR)
    target = None
    for i, pg in enumerate(doc):
        flat = re.sub(r'\s+', '', pg.get_text())
        if 'writeitonthefacingpage' in flat and '語' in flat:
            target = i
            break
    if target is None:
        raise SystemExit('no reference page for 語 in the interior; rebuild it first')
    doc[target].get_pixmap(dpi=200).save(str(BUILD / 'card-ref.png'))
    doc[target + 1].get_pixmap(dpi=200).save(str(BUILD / 'card-practice.png'))
    doc.close()
    return BUILD / 'card-ref.png', BUILD / 'card-practice.png'


CARD_REF, CARD_PRACTICE = sample_cards()


BULLETS = [
    ('Every stroke, in order, and large.',
     'One diagram per stroke for all 82 characters, from KanjiVG data &mdash; not a '
     'finished character with arrows drawn on it.'),
    ('132 squares for every character.',
     'Trace, copy from a model, then write from memory on 15mm practice grids, the '
     'size a Japanese exercise book uses.'),
    ('A fourteen-week plan with no dates in it.',
     'Count back fourteen weeks from your test and start. The review boxes run on '
     'intervals, so the book works in any year and for either sitting.'),
    ('Words you can actually write.',
     'Two or three real words per character, every one of them spelled only with '
     'characters this book has already taught you.'),
    ('Built to be written in.',
     'Every square sits on a right-hand page, so your hand travels away from the '
     'spine instead of fighting it.'),
]


def bullets_html():
    return ''.join(
        f'<div class="b"><div class="bt">{t}</div><div class="bd">{d}</div></div>'
        for t, d in BULLETS)


HTML = f"""<!doctype html><html><head><meta charset="utf-8"><style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
@page {{ size:{CW:.6f}in {CH:.6f}in; margin:0; }}
html,body {{ width:{CW:.6f}in; height:{CH:.6f}in; }}
body {{ font-family:'Noto Sans CJK JP',sans-serif; color:{BODY};
        background:{CREAM}; position:relative; overflow:hidden; }}
.serif {{ font-family:'Noto Serif CJK JP',serif; }}

/* genko-yoshi grid, run across the whole wrap so the spine is not a seam */
.grid {{ position:absolute; inset:0;
  background-image:linear-gradient(rgba(156,180,156,.16) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(156,180,156,.16) 1px,transparent 1px);
  background-size:0.34in 0.34in; }}

/* overflow:hidden is load-bearing, not tidiness. The sage blob is placed with
   right:-1.1in so it bleeds off the fore-edge; unclipped it made the document
   18.79in wide against a 17.6959in page box, and Chromium responded by SCALING
   THE WHOLE COVER DOWN 5.7% to fit. The file was still exactly the right size,
   so nothing failed -- but every fold moved half an inch, which would have
   printed the spine text across the back cover. Clipping each panel keeps the
   document exactly as wide as the page. `assert_unscaled()` checks it. */
.panel {{ position:absolute; top:0; height:{CH:.6f}in; overflow:hidden; }}
.back  {{ left:0; width:{SPINE_X:.6f}in; }}
.spine {{ left:{SPINE_X:.6f}in; width:{SPINE:.6f}in; }}
.front {{ left:{FRONT_X:.6f}in; width:{CW - FRONT_X:.6f}in; }}

/* ── front ──────────────────────────────────────────────────────────── */
.blob {{ position:absolute; right:-1.1in; bottom:0.6in; width:7.4in; height:7.4in;
         border-radius:50%; background:{SAGE_PALE}; }}
.fpad {{ position:absolute; left:0.55in; right:0.55in; top:0.85in; }}
.kicker {{ font-size:15pt; letter-spacing:.26em; text-transform:uppercase;
           color:{TERRA_INK}; font-weight:700; }}
h1 {{ font-size:58pt; line-height:1.03; color:{INK}; margin-top:0.16in; }}
h1 em {{ font-style:normal; color:{TERRA_INK}; }}
.sub {{ font-size:15pt; line-height:1.5; color:{BODY}; margin-top:0.22in;
        max-width:5.4in; }}
.stats {{ display:flex; gap:0.34in; margin-top:0.26in; }}
.stat {{ font-size:11.5pt; color:{MUTED}; line-height:1.25; }}
.stat b {{ display:block; font-family:'Noto Serif CJK JP',serif; font-size:23pt;
           color:{TERRA_INK}; }}
.krule {{ width:0.62in; height:0.045in; background:{TERRA}; border-radius:0.02in;
           margin-top:0.13in; }}

.cards {{ position:absolute; left:0.66in; bottom:0.92in; width:5in; height:4.3in; }}
.card {{ position:absolute; background:{PAPER_W}; border:1px solid #E6DECF;
         box-shadow:0 0.06in 0.22in rgba(62,47,38,.16); overflow:hidden; }}
.card img {{ width:100%; display:block; }}
.c1 {{ left:0; bottom:0.06in; width:2.42in; transform:rotate(-6deg); }}
.c2 {{ left:1.66in; bottom:0.42in; width:2.42in; transform:rotate(4.5deg); }}
.tan {{ position:absolute; right:0.30in; bottom:0.62in; width:4.35in; }}

.lockup {{ position:absolute; left:0.55in; bottom:0.42in; display:flex;
           align-items:center; gap:0.16in; }}
.roundel {{ width:0.46in; height:0.46in; border-radius:50%; background:{TERRA_INK};
            color:#fff; display:flex; align-items:center; justify-content:center;
            font-family:'Noto Serif CJK JP',serif; font-size:17pt; }}
.lockup .t {{ font-size:13pt; color:{INK}; font-weight:600; letter-spacing:.02em; }}
.lockup .t span {{ display:block; font-size:9.5pt; color:{MUTED}; font-weight:400;
                   letter-spacing:.1em; text-transform:uppercase; }}

/* ── spine ──────────────────────────────────────────────────────────── */
/* 0.0625in of clearance either side of the folds; the panel is {SPINE:.4f}in wide. */
.spine .inner {{ position:absolute; left:0.0625in; right:0.0625in; top:0.5in;
                 bottom:0.5in; display:flex; flex-direction:column;
                 align-items:center; justify-content:space-between; }}
.spine .rd {{ width:0.30in; height:0.30in; border-radius:50%; background:{TERRA_INK};
              color:#fff; display:flex; align-items:center; justify-content:center;
              font-family:'Noto Serif CJK JP',serif; font-size:11pt; flex:0 0 auto; }}
.spine .txt {{ writing-mode:vertical-rl; font-size:12.5pt; color:{INK};
               font-family:'Noto Serif CJK JP',serif; white-space:nowrap;
               letter-spacing:.01em; }}
.spine .txt b {{ color:{TERRA_INK}; font-weight:700; }}
.spine .brand {{ writing-mode:vertical-rl; font-size:10pt; color:{MUTED};
                 letter-spacing:.14em; text-transform:uppercase; white-space:nowrap; }}

/* ── back ───────────────────────────────────────────────────────────── */
.bpad {{ position:absolute; left:0.72in; right:0.62in; top:0.9in; }}
.bhead {{ font-size:26pt; line-height:1.2; color:{INK}; }}
.bhead em {{ font-style:normal; color:{TERRA_INK}; }}
.blede {{ font-size:12pt; line-height:1.6; color:{BODY}; margin-top:0.2in; }}
.b {{ margin-top:0.19in; padding-left:0.26in; position:relative; }}
.b::before {{ content:''; position:absolute; left:0.02in; top:0.075in;
              width:0.11in; height:0.11in; background:{SAGE_DEEP}; border-radius:1px; }}
.bt {{ font-size:12.5pt; color:{INK}; font-weight:600; line-height:1.35; }}
.bd {{ font-size:11pt; color:{BODY}; line-height:1.5; margin-top:0.03in; }}
.bseries {{ position:absolute; left:0.72in; right:1.9in; bottom:2.66in;
             font-size:11.5pt; line-height:1.55; color:{MUTED};
             font-family:'Noto Serif CJK JP',serif; font-style:italic; }}
.bfoot {{ position:absolute; left:0.72in; right:0.62in; bottom:2.18in;
          border-top:1px solid {SAGE_DEEP}; padding-top:0.16in;
          display:flex; align-items:center; gap:0.16in; }}
.bfoot .t {{ font-size:11.5pt; color:{INK}; font-weight:600; }}
.bfoot .t span {{ display:block; font-size:10pt; color:{MUTED}; font-weight:400; }}
.credit {{ position:absolute; left:0.72in; right:0.62in; bottom:1.78in;
           font-size:7.5pt; color:#A4937F; line-height:1.4; }}
</style></head><body>
<div class="grid"></div>

<!-- ── BACK COVER ─────────────────────────────────────────────────── -->
<div class="panel back">
  <div class="bpad">
    <div class="bhead serif">Learn to <em>write</em> them,<br>not just recognise them.</div>
    <div class="blede">Reading kanji off a screen and writing one from memory are
      different skills, and only one of them is tested by a blank sheet of paper.
      This is a workbook for the second one.</div>
    {bullets_html()}
  </div>
  <div class="bseries">Book 1 of the MichiKanji Stroke Order Workbooks.
    N5 first, then N4 &mdash; same pages, same fourteen weeks, the next set of
    characters.</div>
  <div class="bfoot">
    <div class="roundel serif">探</div>
    <div class="t">MichiKanji<span>michikanji.com &mdash; animated stroke order for
      every character in this book, free</span></div>
  </div>
  <div class="credit">Stroke diagrams from KanjiVG &copy; 2009&ndash;2011 Ulrich Apel,
    CC BY-SA 3.0. Vocabulary from JMdict, &copy; Electronic Dictionary Research and
    Development Group, CC BY-SA 4.0. Not affiliated with or endorsed by the
    administrators of the JLPT.</div>
</div>

<!-- ── SPINE ──────────────────────────────────────────────────────── -->
<div class="panel spine">
  <div class="inner">
    <div class="rd serif">探</div>
    <div class="txt serif">N5 Kanji &nbsp;<b>Stroke Order &amp; Writing Practice</b></div>
    <div class="brand">MichiKanji</div>
  </div>
</div>

<!-- ── FRONT COVER ────────────────────────────────────────────────── -->
<div class="panel front">
  <div class="blob"></div>
  <div class="fpad">
    <div class="kicker">MichiKanji</div>
    <div class="krule"></div>
    <h1 class="serif">N5 Kanji<br><em>Stroke Order</em><br>&amp; Writing Practice</h1>
    <!-- This line is the Amazon SUBTITLE, verbatim. KDP requires the title and
         subtitle entered on the listing to match the cover, so the two are one
         string in two places and must be edited together. -->
    <div class="sub">All 82 JLPT N5 Characters &mdash; Stroke Order Diagrams,
      Writing Grids, and the Words That Use Them</div>
    <div class="stats">
      <div class="stat"><b>82</b>characters</div>
      <div class="stat"><b>132</b>squares each</div>
      <div class="stat"><b>14</b>week plan</div>
    </div>
  </div>
  <div class="cards">
    <div class="card c1"><img src="data:image/png;base64,{b64(CARD_REF)}"></div>
    <div class="card c2"><img src="data:image/png;base64,{b64(CARD_PRACTICE)}"></div>
  </div>
  <img class="tan" src="data:image/png;base64,{b64(TAN)}">
  <div class="lockup">
    <div class="roundel serif">探</div>
    <div class="t">michikanji.com<span>Stroke Order Workbooks &middot; Book 1</span></div>
  </div>
</div>
</body></html>"""


async def main():
    (HERE / 'cover-render.html').write_text(HTML)
    out = HERE / 'N5-Practice-cover.pdf'
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # Viewport set to the page box. scrollWidth is floored at the viewport
        # width, so a wider viewport hides the very overflow this checks for, and
        # getBoundingClientRect is no substitute -- it reports the unclipped box of
        # an element that overflow:hidden has already contained.
        pg = await b.new_page(
            viewport={'width': int(CW * 96), 'height': int(CH * 96)},
            device_scale_factor=2)
        await pg.goto(f'file://{HERE / "cover-render.html"}')
        await pg.wait_for_timeout(1500)
        doc_w = await pg.evaluate('document.documentElement.scrollWidth / 96')
        if doc_w > CW + 0.02:
            raise SystemExit(
                f'content is {doc_w:.4f}in wide against a {CW:.4f}in page: Chromium '
                f'would scale the cover by {CW / doc_w:.4f} and move every fold. '
                f'Something is overflowing a panel.')
        raw = HERE / '.cover-raw.pdf'
        await pg.pdf(path=str(raw), width=f'{CW:.6f}in', height=f'{CH:.6f}in',
                     print_background=True,
                     margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
        await b.close()

    # Chromium rounds a page box up to a whole CSS pixel and handed back
    # 17.710in against the 17.6959in the spine calculation requires -- 0.36mm
    # wide. KDP either rejects a mis-sized cover or scales it, and a scaled cover
    # moves the spine folds off the actual spine. Re-place the rendered page into
    # a MediaBox of exactly the right size; the content scales by 0.08%, which is
    # invisible, and every fold then lands where it was calculated to land.
    src = pymupdf.open(raw)
    doc = pymupdf.open()
    page = doc.new_page(width=CW * 72, height=CH * 72)
    page.show_pdf_page(page.rect, src, 0)
    doc.save(out, garbage=4, deflate=True)
    src.close(); doc.close()
    # raw is kept: show_pdf_page wraps the page in a form XObject, and text
    # coordinates read back out of the wrapped file are in the form's space, not
    # the page's. The audit measures geometry on this native render and checks
    # only the MediaBox on the placed one.
    d = pymupdf.open(out)
    print(f'interior {PAGES}pp -> spine {SPINE:.4f}in')
    print(f'cover {d[0].rect.width / 72:.4f} x {d[0].rect.height / 72:.4f}in '
          f'(want {CW:.4f} x {CH:.4f})')
    print(out)


if __name__ == '__main__':
    asyncio.run(main())
