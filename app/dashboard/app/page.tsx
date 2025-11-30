'use client';

import { useState } from 'react';
import AgentLogs from '@/components/AgentLogs';
import BountiesView from '@/components/BountiesView';
import ReputationScore from '@/components/ReputationScore';
import TriggerAgent from '@/components/TriggerAgent';
import PaymentLedger from '@/components/PaymentLedger';
import AnalysisResults from '@/components/AnalysisResults';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'logs' | 'bounties' | 'reputation' | 'payments'>('logs');

  return (
    <div className="min-h-screen bg-page">
      <div className="container mx-auto px-8 py-12 max-w-7xl">
        <header className="mb-12 border-b-2 border-black pb-6">
          <h1 className="text-3xl font-normal text-black mb-2">BountyForge</h1>
          <p className="text-sm text-gray-600">Autonomous Bounty Hunter Agent</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <TriggerAgent />
            <ReputationScore />
            <div className="border-2 border-black bg-card">
              <div className="p-4 border-b-2 border-black">
                <span className="text-xs uppercase tracking-wide text-gray-600">Latest Analysis</span>
              </div>
              <div className="p-4">
                <AnalysisResults />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-card border-2 border-black">
              <div className="flex border-b-2 border-black">
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-6 py-4 text-sm border-r-2 border-black transition-colors ${activeTab === 'logs'
                      ? 'bg-black text-white border-b-2 border-black -mb-0.5'
                      : 'bg-white text-black hover:bg-gray-50'
                    }`}
                >
                  Logs
                </button>
                <button
                  onClick={() => setActiveTab('bounties')}
                  className={`px-6 py-4 text-sm border-r-2 border-black transition-colors ${activeTab === 'bounties'
                      ? 'bg-black text-white border-b-2 border-black -mb-0.5'
                      : 'bg-white text-black hover:bg-gray-50'
                    }`}
                >
                  Bounties
                </button>
                <button
                  onClick={() => setActiveTab('reputation')}
                  className={`px-6 py-4 text-sm border-r-2 border-black transition-colors ${activeTab === 'reputation'
                      ? 'bg-black text-white border-b-2 border-black -mb-0.5'
                      : 'bg-white text-black hover:bg-gray-50'
                    }`}
                >
                  Reputation
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-6 py-4 text-sm transition-colors ${activeTab === 'payments'
                      ? 'bg-black text-white border-b-2 border-black -mb-0.5'
                      : 'bg-white text-black hover:bg-gray-50'
                    }`}
                >
                  Payments
                </button>
              </div>

              <div className="p-8">
                {activeTab === 'logs' && <AgentLogs />}
                {activeTab === 'bounties' && <BountiesView />}
                {activeTab === 'reputation' && <ReputationScore />}
                {activeTab === 'payments' && <PaymentLedger />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
