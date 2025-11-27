'use client';

import { useState, useEffect } from 'react';

type BountyType = 'wallet_intelligence' | 'token_screening';
type BountyStatus = 'open' | 'submitted' | 'settled';

interface Bounty {
  id: number;
  bounty_type: BountyType;
  description: string;
  reward: number;
  status: BountyStatus;
  skills?: string[];
  on_chain?: boolean;
}

interface BountiesResponse {
  bounties: Bounty[];
  source?: 'agent' | 'file' | 'fallback' | 'error';
  warning?: string;
  count?: number;
}

const TYPE_LABELS: Record<BountyType, { label: string; color: string }> = {
  wallet_intelligence: { label: 'Wallet Intel', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  token_screening: { label: 'Token Screen', color: 'bg-purple-100 text-purple-800 border-purple-300' },
};

const STATUS_COLORS: Record<BountyStatus, string> = {
  open: 'bg-green-100 text-green-800 border-green-300',
  submitted: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  settled: 'bg-gray-100 text-gray-600 border-gray-300',
};

export default function BountiesView() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<string>('');
  const [warning, setWarning] = useState<string | null>(null);
  const [filter, setFilter] = useState<BountyType | 'all'>('all');

  useEffect(() => {
    fetchBounties();
    const interval = setInterval(fetchBounties, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchBounties = async () => {
    try {
      const response = await fetch('/api/bounties');
      if (response.ok) {
        const data: BountiesResponse = await response.json();
        setBounties(data.bounties || []);
        setSource(data.source || 'unknown');
        setWarning(data.warning || null);
      }
    } catch (error) {
      console.error('Error fetching bounties:', error);
      setWarning('Failed to fetch bounties');
    } finally {
      setIsLoading(false);
    }
  };

  const formatReward = (lamports: number) => {
    return (lamports / 1_000_000).toFixed(2);
  };

  const filteredBounties = filter === 'all'
    ? bounties
    : bounties.filter(b => b.bounty_type === filter);

  if (isLoading) {
    return <div className="text-gray-500 text-sm animate-pulse">Loading bounties...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-xs font-medium border-2 transition-colors ${filter === 'all'
              ? 'bg-black text-white border-black'
              : 'bg-white text-black border-black hover:bg-gray-100'
            }`}
        >
          All ({bounties.length})
        </button>
        <button
          onClick={() => setFilter('wallet_intelligence')}
          className={`px-3 py-1 text-xs font-medium border-2 transition-colors ${filter === 'wallet_intelligence'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
            }`}
        >
          Wallet ({bounties.filter(b => b.bounty_type === 'wallet_intelligence').length})
        </button>
        <button
          onClick={() => setFilter('token_screening')}
          className={`px-3 py-1 text-xs font-medium border-2 transition-colors ${filter === 'token_screening'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-purple-600 border-purple-300 hover:bg-purple-50'
            }`}
        >
          Token ({bounties.filter(b => b.bounty_type === 'token_screening').length})
        </button>
      </div>

      {warning && (
        <div className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-2 rounded">
          ⚠️ {warning}
        </div>
      )}

      {filteredBounties.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-8">
          {filter === 'all' ? 'No bounties discovered yet' : `No ${filter.replace('_', ' ')} bounties`}
        </div>
      ) : (
        filteredBounties.map((bounty) => {
          const typeInfo = TYPE_LABELS[bounty.bounty_type] || TYPE_LABELS.wallet_intelligence;
          const statusColor = STATUS_COLORS[bounty.status] || STATUS_COLORS.open;

          return (
            <div
              key={bounty.id}
              className="border-2 border-black p-5 hover:bg-gray-50 transition-all"
            >
              {/* Header row */}
              <div className="flex justify-between items-start mb-3 pb-3 border-b-2 border-black">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">#{bounty.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                  {bounty.on_chain && (
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-300">
                      On-chain
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-black border-2 border-black px-3 py-1">
                  {formatReward(bounty.reward)} USDC
                </span>
              </div>

              <p className="text-sm text-black mb-4 leading-relaxed">{bounty.description}</p>

              <div className="flex items-center justify-between pt-3 border-t-2 border-black">
                <span className={`text-xs uppercase px-2 py-1 rounded border ${statusColor}`}>
                  {bounty.status}
                </span>
                {bounty.skills && bounty.skills.length > 0 && (
                  <div className="flex gap-1 flex-wrap justify-end">
                    {bounty.skills.slice(0, 3).map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                    {bounty.skills.length > 3 && (
                      <span className="text-xs text-gray-400">+{bounty.skills.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      <div className="text-xs text-gray-400 text-right">
        Source: {source}
      </div>
    </div>
  );
}
