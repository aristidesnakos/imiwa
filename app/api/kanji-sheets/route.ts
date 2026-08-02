import { NextRequest, NextResponse } from 'next/server';
import type { KanjiWithLevel } from '@/lib/constants/kanji-types';
import { N5_KANJI } from '@/lib/constants/n5-kanji';
import { N4_KANJI } from '@/lib/constants/n4-kanji';
import { N3_KANJI } from '@/lib/constants/n3-kanji';
import { N2_KANJI } from '@/lib/constants/n2-kanji';
import { N1_KANJI } from '@/lib/constants/n1-kanji';

// Built once at module scope: this route is hit on every sheet open, so a
// ~2000-entry lookup should not be rebuilt per request.
// Insertion order runs N1 -> N5 so that a kanji appearing in several level
// lists is overwritten by the LOWEST level, matching how the rest of the site
// (KanjiSearchClient, ReviewClient) resolves duplicates.
const KANJI_MAP = new Map<string, KanjiWithLevel>([
  ...N1_KANJI.map((k) => [k.kanji, { ...k, level: 'N1' }] as [string, KanjiWithLevel]),
  ...N2_KANJI.map((k) => [k.kanji, { ...k, level: 'N2' }] as [string, KanjiWithLevel]),
  ...N3_KANJI.map((k) => [k.kanji, { ...k, level: 'N3' }] as [string, KanjiWithLevel]),
  ...N4_KANJI.map((k) => [k.kanji, { ...k, level: 'N4' }] as [string, KanjiWithLevel]),
  ...N5_KANJI.map((k) => [k.kanji, { ...k, level: 'N5' }] as [string, KanjiWithLevel]),
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const character = searchParams.get('character');

  if (!character) {
    return new NextResponse('Missing character parameter', { status: 400 });
  }

  // Find kanji data across every JLPT level
  const kanjiData = KANJI_MAP.get(character);

  if (!kanjiData) {
    return new NextResponse(
      `Kanji "${character}" is not in our JLPT N5-N1 dataset`,
      { status: 404 }
    );
  }

  // Fetch stroke order SVG
  const strokeOrderSvg = await fetchKanjiStrokeOrder(character);
  const strokeCount = strokeOrderSvg ? extractStrokeCount(strokeOrderSvg) : null;

  // Generate HTML for practice sheet
  const html = generatePracticeSheetHTML(kanjiData, strokeOrderSvg, strokeCount);

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    }
  });
}

async function fetchKanjiStrokeOrder(character: string): Promise<string | null> {
  try {
    // codePointAt, not charCodeAt: KanjiVG filenames are the full code point, and
    // charCodeAt would hand back a lone surrogate for anything above U+FFFF —
    // a filename that cannot exist, so the sheet would silently print without its
    // stroke-order reference. Every kanji in the N5-N1 dataset is BMP today, so
    // this is guarding the door before anyone walks through it, not fixing a
    // sheet that is currently broken.
    const unicode = character.codePointAt(0) ?? 0;
    const hex = unicode.toString(16).padStart(5, '0');
    const response = await fetch(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg/kanji/${hex}.svg`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KanjiApp/1.0)',
        'Accept': 'image/svg+xml,text/xml,application/xml,*/*',
      },
    });

    if (!response.ok) {
      return null;
    }

    const svgContent = await response.text();

    // Clean SVG
    let cleanedSvg = svgContent;
    const svgStart = cleanedSvg.indexOf('<svg');
    if (svgStart > 0) {
      cleanedSvg = cleanedSvg.substring(svgStart);
    }
    cleanedSvg = cleanedSvg.replace(/<!--[\s\S]*?-->/g, '');
    cleanedSvg = cleanedSvg
      .replace(/width="[^"]*"/g, 'width="100%"')
      .replace(/height="[^"]*"/g, 'height="100%"');

    return cleanedSvg;
  } catch (error) {
    console.error(`Failed to fetch stroke order for ${character}:`, error);
    return null;
  }
}

function extractStrokeCount(svg: string): number {
  // Count path elements with IDs like "s1", "s2", etc.
  const matches = svg.match(/id="[^"]*-s\d+"/g);
  return matches ? matches.length : 0;
}

function generatePracticeSheetHTML(
  kanjiData: KanjiWithLevel,
  strokeOrderSvg: string | null,
  strokeCount: number | null
): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${kanjiData.kanji} Practice Sheet</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Noto Sans JP', 'MS PGothic', 'Hiragino Sans', 'Yu Gothic', sans-serif;
      margin: 0;
      padding: 20px;
      background: white;
      color: black;
    }

    .page-container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
    }

    /* Header Section - 25% */
    .header-section {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #333;
    }

    .kanji-display {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 15px;
    }

    .large-kanji {
      font-size: 72px;
      font-weight: bold;
      line-height: 1;
    }

    .kanji-info {
      flex: 1;
    }

    .info-row {
      margin-bottom: 8px;
    }

    .info-label {
      font-weight: bold;
      font-size: 12px;
      color: #666;
      display: inline-block;
      width: 100px;
    }

    .info-value {
      font-size: 14px;
      color: #333;
    }

    /* Stroke Order Section */
    .stroke-order-section {
      margin-bottom: 20px;
      text-align: center;
    }

    .stroke-order-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .stroke-order-container {
      width: 150px;
      height: 150px;
      margin: 0 auto;
      border: 2px solid #ccc;
      padding: 10px;
    }

    .stroke-order-container svg {
      width: 100%;
      height: 100%;
    }

    /* Practice Grid - 75% */
    .practice-grid {
      margin-top: 20px;
    }

    .grid-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .grid-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .grid-cell {
      width: 10%;
      height: 60px;
      border: 1px solid #333;
      position: relative;
    }

    /* Crosshair guides for practice */
    .grid-cell::before,
    .grid-cell::after {
      content: '';
      position: absolute;
      background: #e0e0e0;
    }

    .grid-cell::before {
      left: 50%;
      top: 0;
      bottom: 0;
      width: 1px;
      transform: translateX(-50%);
    }

    .grid-cell::after {
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      transform: translateY(-50%);
    }

    /* Stroke order in first column */
    .grid-cell.with-guide {
      padding: 3px;
    }

    .grid-cell.with-guide svg {
      width: 100%;
      height: 100%;
      opacity: 0.3;
    }

    @media print {
      body {
        padding: 0;
      }

      .page-container {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Header Section -->
    <div class="header-section">
      <div class="kanji-display">
        <div class="large-kanji">${kanjiData.kanji}</div>
        <div class="kanji-info">
          <div class="info-row">
            <span class="info-label">Meaning:</span>
            <span class="info-value">${kanjiData.meaning}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Onyomi:</span>
            <span class="info-value">${kanjiData.onyomi}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Kunyomi:</span>
            <span class="info-value">${kanjiData.kunyomi}</span>
          </div>
          <div class="info-row">
            <span class="info-label">JLPT Level:</span>
            <span class="info-value">${kanjiData.level}</span>
          </div>
          ${strokeCount ? `
          <div class="info-row">
            <span class="info-label">Stroke Count:</span>
            <span class="info-value">${strokeCount} strokes</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Stroke Order Section -->
    ${strokeOrderSvg ? `
    <div class="stroke-order-section">
      <div class="stroke-order-title">Stroke Order Reference</div>
      <div class="stroke-order-container">
        ${strokeOrderSvg}
      </div>
    </div>
    ` : ''}

    <!-- Practice Grid -->
    <div class="practice-grid">
      <div class="grid-title">Practice Grid (80 squares)</div>
      <table class="grid-table">
        ${Array.from({ length: 8 }, () => `
          <tr>
            ${Array.from({ length: 10 }, (_, colIndex) => `
              <td class="grid-cell ${colIndex === 0 ? 'with-guide' : ''}">
                ${colIndex === 0 && strokeOrderSvg ? strokeOrderSvg : ''}
              </td>
            `).join('')}
          </tr>
        `).join('')}
      </table>
    </div>
  </div>
</body>
</html>`;
}
