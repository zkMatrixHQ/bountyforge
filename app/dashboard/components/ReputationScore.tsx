'use client';

import { useState, useEffect } from 'react';

interface Reputation {
  score: number;
  successful_bounties: number;
  failed_bounties: number;
  total_earned: number;
}

interface ReputationResponse {
  reputation: Reputation;
  agent_address?: string;
  message?: string;
  has_reputation?: boolean;
}

export default function ReputationScore() {
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [agentAddress, setAgentAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reputationMessage, setReputationMessage] = useState<string | null>(null);

  const copyAddress = async () => {
    if (!agentAddress) return;
    try {
      await navigator.clipboard.writeText(agentAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = agentAddress;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fetchReputation = async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    }
    try {
      const response = await fetch('/api/reputation');
      if (response.ok) {
        const data: ReputationResponse = await response.json();
        setReputation(data.reputation);
        setAgentAddress(data.agent_address || null);
        setReputationMessage(data.message || null);
      }
    } catch {
    } finally {
      setIsLoading(false);
      if (showRefreshing) {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchReputation();
    const interval = setInterval(fetchReputation, 10000);

    const handleAgentComplete = () => {
      setTimeout(() => {
        fetchReputation(true);
      }, 2000);
    };

    window.addEventListener('agent-complete', handleAgentComplete);

    return () => {
      clearInterval(interval);
      window.removeEventListener('agent-complete', handleAgentComplete);
    };
  }, []);

  const handleManualRefresh = () => {
    fetchReputation(true);
  };

  const formatUSDC = (lamports: number) => {
    return (lamports / 1_000_000).toFixed(2);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="border-2 border-black bg-card p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-8 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    );
  }

  const score = reputation?.score || 0;
  const successRate = reputation && (reputation.successful_bounties + reputation.failed_bounties) > 0
    ? Math.round((reputation.successful_bounties / (reputation.successful_bounties + reputation.failed_bounties)) * 100)
    : 0;

  return (
    <div className="border-2 border-black bg-card">
      <div className="p-4 border-b-2 border-black">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-gray-600">Reputation</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="text-xs text-gray-400 hover:text-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              title="Refresh reputation"
            >
              {isRefreshing ? (
                <>
                  <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <span>↻</span>
                  <span>Refresh</span>
                </>
              )}
            </button>
            {agentAddress && (
              <button
                onClick={copyAddress}
                className="text-xs font-mono text-gray-400 hover:text-black transition-colors cursor-pointer flex items-center gap-1"
                title="Click to copy"
              >
                {copied ? (
                  <>
                    <span className="text-green-600">✓</span>
                    <span className="text-green-600">Copied</span>
                  </>
                ) : (
                  <>
                    {truncateAddress(agentAddress)}
                    <span className="text-gray-300">⎘</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 text-center border-b border-gray-200">
        <div className="text-5xl font-light text-black mb-1">{score}</div>
        <div className="text-xs text-gray-500">Total Score</div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-200">
        <div className="p-4 text-center">
          <div className="text-lg font-medium text-green-600">
            {reputation?.successful_bounties || 0}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Won</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-lg font-medium text-gray-400">
            {reputation?.failed_bounties || 0}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Failed</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-lg font-medium text-black">
            {successRate}%
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Rate</div>
        </div>
      </div>

      {reputation && reputation.total_earned > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Total Earned</span>
            <span className="text-sm font-medium text-black">
              ${formatUSDC(reputation.total_earned)}
            </span>
          </div>
        </div>
      )}

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 leading-relaxed">
          {reputationMessage ? (
            <>
              <p className="mb-1">ℹ️ {reputationMessage}</p>
            </>
          ) : (
            <>
              <p className="mb-1">ℹ️ Reputation updates when bounties are <strong>settled</strong>, not just submitted.</p>
              <p>If you just ran the agent, settlement may take a few moments.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
