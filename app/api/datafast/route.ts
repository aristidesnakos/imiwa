import { NextRequest, NextResponse } from 'next/server';

interface DataFastPayment {
  amount: number;
  currency: string;
  transaction_id: string;
  datafast_visitor_id?: string;
  email?: string;
  name?: string;
  customer_id?: string;
  renewal?: boolean;
  refunded?: boolean;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATAFAST_API_KEY) {
      console.error('DataFast API key not configured');
      return NextResponse.json(
        { error: 'DataFast API key not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    console.log('DataFast API Request body:', JSON.stringify(body, null, 2));
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
        };
        break;
      case 'payment':
        endpoint = 'https://datafa.st/api/v1/payments';
        payload = data as DataFastPayment;
        break;
      case 'visitor':
        // This should be a GET request, not POST
        console.error('Visitor requests should use GET method');
        return NextResponse.json(
          { error: 'Use GET method for visitor requests' },
          { status: 400 }
        );
      default:
        console.error('Invalid request type:', type);
        return NextResponse.json(
          { error: 'Invalid request type. Use "goal" or "payment"' },
          { status: 400 }
        );
    }

    console.log('DataFast API Endpoint:', endpoint);
    console.log('DataFast API Payload:', JSON.stringify(payload, null, 2));
    console.log('DataFast API Key present:', !!process.env.DATAFAST_API_KEY);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DATAFAST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    console.log('DataFast API Response status:', response.status);
    console.log('DataFast API Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('DataFast API error response body:', errorBody);
      throw new Error(`DataFast API error: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    console.log('DataFast API Success response:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('DataFast API error:', error);
    return NextResponse.json(
      { error: 'Failed to process DataFast request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATAFAST_API_KEY) {
      return NextResponse.json(
        { error: 'DataFast API key not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const visitorId = searchParams.get('visitor_id');

    if (!visitorId) {
      return NextResponse.json(
        { error: 'visitor_id parameter required' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://datafa.st/api/v1/visitors/${visitorId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.DATAFAST_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`DataFast API error: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('DataFast API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visitor data' },
      { status: 500 }
    );
  }
}