import { NextResponse } from 'next/server';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:3003';
const MALLORY_API_URL = process.env.MALLORY_API_URL || 'http://localhost:3001';
const GATEWAY_API_URL = process.env.GATEWAY_API_URL || 'http://localhost:3002';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'error';
  latency?: number;
  error?: string;
}

async function checkService(name: string, url: string, healthPath: string = '/health'): Promise<ServiceStatus> {
  const start = Date.now();

  try {
    const response = await fetch(`${url}${healthPath}`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3s timeout
    });

    const latency = Date.now() - start;

    if (response.ok) {
      return { name, url, status: 'online', latency };
    }

    return {
      name,
      url,
      status: 'error',
      latency,
      error: `HTTP ${response.status}`
    };
  } catch (e) {
    return {
      name,
      url,
      status: 'offline',
      error: e instanceof Error ? e.message : 'Connection failed'
    };
  }
}

export async function GET() {
  const services = await Promise.all([
    checkService('Agent API', AGENT_API_URL, '/health'),
    checkService('Mallory MCP', MALLORY_API_URL, '/health'),
    checkService('x402 Gateway', GATEWAY_API_URL, '/health'),
  ]);

  const allOnline = services.every(s => s.status === 'online');
  const anyOnline = services.some(s => s.status === 'online');

  return NextResponse.json({
    status: allOnline ? 'healthy' : anyOnline ? 'degraded' : 'offline',
    services,
    timestamp: new Date().toISOString(),
  });
}


