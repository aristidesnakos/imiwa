import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hex: string }> }
) {
  try {
    const { hex } = await params;

    // Validate hex parameter (allow 4-5 characters)
    if (!hex || !/^[0-9a-f]{4,5}$/i.test(hex)) {
      return NextResponse.json({ error: 'Invalid hex parameter', received: hex }, { status: 400 });
    }

    // Pad to 5 characters if needed
    const paddedHex = hex.padStart(5, '0');

    const url = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg/kanji/${paddedHex}.svg`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KanjiApp/1.0)',
        'Accept': 'image/svg+xml,text/xml,application/xml,*/*',
        'Referer': 'https://github.com/KanjiVG/kanjivg',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'SVG not found', status: response.status },
        { status: response.status }
      );
    }
    
    const svgContent = await response.text();
    
    return new NextResponse(svgContent, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error fetching kanji SVG:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}