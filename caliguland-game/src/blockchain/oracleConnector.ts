/**
 * Oracle Blockchain Connector
 * Handles commitment and revelation of game outcomes to PredictionOracle.sol
 */

import { ethers, Wallet, Contract, JsonRpcProvider } from 'ethers';
import { dstackHelper } from '../utils/dstack';

const PREDICTION_ORACLE_ABI = [
    'function commitGame(bytes32 sessionId, string calldata question, bytes32 commitment) external',
    'function revealGame(bytes32 sessionId, bool outcome, bytes32 salt, bytes memory teeQuote, address[] calldata winners, uint256 totalPayout) external',
    'function getOutcome(bytes32 sessionId) external view returns (bool outcome, bool finalized)',
    'function getGame(bytes32 sessionId) external view returns (bytes32 sessionId, string memory question, bool outcome, bytes32 commitment, bytes32 salt, uint256 startTime, uint256 endTime, bytes memory teeQuote, address[] memory winners, uint256 totalPayout, bool finalized)',
    'event GameCommitted(bytes32 indexed sessionId, string question, bytes32 commitment, uint256 startTime)',
    'event GameRevealed(bytes32 indexed sessionId, bool outcome, uint256 endTime, bytes teeQuote, uint256 winnersCount)'
];

export interface OracleConfig {
    rpcUrl: string;
    oracleAddress: string;
    privateKey: string;
}

export interface CommitmentData {
    sessionId: string;
    question: string;
    outcome: boolean;
    salt: string;
}

export interface RevealData {
    sessionId: string;
    outcome: boolean;
    salt: string;
    teeQuote: string;
    winners: string[];
    totalPayout: number;
}

/**
 * Connector for PredictionOracle contract
 */
export class OracleConnector {
    private provider: JsonRpcProvider;
    private wallet: Wallet;
    private contract: Contract;
    private config: OracleConfig;

    constructor(config: OracleConfig) {
        this.config = config;
        this.provider = new JsonRpcProvider(config.rpcUrl);
        this.wallet = new Wallet(config.privateKey, this.provider);
        this.contract = new Contract(config.oracleAddress, PREDICTION_ORACLE_ABI, this.wallet);
    }

    /**
     * Commit a game outcome at start
     */
    async commitGame(sessionId: string, question: string, outcome: boolean): Promise<{ txHash: string; commitment: string }> {
        // Generate salt
        const salt = ethers.hexlify(ethers.randomBytes(32));

        // Create commitment
        const commitment = ethers.keccak256(
            ethers.solidityPacked(['bool', 'bytes32'], [outcome, salt])
        );

        // Convert sessionId to bytes32
        const sessionIdBytes32 = ethers.id(sessionId);

        console.log('📝 Committing game to oracle...');
        console.log('   Session ID:', sessionId);
        console.log('   Session ID (bytes32):', sessionIdBytes32);
        console.log('   Question:', question);
        console.log('   Commitment:', commitment);

        // Call contract
        const tx = await this.contract.commitGame(sessionIdBytes32, question, commitment);

        console.log('⏳ Waiting for confirmation...');
        const receipt = await tx.wait();

        console.log('✅ Game committed! Tx:', receipt.hash);

        // Store commitment data for later reveal
        return {
            txHash: receipt.hash,
            commitment: salt // Return salt for later use
        };
    }

    /**
     * Reveal game outcome with TEE attestation
     */
    async revealGame(data: RevealData): Promise<string> {
        // Convert sessionId to bytes32
        const sessionIdBytes32 = ethers.id(data.sessionId);

        // Validate all winner addresses
        for (const winnerId of data.winners) {
            if (!ethers.isAddress(winnerId)) {
                throw new Error(`Invalid winner address: ${winnerId}. Agent IDs must be Ethereum addresses.`);
            }
        }

        // Get TEE quote
        const attestationData = {
            sessionId: data.sessionId,
            outcome: data.outcome,
            timestamp: Date.now(),
            winners: data.winners,
            totalPayout: data.totalPayout
        };

        const quote = await dstackHelper.getQuote(JSON.stringify(attestationData));

        console.log('📜 Revealing game outcome...');
        console.log('   Session ID:', data.sessionId);
        console.log('   Outcome:', data.outcome ? 'YES' : 'NO');
        console.log('   Winners:', data.winners.length);
        console.log('   Winner Addresses:', data.winners);
        console.log('   Total Payout:', data.totalPayout);
        console.log('   TEE Quote:', quote.quote.substring(0, 64) + '...');

        // Winners are already Ethereum addresses - use directly
        const winnerAddresses = data.winners;

        // Call contract
        const tx = await this.contract.revealGame(
            sessionIdBytes32,
            data.outcome,
            data.salt,
            ethers.toUtf8Bytes(quote.quote),
            winnerAddresses,
            ethers.parseEther(String(data.totalPayout))
        );

        console.log('⏳ Waiting for confirmation...');
        const receipt = await tx.wait();

        console.log('✅ Game revealed! Tx:', receipt.hash);
        console.log('🎉 Oracle updated with TEE attestation');

        return receipt.hash;
    }

    /**
     * Get game outcome from oracle
     */
    async getOutcome(sessionId: string): Promise<{ outcome: boolean; finalized: boolean }> {
        const sessionIdBytes32 = ethers.id(sessionId);
        const [outcome, finalized] = await this.contract.getOutcome(sessionIdBytes32);
        return { outcome, finalized };
    }

    /**
     * Check if connector is operational
     * @throws If provider is not operational
     */
    async isOperational(): Promise<void> {
        await this.provider.getBlockNumber();
    }

    /**
     * Get wallet address
     */
    getAddress(): string {
        return this.wallet.address;
    }

    /**
     * Get oracle contract address
     */
    getOracleAddress(): string {
        return this.config.oracleAddress;
    }
}

