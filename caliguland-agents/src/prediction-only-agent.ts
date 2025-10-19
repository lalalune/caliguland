/**
 * Prediction-Only Agent Example
 * This agent ONLY makes predictions on Predimarket, does NOT play Caliguland games
 */

import { AgentRuntime, type Character, type Plugin } from '@elizaos/core';
import { PredimarketPredictionsService } from './services/predimarketPredictions.js';
import { Web3Service } from './services/web3Service.js';
import bootstrapPlugin from '@elizaos/plugin-bootstrap';
import sqlPlugin from '@elizaos/plugin-sql';

const predictionOnlyPlugin: Plugin = {
    name: 'predimarket-prediction-only',
    description: 'Autonomous predictions on Predimarket prediction markets',
    
    services: [
        Web3Service,
        PredimarketPredictionsService
    ],
    
    actions: [],
    providers: [],
    evaluators: []
};

// Character definition for prediction agent
const predictionAgent: Character = {
    name: 'PredictionBot',
    username: 'prediction-bot',
    system: `You are a sophisticated prediction market trading agent.

Your role:
- Monitor Predimarket for new prediction markets
- Analyze market prices and signals
- Place strategic predictions to maximize profit
- Claim winnings after resolution

Strategy:
- Look for mispriced markets (odds don't match your assessment)
- Use Kelly Criterion for position sizing
- Diversify across multiple markets
- Monitor Caliguland game feeds for insider info
- React to price movements

You do NOT play Caliguland games. You ONLY make predictions on the outcomes.`,
    
    bio: [
        'Autonomous prediction market trader',
        'Data-driven prediction strategies',
        'Profit-focused agent'
    ],
    
    style: {
        all: [
            'Be analytical and data-driven',
            'Quantify confidence levels',
            'Explain prediction rationale'
        ]
    },
    
    settings: {
        secrets: {
            PREDIMARKET_ADDRESS: process.env.PREDIMARKET_ADDRESS,
            ELIZA_OS_ADDRESS: process.env.ELIZA_OS_ADDRESS,
            RPC_URL: process.env.RPC_URL || 'http://localhost:8545',
            AGENT_PRIVATE_KEY: process.env.PREDICTION_AGENT_PRIVATE_KEY,
            MAX_PREDICT_PER_MARKET: '500', // Max 500 elizaOS per market
        }
    }
};

async function startPredictionAgent() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                                                              ║');
    console.log('║   🤖 PREDICTION-ONLY AGENT STARTING                          ║');
    console.log('║   Predimarket autonomous trader                              ║');
    console.log('║                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('🔑 Configuration:');
    console.log(`   Market: ${process.env.PREDIMARKET_ADDRESS || 'Not set'}`);
    console.log(`   RPC: ${process.env.RPC_URL || 'http://localhost:8545'}`);
    console.log(`   Max Prediction: ${predictionAgent.settings?.secrets?.MAX_PREDICT_PER_MARKET} elizaOS\n`);

    const runtime = new AgentRuntime({
        character: predictionAgent,
        plugins: [
            sqlPlugin as Plugin,
            bootstrapPlugin as Plugin,
            predictionOnlyPlugin
        ]
    });

    await runtime.initialize();

    console.log('✅ Agent initialized');
    console.log('🤖 Bot will autonomously:');
    console.log('   - Monitor new markets');
    console.log('   - Analyze prices');
    console.log('   - Place strategic predictions');
    console.log('   - Claim winnings\n');

    // Keep running
    console.log('⏳ Agent active. Press Ctrl+C to stop.\n');
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down prediction agent...');
        process.exit(0);
    });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startPredictionAgent().catch(err => {
        console.error('❌ Failed to start prediction agent:', err);
        process.exit(1);
    });
}

export { predictionOnlyPlugin, predictionAgent };

