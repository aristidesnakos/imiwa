"""
Renders the MichiKanji N5 Countdown to print-ready PDF.

Sample mode renders four pages — cover, a week opener, one kanji sheet, the
tracker — because the layout has to be judged before 82 sheets are committed to
it.

WHY THIS IS NOT THE FREE GENERATOR WITH A NICER FONT
────────────────────────────────────────────────────
Four things here the site's per-character sheet cannot have, because none of
them is a property of a character:

  · dated review boxes  — the four spaced touches for THIS character, as real
                          dates derived from its week, not advice to "review
                          regularly"
  · the fold strip      — readings and meaning live in a column you fold under,
                          which turns a reference sheet into a recall test
  · the week opener     — what to do, in what order, with a countdown
  · the tracker         — 82 boxes, one page, the whole test in one glance

STROKE DIAGRAMS
───────────────
KanjiVG, CC BY-SA 3.0. The licence is share-alike and the attribution has to
travel with the diagrams, so it is printed on every sheet that carries one
rather than buried on a colophon — the same reason the site puts it in a
site-wide footer.

WHAT IS DELIBERATELY ABSENT IN v1
─────────────────────────────────
Vocabulary and example sentences. `data/sentences/published/N5.json` is an
empty array — the repo's review queue has never been worked through — and there
is no vocabulary source in the tree at all. Inventing Japanese to fill the gap
would put unreviewed readings in front of paying learners, which is the one
failure this product cannot survive. The sheet is laid out with the room for it
so v2 drops in without a redesign.
"""

import json
import pathlib
import re
import asyncio
from datetime import date, timedelta
from playwright.async_api import async_playwright

# Paths are derived from this file so the generator runs from a checkout,
# not from whatever sandbox it was first written in.
HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
BASE = HERE
DATA = json.loads((BASE / 'schedule.json').read_text())
TEST_DATE = date(2026, 12, 6)

SAGE, SAGE_DEEP = '#C0D8B4', '#9CB49C'
TERRA, TERRA_INK = '#CC543C', '#9B3A26'
INK, CREAM = '#4A382E', '#FAF6EE'


def stroke_paths(char):
    """
    The stroke <path>s only, in order, stripped of ids.

    KanjiVG ships two sibling groups: StrokePaths and StrokeNumbers. Taking
    every <path> in the file would be right by accident today and wrong the
    moment a variant adds one, so this reads the StrokePaths group by name. The
    ids go because each path is emitted twice per step — once ghosted, once
    live — and duplicate ids in one document is invalid SVG.
    """
    p = BASE / 'svg' / f'{ord(char):05x}.svg'
    if not p.exists():
        return []
    raw = re.sub(r'<!--.*?-->', '', p.read_text(), flags=re.S)
    m = re.search(r'<g id="kvg:StrokePaths_[^"]*"[^>]*>(.*?)\n</g>', raw, re.S)
    body = m.group(1) if m else raw
    paths = re.findall(r'<path[^>]*?/>', body)
    return [re.sub(r'\s(?:id|kvg:type)="[^"]*"', '', x) for x in paths]


def stroke_steps(paths):
    """One mini-diagram per stroke: the finished character ghosted underneath,
    the strokes drawn so far on top. Styling is inline because the two groups
    differ only in colour, and a stylesheet rule on `path` would hit both."""
    ghost = 'fill="none" stroke="#E2EADD" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"'
    live = f'fill="none" stroke="{INK}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"'
    out = []
    for i in range(len(paths)):
        out.append(
            f'<svg viewBox="0 0 109 109"><g {ghost}>{"".join(paths)}</g>'
            f'<g {live}>{"".join(paths[: i + 1])}</g></svg>')
    return out


# The last useful revision day. Saturday, not test day itself: nobody is
# learning a character the morning of the exam, and a box dated 6 December would
# be read as "do this before you leave", which is bad advice.
LAST_REVISION = TEST_DATE - timedelta(days=1)


def review_slots(week_start):
    """
    The four spaced touches for a character learned in this week, as (label,
    date) pairs, with the last one clamped to the final revision day.

    Without the clamp, week twelve's characters print a day-21 box dated
    7 December — the day AFTER the exam. Seven of the eighty-two sheets carried
    that date in the first render. A workbook whose whole promise is that the
    dates are done for you cannot ship a date that is past the thing it counts
    down to.
    """
    d0 = date.fromisoformat(week_start)
    raw = [('Day 1', d0), ('Day 3', d0 + timedelta(days=3)),
           ('Day 7', d0 + timedelta(days=7)), ('Day 21', d0 + timedelta(days=21))]
    out = []
    for label, d in raw:
        if d > LAST_REVISION:
            out.append(('Final pass', LAST_REVISION))
        else:
            out.append((label, d))
    return out


def fmt(d):
    return d.strftime('%a %-d %b')


CSS = f"""
@page {{ size: A4 portrait; margin: 0; }}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:'Noto Sans CJK JP',sans-serif; color:{INK}; }}
.page {{ width:210mm; height:297mm; padding:16mm 15mm; position:relative;
         page-break-after:always; background:{CREAM}; overflow:hidden; }}
.serif {{ font-family:'Noto Serif CJK JP',serif; }}
.rule {{ height:2px; background:{TERRA}; width:54px; border-radius:2px; }}

/* ── cover ───────────────────────────────────────────────────────────── */
.cover {{ display:flex; flex-direction:column; justify-content:center; text-align:center; }}
.cover .kicker {{ font-size:11pt; letter-spacing:.22em; text-transform:uppercase;
                  color:{TERRA_INK}; font-weight:700; }}
.cover h1 {{ font-size:44pt; line-height:1.08; margin-top:8mm; }}
.cover h1 em {{ font-style:normal; color:{TERRA_INK}; }}
.cover .sub {{ font-size:13pt; color:#6E5C4E; margin-top:6mm; line-height:1.6; }}
.cover img {{ width:78mm; margin:10mm auto 0; }}
.cover .foot {{ position:absolute; left:0; right:0; bottom:16mm; font-size:9pt; color:#8A7666; }}

/* ── week opener ─────────────────────────────────────────────────────── */
.wk-head {{ display:flex; justify-content:space-between; align-items:flex-start; }}
.wk-num {{ font-size:13pt; letter-spacing:.2em; text-transform:uppercase;
           color:{TERRA_INK}; font-weight:700; }}
.wk-dates {{ font-size:11pt; color:#6E5C4E; margin-top:2mm; }}
.countdown {{ text-align:right; }}
.countdown .n {{ font-size:30pt; font-weight:700; line-height:1; color:{INK}; }}
.countdown .l {{ font-size:9pt; letter-spacing:.12em; text-transform:uppercase; color:#8A7666; }}
.wk-theme {{ font-size:20pt; margin-top:7mm; }}
.block {{ margin-top:8mm; }}
.block h3 {{ font-size:10pt; letter-spacing:.14em; text-transform:uppercase;
             color:{TERRA_INK}; font-weight:700; margin-bottom:3mm; }}
.chars {{ display:flex; flex-wrap:wrap; gap:3mm; }}
.chip {{ width:16mm; height:16mm; border:1.4px solid {SAGE_DEEP}; border-radius:3mm;
         background:#fff; display:flex; align-items:center; justify-content:center;
         font-size:19pt; }}
.chip.sm {{ width:12mm; height:12mm; font-size:14pt; border-style:dashed; background:transparent; }}
.plan {{ margin-top:9mm; border-top:1px solid {SAGE_DEEP}; padding-top:5mm; }}
.day {{ display:flex; gap:4mm; align-items:baseline; padding:2.4mm 0;
        border-bottom:1px dotted {SAGE_DEEP}; font-size:10.5pt; }}
.day .d {{ width:26mm; font-weight:700; color:{INK}; }}
.day .t {{ flex:1; color:#5C4A3C; }}
.day .box {{ width:5mm; height:5mm; border:1.3px solid {SAGE_DEEP}; border-radius:1mm; }}

/* ── kanji sheet ─────────────────────────────────────────────────────── */
.sheet-body {{ display:flex; height:100%; }}
.work {{ flex:1; padding-right:7mm; }}
/* The answers live in their own column with the fold on its inside edge, so
   folding the strip under actually hides them. The first draft put the fold on
   the far right with the readings up in the header, where folding hid a margin
   and nothing else. */
.answers {{ width:36mm; border-left:1.2px dashed {SAGE_DEEP}; padding-left:5mm; }}
.answers .fold-note {{ font-size:7.5pt; letter-spacing:.16em; text-transform:uppercase;
                       color:{SAGE_DEEP}; margin-bottom:6mm; }}
.answers h4 {{ font-size:8pt; letter-spacing:.14em; text-transform:uppercase;
               color:{TERRA_INK}; font-weight:700; margin-bottom:1.5mm; }}
.answers .val {{ font-size:11pt; line-height:1.5; margin-bottom:6mm; }}
.answers .val.small {{ font-size:10pt; }}

.sheet-top {{ display:flex; gap:6mm; align-items:flex-start; }}
.glyph {{ font-size:56pt; line-height:1; font-family:'Noto Serif CJK JP',serif; }}
.tag {{ display:inline-block; font-size:8pt; letter-spacing:.12em; text-transform:uppercase;
        background:{SAGE}; color:{INK}; padding:1.4mm 3mm; border-radius:99px; font-weight:700; }}
.stat {{ font-size:10pt; color:#5C4A3C; margin-top:3mm; }}
.stat b {{ color:{TERRA_INK}; font-size:8.5pt; letter-spacing:.06em; text-transform:uppercase;
           margin-right:1.5mm; }}

.strokes {{ margin-top:5mm; border:1px solid {SAGE_DEEP}; border-radius:2mm; background:#fff;
            padding:3.5mm; }}
h3.lbl {{ font-size:8.5pt; letter-spacing:.14em; text-transform:uppercase;
          color:{TERRA_INK}; font-weight:700; margin-bottom:2.5mm; }}
h3.lbl span {{ color:#9A8878; font-weight:400; letter-spacing:0; text-transform:none; }}
.strokes .row {{ display:flex; gap:2.5mm; flex-wrap:wrap; }}
.strokes svg {{ width:15mm; height:15mm; border:1px dashed {SAGE_DEEP}; border-radius:1.5mm; }}
/* No `path` rule here on purpose: each step draws the same paths twice, once
   ghosted and once live, and a stylesheet rule would colour both the same —
   which is exactly how the first draft rendered four identical finished
   characters instead of a stroke sequence. */

.band {{ margin-top:5mm; }}
table.grid {{ border-collapse:collapse; }}
table.grid td {{ border:1px solid {SAGE_DEEP}; height:16mm; width:16mm; position:relative;
                 text-align:center; vertical-align:middle;
                 font-family:'Noto Serif CJK JP',serif; font-size:21pt; }}
table.grid td::before {{ content:''; position:absolute; left:50%; top:1mm; bottom:1mm;
                         border-left:1px dashed #DCE6D6; }}
table.grid td::after {{ content:''; position:absolute; top:50%; left:1mm; right:1mm;
                        border-top:1px dashed #DCE6D6; }}
.trace td {{ color:#CBD9C2; }}
.write td.model {{ color:#CBD9C2; }}
.memory td {{ background:#F6F2EA; }}

.review {{ margin-top:6mm; border-top:1px solid {SAGE_DEEP}; padding-top:3.5mm; }}
.review .slots {{ display:flex; gap:5mm; margin-top:2.5mm; }}
.slot {{ display:flex; gap:1.8mm; align-items:center; font-size:9pt; color:#5C4A3C;
         white-space:nowrap; }}
.slot .b {{ width:4.4mm; height:4.4mm; border:1.3px solid {SAGE_DEEP}; border-radius:1mm; }}
.credit {{ position:absolute; left:15mm; right:15mm; bottom:9mm; font-size:7pt; color:#9A8878;
           display:flex; justify-content:space-between; }}

/* ── tracker ─────────────────────────────────────────────────────────── */
.tracker h1 {{ font-size:26pt; }}
.tracker .grid82 {{ display:grid; grid-template-columns:repeat(10,1fr); gap:2.6mm; margin-top:7mm; }}
.cellk {{ aspect-ratio:1; border:1.2px solid {SAGE_DEEP}; border-radius:2mm; background:#fff;
          display:flex; align-items:center; justify-content:center; font-size:13pt;
          font-family:'Noto Serif CJK JP',serif; }}
.legend {{ margin-top:8mm; font-size:10pt; color:#5C4A3C; line-height:1.8; }}
"""


def cover_page():
    return f"""<div class="page cover">
  <div class="kicker">Free preview &middot; MichiKanji</div>
  <h1 class="serif">The N5<br><em>Countdown</em></h1>
  <div class="sub">Every JLPT N5 kanji, on a dated fourteen-week plan<br>
     that ends on Sunday 6 December 2026 &mdash; test day.</div>
  <img src="tan.png" alt="">
  <div class="foot">MichiKanji.com &middot; 82 characters &middot; 14 weeks &middot; print at A4 or US Letter</div>
</div>"""


def week_page(w):
    new = ''.join(f'<div class="chip serif">{c}</div>' for c in w['new'])
    r7 = ''.join(f'<div class="chip sm serif">{c}</div>' for c in w['review_7']) or \
        '<div style="font-size:10pt;color:#8A7666">Nothing yet &mdash; this is week one.</div>'
    r21 = ''.join(f'<div class="chip sm serif">{c}</div>' for c in w['review_21']) or \
        '<div style="font-size:10pt;color:#8A7666">Nothing yet.</div>'
    d0 = date.fromisoformat(w['start'])
    rows = []
    plan = [
        ('Mon', 'Learn the new set &mdash; one sheet each, stroke order first'),
        ('Tue', 'Finish any sheets left over'),
        ('Wed', 'Fold the strip. Write each new character from its meaning alone'),
        ('Thu', 'Three-day review of this week&rsquo;s set'),
        ('Fri', 'Last week&rsquo;s set, from memory'),
        ('Sat', 'The three-weeks-ago set, from memory'),
        ('Sun', 'Rest, or catch up. Tick the tracker.'),
    ]
    for i, (lab, txt) in enumerate(plan):
        rows.append(f'<div class="day"><div class="box"></div>'
                    f'<div class="d">{lab} {(d0 + timedelta(days=i)).strftime("%-d %b")}</div>'
                    f'<div class="t">{txt}</div></div>')
    return f"""<div class="page">
  <div class="wk-head">
    <div>
      <div class="wk-num">Week {w['week']} of 14</div>
      <div class="wk-dates">{fmt(d0)} &ndash; {fmt(d0 + timedelta(days=6))}</div>
    </div>
    <div class="countdown"><div class="n">{w['days_to_test']}</div><div class="l">days to the test</div></div>
  </div>
  <div class="rule" style="margin-top:6mm"></div>
  <h2 class="wk-theme serif">{w['theme']}</h2>

  <div class="block"><h3>New this week &middot; {len(w['new'])} characters</h3>
    <div class="chars">{new}</div></div>
  <div class="block"><h3>Seven-day review &middot; last week&rsquo;s set</h3>
    <div class="chars">{r7}</div></div>
  <div class="block"><h3>Twenty-one-day review &middot; three weeks back</h3>
    <div class="chars">{r21}</div></div>

  <div class="plan">{''.join(rows)}</div>
</div>"""


def kanji_page(k, w):
    paths = stroke_paths(k['kanji'])
    steps = stroke_steps(paths)
    slots = ''.join(
        f'<div class="slot"><div class="b"></div>{lab} &middot; {fmt(d)}</div>'
        for lab, d in review_slots(w['start']))

    def band(rows, cols=8, model='none'):
        out = []
        for r in range(rows):
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

    return f"""<div class="page sheet">
  <div class="sheet-body">
    <div class="work">
      <div class="sheet-top">
        <div class="glyph">{k['kanji']}</div>
        <div>
          <span class="tag">Week {w['week']} &middot; day {(w['week'] - 1) * 7 + 1} of the plan</span>
          <div class="stat"><b>Strokes</b>{len(paths)}</div>
          <div class="stat"><b>Group</b>{k['group']}</div>
        </div>
      </div>

      <div class="strokes"><h3 class="lbl">Stroke order</h3><div class="row">{''.join(steps)}</div></div>

      <div class="band"><h3 class="lbl">Trace <span>&mdash; follow the grey</span></h3>
        <table class="grid trace">{band(2, model='all')}</table></div>

      <div class="band"><h3 class="lbl">Copy <span>&mdash; model in the first square</span></h3>
        <table class="grid write">{band(4, model='first')}</table></div>

      <div class="band"><h3 class="lbl">From memory <span>&mdash; fold the strip first</span></h3>
        <table class="grid memory">{band(1)}</table></div>

      <div class="review"><h3 class="lbl">Review &mdash; tick each pass</h3>
        <div class="slots">{slots}</div></div>
    </div>

    <aside class="answers">
      <div class="fold-note">&#9666; Fold</div>
      <h4>Meaning</h4>
      <div class="val">{k['meaning']}</div>
      <h4>On</h4>
      <div class="val small" lang="ja">{k['on'] or '&mdash;'}</div>
      <h4>Kun</h4>
      <div class="val small" lang="ja">{k['kun'] or '&mdash;'}</div>
    </aside>
  </div>

  <div class="credit">
    <span>Stroke data: KanjiVG &copy; Ulrich Apel &middot; CC BY-SA 3.0</span>
    <span>MichiKanji.com &middot; N5 Countdown</span>
  </div>
</div>"""


def tracker_page():
    cells = ''.join(f'<div class="cellk">{k["kanji"]}</div>' for k in DATA['kanji'])
    return f"""<div class="page tracker">
  <div class="wk-num">The whole test</div>
  <div class="rule" style="margin:5mm 0 6mm"></div>
  <h1 class="serif">82 characters, one page</h1>
  <div style="font-size:11pt;color:#6E5C4E;margin-top:4mm;max-width:150mm">
    Colour a square in when you can write the character from its meaning alone,
    without the fold strip. This page is the only progress report that matters.
  </div>
  <div class="grid82">{cells}</div>
  <div class="legend">
    <b>Test day:</b> Sunday 6 December 2026 &mdash; the only US sitting this year.<br>
    Registration closes late September. Do not leave it.
  </div>
  <div class="credit"><span>MichiKanji.com</span><span>&nbsp;</span></div>
</div>"""


async def main():
    plan = DATA['plan']
    w1 = plan[0]
    sample_kanji = next(k for k in DATA['kanji'] if k['kanji'] == '日')
    html = (f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>'
            + cover_page() + week_page(w1) + kanji_page(sample_kanji, w1) + tracker_page()
            + '</body></html>')
    out = BASE / 'sample.html'
    out.write_text(html)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        await pg.goto(f'file://{out}')
        await pg.wait_for_timeout(700)
        await pg.pdf(path=str(BASE / 'N5-Countdown-sample.pdf'),
                     format='A4', print_background=True,
                     margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
        for i, name in enumerate(['cover', 'week01', 'sheet-hi', 'tracker']):
            await pg.set_viewport_size({'width': 794, 'height': 1123})
            el = (await pg.query_selector_all('.page'))[i]
            await el.screenshot(path=str(BASE / f'preview-{name}.png'))
        await b.close()
    print('rendered sample.pdf + previews')


if __name__ == '__main__':
    asyncio.run(main())
