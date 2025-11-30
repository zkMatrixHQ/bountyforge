import { NextResponse } from 'next/server';

const GATEWAY_API_URL = process.env.GATEWAY_API_URL || 'http://localhost:3002';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '100';

    const response = await fetch(`${GATEWAY_API_URL}/api/payments?limit=${limit}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Gateway API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      payments: data.payments || [],
      total: data.total || 0,
      total_amount: data.total_amount || 0,
      source: 'gateway'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching payments:', errorMessage);

    return NextResponse.json({
      payments: [],
      total: 0,
      total_amount: 0,
      source: 'error',
      error: 'Failed to fetch payments',
      message: errorMessage
    });
  }
}

