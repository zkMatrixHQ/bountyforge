# BountyForge - Setup Guide

## Quick Start

```bash
# 1. Install dependencies
yarn install

# 2. Configure API keys (see Step 2 below)

# 3. Start everything
yarn start
```

That's it! The dashboard will be available at http://localhost:3000

---

## Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.10+ and pip
- Rust and Anchor CLI
- Solana CLI (for devnet)
- Bun (for Mallory MCP server)

---

## Step 1: Clone and Install Dependencies

```bash
# Install Anchor dependencies
yarn install

# Build Anchor program (generates IDL)
anchor build
```

---

## Step 2: Configure API Keys

### Agent (CDP Wallet)

Create `app/agent/.env`:
```bash
CDP_API_KEY_ID=your_cdp_api_key_id
CDP_API_KEY_SECRET=your_cdp_api_key_secret
CDP_WALLET_SECRET=your_cdp_wallet_secret  # Optional
```

Get CDP credentials from: https://portal.cdp.coinbase.com/projects/api-keys

### Mallory MCP (AI Reasoning)

Create `app/mallory/apps/server/.env`:
```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-pro  # Free tier compatible
```

Get Gemini API key from: https://aistudio.google.com/app/apikey

---

## Step 3: Setup Python Agent

```bash
cd app/agent

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

---

## Step 4: Start All Services

**One command starts everything:**

```bash
# From the root directory
yarn start
# or
npm start
```

This will automatically:
- ✅ Check if Anchor build is needed (runs if IDL missing)
- ✅ Start Mallory MCP Server (port 3001)
- ✅ Start x402 Gateway (port 3002)
- ✅ Start Agent API Server (port 3003)
- ✅ Start Dashboard (port 3000)

All services run in parallel with color-coded logs. Press `Ctrl+C` to stop all services.

**Note:** Make sure you've installed dependencies in each service directory first:
```bash
# Install root dependencies
yarn install

# Install service dependencies (one-time setup)
cd app/mallory/apps/server && npm install && cd ../../../../..
cd app/gateway && npm install && cd ../..
cd app/dashboard && npm install && cd ../..
cd app/agent && pip install -r requirements.txt && cd ../..
```

---

## Step 5: Initialize Agent Wallet

```bash
# Trigger agent to create wallet
curl -X POST http://localhost:3003/trigger \
  -H "Content-Type: application/json" \
  -d '{"single_run": true}'

# Get wallet addresses
curl http://localhost:3003/wallet
```

Copy the `signing_address` from the response. This is used for on-chain transactions.

**Important:** Fund the `signing_address` with SOL (devnet) for transaction fees.

---

## Step 6: Post Bounties (Optional)

```bash
# Build program first
anchor build

# Post test bounties to devnet
yarn post-bounties
```

Make sure you have USDC (devnet) in your wallet. The script uses mint: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`

---

## Step 7: Access Dashboard

Open http://localhost:3000 in your browser.

The dashboard will automatically:
- Fetch agent logs
- Display discovered bounties
- Show reputation (uses signing address automatically)
- Allow triggering the agent

---

## Troubleshooting

**Wallet not found**: Trigger agent first: `curl -X POST http://localhost:3003/trigger -H "Content-Type: application/json" -d '{"single_run": true}'`

**IDL errors**: Make sure `anchor build` was run and IDL exists at `target/idl/bountyforge.json`

**Connection refused**: Check that all services are running on correct ports (3001, 3002, 3003, 3000)

**No reputation**: Agent needs to submit solutions on-chain. Make sure signing address is funded with SOL.

**Program not deployed**: On-chain operations require the program to be deployed to devnet. Run `anchor deploy --provider.cluster devnet`

---

## Architecture

- **Agent** (Python): Discovers bounties, reasons about solutions, submits on-chain
- **Mallory MCP** (Node.js): AI reasoning engine using Gemini
- **x402 Gateway** (Node.js): Micropayment gateway for tool access
- **Dashboard** (Next.js): Web UI for monitoring agent activity
- **Smart Contract** (Anchor/Rust): On-chain bounty and reputation system

---

## How Bounties Work

**Primary Source: On-Chain Bounties**
- Bounties are posted on-chain using the `post_bounty` instruction
- Agent queries the smart contract for open bounties
- Mock bounties are only used if no on-chain bounties exist

**To Post a Bounty:**
```bash
yarn post-bounties
```

Or manually call the `post_bounty` instruction from your client.
