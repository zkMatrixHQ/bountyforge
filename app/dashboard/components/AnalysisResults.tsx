'use client';

import { useState, useEffect } from 'react';

interface Analysis {
  type: string;
  wallet?: string;
  chain?: string;
  is_smart_money?: boolean;
  confidence?: number;
  pnl_30d?: number;
  risk_score?: number;
  activity_pattern?: string;
  summary?: string;
  tokens?: any[];
}

interface AnalysisResponse {
  analysis: Analysis | null;
  source: string;
  error?: string;
}

export default function AnalysisResults() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysis();
    const interval = setInterval(fetchAnalysis, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalysis = async () => {
    try {
      const response = await fetch('/api/analysis');
      if (response.ok) {
        const data: AnalysisResponse = await response.json();
        setAnalysis(data.analysis);
        setError(data.error || null);
      }
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setError('Failed to fetch analysis');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-gray-500 text-sm animate-pulse">Loading analysis...</div>;
  }

  if (error || !analysis) {
    return (
      <div className="text-gray-400 text-sm text-center py-8">
        {error || 'No analysis available. Trigger the agent to generate analysis.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-black">
          Latest Analysis: {analysis.type === 'wallet_intelligence' ? 'Wallet Intelligence' : 'Token Screening'}
        </h3>
        {analysis.chain && (
          <span className="text-xs text-gray-500 capitalize">{analysis.chain}</span>
        )}
      </div>

      {analysis.type === 'wallet_intelligence' && (
        <div className="space-y-3">
          {analysis.wallet && (
            <div className="border-2 border-black p-3">
              <div className="text-xs text-gray-500 mb-1">Wallet</div>
              <div className="text-sm font-mono text-black">{analysis.wallet}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {analysis.is_smart_money !== undefined && (
              <div className="border-2 border-black p-3">
                <div className="text-xs text-gray-500 mb-1">Smart Money</div>
                <div className={`text-sm font-bold ${analysis.is_smart_money ? 'text-green-600' : 'text-gray-600'}`}>
                  {analysis.is_smart_money ? 'YES' : 'NO'}
                </div>
              </div>
            )}

            {analysis.confidence !== undefined && (
              <div className="border-2 border-black p-3">
                <div className="text-xs text-gray-500 mb-1">Confidence</div>
                <div className="text-sm font-bold text-black">
                  {(analysis.confidence * 100).toFixed(0)}%
                </div>
              </div>
            )}

            {analysis.pnl_30d !== undefined && (
              <div className="border-2 border-black p-3">
                <div className="text-xs text-gray-500 mb-1">PnL (30d)</div>
                <div className={`text-sm font-bold ${analysis.pnl_30d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analysis.pnl_30d >= 0 ? '+' : ''}{analysis.pnl_30d.toFixed(1)}%
                </div>
              </div>
            )}

            {analysis.risk_score !== undefined && (
              <div className="border-2 border-black p-3">
                <div className="text-xs text-gray-500 mb-1">Risk Score</div>
                <div className="text-sm font-bold text-black">
                  {analysis.risk_score.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {analysis.activity_pattern && (
            <div className="border-2 border-black p-3">
              <div className="text-xs text-gray-500 mb-1">Activity Pattern</div>
              <div className="text-sm text-black">{analysis.activity_pattern}</div>
            </div>
          )}
        </div>
      )}

      {analysis.type === 'token_screening' && analysis.tokens && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 mb-2">Top Ranked Tokens</div>
          {analysis.tokens.slice(0, 5).map((token, idx) => (
            <div key={idx} className="border-2 border-black p-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-black">{token.token || 'Unknown'}</div>
                  {token.confidence !== undefined && (
                    <div className="text-xs text-gray-500">
                      Confidence: {(token.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
                {token.inflow !== undefined && (
                  <div className="text-sm font-bold text-black">
                    ${token.inflow.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {analysis.summary && (
        <div className="border-2 border-black p-4 mt-4">
          <div className="text-xs text-gray-500 mb-2">Full Report</div>
          <pre className="text-xs text-black whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
            {analysis.summary}
          </pre>
        </div>
      )}
    </div>
  );
}

