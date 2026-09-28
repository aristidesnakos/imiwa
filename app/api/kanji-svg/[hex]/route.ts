import { NextRequest, NextResponse } from 'next/server';
import { fetchKanjiVgSource } from '@/lib/kanjivg';

// The KanjiVG source file, untouched, for the viewer's animation: it injects
// this inline so CSS can reach the strokes. Since 2026-09-28 it is fetched only
// when someone presses Play; the diagram a page shows at rest, and the one
// search engines index, is /kanji/<char>/stroke-order.svg. Both routes fetch
// through lib/kanjivg.ts.
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

    const source = await fetchKanjiVgSource(paddedHex);

    if (source.svg === null) {
      return NextResponse.json(
        { error: 'SVG not found', status: source.status },
        { status: source.status }
      );
    }

    return new NextResponse(source.svg, {
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
