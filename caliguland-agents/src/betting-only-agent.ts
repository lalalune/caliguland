/**
 * Betting-Only Agent Example
 * This agent ONLY bets on JejuMarket, does NOT play Caliguland games
 */

import { AgentRuntime, type Character, type Plugin } from '@elizaos/core';
import { JejuMarketBettingService } from './services/jejuMarketBetting.js';
import { Web3Service } from './services/web3Service.js';
import bootstrapPlugin from '@elizaos/plugin-bootstrap';
import sqlPlugin from '@elizaos/plugin-sql';

const bettingOnlyPlugin: Plugin = {
    name: 'jeju-market-betting-only',
    description: 'Autonomous betting on JejuMarket prediction markets',
    
    services: [
        Web3Service,
        JejuMarketBettingService
    ],
    
    actions: [],
    providers: [],
    evaluators: []
};

// Character definition for betting agent
const bettingAgent: Character = {
    name: 'BettingBot',
    username: 'betting-bot',
    system: `You are a sophisticated prediction market trading agent.

Your role:
- Monitor JejuMarket for new prediction markets
- Analyze market prices and signals
- Place strategic bets to maximize profit
- Claim winnings after resolution

Strategy:
- Look for mispriced markets (odds don't match your assessment)
- Use Kelly Criterion for bet sizing
- Diversify across multiple markets
- Monitor Caliguland game feeds for insider info
- React to price movements

You do NOT play Caliguland games. You ONLY bet on the outcomes.`,
    
    bio: [
        'Autonomous prediction market trader',
        'Data-driven betting strategies',
        'Profit-focused agent'
    ],
    
    style: {
        all: [
            'Be analytical and data-driven',
            'Quantify confidence levels',
            'Explain betting rationale'
        ]
    },
    
    settings: {
        secrets: {
            JEJU_MARKET_ADDRESS: process.env.JEJU_MARKET_ADDRESS,
            ELIZA_OS_ADDRESS: process.env.ELIZA_OS_ADDRESS,
            RPC_URL: process.env.RPC_URL || 'http://localhost:8545',
            AGENT_PRIVATE_KEY: process.env.BETTING_AGENT_PRIVATE_KEY,
            MAX_BET_PER_MARKET: '500', // Max 500 elizaOS per market
        }
    }
};

async function startBettingAgent() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                                                              ║');
    console.log('║   🤖 BETTING-ONLY AGENT STARTING                             ║');
    console.log('║   JejuMarket autonomous trader                              ║');
    console.log('║                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('🔑 Configuration:');
    console.log(`   Market: ${process.env.JEJU_MARKET_ADDRESS || 'Not set'}`);
    console.log(`   RPC: ${process.env.RPC_URL || 'http://localhost:8545'}`);
    console.log(`   Max Bet: ${bettingAgent.settings?.secrets?.MAX_BET_PER_MARKET} elizaOS\n`);

    const runtime = new AgentRuntime({
        character: bettingAgent,
        plugins: [
            sqlPlugin as Plugin,
            bootstrapPlugin as Plugin,
            bettingOnlyPlugin
        ]
    });

    await runtime.initialize();

    console.log('✅ Agent initialized');
    console.log('🤖 Bot will autonomously:');
    console.log('   - Monitor new markets');
    console.log('   - Analyze prices');
    console.log('   - Place strategic bets');
    console.log('   - Claim winnings\n');

    // Keep running
    console.log('⏳ Agent active. Press Ctrl+C to stop.\n');
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down betting agent...');
        process.exit(0);
    });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startBettingAgent().catch(err => {
        console.error('❌ Failed to start betting agent:', err);
        process.exit(1);
    });
}

export { bettingOnlyPlugin, bettingAgent };

