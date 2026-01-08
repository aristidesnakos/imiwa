import { NextRequest, NextResponse } from 'next/server';
import { getKanaGrid, getKanaTitle, type KanaType, type KanaRow, type KanaChar } from '@/lib/kana-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as KanaType || 'hiragana';
  const format = searchParams.get('format') || 'empty'; // 'empty' | 'filled' | 'stroke-order'
  const showRomaji = searchParams.get('romaji') === 'true';

  const kanaGrid = getKanaGrid(type);
  const title = getKanaTitle(type);
  
  // Generate HTML for practice sheet
  const html = await generatePracticeSheetHTML(kanaGrid, title, format, showRomaji);
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${type}_${format}_sheet.html"`
    }
  });
}

async function fetchKanaStrokeOrder(unicode: number): Promise<string | null> {
  try {
    const hex = unicode.toString(16).padStart(5, '0');
    const response = await fetch(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg/kanji/${hex}.svg`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KanaApp/1.0)',
        'Accept': 'image/svg+xml,text/xml,application/xml,*/*',
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    const svgContent = await response.text();
    
    // Clean and prepare SVG for embedding
    let cleanedSvg = svgContent;
    
    // Remove everything before the <svg> tag (XML declaration, DOCTYPE, DTD, etc.)
    const svgStart = cleanedSvg.indexOf('<svg');
    if (svgStart > 0) {
      cleanedSvg = cleanedSvg.substring(svgStart);
    }
    
    // Remove comments
    cleanedSvg = cleanedSvg.replace(/<!--[\s\S]*?-->/g, '');
    
    // Add our CSS class to SVG
    cleanedSvg = cleanedSvg.replace(/<svg([^>]*)>/g, '<svg$1 class="kana-stroke-svg">');
    
    // Make responsive
    cleanedSvg = cleanedSvg
      .replace(/width="[^"]*"/g, 'width="100%"')
      .replace(/height="[^"]*"/g, 'height="100%"')
      .replace(/viewBox="([^"]*)"/g, 'viewBox="$1" preserveAspectRatio="xMidYMid meet"');
    
    return cleanedSvg;
  } catch (error) {
    console.error(`Failed to fetch stroke order for unicode ${unicode}:`, error);
    return null;
  }
}

async function generatePracticeSheetHTML(
  kanaGrid: KanaRow[], 
  title: string, 
  format: string, 
  showRomaji: boolean
): Promise<string> {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} Practice Sheet</title>
  <style>
    @page {
      size: A4;
      margin: 10mm 8mm;
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans JP', 'MS PGothic', 'Hiragino Sans', 'Yu Gothic', sans-serif;
      margin: 0;
      padding: 0;
      background: white;
      color: black;
      font-size: 12px;
      line-height: 1.2;
    }
    
    .page-container {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 5mm;
    }
    
    .header {
      text-align: center;
      margin-bottom: 8px;
      flex-shrink: 0;
    }
    
    .title {
      font-size: 18px;
      font-weight: bold;
      margin: 0 0 2px 0;
      color: #333;
    }
    
    .subtitle {
      font-size: 11px;
      color: #666;
      margin: 0;
    }
    
    .grid-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    
    .grid-table {
      width: 100%;
      height: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    
    .header-row {
      height: 6%;
    }
    
    .grid-row {
      height: 8.5%;
    }
    
    .grid-cell, .header-cell, .label-cell {
      border: 1.2px solid #333;
      text-align: center;
      vertical-align: middle;
      position: relative;
      padding: 0;
    }
    
    .header-cell {
      background: #f8f9fa;
      font-weight: bold;
      font-size: 11px;
      color: #333;
    }
    
    .label-cell {
      background: #f8f9fa;
      font-weight: bold;
      font-size: 11px;
      width: 8%;
      color: #333;
    }
    
    .grid-cell {
      width: 18.4%;
      font-size: 28px;
      position: relative;
    }
    
    .grid-cell.empty {
      background: 
        linear-gradient(to right, #e9ecef 49.5%, transparent 49.5%, transparent 50.5%, #e9ecef 50.5%),
        linear-gradient(to bottom, #e9ecef 49.5%, transparent 49.5%, transparent 50.5%, #e9ecef 50.5%);
      background-size: 100% 1.5px, 1.5px 100%;
      background-position: center center;
      background-repeat: no-repeat;
    }
    
    .kana-char {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 28px;
      font-weight: normal;
      line-height: 1;
    }
    
    .romaji {
      position: absolute;
      bottom: 2px;
      right: 3px;
      font-size: 8px;
      color: #666;
      font-family: 'Arial', sans-serif;
      font-weight: normal;
    }
    
    .kana-stroke-svg {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }
    
    .grid-cell.stroke-order {
      padding: 2px;
    }
    
    .stroke-order-container {
      position: relative;
      width: 100%;
      height: 100%;
    }
    
    /* Print-specific optimizations */
    @media print {
      body { 
        margin: 0 !important;
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }
      
      .page-container {
        height: 100vh;
        page-break-inside: avoid;
      }
      
      .grid-table {
        page-break-inside: avoid;
      }
      
      .no-print { 
        display: none !important; 
      }
    }
    
    /* Screen view optimizations */
    @media screen {
      .page-container {
        min-height: 100vh;
        max-width: 210mm;
        margin: 0 auto;
        background: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="header">
      <h1 class="title">${title}</h1>
      <p class="subtitle">${
        format === 'empty' ? 'Practice Sheet' : 
        format === 'stroke-order' ? 'Stroke Order Reference' : 
        'Reference Sheet with Characters'
      }</p>
    </div>

    <div class="grid-container">
      <table class="grid-table">
        <!-- Header row with vowels -->
        <tr class="header-row">
          <td class="header-cell"></td>
          <td class="header-cell">A</td>
          <td class="header-cell">I</td>
          <td class="header-cell">U</td>
          <td class="header-cell">E</td>
          <td class="header-cell">O</td>
        </tr>
        
        ${(await Promise.all(kanaGrid.map(async row => {
          const cells = await Promise.all(row.chars.map(async (char: KanaChar | null) => {
            let cellContent = '';
            
            if (format === 'stroke-order' && char) {
              const strokeSvg = await fetchKanaStrokeOrder(char.unicode);
              cellContent = `
                <div class="stroke-order-container">
                  ${strokeSvg || `<div class="kana-char">${char.char}</div>`}
                  ${showRomaji ? `<div class="romaji">${char.romaji}</div>` : ''}
                </div>
              `;
            } else if (format === 'filled' && char) {
              cellContent = `
                <div class="kana-char">${char.char}</div>
                ${showRomaji ? `<div class="romaji">${char.romaji}</div>` : ''}
              `;
            }
            
            const cellClass = format === 'empty' ? 'empty' : (format === 'stroke-order' ? 'stroke-order' : '');
            
            return `
            <td class="grid-cell ${cellClass}">
              ${cellContent}
            </td>
            `;
          }));
          
          return `
        <tr class="grid-row">
          <td class="label-cell">${row.label}</td>
          ${cells.join('')}
        </tr>
          `;
        }))).join('')}
      </table>
    </div>
  </div>

  <script>
    // Auto-print when page loads (optional)
    window.onload = function() {
      if (window.location.search.includes('autoprint=true')) {
        setTimeout(() => window.print(), 500);
      }
    };
  </script>
</body>
</html>`;
}