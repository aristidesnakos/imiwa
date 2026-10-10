/**
 * A KanjiVG-shaped stand-in for one character's source file, so
 * scripts/validate-sheets.ts can render sheets with no network.
 *
 * It has the parts of a real file the sheet code reads: an XML declaration, a
 * header comment where KanjiVG keeps its copyright notice, a DOCTYPE, a root
 * <svg> with width and height to be rewritten, one `kvg:<hex>-s<n>` path per
 * stroke (which is what the stroke count counts) and a stroke-number group.
 * The drawing itself is meaningless. The comment says STUB, so a golden fixture
 * built from it can never be mistaken for a sheet carrying KanjiVG's notice.
 *
 * The golden fixtures in this directory were rendered from these stubs. Change
 * the output here and every fixture has to be re-recorded, which defeats the
 * point of them: leave it alone.
 */
export function stubKanjiVgSource(character: string, strokes: number): string {
  const hex = (character.codePointAt(0) ?? 0).toString(16).padStart(5, '0');
  const paths = Array.from(
    { length: strokes },
    (_, i) => `\t<path id="kvg:${hex}-s${i + 1}" d="M${12 + i * 9},20c0,20 0,40 0,60"/>`
  ).join('\n');
  const numbers = Array.from(
    { length: strokes },
    (_, i) => `\t<text transform="matrix(1 0 0 1 ${8 + i * 9} 16)">${i + 1}</text>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
STUB, not KanjiVG data: a stand-in for the ${character} file, from
scripts/fixtures/sheets/stub-kanjivg.ts.
-->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.0//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd">
<svg xmlns="http://www.w3.org/2000/svg" width="109" height="109" viewBox="0 0 109 109">
<g id="kvg:StrokePaths_${hex}" style="fill:none;stroke:#000000;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;">
${paths}
</g>
<g id="kvg:StrokeNumbers_${hex}" style="font-size:8;fill:#808080">
${numbers}
</g>
</svg>
`;
}
