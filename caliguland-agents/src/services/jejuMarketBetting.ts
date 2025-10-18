/**
 * JejuMarket Betting Service
 * Enables agents to bet on prediction markets without playing the game
 */

import { Service, type IAgentRuntime, logger } from '@elizaos/core';
import { ethers, Contract, Wallet } from 'ethers';

const JEJU_MARKET_ABI = [
    'function buy(bytes32 sessionId, bool outcome, uint256 elizaOSAmount, uint256 minShares) external returns (uint256 shares)',
    'function sell(bytes32 sessionId, bool outcome, uint256 numShares, uint256 minProceeds) external returns (uint256 proceeds)',
    'function getYesPrice(bytes32 sessionId) external view returns (uint256)',
    'function getNoPrice(bytes32 sessionId) external view returns (uint256)',
    'function getPosition(bytes32 sessionId, address user) external view returns (uint256 yesShares, uint256 noShares, uint256 totalSpent, uint256 totalReceived, bool hasClaimed)',
    'function claimPayout(bytes32 sessionId) external returns (uint256 payout)',
    'function resolveMarket(bytes32 sessionId) external',
    'event SharesPurchased(bytes32 indexed sessionId, address indexed buyer, bool outcome, uint256 shares, uint256 cost, uint256 newPrice)',
    'event SharesSold(bytes32 indexed sessionId, address indexed seller, bool outcome, uint256 shares, uint256 proceeds, uint256 newPrice)'
];

const ELIZA_OS_ABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address account) external view returns (uint256)',
    'function allowance(address owner, address spender) external view returns (uint256)'
];

export interface BettingConfig {
    rpcUrl: string;
    jejuMarketAddress: string;
    elizaOSAddress: string;
    privateKey: string;
    maxBetPerMarket: string; // e.g., "1000" elizaOS
}

export interface BetDecision {
    sessionId: string;
    outcome: boolean; // true=YES, false=NO
    amount: string;   // elizaOS amount
    confidence: number; // 0-1
}

/**
 * Service for betting on JejuMarket prediction markets
 */
export class JejuMarketBettingService extends Service {
    static serviceType = 'jeju-market-betting';
    capabilityDescription = 'Bet on JejuMarket prediction markets using elizaOS tokens';

    private provider: ethers.JsonRpcProvider | null = null;
    private wallet: Wallet | null = null;
    private marketContract: Contract | null = null;
    private elizaOSContract: Contract | null = null;
    private config: BettingConfig | null = null;

    async initialize(runtime: IAgentRuntime): Promise<void> {
        const config: BettingConfig = {
            rpcUrl: runtime.getSetting('RPC_URL') || 'http://localhost:8545',
            jejuMarketAddress: runtime.getSetting('JEJU_MARKET_ADDRESS') || '',
            elizaOSAddress: runtime.getSetting('ELIZA_OS_ADDRESS') || '',
            privateKey: runtime.getSetting('AGENT_PRIVATE_KEY') || '',
            maxBetPerMarket: runtime.getSetting('MAX_BET_PER_MARKET') || '1000'
        };

        if (!config.jejuMarketAddress || !config.elizaOSAddress) {
            logger.warn('[JejuMarket] Market addresses not configured - betting disabled');
            return;
        }

        if (!config.privateKey) {
            throw new Error('AGENT_PRIVATE_KEY required for betting');
        }

        this.config = config;
        this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.wallet = new Wallet(config.privateKey, this.provider);
        
        this.marketContract = new Contract(
            config.jejuMarketAddress,
            JEJU_MARKET_ABI,
            this.wallet
        );

        this.elizaOSContract = new Contract(
            config.elizaOSAddress,
            ELIZA_OS_ABI,
            this.wallet
        );

        logger.info('[JejuMarket] ✅ Betting service initialized');
        logger.info(`[JejuMarket]    Wallet: ${this.wallet.address}`);
        logger.info(`[JejuMarket]    Market: ${config.jejuMarketAddress}`);
        
        // Check and approve elizaOS spending
        await this.ensureAllowance();
    }

    /**
     * Ensure market contract has elizaOS allowance
     */
    private async ensureAllowance(): Promise<void> {
        if (!this.elizaOSContract || !this.marketContract || !this.wallet || !this.config) return;

        const allowance = await this.elizaOSContract.allowance(
            this.wallet.address,
            this.config.jejuMarketAddress
        );

        const maxBet = ethers.parseEther(this.config.maxBetPerMarket);
        const requiredAllowance = maxBet * 100n; // Allow 100x max bet

        if (allowance < requiredAllowance) {
            logger.info('[JejuMarket] Approving elizaOS spending...');
            const tx = await this.elizaOSContract.approve(
                this.config.jejuMarketAddress,
                ethers.MaxUint256
            );
            await tx.wait();
            logger.info('[JejuMarket] ✅ Approval granted');
        }
    }

    /**
     * Place a bet on a market
     */
    async placeBet(decision: BetDecision): Promise<{ success: boolean; txHash?: string; error?: string }> {
        if (!this.marketContract || !this.wallet) {
            return { success: false, error: 'Betting service not initialized' };
        }

        try {
            logger.info(`[JejuMarket] Placing bet: ${decision.amount} elizaOS on ${decision.outcome ? 'YES' : 'NO'}`);
            logger.info(`[JejuMarket] Confidence: ${(decision.confidence * 100).toFixed(1)}%`);

            const sessionIdBytes32 = ethers.id(decision.sessionId);
            const amountWei = ethers.parseEther(decision.amount);

            // Call buy() with 0 minShares (no slippage protection for agents)
            const tx = await this.marketContract.buy(
                sessionIdBytes32,
                decision.outcome,
                amountWei,
                0n
            );

            logger.info('[JejuMarket] ⏳ Waiting for confirmation...');
            const receipt = await tx.wait();

            logger.info(`[JejuMarket] ✅ Bet placed! Tx: ${receipt.hash}`);

            return {
                success: true,
                txHash: receipt.hash
            };
        } catch (error) {
            logger.error('[JejuMarket] ❌ Bet failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get current prices for a market
     */
    async getMarketPrices(sessionId: string): Promise<{ yesPrice: number; noPrice: number } | null> {
        if (!this.marketContract) return null;

        try {
            const sessionIdBytes32 = ethers.id(sessionId);
            
            const [yesPrice, noPrice] = await Promise.all([
                this.marketContract.getYesPrice(sessionIdBytes32),
                this.marketContract.getNoPrice(sessionIdBytes32)
            ]);

            return {
                yesPrice: Number(yesPrice) / 1e18,
                noPrice: Number(noPrice) / 1e18
            };
        } catch (error) {
            logger.error('[JejuMarket] Failed to get prices:', error);
            return null;
        }
    }

    /**
     * Get agent's position in a market
     */
    async getPosition(sessionId: string): Promise<any> {
        if (!this.marketContract || !this.wallet) return null;

        try {
            const sessionIdBytes32 = ethers.id(sessionId);
            
            const position = await this.marketContract.getPosition(
                sessionIdBytes32,
                this.wallet.address
            );

            return {
                yesShares: position[0],
                noShares: position[1],
                totalSpent: position[2],
                totalReceived: position[3],
                hasClaimed: position[4]
            };
        } catch (error) {
            logger.error('[JejuMarket] Failed to get position:', error);
            return null;
        }
    }

    /**
     * Claim winnings after market resolution
     */
    async claimPayout(sessionId: string): Promise<{ success: boolean; payout?: bigint; error?: string }> {
        if (!this.marketContract) {
            return { success: false, error: 'Not initialized' };
        }

        try {
            const sessionIdBytes32 = ethers.id(sessionId);
            
            logger.info('[JejuMarket] Claiming payout...');
            const tx = await this.marketContract.claimPayout(sessionIdBytes32);
            const receipt = await tx.wait();

            // Extract payout from event
            const event = receipt.logs
                .map((log: unknown) => {
                    if (!log || typeof log !== 'object') return null;
                    try {
                        return this.marketContract!.interface.parseLog(log as { topics: readonly string[]; data: string });
                    } catch {
                        return null;
                    }
                })
                .find((e: unknown) => {
                    return e !== null && typeof e === 'object' && 'name' in e && (e as Record<string, unknown>).name === 'PayoutClaimed';
                });

            const payout = event?.args?.amount || 0n;

            logger.info(`[JejuMarket] ✅ Claimed ${ethers.formatEther(payout)} elizaOS`);

            return {
                success: true,
                payout
            };
        } catch (error) {
            logger.error('[JejuMarket] Claim failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // ============ Lifecycle ============

    static async start(runtime: IAgentRuntime): Promise<Service> {
        const service = new JejuMarketBettingService(runtime);
        await service.initialize(runtime);
        return service;
    }

    async stop(): Promise<void> {
        logger.info('[JejuMarket] Shutting down betting service');
    }
}

