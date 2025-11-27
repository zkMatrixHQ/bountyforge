import { NextResponse } from 'next/server';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:3003';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '100';

    const response = await fetch(`${AGENT_API_URL}/logs?limit=${limit}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Agent API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      logs: data.logs || [],
      count: (data.logs || []).length,
      source: 'agent'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching logs:', errorMessage);

    return NextResponse.json({
      logs: [],
      count: 0,
      source: 'error',
      error: 'Failed to fetch logs',
      message: errorMessage
    });
  }
}

