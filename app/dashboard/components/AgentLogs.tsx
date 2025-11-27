'use client';

import { useState, useEffect, useRef } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

interface LogsResponse {
  logs: LogEntry[];
  count: number;
  source: string;
  error?: string;
}

const LEVEL_STYLES: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700 border-blue-300',
  success: 'bg-green-100 text-green-700 border-green-300',
  error: 'bg-red-100 text-red-700 border-red-300',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
};

export default function AgentLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs?limit=100');
      if (response.ok) {
        const data: LogsResponse = await response.json();
        setLogs(data.logs || []);
        setError(data.error || null);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-gray-500 text-sm animate-pulse">Loading logs...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-500">{logs.length} entries</span>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded border-gray-300"
          />
          Auto-scroll
        </label>
      </div>

      {error && (
        <div className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded mb-2">
          ⚠️ {error}
        </div>
      )}

      <div
        ref={containerRef}
        className="bg-gray-900 border-2 border-black p-4 h-[550px] overflow-y-auto font-mono text-xs"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No logs available. Trigger the agent to generate activity.
          </div>
        ) : (
          logs.map((log, index) => {
            const levelStyle = LEVEL_STYLES[log.level] || LEVEL_STYLES.info;
            return (
              <div
                key={index}
                className="mb-2 pb-2 border-b border-gray-700 last:border-b-0 flex items-start gap-2"
              >
                <span className="text-gray-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs border ${levelStyle}`}>
                  {log.level.toUpperCase()}
                </span>
                <span className="text-gray-100 break-all">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
