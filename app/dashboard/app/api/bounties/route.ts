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
        source: 'agent',
        count: bounties.length
      });
    }
    error = `Agent API returned ${response.status}`;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Agent API unavailable';
    console.error('Error fetching bounties from agent API:', error);
  }

  try {
    const bountiesPath = join(process.cwd(), '..', 'agent', 'bounties', 'mock_bounties.json');
    const fileContent = await readFile(bountiesPath, 'utf-8');
    const rawBounties = JSON.parse(fileContent);
    const bounties = rawBounties.map(normalizeBounty);
    source = 'file';
    return NextResponse.json({
      bounties,
      source,
      count: bounties.length,
      warning: error ? `Agent offline: ${error}` : undefined
    });
  } catch {

  }

  const mockBounties: Bounty[] = [
    {
      id: 1,
      bounty_type: 'wallet_intelligence',
      description: 'Analyze wallet 7xKXtg2... and identify if smart money',
      reward: 1000000,
      status: 'open',
      skills: ['wallet_analysis', 'smart_money'],
    },
    {
      id: 2,
      bounty_type: 'token_screening',
      description: 'Find top 5 tokens by smart money inflows (24h)',
      reward: 2000000,
      status: 'open',
      skills: ['token_screening', 'flow_analysis'],
    },
    {
      id: 3,
      bounty_type: 'wallet_intelligence',
      description: 'Calculate risk score for wallet Y based on transaction patterns',
      reward: 1500000,
      status: 'open',
      skills: ['risk_analysis', 'pattern_recognition'],
    },
  ];

  return NextResponse.json({
    bounties: mockBounties,
    source: 'fallback',
    count: mockBounties.length,
    warning: error ? `Agent offline: ${error}` : 'Using fallback data'
  });
}

