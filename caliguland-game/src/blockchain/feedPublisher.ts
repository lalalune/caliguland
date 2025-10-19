/**
 * Feed Publisher for Caliguland
 * 
 * Publishes game feed events to GameFeedOracle contract
 * Enables Predimarket users to read game context while making predictions
 */

import { ethers, Wallet, Contract, JsonRpcProvider } from 'ethers';
import type { Post, MarketState } from '../types';

const GAME_FEED_ORACLE_ABI = [
    'function publishPost(bytes32 sessionId, bytes32 postId, address author, string content, uint8 gameDay, bool isSystemMessage) external',
    'function publishMarketUpdate(bytes32 sessionId, uint8 yesOdds, uint8 noOdds, uint256 totalVolume, uint8 gameDay) external',
    'function publishPhaseChange(bytes32 sessionId, string phase, uint8 day) external',
    'event FeedPostPublished(bytes32 indexed sessionId, bytes32 indexed postId, address indexed author, string content, uint8 gameDay, uint256 timestamp)',
    'event MarketUpdated(bytes32 indexed sessionId, uint8 yesOdds, uint8 noOdds, uint256 totalVolume, uint8 gameDay, uint256 timestamp)',
    'event GamePhaseChanged(bytes32 indexed sessionId, string phase, uint8 day, uint256 timestamp)'
];

export interface FeedPublisherConfig {
    rpcUrl: string;
    gameFeedOracleAddress: string;
    privateKey: string;
    enabled: boolean;
}

/**
 * FeedPublisher - Publishes Caliguland game events to blockchain
 */
export class FeedPublisher {
    private provider: JsonRpcProvider | null = null;
    private wallet: Wallet | null = null;
    private oracleContract: Contract | null = null;
    private config: FeedPublisherConfig;
    private enabled: boolean = false;

    constructor(config: FeedPublisherConfig) {
        this.config = config;
        this.enabled = config.enabled;

        if (!this.enabled) {
            console.log('[FeedPublisher] Disabled - game events will not be published to blockchain');
            return;
        }

        if (!config.gameFeedOracleAddress) {
            console.warn('[FeedPublisher] No oracle address - disabling feed publishing');
            this.enabled = false;
            return;
        }

        this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.wallet = new Wallet(config.privateKey, this.provider);
        this.oracleContract = new Contract(
            config.gameFeedOracleAddress,
            GAME_FEED_ORACLE_ABI,
            this.wallet
        );

        console.log('[FeedPublisher] ✅ Initialized');
        console.log(`[FeedPublisher]    Wallet: ${this.wallet.address}`);
        console.log(`[FeedPublisher]    Oracle: ${config.gameFeedOracleAddress}`);
    }

    /**
     * Publish a feed post to blockchain
     */
    async publishPost(sessionId: string, post: Post): Promise<boolean> {
        if (!this.enabled || !this.oracleContract) return false;

        const sessionIdBytes32 = ethers.id(sessionId);
        const postIdBytes32 = ethers.id(post.id);
        
        // Convert authorId to address (or hash if not address)
        let authorAddress: string;
        if (post.authorId.startsWith('0x') && post.authorId.length === 42) {
            authorAddress = post.authorId;
        } else {
            // Hash non-address IDs (like NPC IDs) to create pseudo-address
            authorAddress = ethers.getAddress('0x' + ethers.id(post.authorId).slice(26));
        }

        console.log(`[FeedPublisher] Publishing post: "${post.content.substring(0, 50)}..."`);

        const tx = await this.oracleContract.publishPost(
            sessionIdBytes32,
            postIdBytes32,
            authorAddress,
            post.content,
            post.gameDay,
            post.isSystemMessage || false
        );

        await tx.wait();
        console.log(`[FeedPublisher] ✅ Post published (Tx: ${tx.hash})`);

        return true;
    }

    /**
     * Publish market update to blockchain
     */
    async publishMarketUpdate(
        sessionId: string,
        market: MarketState,
        gameDay: number
    ): Promise<boolean> {
        if (!this.enabled || !this.oracleContract) return false;

        const sessionIdBytes32 = ethers.id(sessionId);

        // Only publish significant changes (>1% movement)
        console.log(`[FeedPublisher] Publishing market update: ${market.yesOdds}% YES / ${market.noOdds}% NO`);

        const tx = await this.oracleContract.publishMarketUpdate(
            sessionIdBytes32,
            market.yesOdds,
            market.noOdds,
            market.totalVolume,
            gameDay
        );

        await tx.wait();
        console.log(`[FeedPublisher] ✅ Market update published`);

        return true;
    }

    /**
     * Publish phase change to blockchain
     */
    async publishPhaseChange(
        sessionId: string,
        phase: string,
        day: number
    ): Promise<boolean> {
        if (!this.enabled || !this.oracleContract) return false;

        const sessionIdBytes32 = ethers.id(sessionId);

        console.log(`[FeedPublisher] Publishing phase change: ${phase} (Day ${day})`);

        const tx = await this.oracleContract.publishPhaseChange(
            sessionIdBytes32,
            phase,
            day
        );

        await tx.wait();
        console.log(`[FeedPublisher] ✅ Phase change published`);

        return true;
    }

    /**
     * Batch publish multiple posts (gas optimization)
     */
    async publishBatchPosts(sessionId: string, posts: Post[]): Promise<boolean> {
        if (!this.enabled || !this.oracleContract) return false;

        console.log(`[FeedPublisher] Publishing batch of ${posts.length} posts...`);

        // Publish in sequence (could optimize with multicall)
        for (const post of posts) {
            await this.publishPost(sessionId, post);
        }

        console.log(`[FeedPublisher] ✅ Batch published`);
        return true;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    getAddress(): string {
        return this.wallet?.address || '';
    }
}

