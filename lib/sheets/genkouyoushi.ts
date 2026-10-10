/**
 * lib/sheets/genkouyoushi.ts
 *
 * Blank genkōyōshi (原稿用紙), Japanese manuscript paper, in two formats: the
 * standard 400-square sheet and a large-square sheet for learners. One SVG
 * drawing per format, in millimetres, used by everything that shows the paper:
 *
 *   /api/genkouyoushi/<format>        the print document (A4 landscape)
 *   public/downloads/*.pdf            the same document printed to PDF by
 *                                     scripts/sheets/render-genkouyoushi-pdfs.ts
 *   /free-resources/genkouyoushi      a small preview of each sheet
 *   scripts/validate-sheets.ts        counts the squares and ruby strips
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CONVENTIONS, AND WHERE THEY COME FROM
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Checked 2026-10-10 against JIS S 5508:2010 (原稿用紙), the ja.wikipedia
 * article 原稿用紙, and KOKUYO's own sheets (ケ-10 B4, ケ-20-5N and ケ-70N-G A4,
 * measured off the maker's product images):
 *
 *   · Columns read top to bottom, right to left. Vertical (縦書き) sheets are
 *     landscape; a portrait 20×20 sheet is the horizontal (横書き) kind.
 *   · Each column of squares has a narrow strip on its RIGHT, for furigana and
 *     corrections (Wikipedia: 「文字右隣り余白」; JIS: 添削けい). JIS pairs
 *     square and strip at 10 + 4.5, 8.5 + 3.5 or 8 + 4 mm.
 *   · The squares are plain. JIS defines no guides, and neither KOKUYO nor
 *     Masuya prints them; crosshairs belong to children's practice books.
 *   · The 400-square sheet is two halves of ten columns either side of a
 *     centre column, a relic of folding and binding (版心). KOKUYO's A4 sheet
 *     makes it about one square wide, with a filled band notched like a fish's
 *     tail (魚尾) whose top sits four squares down.
 *   · A solid frame, heavier than the rules inside it. JIS sets no colour;
 *     makers print brown, green or vermilion. These print in the sheets' grey,
 *     which any printer reproduces.
 *   · The format is printed small in the lower-left corner ("20×20").
 *
 * STANDARD: 20 columns of 20, 8.5mm squares with 3.5mm strips (JIS's middle
 * pair, and what KOKUYO's A4 sheet measures), 248.5 × 170mm with the centre
 * column. It fills A4 landscape.
 *
 * LARGE: 12 columns of 10, 15mm squares with 6mm strips, no centre column:
 * 120 squares, 252 × 150mm. Japanese composition paper for the first school
 * years uses squares of about 14mm (KOKUYO ケ-13N, Showa's さくぶんちょう for
 * grades 1-3, which also has 120); 15mm is the next step up because the people
 * printing this are adults writing kanji they learned last week, and a stroke
 * they are unsure of needs the room. Ten squares to a column keeps a column
 * short enough to finish.
 */

export const GENKOUYOUSHI_FORMAT_IDS = ['standard', 'large'] as const;
export type GenkouyoushiFormatId = (typeof GENKOUYOUSHI_FORMAT_IDS)[number];

export interface GenkouyoushiFormat {
  id: GenkouyoushiFormatId;
  /** What the page calls it. */
  name: string;
  columns: number;
  squaresPerColumn: number;
  squareMm: number;
  rubyMm: number;
  /** The centre (fold) column, 0 for none. */
  centreMm: number;
}

export const GENKOUYOUSHI_FORMATS: Record<GenkouyoushiFormatId, GenkouyoushiFormat> = {
  standard: {
    id: 'standard',
    name: 'Standard 400-square sheet',
    columns: 20,
    squaresPerColumn: 20,
    squareMm: 8.5,
    rubyMm: 3.5,
    centreMm: 8.5,
  },
  large: {
    id: 'large',
    name: 'Large-square learner sheet',
    columns: 12,
    squaresPerColumn: 10,
    squareMm: 15,
    rubyMm: 6,
    centreMm: 0,
  },
};

export function isGenkouyoushiFormat(value: string): value is GenkouyoushiFormatId {
  return (GENKOUYOUSHI_FORMAT_IDS as readonly string[]).includes(value);
}

export function squareCount(format: GenkouyoushiFormat): number {
  return format.columns * format.squaresPerColumn;
}

/** "20×20": columns by squares, as printed in the sheet's corner. */
export function formatMark(format: GenkouyoushiFormat): string {
  return `${format.squaresPerColumn}×${format.columns}`;
}

/** The drawing's size in mm. */
export function paperSizeMm(format: GenkouyoushiFormat): { width: number; height: number } {
  return {
    width: format.columns * (format.squareMm + format.rubyMm) + format.centreMm,
    height: format.squaresPerColumn * format.squareMm,
  };
}

/** Numbers in an SVG attribute: no float noise like 248.49999999999997. */
function n(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * One sheet as an SVG, in mm. Every square, ruby strip and the centre column
 * is its own rect (classes gk-sq, gk-ruby, gk-centre) so the validator can
 * count them. Sized by the caller: the print document gives it its true mm
 * size, the page's preview a fraction of it.
 */
export function genkouyoushiSvg(format: GenkouyoushiFormat, attributes = ''): string {
  const { width, height } = paperSizeMm(format);
  const pitch = format.squareMm + format.rubyMm;
  const half = format.columns / 2;
  const parts: string[] = [];

  for (let column = 0; column < format.columns; column++) {
    // Counted from the right; past the centre, shifted left by its width.
    const right = width - column * pitch - (format.centreMm && column >= half ? format.centreMm : 0);
    const left = right - pitch;
    parts.push(`<rect class="gk-ruby" x="${n(right - format.rubyMm)}" y="0" width="${n(format.rubyMm)}" height="${n(height)}"/>`);
    for (let square = 0; square < format.squaresPerColumn; square++) {
      parts.push(
        `<rect class="gk-sq" x="${n(left)}" y="${n(square * format.squareMm)}" width="${n(format.squareMm)}" height="${n(format.squareMm)}"/>`
      );
    }
  }

  if (format.centreMm) {
    const x0 = width - half * pitch - format.centreMm;
    const x1 = x0 + format.centreMm;
    parts.push(`<rect class="gk-centre" x="${n(x0)}" y="0" width="${n(format.centreMm)}" height="${n(height)}"/>`);
    // 魚尾: a filled band notched at its foot, its top four squares down.
    const inset = 0.8;
    const top = 4 * format.squareMm;
    const bottom = top + format.squareMm;
    const notch = bottom - format.squareMm * 0.4;
    parts.push(
      `<polygon class="gk-fishtail" points="${n(x0 + inset)},${n(top)} ${n(x1 - inset)},${n(top)} ${n(x1 - inset)},${n(bottom)} ${n((x0 + x1) / 2)},${n(notch)} ${n(x0 + inset)},${n(bottom)}"/>`
    );
  }

  parts.push(`<rect class="gk-frame" x="0.25" y="0.25" width="${n(width - 0.5)}" height="${n(height - 0.5)}"/>`);

  // The <style> is scoped to the class: inline in a page, an SVG's stylesheet
  // applies to the whole document, and a bare `rect` rule would restyle every
  // icon on it.
  return `<svg class="gk-paper" viewBox="0 0 ${n(width)} ${n(height)}" ${attributes}>
  <style>.gk-paper rect{fill:none;stroke:#666;stroke-width:0.2}.gk-paper .gk-frame{stroke:#333;stroke-width:0.5}.gk-paper .gk-fishtail{fill:#666}</style>
  ${parts.join('\n  ')}
</svg>`;
}

/**
 * The print document for one format: one A4 landscape page, the sheet
 * centred, the format in the lower-left corner and michikanji.com in the
 * lower right. Blank paper carries no KanjiVG diagram, so no KanjiVG credit.
 */
export function renderGenkouyoushiDocument(id: GenkouyoushiFormatId): string {
  const format = GENKOUYOUSHI_FORMATS[id];
  const { width, height } = paperSizeMm(format);
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Genkouyoushi ${formatMark(format)} (${squareCount(format)} squares) - michikanji.com</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 20px;
      background: white;
      color: black;
      font-family: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
    }

    .paper {
      width: ${n(width)}mm;
      margin: 0 auto;
    }

    .paper svg {
      display: block;
      width: ${n(width)}mm;
      height: ${n(height)}mm;
    }

    .paper-foot {
      display: flex;
      justify-content: space-between;
      margin-top: 1.5mm;
      font-size: 8px;
      color: #666;
    }

    .print-hint {
      max-width: ${n(width)}mm;
      margin: 0 auto 16px;
      font-size: 13px;
      line-height: 1.5;
    }

    @media print {
      body {
        padding: 0;
      }

      .print-hint {
        display: none;
      }

      /* Centred on the page: 186mm is A4's short side less the margins, and
         185 leaves a millimetre so a print engine's rounding cannot spill a
         blank second page. */
      .paper-page {
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 185mm;
      }
    }
  </style>
</head>
<body>
  <p class="print-hint" lang="en">Genkouyoushi paper, ${squareCount(format)} squares on one A4 page in landscape. Press Ctrl+P (&#8984;P on a Mac) to print, as many copies as you need, or choose Save as PDF.</p>
  <div class="paper-page">
    <div class="paper">
      ${genkouyoushiSvg(format, 'aria-hidden="true"')}
      <div class="paper-foot" lang="en"><span>${formatMark(format)}</span><span>michikanji.com</span></div>
    </div>
  </div>
</body>
</html>`;
}
