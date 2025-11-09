import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mock reputation - in production, query from Solana contract
    const reputation = {
      score: 3,
      successful_bounties: 2,
      failed_bounties: 1,
      total_earned: 3000000, // lamports
    };

    return NextResponse.json({ reputation });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reputation' }, { status: 500 });
  }
}

