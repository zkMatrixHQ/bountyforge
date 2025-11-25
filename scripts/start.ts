#!/usr/bin/env tsx

/**
 * Unified startup script for BountyForge
 * Starts all services in parallel:
 * - Mallory MCP Server (port 3001)
 * - x402 Gateway (port 3002)
 * - Agent API Server (port 3003)
 * - Dashboard (port 3000)
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

// Get root directory (one level up from scripts/)
const ROOT_DIR = join(process.cwd());

interface Service {
  name: string;
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
  color: string;
}

const services: Service[] = [
  {
    name: 'Mallory MCP',
    command: 'bun',
    args: ['--watch', 'src/server.ts'],
    cwd: join(ROOT_DIR, 'app/mallory/apps/server'),
    color: '\x1b[36m', // Cyan
  },
  {
    name: 'x402 Gateway',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: join(ROOT_DIR, 'app/gateway'),
    color: '\x1b[33m', // Yellow
  },
  (() => {
    const agentDir = join(ROOT_DIR, 'app/agent');
    const venvPython = process.platform === 'win32' 
      ? join(agentDir, 'venv', 'Scripts', 'python.exe')
      : join(agentDir, 'venv', 'bin', 'python3');
    
    // Use venv python if it exists, otherwise use system python
    const pythonCmd = existsSync(venvPython) 
      ? venvPython 
      : (process.platform === 'win32' ? 'python' : 'python3');
    
    return {
      name: 'Agent API',
      command: pythonCmd,
      args: ['api_server.py'],
      cwd: agentDir,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
      color: '\x1b[32m', // Green
    };
  })(),
  {
    name: 'Dashboard',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: join(ROOT_DIR, 'app/dashboard'),
    color: '\x1b[35m', // Magenta
  },
];

const processes: Map<string, ChildProcess> = new Map();
const RESET = '\x1b[0m';

function log(service: Service, message: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${service.color}[${timestamp}] [${service.name}]${RESET} ${message}`);
}

function startService(service: Service): Promise<void> {
  return new Promise((resolve, reject) => {
    log(service, `Starting... (${service.command} ${service.args.join(' ')})`);

    const child = spawn(service.command, service.args, {
      cwd: service.cwd,
      env: service.env || process.env,
      stdio: 'pipe',
      shell: false,
    });

    processes.set(service.name, child);

    child.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n').filter((line: string) => line.trim());
      lines.forEach((line: string) => {
        log(service, line);
      });
    });

    child.stderr?.on('data', (data) => {
      const lines = data.toString().split('\n').filter((line: string) => line.trim());
      lines.forEach((line: string) => {
        log(service, `ERROR: ${line}`);
      });
    });

    child.on('error', (error) => {
      log(service, `Failed to start: ${error.message}`);
      reject(error);
    });

    child.on('exit', (code) => {
      if (code !== null && code !== 0) {
        log(service, `Exited with code ${code}`);
      }
    });

    // Give it a moment to start, then resolve
    setTimeout(() => {
      log(service, 'Started successfully');
      resolve();
    }, 2000);
  });
}

async function startAll() {
  console.log('\n🚀 Starting BountyForge services...\n');

  // Check if anchor build is needed
  const idlPath = join(ROOT_DIR, 'target/idl/bountyforge.json');
  if (!existsSync(idlPath)) {
    console.log('⚠️  IDL not found. Running anchor build...\n');
    const buildProcess = spawn('anchor', ['build'], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });
    await new Promise((resolve) => {
      buildProcess.on('exit', resolve);
    });
    console.log('\n');
  }

  // Start all services
  const startPromises = services.map((service) =>
    startService(service).catch((error) => {
      log(service, `Startup error: ${error.message}`);
    })
  );

  await Promise.all(startPromises);

  console.log('\n✅ All services started!\n');
  console.log('📊 Dashboard: http://localhost:3000');
  console.log('🤖 Mallory MCP: http://localhost:3001');
  console.log('💳 x402 Gateway: http://localhost:3002');
  console.log('🔧 Agent API: http://localhost:3003');
  console.log('\nPress Ctrl+C to stop all services\n');
}

function cleanup() {
  console.log('\n\n🛑 Stopping all services...\n');
  processes.forEach((process, name) => {
    console.log(`Stopping ${name}...`);
    process.kill('SIGTERM');
  });

  setTimeout(() => {
    processes.forEach((process) => {
      if (!process.killed) {
        process.kill('SIGKILL');
      }
    });
    process.exit(0);
  }, 3000);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

startAll().catch((error) => {
  console.error('Fatal error:', error);
  cleanup();
  process.exit(1);
});

