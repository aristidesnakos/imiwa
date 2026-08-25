"""
Regenerates the FREE N5 kanji pack so it contains all 82 characters.

WHY THIS EXISTS
───────────────
The pack on Gumroad has 81 sheets. `lib/constants/n5-kanji.ts` has 82 entries.
Commit ff30967 (31 Jul 2026) added 暑 to the N5 list; the PDF was built before
that and never rebuilt, so 暑 — "hot (weather)" — is the one N5 character a
reader who downloads the pack never gets a sheet for. Every piece of copy
pointing at the file says "81", so the mistake has been self-consistent and
therefore invisible.

WHY IT COPIES THE SITE'S SHEET RATHER THAN THE COUNTDOWN'S
──────────────────────────────────────────────────────────
This is a port of `app/api/kanji-sheets/route.ts` — same header block, same
Stroke Order Reference box, same 80-square grid with the ghosted guide in
column one. Two reasons it must stay that way:

  · the free pack IS the site's sheet, collected. If it drifts, the pack stops
    being what the page promises.
  · the paid Countdown has to look like a different product, because it is one.
    Regenerating the freebie in the Countdown's layout would hand away the only
    visible reason to pay.

So the design here is deliberately the plainer one. The difference between free
and paid is not typography.
"""

import asyncio
import json
import pathlib
import re
import urllib.request

from playwright.async_api import async_playwright

# Paths are derived from this file so the generator runs from a checkout,
# not from whatever sandbox it was first written in.
HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
BASE = HERE
SVG_DIR = BASE / 'svg'
DATA = json.loads((BASE / 'schedule.json').read_text())
KANJI = DATA['kanji']


def fetch_svg(char):
    """
    KanjiVG, cleaned the same way the route cleans it: strip the XML preamble
    and DOCTYPE by seeking to `<svg`, drop comments, and make the dimensions
    fluid so one file can be a 150px reference box and a 60px grid guide.

    codePointAt equivalent — Python's ord() is already the full code point, so
    the surrogate trap the TypeScript guards against cannot occur here.
    """
    SVG_DIR.mkdir(exist_ok=True)
    p = SVG_DIR / f'{ord(char):05x}.svg'
    if not p.exists():
        url = f'https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg/kanji/{ord(char):05x}.svg'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; KanjiApp/1.0)'})
        with urllib.request.urlopen(req, timeout=30) as r:
            p.write_bytes(r.read())
    raw = p.read_text()
    i = raw.find('<svg')
    if i > 0:
        raw = raw[i:]
    raw = re.sub(r'<!--[\s\S]*?-->', '', raw)
    raw = re.sub(r'width="[^"]*"', 'width="100%"', raw)
    raw = re.sub(r'height="[^"]*"', 'height="100%"', raw)
    return raw


def stroke_count(svg):
    return len(re.findall(r'id="[^"]*-s\d+"', svg))


CSS = """
@page { size: A4 portrait; margin: 15mm; }
* { box-sizing: border-box; }
body { font-family:'Noto Sans CJK JP','Noto Sans JP',sans-serif; margin:0; background:white; color:black; }
.page-container { width:100%; page-break-after:always; padding:0; }
.page-container:last-child { page-break-after:auto; }
.header-section { margin-bottom:20px; padding-bottom:15px; border-bottom:2px solid #333; }
.kanji-display { display:flex; align-items:center; gap:20px; margin-bottom:15px; }
.large-kanji { font-size:72px; font-weight:bold; line-height:1; }
.kanji-info { flex:1; }
.info-row { margin-bottom:8px; }
.info-label { font-weight:bold; font-size:12px; color:#666; display:inline-block; width:100px; }
.info-value { font-size:14px; color:#333; }
.stroke-order-section { margin-bottom:20px; text-align:center; }
.stroke-order-title { font-size:14px; font-weight:bold; margin-bottom:10px; }
.stroke-order-container { width:150px; height:150px; margin:0 auto; border:2px solid #ccc; padding:10px; }
.stroke-order-container svg { width:100%; height:100%; }
.practice-grid { margin-top:20px; }
.grid-title { font-size:14px; font-weight:bold; margin-bottom:10px; }
.grid-table { width:100%; border-collapse:collapse; table-layout:fixed; }
.grid-cell { width:10%; height:60px; border:1px solid #333; position:relative; }
.grid-cell::before, .grid-cell::after { content:''; position:absolute; background:#e0e0e0; }
.grid-cell::before { left:50%; top:0; bottom:0; width:1px; transform:translateX(-50%); }
.grid-cell::after { top:50%; left:0; right:0; height:1px; transform:translateY(-50%); }
.grid-cell.with-guide { padding:3px; }
.grid-cell.with-guide svg { width:100%; height:100%; opacity:.3; }
.footer { margin-top:14px; font-size:9px; color:#777; display:flex; justify-content:space-between; }
"""


def sheet(k, svg, count):
    rows = ''.join(
        '<tr>' + ''.join(
            f'<td class="grid-cell {"with-guide" if c == 0 else ""}">{svg if c == 0 else ""}</td>'
            for c in range(10)) + '</tr>'
        for _ in range(8))
    stroke_block = (f'<div class="stroke-order-section">'
                    f'<div class="stroke-order-title">Stroke Order Reference</div>'
                    f'<div class="stroke-order-container">{svg}</div></div>') if svg else ''
    count_row = (f'<div class="info-row"><span class="info-label">Stroke Count:</span>'
                 f'<span class="info-value">{count} strokes</span></div>') if count else ''
    return f"""<div class="page-container">
  <div class="header-section">
    <div class="kanji-display">
      <div class="large-kanji">{k['kanji']}</div>
      <div class="kanji-info">
        <div class="info-row"><span class="info-label">Meaning:</span><span class="info-value">{k['meaning']}</span></div>
        <div class="info-row"><span class="info-label">Onyomi:</span><span class="info-value">{k['on']}</span></div>
        <div class="info-row"><span class="info-label">Kunyomi:</span><span class="info-value">{k['kun']}</span></div>
        <div class="info-row"><span class="info-label">JLPT Level:</span><span class="info-value">N5</span></div>
        {count_row}
      </div>
    </div>
  </div>
  {stroke_block}
  <div class="practice-grid">
    <div class="grid-title">Practice Grid (80 squares)</div>
    <table class="grid-table">{rows}</table>
  </div>
  <div class="footer">
    <span>Stroke data: KanjiVG &copy; Ulrich Apel &mdash; CC BY-SA 3.0</span>
    <span>MichiKanji.com</span>
  </div>
</div>"""


async def main():
    pages, missing = [], []
    for i, k in enumerate(KANJI, 1):
        try:
            svg = fetch_svg(k['kanji'])
            n = stroke_count(svg)
        except Exception as e:                      # noqa: BLE001
            # A sheet without its diagram is still a usable practice grid, so a
            # fetch failure degrades rather than aborting the build — but it is
            # recorded, because 82 sheets of which three are missing diagrams is
            # not the thing the listing promises.
            svg, n = '', 0
            missing.append((k['kanji'], str(e)))
        pages.append(sheet(k, svg, n))
        if i % 20 == 0:
            print(f'  {i}/{len(KANJI)}')

    html = (f'<!doctype html><html lang="ja"><head><meta charset="utf-8">'
            f'<style>{CSS}</style></head><body>{"".join(pages)}</body></html>')
    out_html = BASE / 'freepack.html'
    out_html.write_text(html)

    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        await pg.goto(f'file://{out_html}')
        await pg.wait_for_timeout(1500)
        await pg.pdf(path=str(BASE / 'MichiKanji-N5-Kanji-Practice-Sheets.pdf'),
                     format='A4', print_background=True,
                     margin={'top': '15mm', 'bottom': '15mm', 'left': '15mm', 'right': '15mm'})
        await b.close()

    print(f'\nsheets: {len(pages)}   diagrams missing: {len(missing)} {missing}')
    print('has 暑:', any(k['kanji'] == '暑' for k in KANJI))


if __name__ == '__main__':
    asyncio.run(main())
