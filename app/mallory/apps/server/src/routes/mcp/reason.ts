import express, { Router } from 'express';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const router: Router = express.Router();

const getGeminiModel = () => {
    return process.env.GEMINI_MODEL || 'gemini-pro';
};

interface BountyReasonRequest {
    bounty: string;
    context?: string;
}

interface BountyReasonResponse {
    needs: string[];
    reasoning: string;
    plan: string;
}

router.post('/reason', async (req: express.Request, res: express.Response) => {
    try {
        const { bounty, context }: BountyReasonRequest = req.body;

        if (!bounty) {
            return res.status(400).json({ error: 'Bounty description is required' });
        }

        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            console.warn('GEMINI_API_KEY not set, falling back to keyword matching');
            return fallbackKeywordMatching(bounty, res);
        }

        const google = createGoogleGenerativeAI({
            apiKey: geminiApiKey,
        });

        let model;
        try {
            model = google(getGeminiModel());
        } catch (modelError) {
            console.warn(`Model ${getGeminiModel()} not available, trying gemini-pro`);
            model = google('gemini-pro');
        }

        const systemPrompt = `You are an AI reasoning engine for bounty analysis. Analyze the bounty description and determine:
1. What tools/APIs are needed (e.g., switchboard_oracle, code_analysis, data_analysis, solana_rpc)
2. Your reasoning for why these tools are needed
3. A step-by-step plan to solve the bounty

Available tools:
- switchboard_oracle: For price feeds and oracle data
- code_analysis: For smart contract analysis and debugging
- data_analysis: For transaction pattern analysis
- solana_rpc: For blockchain data queries
- general_research: For general research tasks

Respond ONLY with valid JSON in this exact format:
{
  "needs": ["tool1", "tool2"],
  "reasoning": "Brief explanation of what the bounty requires",
  "plan": "Step-by-step plan to solve the bounty"
}`;

        let result;
        try {
            result = await generateText({
                model,
                system: systemPrompt,
                prompt: `Bounty Description: ${bounty}\n${context ? `Context: ${context}` : ''}\n\nAnalyze this bounty and provide the required tools, reasoning, and plan.`,
                temperature: 0.3,
            });
        } catch (apiError: any) {
            if (apiError?.statusCode === 404 || apiError?.message?.includes('not found')) {
                console.warn(`Model ${getGeminiModel()} not available, falling back to keyword matching`);
                return fallbackKeywordMatching(bounty, res);
            }
            throw apiError;
        }

        try {
            const response = JSON.parse(result.text) as BountyReasonResponse;
            
            if (!response.needs || !Array.isArray(response.needs)) {
                throw new Error('Invalid response format');
            }

            res.json({
                needs: response.needs,
                reasoning: response.reasoning || 'AI analysis completed',
                plan: response.plan || 'Follow the reasoning to solve the bounty'
            });
        } catch (parseError) {
            console.error('Failed to parse AI response, using fallback:', parseError);
            return fallbackKeywordMatching(bounty, res);
        }
    } catch (error) {
        console.error('Error in bounty reasoning:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

function fallbackKeywordMatching(bounty: string, res: express.Response) {
    const bountyLower = bounty.toLowerCase();
    const needs: string[] = [];
    let reasoning = '';
    let plan = '';

    if (bountyLower.includes('price') || bountyLower.includes('oracle') || bountyLower.includes('switchboard')) {
        needs.push('switchboard_oracle');
        reasoning = 'Bounty requires price data from an oracle';
        plan = 'Fetch current price data from Switchboard oracle';
    }

    if (bountyLower.includes('debug') || bountyLower.includes('bug') || bountyLower.includes('fix')) {
        needs.push('code_analysis');
        reasoning = 'Bounty requires code analysis and debugging';
        plan = 'Analyze smart contract code to identify and fix issues';
    }

    if (bountyLower.includes('transaction') || bountyLower.includes('pattern') || bountyLower.includes('analyze')) {
        needs.push('data_analysis');
        reasoning = 'Bounty requires transaction data analysis';
        plan = 'Fetch and analyze transaction patterns from blockchain';
    }

    if (bountyLower.includes('solana') || bountyLower.includes('sol')) {
        needs.push('solana_rpc');
        reasoning = 'Bounty requires Solana blockchain data';
        plan = 'Query Solana RPC for blockchain data';
    }

    if (needs.length === 0) {
        needs.push('general_research');
        reasoning = 'Bounty requires general research and analysis';
        plan = 'Research and analyze the bounty requirements';
    }

    res.json({
        needs,
        reasoning,
        plan
    });
}

export { router as mcpRouter };

