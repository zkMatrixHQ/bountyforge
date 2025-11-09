'use client';

import { useState, useEffect } from 'react';

interface Reputation {
  score: number;
  successful_bounties: number;
  failed_bounties: number;
  total_earned: number;
}

export default function ReputationScore() {
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReputation();
    const interval = setInterval(fetchReputation, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchReputation = async () => {
    try {
      const response = await fetch('/api/reputation');
      if (response.ok) {
        const data = await response.json();
        setReputation(data.reputation);
      }
    } catch (error) {
      console.error('Error fetching reputation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatLamports = (lamports: number) => {
    return (lamports / 1_000_000).toFixed(2);
  };

  if (isLoading) {
    return <div className="text-gray-500 text-sm">Loading...</div>;
  }

  if (!reputation) {
    return (
      <div className="text-gray-400 text-sm">
        <p>No reputation data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-black p-6 text-center bg-white">
        <div className="text-4xl font-normal text-black mb-2">{reputation.score}</div>
        <div className="text-xs text-gray-600 uppercase tracking-wide">Score</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border-2 border-black p-4 bg-white">
          <div className="text-xl font-normal text-black">{reputation.successful_bounties}</div>
          <div className="text-xs text-gray-600 mt-1">Successful</div>
        </div>
        <div className="border-2 border-black p-4 bg-white">
          <div className="text-xl font-normal text-black">{reputation.failed_bounties}</div>
          <div className="text-xs text-gray-600 mt-1">Failed</div>
        </div>
      </div>

      <div className="border-2 border-black p-4 bg-white">
        <div className="text-base font-normal text-black">
          {formatLamports(reputation.total_earned)} SOL
        </div>
        <div className="text-xs text-gray-600 mt-1">Total Earned</div>
      </div>
    </div>
  );
}
