import { NextResponse } from 'next/server';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:3003';

export async function POST(request: Request) {
  try {
    let options = { single_run: true };
    try {
      const body = await request.json();
      options = { ...options, ...body };
    } catch {
    }

    const response = await fetch(`${AGENT_API_URL}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Agent API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: data.message || 'Agent triggered successfully!',
      status: data.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Agent trigger failed';
    console.error('Error triggering agent:', errorMessage);

    return NextResponse.json({
      success: false,
      error: 'Failed to trigger agent',
      message: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

