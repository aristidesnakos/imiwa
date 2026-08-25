"""
audit_print.py — the checks that stand between this book and a printed mistake.

Run after `kdpbook.py --mode full` and `kdpcover.py`. Everything here failed at
least once during the build, which is why each check exists:

  * The interior came out 8.513 x 11.013in because Chromium rounds a millimetre
    page box up to a whole device pixel. KDP scales a mis-sized interior rather
    than rejecting it, and a scaled interior has the wrong margins everywhere.
  * The inside margin measured 0.739in against KDP's 0.75in requirement for a
    151-300 page book, because table borders stroke ON the box edge.
  * The week-13 sheet ran 82 cells at 10 across, overflowed the page, and had
    its last row silently clipped by overflow:hidden. It held 80.
  * The cover's decorative circle overflowed the page box by 1.1in, and Chromium
    responded by scaling the entire cover down 5.7%. The file was still exactly
    the right size, so nothing complained -- but every fold had moved half an
    inch, which prints the spine text across the back cover.

The cover's geometry is measured on the pre-placement render. `show_pdf_page`
wraps the page in a form XObject, and coordinates read back out of the wrapped
file are in the form's space, not the page's.
"""

import pathlib
import sys
import pymupdf

HERE = pathlib.Path(__file__).resolve().parent
W, H = 612.0, 792.0
SAFE = 0.25 * 72                       # nothing within 0.25in of trim
GUT = 0.75 * 72                        # inside margin for a 151-300pp book


def items(pg):
    for b in pg.get_text('blocks'):
        if b[4].strip():
            yield 'text', pymupdf.Rect(b[:4]), b[4].strip()[:28]
    for dd in pg.get_drawings():
        r = dd['rect']
        # the .page div paints a white full-bleed background; it is not content
        if r.width > W - 1 and r.height > H - 1:
            continue
        if r.is_empty or r.width <= 0 or r.height <= 0:
            continue
        yield 'draw', r, ''

def audit(path):
    d = pymupdf.open(path)
    worst = {'top': 1e9, 'bottom': 1e9, 'outside': 1e9, 'inside': 1e9}
    where, bad = {}, []
    for i, pg in enumerate(d):
        recto = (i % 2 == 0)                        # page 1 is a recto
        for kind, r, label in items(pg):
            dt, db = r.y0, H - r.y1
            dl, dr = r.x0, W - r.x1
            din, dout = (dl, dr) if recto else (dr, dl)
            for k, v in (('top', dt), ('bottom', db), ('outside', dout), ('inside', din)):
                if v < worst[k]:
                    worst[k] = v; where[k] = (i + 1, kind, label)
            if dt < SAFE or db < SAFE or dout < SAFE or din < GUT - 0.5:
                bad.append((i + 1, kind, label, round(dt, 1), round(db, 1),
                            round(dout, 1), round(din, 1)))
    print(f'{d.page_count} pages, {d[0].rect.width/72:.4f} x {d[0].rect.height/72:.4f} in')
    for k in ('top', 'bottom', 'outside', 'inside'):
        pno, kind, label = where[k]
        print(f'  {k:8s} min {worst[k]/72:6.3f}in  (p{pno} {kind} {label!r})')
    floor = {'top': SAFE, 'bottom': SAFE, 'outside': SAFE, 'inside': GUT - 0.5}
    ok = all(worst[k] >= floor[k] for k in floor)
    if bad:
        print(f'\n  {len(bad)} violating element(s); first 12 by page:')
        seen = set()
        for row in bad:
            if row[0] in seen: continue
            seen.add(row[0])
            print('   p%-4d %-5s %-28r top%7.1f bot%7.1f out%7.1f in%7.1f' % row)
            if len(seen) >= 12: break
    print('\n', 'PASS' if ok else 'FAIL')
    return ok


def audit_overlap(path):
    """No two runs of type may sit on top of each other.

    This is the check that was missing. The margin audit measured every element
    against the trim, passed, and said nothing while REVIEW printed on top of the
    running credit line on all 82 practice pages -- because both were comfortably
    inside the margins, just not beside each other. Distance to the paper edge is
    not the same question as distance to the next thing on the page.

    Two exclusions, both necessary or the check drowns in false positives:

    Grid glyphs -- the model character and the traced greys are text inside table
    cells that legitimately share a row, and their boxes touch.

    Spans sharing a baseline -- full-width CJK punctuation carries far more side
    bearing than advance width, so 「）」 and the 「、」 after it genuinely overlap as
    boxes while reading perfectly. So does a typographic apostrophe against the
    letters beside it. Anything on the same baseline is adjacency, not collision;
    a real collision is one run of type printed across another at a different
    height, which is what REVIEW over the credit line was.
    """
    d = pymupdf.open(path)
    hits = []
    for i, pg in enumerate(d):
        spans = []
        for blk in pg.get_text('rawdict')['blocks']:
            for ln in blk.get('lines', []):
                for sp in ln['spans']:
                    t = ''.join(c['c'] for c in sp.get('chars', [])).strip()
                    r = pymupdf.Rect(sp['bbox'])
                    # a lone CJK glyph at grid size is a practice square, not prose
                    if len(t) <= 1 and sp['size'] > 18:
                        continue
                    if t and r.width > 0 and r.height > 0:
                        spans.append((r, t))
        for a in range(len(spans)):
            for b in range(a + 1, len(spans)):
                ra, ta = spans[a]
                rb, tb = spans[b]
                if abs((ra.y0 + ra.y1) / 2 - (rb.y0 + rb.y1) / 2) < 1.2:
                    continue                      # same baseline: adjacency
                ov = ra & rb
                if ov.is_empty or ov.width <= 0.5 or ov.height <= 0.5:
                    continue
                # ignore slivers: real collisions bury one run under another
                share = (ov.width * ov.height) / min(ra.width * ra.height,
                                                     rb.width * rb.height)
                if share > 0.18:
                    hits.append((i + 1, ta[:26], tb[:26], round(share, 2)))
    # A ruled box printed across a line of type is the same defect wearing a
    # different hat, and it is how this nearly shipped a second time: with REVIEW
    # moved off the foot, the from-memory grid grew into the space and its bottom
    # border crossed the credit line by 1.3pt on all 82 practice pages.
    #
    # Bucketed by y. A practice page carries ~300 box drawings and ~60 runs of
    # type; comparing every pair is 3.5 million rect intersections over the book
    # and takes minutes. Only boxes and type that share a horizontal band can
    # possibly touch.
    BIN = 12.0
    for i, pg in enumerate(d):
        buckets = {}
        for blk in pg.get_text('rawdict')['blocks']:
            for ln in blk.get('lines', []):
                for sp in ln['spans']:
                    t = ''.join(c['c'] for c in sp.get('chars', [])).strip()
                    if not t:
                        continue
                    r = pymupdf.Rect(sp['bbox'])
                    for b in range(int(r.y0 // BIN), int(r.y1 // BIN) + 1):
                        buckets.setdefault(b, []).append((r, t))
        for dd in pg.get_drawings():
            r = dd['rect']
            if r.width > W - 1 or r.is_empty or r.width <= 0 or r.height <= 0:
                continue
            near = {}
            for b in range(int(r.y0 // BIN), int(r.y1 // BIN) + 1):
                for rt, t in buckets.get(b, []):
                    near[(tuple(rt), t)] = (rt, t)
            for rt, t in near.values():
                ov = r & rt
                if ov.is_empty or ov.width <= 0.5 or ov.height <= 0.5:
                    continue
                # a box may legitimately contain type: a cell, a chip, a card
                if r.contains(rt):
                    continue
                share = (ov.width * ov.height) / (rt.width * rt.height)
                if share > 0.25:
                    hits.append((i + 1, '<box>', t[:26], round(share, 2)))

    # Near misses too. A ruled border stopping 0.9mm above a line of type has
    # not collided, but it is one layout tweak from doing so and it reads as a
    # mistake on paper. 1.5mm is the floor.
    NEAR = 1.5 * 72 / 25.4
    for i, pg in enumerate(d):
        boxes = [dd['rect'] for dd in pg.get_drawings()
                 if dd['rect'].width < W - 1 and not dd['rect'].is_empty]
        if not boxes:
            continue
        for blk in pg.get_text('rawdict')['blocks']:
            for ln in blk.get('lines', []):
                for sp in ln['spans']:
                    t = ''.join(c['c'] for c in sp.get('chars', [])).strip()
                    if not t:
                        continue
                    y0 = sp['bbox'][1]
                    above = [r for r in boxes
                             if r.y1 <= y0 and y0 - r.y1 < NEAR
                             and r.x1 > sp['bbox'][0] and r.x0 < sp['bbox'][2]]
                    if above:
                        gap = min(y0 - r.y1 for r in above)
                        hits.append((i + 1, '<box>', f'{t[:20]} ({gap / 72 * 25.4:.1f}mm below a rule)',
                                     round(1 - gap / NEAR, 2)))

    if hits:
        print(f'  {len(hits)} collision(s) on {len({h[0] for h in hits})} page(s):')
        seen = set()
        for pno, ta, tb, sh in hits:
            if pno in seen:
                continue
            seen.add(pno)
            print(f'   p{pno:<4d} {ta!r} over {tb!r}  ({sh:.0%} buried)')
            if len(seen) >= 8:
                break
    else:
        print('  no two runs of type overlap')
    return not hits


def audit_cover():
    PAPER=0.002252; TRIM_W,TRIM_H=8.5,11.0; BLEED=0.125
    PAGES=pymupdf.open(HERE / 'N5-Practice-print-interior.pdf').page_count
    SPINE=PAGES*PAPER
    CW=BLEED+TRIM_W+SPINE+TRIM_W+BLEED; CH=BLEED+TRIM_H+BLEED
    I=72.0
    final=pymupdf.open(HERE / 'N5-Practice-cover.pdf')
    fr=final[0].rect
    print(f'{PAGES}pp -> spine {SPINE:.4f}in | delivered cover {fr.width/I:.4f} x {fr.height/I:.4f}in '
          f'(want {CW:.4f} x {CH:.4f})')
    size_ok = abs(fr.width/I-CW)<5e-4 and abs(fr.height/I-CH)<5e-4

    # Geometry is measured on the native render, then expressed in delivered inches.
    d=pymupdf.open(HERE / '.cover-raw.pdf'); pg=d[0]
    K = CW / (pg.rect.width / I)          # 0.9992: the shrink applied when placing
    I = I / K                             # so every /I below reports delivered inches

    # content = text spans + non-background drawings
    # Spans, not blocks. PyMuPDF merged the vertical spine text and the front-cover
    # title into one block, whose union bbox straddled the fold and reported four
    # failures that do not exist. A span is one run of type in one place.
    items=[]
    for blk in pg.get_text('rawdict')['blocks']:
        for ln in blk.get('lines', []):
            for sp in ln['spans']:
                t=''.join(c['c'] for c in sp.get('chars',[])).strip()
                if t: items.append((pymupdf.Rect(sp['bbox']), t[:34]))
    for dd in pg.get_drawings():
        r=dd['rect']
        if r.width>CW*I-1 and r.height>CH*I-1: continue     # the cream ground + grid
        if r.is_empty: continue
        items.append((r,'<draw>'))
    for im in pg.get_images(full=True):
        for r in pg.get_image_rects(im[0]): items.append((r,'<image>'))

    trim=pymupdf.Rect(BLEED*I,BLEED*I,(BLEED+TRIM_W*2+SPINE)*I,(BLEED+TRIM_H)*I)
    safe=pymupdf.Rect(trim.x0+0.125*I,trim.y0+0.125*I,trim.x1-0.125*I,trim.y1-0.125*I)
    spine_l=(BLEED+TRIM_W)*I; spine_r=spine_l+SPINE*I
    spine_safe=pymupdf.Rect(spine_l+0.0625*I, trim.y0, spine_r-0.0625*I, trim.y1)
    # barcode band: bottom 1.6in of the back cover, full width of that panel
    band=pymupdf.Rect(trim.x0, trim.y1-1.6*I, spine_l, trim.y1)

    fails=[]
    for r,lab in items:
        if lab=='<image>' or lab=='<draw>':
            pass  # bleed art may run to the edge; only text and boxes are checked below
        # anything overlapping the spine but not fully inside spine-safe is a fold risk
        if r.x1>spine_l and r.x0<spine_r and not (r.x0>=spine_safe.x0-0.5 and r.x1<=spine_safe.x1+0.5):
            if not (r.x0<=trim.x0+1 and r.x1>=trim.x1-1):     # ignore full-wrap art
                fails.append(('spine fold', lab, round(r.x0/I,3), round(r.x1/I,3)))
        if lab not in ('<draw>','<image>'):
            if not safe.contains(r):
                fails.append(('outside 0.125in safe area', lab, round(r.x0/I,3), round(r.y1/I,3)))
            if r.intersects(band):
                fails.append(('in barcode band', lab, round(r.x0/I,3), round(r.y1/I,3)))

    print(f'spine panel {spine_l/I:.4f}..{spine_r/I:.4f}in, safe {spine_safe.x0/I:.4f}..{spine_safe.x1/I:.4f}in')
    print(f'barcode band cleared: x {band.x0/I:.3f}..{band.x1/I:.3f}, y {band.y0/I:.3f}..{band.y1/I:.3f}')
    if fails:
        print(f'\n{len(fails)} issue(s):')
        for f in fails[:15]: print('  ', f)
    else:
        print('\nno text or box outside the safe area, on a fold, or in the barcode band')
    print('\n', 'PASS' if (size_ok and not fails) else 'FAIL')
    return size_ok and not fails


if __name__ == '__main__':
    a = audit(str(HERE / 'N5-Practice-print-interior.pdf'))
    print()
    o = audit_overlap(str(HERE / 'N5-Practice-print-interior.pdf'))
    print()
    b = audit_cover()
    sys.exit(0 if (a and o and b) else 1)
