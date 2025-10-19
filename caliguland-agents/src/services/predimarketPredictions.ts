/**
 * Predimarket Predictions Service
 * Enables agents to make predictions on prediction markets without playing the game
 */

import { Service, type IAgentRuntime, logger } from '@elizaos/core';
import { ethers, Contract, Wallet } from 'ethers';

const PREDIMARKET_ABI = [
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

export interface PredictionConfig {
    rpcUrl: string;
    predimarketAddress: string;
    elizaOSAddress: string;
    privateKey: string;
    maxPredictPerMarket: string; // e.g., "1000" elizaOS
}

export interface PredictionDecision {
    sessionId: string;
    outcome: boolean; // true=YES, false=NO
    amount: string;   // elizaOS amount
    confidence: number; // 0-1
}

/**
 * Service for making predictions on Predimarket prediction markets
 */
export class PredimarketPredictionsService extends Service {
    static serviceType = 'predimarket-predictions';
    capabilityDescription = 'Make predictions on Predimarket prediction markets using elizaOS tokens';

    private provider: ethers.JsonRpcProvider | null = null;
    private wallet: Wallet | null = null;
    private marketContract: Contract | null = null;
    private elizaOSContract: Contract | null = null;
    private config: PredictionConfig | null = null;

    async initialize(runtime: IAgentRuntime): Promise<void> {
        const config: PredictionConfig = {
            rpcUrl: runtime.getSetting('RPC_URL') || 'http://localhost:8545',
            predimarketAddress: runtime.getSetting('PREDIMARKET_ADDRESS') || '',
            elizaOSAddress: runtime.getSetting('ELIZA_OS_ADDRESS') || '',
            privateKey: runtime.getSetting('AGENT_PRIVATE_KEY') || '',
            maxPredictPerMarket: runtime.getSetting('MAX_PREDICT_PER_MARKET') || '1000'
        };

        if (!config.predimarketAddress || !config.elizaOSAddress) {
            logger.warn('[Predimarket] Market addresses not configured - predictions disabled');
            return;
        }

        if (!config.privateKey) {
            throw new Error('AGENT_PRIVATE_KEY required for making predictions');
        }

        this.config = config;
        this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.wallet = new Wallet(config.privateKey, this.provider);
        
        this.marketContract = new Contract(
            config.predimarketAddress,
            PREDIMARKET_ABI,
            this.wallet
        );

        this.elizaOSContract = new Contract(
            config.elizaOSAddress,
            ELIZA_OS_ABI,
            this.wallet
        );

        logger.info('[Predimarket] ✅ Predictions service initialized');
        logger.info(`[Predimarket]    Wallet: ${this.wallet.address}`);
        logger.info(`[Predimarket]    Market: ${config.predimarketAddress}`);
        
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
            this.config.predimarketAddress
        );

        const maxPredict = ethers.parseEther(this.config.maxPredictPerMarket);
        const requiredAllowance = maxPredict * 100n; // Allow 100x max prediction

        if (allowance < requiredAllowance) {
            logger.info('[Predimarket] Approving elizaOS spending...');
            const tx = await this.elizaOSContract.approve(
                this.config.predimarketAddress,
                ethers.MaxUint256
            );
            await tx.wait();
            logger.info('[Predimarket] ✅ Approval granted');
        }
    }

    /**
     * Place a prediction on a market
     */
    async makePrediction(decision: PredictionDecision): Promise<{ success: boolean; txHash?: string; error?: string }> {
        if (!this.marketContract || !this.wallet) {
            throw new Error('Predictions service not initialized');
        }

        logger.info(`[Predimarket] Making prediction: ${decision.amount} elizaOS on ${decision.outcome ? 'YES' : 'NO'}`);
        logger.info(`[Predimarket] Confidence: ${(decision.confidence * 100).toFixed(1)}%`);

        const sessionIdBytes32 = ethers.id(decision.sessionId);
        const amountWei = ethers.parseEther(decision.amount);

        // Call buy() with 0 minShares (no slippage protection for agents)
        const tx = await this.marketContract.buy(
            sessionIdBytes32,
            decision.outcome,
            amountWei,
            0n
        );

        logger.info('[Predimarket] ⏳ Waiting for confirmation...');
        const receipt = await tx.wait();

        logger.info(`[Predimarket] ✅ Prediction placed! Tx: ${receipt.hash}`);

        return {
            success: true,
            txHash: receipt.hash
        };
    }

    /**
     * Get current prices for a market
     */
    async getMarketPrices(sessionId: string): Promise<{ yesPrice: number; noPrice: number }> {
        if (!this.marketContract) {
            throw new Error('Market contract not initialized');
        }

        const sessionIdBytes32 = ethers.id(sessionId);
        
        const [yesPrice, noPrice] = await Promise.all([
            this.marketContract.getYesPrice(sessionIdBytes32),
            this.marketContract.getNoPrice(sessionIdBytes32)
        ]);

        return {
            yesPrice: Number(yesPrice) / 1e18,
            noPrice: Number(noPrice) / 1e18
        };
    }

    /**
     * Get agent's position in a market
     */
    async getPosition(sessionId: string): Promise<{
        yesShares: bigint;
        noShares: bigint;
        totalSpent: bigint;
        totalReceived: bigint;
        hasClaimed: boolean;
    }> {
        if (!this.marketContract || !this.wallet) {
            throw new Error('Market contract or wallet not initialized');
        }

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
    }

    /**
     * Claim winnings after market resolution
     */
    async claimPayout(sessionId: string): Promise<{ payout: bigint; txHash: string }> {
        if (!this.marketContract) {
            throw new Error('Market contract not initialized');
        }

        const sessionIdBytes32 = ethers.id(sessionId);
        
        logger.info('[Predimarket] Claiming payout...');
        const tx = await this.marketContract.claimPayout(sessionIdBytes32);
        const receipt = await tx.wait();

        // Extract payout from event
        const event = receipt.logs
            .map((log: unknown) => {
                if (!log || typeof log !== 'object') return null;
                return this.marketContract!.interface.parseLog(log as { topics: readonly string[]; data: string });
            })
            .find((e: unknown) => {
                return e !== null && typeof e === 'object' && 'name' in e && (e as Record<string, unknown>).name === 'PayoutClaimed';
            });

        const payout = event?.args?.amount || 0n;

        logger.info(`[Predimarket] ✅ Claimed ${ethers.formatEther(payout)} elizaOS`);

        return {
            payout,
            txHash: receipt.hash
        };
    }

    // ============ Lifecycle ============

    static async start(runtime: IAgentRuntime): Promise<Service> {
        const service = new PredimarketPredictionsService(runtime);
        await service.initialize(runtime);
        return service;
    }

    async stop(): Promise<void> {
        logger.info('[Predimarket] Shutting down predictions service');
    }
}

