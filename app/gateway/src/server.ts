import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 3002;

app.use(cors());
app.use(express.json());

const NANSEN_API_KEY = process.env.NANSEN_API_KEY;
const NANSEN_BASE_URL = process.env.NANSEN_BASE_URL || 'https://api.nansen.ai/api/v1';

if (!NANSEN_API_KEY) {
    console.warn('NANSEN_API_KEY not set - Nansen API calls will fail');
}

async function callNansenAPI(endpoint: string, body: any): Promise<any> {
    if (!NANSEN_API_KEY) {
        throw new Error('NANSEN_API_KEY not configured');
    }

    const apiUrl = `${NANSEN_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'apiKey': NANSEN_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Nansen API] Error ${response.status}: ${errorText}`);
            throw new Error(`Nansen API error (${response.status}): ${errorText}`);
        }

        return await response.json();
    } catch (error: any) {
        console.error(`[Nansen API] Request failed:`, error);
        throw error;
    }
}

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

// nansen wallet intelligence endpoints
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

    console.log(`[x402] Payment received: ${payment.amount} USDC for Nansen current balance (${address})`);

    try {
        const data = await callNansenAPI('/profiler/address/current-balance', {
            address,
            chain
        });
        res.json(data);
    } catch (error: any) {
        console.error(`[x402] Error calling Nansen API:`, error);
        return res.status(500).json({
            error: 'Nansen API Error',
            message: error.message || 'Failed to fetch data from Nansen API'
        });
    }
});

app.post('/api/nansen/transactions', async (req: Request, res: Response) => {
    const payment = validatePayment(req);
    if (!payment.valid) {
        return res.status(payment.error!.status).json(payment.error!.body);
    }

    const { address, chain = 'solana', limit = 50, page = 1, startDate, endDate } = req.body;

    if (!address) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'address is required in request body'
        });
    }

    console.log(`[x402] Payment received: ${payment.amount} USDC for Nansen transactions (${address})`);

    try {
        const dateRange = startDate && endDate
            ? { from: startDate, to: endDate }
            : getDefaultDateRange();

        const data = await callNansenAPI('/profiler/address/transactions', {
            address,
            chain,
            date: dateRange,
            hide_spam_token: true,
            pagination: {
                page,
                per_page: limit
            }
        });
        res.json(data);
    } catch (error: any) {
        console.error(`[x402] Error calling Nansen API:`, error);
        return res.status(500).json({
            error: 'Nansen API Error',
            message: error.message || 'Failed to fetch data from Nansen API'
        });
    }
});

app.post('/api/nansen/pnl', async (req: Request, res: Response) => {
    const payment = validatePayment(req);
    if (!payment.valid) {
        return res.status(payment.error!.status).json(payment.error!.body);
    }

    const { address, chain = 'solana', page = 1, per_page = 100 } = req.body;

    if (!address) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'address is required in request body'
        });
    }

    console.log(`[x402] Payment received: ${payment.amount} USDC for Nansen PnL (${address})`);

    try {
        const normalizedChain = chain.toLowerCase();

        const requestBody: any = {
            wallet_address: address.trim(),
            chain: normalizedChain,
            pagination: {
                page: Number(page) || 1,
                per_page: Number(per_page) || 100
            }
        };

        console.log(`[x402] Calling Nansen PnL API with:`, JSON.stringify(requestBody, null, 2));

        const data = await callNansenAPI('/profiler/address/pnl', requestBody);
        res.json(data);
    } catch (error: any) {
        console.error(`[x402] Error calling Nansen API:`, error);

        if (error.message?.includes('wallet_address')) {
            return res.status(400).json({
                error: 'Invalid Address',
                message: 'The provided wallet address is invalid or not supported for this chain. Please verify the address format and chain compatibility.',
                details: error.message
            });
        }

        return res.status(500).json({
            error: 'Nansen API Error',
            message: error.message || 'Failed to fetch data from Nansen API'
        });
    }
});

app.post('/api/nansen/pnl-summary', async (req: Request, res: Response) => {
    const payment = validatePayment(req);
    if (!payment.valid) {
        return res.status(payment.error!.status).json(payment.error!.body);
    }

    const { address, chain = 'solana', startDate, endDate } = req.body;

    if (!address) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'address is required in request body'
        });
    }

    console.log(`[x402] Payment received: ${payment.amount} USDC for Nansen PnL summary (${address})`);

    try {
        const dateRange = startDate && endDate
            ? { from: startDate, to: endDate }
            : getDefaultDateRange();

        const data = await callNansenAPI('/profiler/address/pnl-summary', {
            address,
            chain,
            date: dateRange
        });
        res.json(data);
    } catch (error: any) {
        console.error(`[x402] Error calling Nansen API:`, error);
        return res.status(500).json({
            error: 'Nansen API Error',
            message: error.message || 'Failed to fetch data from Nansen API'
        });
    }
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

    console.log(`[x402] Payment received: ${payment.amount} USDC for Nansen labels (${address})`);

    try {
        const data = await callNansenAPI('/profiler/address/labels', {
            wallet_address: address,
            chain
        });
        res.json(data);
    } catch (error: any) {
        console.error(`[x402] Error calling Nansen API:`, error);
        return res.status(500).json({
            error: 'Nansen API Error',
            message: error.message || 'Failed to fetch data from Nansen API'
        });
    }
});

app.post('/api/nansen/smart-money-netflows', async (req: Request, res: Response) => {
    const payment = validatePayment(req);
    if (!payment.valid) {
        return res.status(payment.error!.status).json(payment.error!.body);
    }

    const { chains = ['solana'], page = 1, per_page = 100 } = req.body;

    console.log(`[x402] Payment received: ${payment.amount} USDC for Nansen smart money netflows`);

    try {
        const data = await callNansenAPI('/smart-money/netflow', {
            chains,
            pagination: {
                page,
                per_page
            }
        });
        res.json(data);
    } catch (error: any) {
        console.error(`[x402] Error calling Nansen API:`, error);
        return res.status(500).json({
            error: 'Nansen API Error',
            message: error.message || 'Failed to fetch data from Nansen API'
        });
    }
});

// Token Screening Endpoints
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

    console.log(`[x402] Payment received: ${payment.amount} USDC for Nansen token screener`);

    try {
        const requestBody: any = {
            chains: [chain],
            pagination: {
                page,
                per_page
            }
        };

        if (min_volume_usd || min_holders || min_holder_growth) {
            requestBody.filters = {};
            if (min_volume_usd) requestBody.filters.min_volume_usd = min_volume_usd;
            if (min_holders) requestBody.filters.min_holders = min_holders;
            if (min_holder_growth) requestBody.filters.min_holder_growth = min_holder_growth;
        }

        const data = await callNansenAPI('/token-god-mode/token-screener', requestBody);
        res.json(data);
    } catch (error: any) {
        console.error(`[x402] Error calling Nansen API:`, error);
        return res.status(500).json({
            error: 'Nansen API Error',
            message: error.message || 'Failed to fetch data from Nansen API'
        });
    }
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

    console.log(`[x402] Payment received: ${payment.amount} USDC for Nansen flows (${address})`);

    try {
        const data = await callNansenAPI('/token-god-mode/flows', {
            address,
            chain,
            pagination: {
                page,
                per_page
            }
        });
        res.json(data);
    } catch (error: any) {
        console.error(`[x402] Error calling Nansen API:`, error);
        return res.status(500).json({
            error: 'Nansen API Error',
            message: error.message || 'Failed to fetch data from Nansen API'
        });
    }
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

    console.log(`[x402] Payment received: ${payment.amount} USDC for Nansen flow intelligence`);

    try {
        const data = await callNansenAPI('/token-god-mode/flow-intelligence', {
            token_address,
            chain
        });
        res.json(data);
    } catch (error: any) {
        console.error(`[x402] Error calling Nansen API:`, error);
        return res.status(500).json({
            error: 'Nansen API Error',
            message: error.message || 'Failed to fetch data from Nansen API'
        });
    }
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
