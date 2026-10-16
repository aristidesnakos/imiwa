import { NextRequest, NextResponse } from 'next/server';

// Forwards a goal from lib/analytics (sendGoal) to DataFast with the server-side
// key. Goals only: the old `payment` type let anyone post fake revenue under our
// key, and the old GET handler put an unescaped `visitor_id` into the upstream
// path, so `..%2F` reached any DataFast read endpoint the key could. Neither had
// a caller. Request bodies are not logged: a goal carries page_url, user agent
// and visitor id, and none of that belongs in the Vercel logs.
export async function POST(request: NextRequest) {
  try {
    const { type, ...data } = await request.json();
    if (type !== 'goal') {
      return NextResponse.json(
        { error: 'Invalid request type. Use "goal"' },
        { status: 400 }
      );
    }

    if (!process.env.DATAFAST_API_KEY) {
      console.error('DataFast API key not configured');
      return NextResponse.json(
        { error: 'DataFast API key not configured' },
        { status: 503 }
      );
    }

    // DataFast expects: { datafast_visitor_id, name, metadata? }
    const payload = {
      datafast_visitor_id: data.datafast_visitor_id,
      name: data.name,
      ...(data.metadata && { metadata: data.metadata })
    };

    const response = await fetch('https://datafa.st/api/v1/goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DATAFAST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`DataFast API error: ${response.status} - ${errorBody.slice(0, 200)}`);
    }

    return NextResponse.json(await response.json());

  } catch (error) {
    console.error('DataFast API error:', error);
    return NextResponse.json(
      { error: 'Failed to process DataFast request' },
      { status: 500 }
    );
  }
}
