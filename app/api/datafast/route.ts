import { NextRequest, NextResponse } from 'next/server';

interface DataFastGoal {
  datafast_visitor_id: string;
  name: string;
  metadata?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    let endpoint: string;
    let payload: any;

    switch (type) {
      case 'goal':
        endpoint = 'https://datafa.st/api/v1/goals';
        // DataFast expects: { datafast_visitor_id, name, metadata? }
        payload = {
          datafast_visitor_id: data.datafast_visitor_id,
          name: data.name,
          ...(data.metadata && { metadata: data.metadata })
        } as DataFastGoal;
        break;
      default:
        return NextResponse.json({ error: 'Invalid tracking type' }, { status: 400 });
    }

    if (!process.env.DATAFAST_API_KEY) {
      console.error('DATAFAST_API_KEY environment variable not set');
      return NextResponse.json({ error: 'Analytics service not configured' }, { status: 500 });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DATAFAST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('DataFast API error:', response.status, responseData);
      return NextResponse.json({ 
        error: 'Failed to track event', 
        details: responseData 
      }, { status: response.status });
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('DataFast API error:', error);
    return NextResponse.json({ error: 'Failed to process DataFast request' }, { status: 500 });
  }
}