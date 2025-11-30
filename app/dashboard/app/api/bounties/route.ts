import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:3003';

type BountyType = 'wallet_intelligence' | 'token_screening';
type BountyStatus = 'open' | 'submitted' | 'settled';

interface Bounty {
  id: number;
  bounty_type: BountyType;
  description: string;
  reward: number;
  status: BountyStatus;
  skills?: string[];
  creator?: string;
  on_chain?: boolean;
}

function normalizeBounty(bounty: Partial<Bounty> & { id: number }): Bounty {
  return {
    id: bounty.id,
    bounty_type: bounty.bounty_type || inferBountyType(bounty.description || ''),
    description: bounty.description || '',
    reward: bounty.reward || 0,
    status: (bounty.status as BountyStatus) || 'open',
    skills: bounty.skills || [],
    creator: bounty.creator,
    on_chain: bounty.on_chain ?? false,
  };
}

function inferBountyType(description: string): BountyType {
  const lower = description.toLowerCase();
  if (lower.includes('wallet') || lower.includes('smart money') || lower.includes('risk')) {
    return 'wallet_intelligence';
  }
  if (lower.includes('token') || lower.includes('screen') || lower.includes('inflow')) {
    return 'token_screening';
  }
  return 'wallet_intelligence';
}

export async function GET() {
  let source: 'agent' | 'file' | 'fallback' = 'fallback';
  let error: string | null = null;

  try {
    const response = await fetch(`${AGENT_API_URL}/bounties`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      const bounties = (data.bounties || []).map(normalizeBounty);
      return NextResponse.json({
        bounties,
        source: 'on-chain',
        count: bounties.length
      });
    }
    error = `Agent API returned ${response.status}`;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Agent API unavailable';
    console.error('Error fetching bounties from agent API:', error);
  }

  return NextResponse.json({
    bounties: [],
    source: 'error',
    count: 0,
    warning: error ? `Agent offline: ${error}. Post bounties on-chain first.` : 'No bounties found. Post bounties on-chain to get started.'
  });
}

