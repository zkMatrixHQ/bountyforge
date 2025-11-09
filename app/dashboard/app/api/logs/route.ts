import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    // Mock logs - in production, read from agent log file or database
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Agent started scanning for bounties',
      },
      {
        timestamp: new Date(Date.now() - 5000).toISOString(),
        level: 'success',
        message: 'Discovered 3 bounties from mock feed',
      },
      {
        timestamp: new Date(Date.now() - 10000).toISOString(),
        level: 'info',
        message: 'Selected Bounty #2 (highest reward)',
      },
      {
        timestamp: new Date(Date.now() - 15000).toISOString(),
        level: 'info',
        message: 'Reasoning via Mallory MCP: requires code_analysis',
      },
      {
        timestamp: new Date(Date.now() - 20000).toISOString(),
        level: 'success',
        message: 'Paid 0.01 USDC for LLM access via x402 gateway',
      },
    ];

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

