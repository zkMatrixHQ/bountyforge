"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const app = (0, express_1.default)();
const PORT = process.env.GATEWAY_PORT || 3002;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.post('/api/switchboard', async (req, res) => {
    const paymentHeader = req.headers['x-402-payment'];
    if (!paymentHeader) {
        return res.status(402).json({
            error: 'Payment Required',
            message: 'X-402-Payment header is required'
        });
    }
    const amount = parseFloat(paymentHeader);
    if (isNaN(amount) || amount <= 0) {
        return res.status(402).json({
            error: 'Invalid Payment',
            message: 'X-402-Payment must be a positive number'
        });
    }
    console.log(`[x402] Payment received: ${amount} USDC for Switchboard oracle`);
    // TODO: Validate payment via AgentPay SDK
    // For now, simulate payment acceptance
    // Mock Switchboard oracle response
    const mockPriceData = {
        price: 150.25,
        timestamp: Date.now(),
        symbol: 'SOL/USD',
        source: 'switchboard'
    };
    res.json(mockPriceData);
});
app.post('/api/llm', async (req, res) => {
    const paymentHeader = req.headers['x-402-payment'];
    if (!paymentHeader) {
        return res.status(402).json({
            error: 'Payment Required',
            message: 'X-402-Payment header is required'
        });
    }
    const amount = parseFloat(paymentHeader);
    if (isNaN(amount) || amount <= 0) {
        res.status(402).json({
            error: 'Invalid Payment',
            message: 'X-402-Payment must be a positive number'
        });
        return;
    }
    console.log(`[x402] Payment received: ${amount} USDC for LLM inference`);
    // TODO: Validate payment via AgentPay SDK
    // TODO: Call LLM API
    res.json({
        response: 'LLM inference result (mock)',
        tokens_used: 100
    });
});
app.post('/api/data', async (req, res) => {
    const paymentHeader = req.headers['x-402-payment'];
    if (!paymentHeader) {
        return res.status(402).json({
            error: 'Payment Required',
            message: 'X-402-Payment header is required'
        });
    }
    const amount = parseFloat(paymentHeader);
    if (isNaN(amount) || amount <= 0) {
        res.status(402).json({
            error: 'Invalid Payment',
            message: 'X-402-Payment must be a positive number'
        });
        return;
    }
    console.log(`[x402] Payment received: ${amount} USDC for data API`);
    // TODO: Validate payment via AgentPay SDK
    // TODO: Fetch external data
    res.json({
        data: 'External data result (mock)'
    });
});
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'x402-gateway'
    });
});
app.listen(PORT, () => {
    console.log(`x402 Gateway Server Started on port ${PORT}`);
});
//# sourceMappingURL=server.js.map