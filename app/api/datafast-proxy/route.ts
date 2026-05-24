import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const widgetId = searchParams.get('id');

  if (!widgetId) {
    return NextResponse.json({ error: 'Missing widget ID' }, { status: 400 });
  }

  try {
    // Fetch from DataFast server-side (no CORS restriction)
    const response = await fetch(
      `https://datafa.st/widgets/${widgetId}/analytics?mainTextSize=16&primaryColor=%23e78468&secondaryColor=%238dcdff`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MichiKanji/1.0)',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`DataFast API returned ${response.status}`);
    }

    const html = await response.text();

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('DataFast proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch widget' },
      { status: 500 }
    );
  }
}
