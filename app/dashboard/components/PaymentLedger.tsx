'use client';

import { useState, useEffect } from 'react';

interface Payment {
  timestamp: string;
  endpoint: string;
  amount: number;
  address?: string;
  chain?: string;
  status: 'success' | 'error';
}

interface PaymentsResponse {
  payments: Payment[];
  total: number;
  total_amount: number;
  source: string;
  error?: string;
}

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-100 text-green-700 border-green-300',
  error: 'bg-red-100 text-red-700 border-red-300',
};

export default function PaymentLedger() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(fetchPayments, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/payments?limit=50');
      if (response.ok) {
        const data: PaymentsResponse = await response.json();
        setPayments(data.payments || []);
        setTotalAmount(data.total_amount || 0);
        setError(data.error || null);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Failed to fetch payments');
    } finally {
      setIsLoading(false);
    }
  };

  const formatEndpoint = (endpoint: string) => {
    return endpoint.replace('/api/nansen/', '').replace(/-/g, ' ');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (isLoading) {
    return <div className="text-gray-500 text-sm animate-pulse">Loading payments...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-medium text-black">Payment Ledger</h3>
          <p className="text-xs text-gray-500">Total: ${totalAmount.toFixed(2)} USDC</p>
        </div>
        <span className="text-xs text-gray-400">{payments.length} payments</span>
      </div>

      {error && (
        <div className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-2 rounded">
          ⚠️ {error}
        </div>
      )}

      {payments.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-8">
          No payments recorded yet
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {payments.map((payment, index) => {
            const statusColor = STATUS_COLORS[payment.status] || STATUS_COLORS.success;
            return (
              <div
                key={index}
                className="border-2 border-black p-3 hover:bg-gray-50 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-black">
                        {formatEndpoint(payment.endpoint)}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${statusColor}`}>
                        {payment.status}
                      </span>
                    </div>
                    {payment.address && (
                      <div className="text-xs text-gray-500 font-mono">
                        {payment.address.slice(0, 8)}...{payment.address.slice(-6)}
                      </div>
                    )}
                    {payment.chain && (
                      <div className="text-xs text-gray-400 capitalize">{payment.chain}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-black">
                      ${payment.amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatTime(payment.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

