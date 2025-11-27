import { NextResponse } from 'next/server';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:3003';
const AGENT_WALLET_ADDRESS = process.env.AGENT_WALLET_ADDRESS || '';

const DEFAULT_REPUTATION = {
  score: 0,
  successful_bounties: 0,
  failed_bounties: 0,
  total_earned: 0,
};

export async function GET() {
  let agentAddress = AGENT_WALLET_ADDRESS;
  let walletSource: 'env' | 'agent' | 'none' = AGENT_WALLET_ADDRESS ? 'env' : 'none';

  if (!agentAddress) {
    try {
      const walletResponse = await fetch(`${AGENT_API_URL}/wallet`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000),
      });

      if (walletResponse.ok) {
        const walletData = await walletResponse.json();
        agentAddress = walletData.signing_address;
        walletSource = 'agent';
      }
    } catch {
    }
  }

  if (!agentAddress) {
    return NextResponse.json({
      reputation: {
        ...DEFAULT_REPUTATION,
      },
      source: 'none',
      message: 'Agent not initialized. Trigger agent first to create signing address.'
    });
  }

  try {
    const response = await fetch(`${AGENT_API_URL}/reputation?address=${agentAddress}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        reputation: data.reputation || DEFAULT_REPUTATION,
        agent_address: agentAddress,
        wallet_source: walletSource,
        source: 'agent'
      });
    }

    return NextResponse.json({
      reputation: DEFAULT_REPUTATION,
      agent_address: agentAddress,
      wallet_source: walletSource,
      source: 'default',
      warning: `Agent returned ${response.status}`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching reputation:', errorMessage);

    return NextResponse.json({
      reputation: DEFAULT_REPUTATION,
      agent_address: agentAddress,
      wallet_source: walletSource,
      source: 'error',
      error: errorMessage
    });
  }
}

