'use client';

import { useState } from 'react';

export default function TriggerAgent() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleTrigger = async () => {
    setIsRunning(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setLastRun(new Date().toLocaleTimeString());
        window.dispatchEvent(new CustomEvent('agent-complete'));
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setIsRunning(false);
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="border-2 border-black bg-card">
      <div className="p-4 border-b-2 border-black">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-gray-600">Agent</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${status === 'success' ? 'bg-green-500' :
              status === 'error' ? 'bg-red-500' :
                isRunning ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'
              }`} />
            <span className="text-xs text-gray-500">
              {isRunning ? 'Running' : status === 'success' ? 'Done' : status === 'error' ? 'Failed' : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={handleTrigger}
          disabled={isRunning}
          className={`w-full py-3 text-sm font-medium transition-all ${isRunning
            ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
            : 'bg-black text-white hover:bg-gray-800 active:scale-[0.98]'
            }`}
        >
          {isRunning ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
              <span>Running Agent...</span>
            </span>
          ) : (
            '▶ Run Agent'
          )}
        </button>

        {lastRun && (
          <div className="mt-3 text-xs text-gray-400 text-center">
            Last run: {lastRun}
          </div>
        )}
      </div>
    </div>
  );
}
