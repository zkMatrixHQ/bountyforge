import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 3002;

app.use(cors());
app.use(express.json());

function validatePayment(req: Request): { valid: boolean; amount?: number; error?: any } {
    const paymentHeader = req.headers['x-402-payment'] as string | undefined;

    if (!paymentHeader) {
        return {
            valid: false,
            error: {
                status: 402,
                body: {
                    error: 'Payment Required',
                    message: 'X-402-Payment header is required'
                }
            }
        };
    }

    const amount = parseFloat(paymentHeader);
    if (isNaN(amount) || amount <= 0) {
        return {
            valid: false,
            error: {
                status: 402,
                body: {
                    error: 'Invalid Payment',
                    message: 'X-402-Payment must be a positive number'
                }
            }
        };
    }

    return { valid: true, amount };
}

function getDefaultDateRange(): { from: string; to: string } {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
        from: yesterday.toISOString(),
        to: now.toISOString()
    };
}

app.post('/api/nansen/current-balance', async (req: Request, res: Response) => {
    const payment = validatePayment(req);
    if (!payment.valid) {
        return res.status(payment.error!.status).json(payment.error!.body);
    }

    const { address, chain = 'solana' } = req.body;

    if (!address) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'address is required in request body'
        });
    }

    console.log(`[x402] Payment received: ${payment.amount} USDC for current balance (${address})`);

    const dummy = {
        address,
        chain,
        total_usd_value: +(Math.random() * 500000).toFixed(2),
        tokens: [
            { symbol: 'SOL', balance: +(Math.random() * 100).toFixed(2), usd_value: +(Math.random() * 10000).toFixed(2) }
        ]
    };

    res.json(dummy);
});

app.post('/api/nansen/transactions', async (req: Request, res: Response) => {
    const payment = validatePayment(req);
    if (!payment.valid) {
        return res.status(payment.error!.status).json(payment.error!.body);
    }

    const { address, chain = 'solana' } = req.body;

    if (!address) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'address is required in request body'
        });
    }

    console.log(`[x402] Payment received: ${payment.amount} USDC for transactions (${address})`);

    const dummy = {
        address,
        chain,
        transactions: Array.from({ length: 5 }, (_, i) => ({
            hash: `tx_${i}`,
            type: 'swap',
            timestamp: Date.now() - i * 3600000,
            usd_value: +(Math.random() * 50000).toFixed(2)
        }))
    };

    res.json(dummy);
});

app.post('/api/nansen/pnl', async (req: Request, res: Response) => {
    const payment = validatePayment(req);
    if (!payment.valid) {
        return res.status(payment.error!.status).json(payment.error!.body);
    }

    const { address, chain = 'solana' } = req.body;

    if (!address) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'address is required in request body'
        });
    }

    console.log(`[x402] Payment received: ${payment.amount} USDC for PnL (${address})`);

    const dummy = {
        address,
        chain,
        page: 1,
        per_page: 100,
        total_trades: Math.floor(Math.random() * 200),
        realized_pnl_usd: +(Math.random() * 100000).toFixed(2),
        unrealized_pnl_usd: +(Math.random() * 50000).toFixed(2),
        pnl_percentage: +(Math.random() * 200 - 50).toFixed(2),
        trades: Array.from({ length: 5 }, (_, i) => ({
            id: i + 1,
            token: 'SOL',
            timestamp: Date.now() - i * 86400000,
            pnl_usd: +(Math.random() * 5000 - 2500).toFixed(2)
        }))
    };

    res.json(dummy);
});

app.post('/api/nansen/pnl-summary', async (req: Request, res: Response) => {
    const payment = validatePayment(req);
    if (!payment.valid) {
        return res.status(payment.error!.status).json(payment.error!.body);
    }

    const { address, chain = 'solana' } = req.body;

    if (!address) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'address is required in request body'
        });
    }

    console.log(`[x402] Payment received: ${payment.amount} USDC for PnL summary (${address})`);

    const dummy = {
        address,
        chain,
        date_range: getDefaultDateRange(),
        total_pnl_usd: +(Math.random() * 200000 - 100000).toFixed(2),
        total_pnl_percentage: +(Math.random() * 200 - 100).toFixed(2),
        win_rate: +(Math.random()).toFixed(2),
        total_trades: Math.floor(Math.random() * 300),
        profitable_trades: Math.floor(Math.random() * 150)
    };

    res.json(dummy);
});

app.post('/api/nansen/labels', async (req: Request, res: Response) => {
    const payment = validatePayment(req);
    if (!payment.valid) {
        return res.status(payment.error!.status).json(payment.error!.body);
    }

    const { address, chain = 'solana' } = req.body;

    if (!address) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'address is required in request body'
        });
    }

    console.log(`[x402] Payment received: ${payment.amount} USDC for labels (${address})`);

    const dummy = {
        address,
        chain,
        labels: [
            { label: 'Smart Money', confidence: +(Math.random()).toFixed(2) },
            { label: 'NFT Trader', confidence: +(Math.random()).toFixed(2) },
            { label: 'DeFi Power User', confidence: +(Math.random()).toFixed(2) }
        ],
        updated_at: new Date().toISOString()
    };

    res.json(dummy);
});

app.post('/api/nansen/smart-money-netflows', async (req: Request, res: Response) => {
    const payment = validatePayment(req);
    if (!payment.valid) {
        return res.status(payment.error!.status).json(payment.error!.body);
    }

    const { chains = ['solana'], page = 1, per_page = 100 } = req.body;

    console.log(`[x402] Payment received: ${payment.amount} USDC for smart money netflows`);

    const dummy = {
        chains,
        page,
        per_page,
        total: per_page,
        netflows: Array.from({ length: Math.min(10, per_page) }, (_, i) => ({
            token: `TOKEN_${i + 1}`,
            token_address: `mock_${i + 1}`,
            netflow_usd: +(Math.random() * 5_000_000 - 2_500_000).toFixed(2),
            netflow_amount: +(Math.random() * 100000).toFixed(2),
            buyers_count: Math.floor(Math.random() * 500),
            sellers_count: Math.floor(Math.random() * 500)
        })),
        timestamp: Date.now()
    };

    res.json(dummy);
});

app.post('/api/nansen/token-screener', async (req: Request, res: Response) => {
    const payment = validatePayment(req);
    if (!payment.valid) {
        return res.status(payment.error!.status).json(payment.error!.body);
    }

    const {
        chain = 'solana',
        min_volume_usd,
        min_holders,
        min_holder_growth,
        page = 1,
        per_page = 50
    } = req.body;

    console.log(`[x402] Payment received: ${payment.amount} USDC for token screener`);

    const dummy = {
        chain,
        page,
        per_page,
        filters: {
            min_volume_usd,
            min_holders,
            min_holder_growth
        },
        tokens: Array.from({ length: Math.min(per_page, 5) }, (_, i) => ({
            token: `TOKEN_${i + 1}`,
            token_address: `mock_token_${i + 1}`,
            volume_24h_usd: +(Math.random() * 50_000_000).toFixed(2),
            holders: Math.floor(Math.random() * 100_000),
            holder_growth_24h: +(Math.random() * 20).toFixed(2),
            price_change_24h: +(Math.random() * 30 - 15).toFixed(2)
        })),
        timestamp: Date.now()
    };

    res.json(dummy);
});

app.post('/api/nansen/flows', async (req: Request, res: Response) => {
    const payment = validatePayment(req);
    if (!payment.valid) {
        return res.status(payment.error!.status).json(payment.error!.body);
    }

    const { address, chain = 'solana', page = 1, per_page = 50 } = req.body;

    if (!address) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'address is required in request body'
        });
    }

    console.log(`[x402] Payment received: ${payment.amount} USDC for flows (${address})`);

    const dummy = {
        address,
        chain,
        page,
        per_page,
        flows: Array.from({ length: Math.min(per_page, 5) }, (_, i) => ({
            token: `TOKEN_${i + 1}`,
            direction: Math.random() > 0.5 ? 'inflow' : 'outflow',
            amount: +(Math.random() * 5000).toFixed(2),
            usd_value: +(Math.random() * 1_000_000).toFixed(2),
            timestamp: Date.now() - i * 3600 * 1000
        })),
        total: Math.min(per_page, 5),
        timestamp: Date.now()
    };

    res.json(dummy);
});

app.post('/api/nansen/flow-intelligence', async (req: Request, res: Response) => {
    const payment = validatePayment(req);
    if (!payment.valid) {
        return res.status(payment.error!.status).json(payment.error!.body);
    }

    const { token_address, chain = 'solana' } = req.body;

    if (!token_address) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'token_address is required in request body'
        });
    }

    console.log(`[x402] Payment received: ${payment.amount} USDC for flow intelligence`);

    const dummy = {
        token_address,
        chain,
        flow_patterns: {
            smart_money_inflow: +(Math.random() * 5_000_000).toFixed(2),
            retail_inflow: +(Math.random() * 2_000_000).toFixed(2),
            exchange_outflow: +(Math.random() * 1_000_000).toFixed(2),
            net_flow: +(Math.random() * 3_000_000 - 1_500_000).toFixed(2)
        },
        top_holders: Array.from({ length: 5 }, (_, i) => ({
            address: `mock_holder_${i + 1}`,
            balance: +(Math.random() * 1_000_000).toFixed(2),
            percentage: +(Math.random() * 5).toFixed(2)
        })),
        updated_at: new Date().toISOString()
    };

    res.json(dummy);
});

app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'x402-gateway'
    });
});

app.listen(PORT, () => {
    console.log(`x402 Gateway Server Started on port ${PORT}`);
});
