import { NextResponse } from 'next/server';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:3003';

export async function GET() {
  try {
    const response = await fetch(`${AGENT_API_URL}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Agent API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      analysis: data.last_analysis || null,
      source: 'agent'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching analysis:', errorMessage);

    return NextResponse.json({
      analysis: null,
      source: 'error',
      error: 'Failed to fetch analysis',
      message: errorMessage
    });
  }
}

