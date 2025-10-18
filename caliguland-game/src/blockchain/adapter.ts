/**
 * Blockchain Adapter for Caliguland Game
 * Integrates with deployed contracts on localnet for E2E functionality
 */

import { ethers, Wallet, Contract, JsonRpcProvider } from 'ethers';
import { Outcome } from '../types';

// Contract ABIs
const JEJU_MARKET_ABI = [
  'function buy(bytes32 sessionId, bool outcome, uint256 elizaOSAmount, uint256 minShares) external returns (uint256 shares)',
  'function sell(bytes32 sessionId, bool outcome, uint256 numShares, uint256 minProceeds) external returns (uint256 proceeds)',
  'function resolveMarket(bytes32 sessionId) external',
  'function claimPayout(bytes32 sessionId) external returns (uint256 payout)',
  'function getYesPrice(bytes32 sessionId) external view returns (uint256)',
  'function getNoPrice(bytes32 sessionId) external view returns (uint256)',
  'function getPosition(bytes32 sessionId, address user) external view returns (uint256 yesShares, uint256 noShares, uint256 totalSpent, uint256 totalReceived, bool hasClaimed)',
  'event MarketCreated(bytes32 indexed sessionId, string question, uint256 liquidityB, uint256 timestamp)',
  'event SharesPurchased(bytes32 indexed sessionId, address indexed buyer, bool outcome, uint256 shares, uint256 cost, uint256 newPrice)',
  'event SharesSold(bytes32 indexed sessionId, address indexed seller, bool outcome, uint256 shares, uint256 proceeds, uint256 newPrice)',
  'event MarketResolved(bytes32 indexed sessionId, bool outcome, uint256 totalPayout, uint256 timestamp)',
  'event PayoutClaimed(bytes32 indexed sessionId, address indexed user, uint256 amount)'
];

const PREDICTION_ORACLE_ABI = [
  'function commitGame(bytes32 sessionId, string calldata question, bytes32 commitment) external',
  'function revealGame(bytes32 sessionId, bool outcome, bytes32 salt, bytes memory teeQuote, address[] calldata winners, uint256 totalPayout) external',
  'function getOutcome(bytes32 sessionId) external view returns (bool outcome, bool finalized)',
  'function getGame(bytes32 sessionId) external view returns (bytes32 sessionId, string memory question, bool outcome, bytes32 commitment, bytes32 salt, uint256 startTime, uint256 endTime, bytes memory teeQuote, address[] memory winners, uint256 totalPayout, bool finalized)',
  'event GameCommitted(bytes32 indexed sessionId, string question, bytes32 commitment, uint256 startTime)',
  'event GameRevealed(bytes32 indexed sessionId, bool outcome, uint256 endTime, bytes teeQuote, uint256 winnersCount)'
];

const REPUTATION_REGISTRY_ABI = [
  'function giveFeedback(uint256 agentId, uint8 score, bytes32 tag1, bytes32 tag2, string calldata fileuri, bytes32 calldata filehash, bytes memory feedbackAuth) external',
  'function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external',
  'function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string calldata responseUri, bytes32 calldata responseHash) external',
  'function getSummary(uint256 agentId, address[] calldata clientAddresses, bytes32 tag1, bytes32 tag2) external view returns (uint64 count, uint8 averageScore)',
  'function readFeedback(uint256 agentId, address clientAddress, uint64 index) external view returns (uint8 score, bytes32 tag1, bytes32 tag2, bool isRevoked)',
  'function readAllFeedback(uint256 agentId, address[] calldata clientAddresses, bytes32 tag1, bytes32 tag2, bool includeRevoked) external view returns (address[] memory clientAddresses, uint8[] memory scores, bytes32[] memory tag1s, bytes32[] memory tag2s, bool[] memory revokedStatuses)',
  'function getClients(uint256 agentId) external view returns (address[] memory)',
  'function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64)',
  'event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint8 score, bytes32 indexed tag1, bytes32 tag2, string fileuri, bytes32 filehash)',
  'event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex)',
  'event ResponseAppended(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, address indexed responder, string responseUri)'
];

const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

export interface BlockchainConfig {
  rpcUrl: string;
  chainId: number;
  privateKey: string;
  contracts: {
    jejuMarket: string;
    elizaToken: string;
    predictionOracle: string;
    reputationRegistry: string;
  };
}

export interface MarketState {
  yesPrice: number;
  noPrice: number;
  yesShares: bigint;
  noShares: bigint;
}

export interface Position {
  yesShares: bigint;
  noShares: bigint;
  totalSpent: bigint;
  totalReceived: bigint;
  hasClaimed: boolean;
}

/**
 * Blockchain Adapter - Connects Caliguland game to deployed contracts
 */
export class BlockchainAdapter {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private contracts: {
    jejuMarket?: Contract;
    elizaToken?: Contract;
    predictionOracle?: Contract;
    reputationRegistry?: Contract;
  };
  private config: BlockchainConfig;
  private enabled: boolean = false;

  constructor(config: BlockchainConfig) {
    this.config = config;
    this.contracts = {};

    try {
      // Log which RPC we're using
      console.log(`🔗 Connecting to blockchain at ${config.rpcUrl}`);
      this.provider = new JsonRpcProvider(config.rpcUrl);
      this.wallet = new Wallet(config.privateKey, this.provider);

      // Initialize contracts
      this.contracts.jejuMarket = new Contract(
        config.contracts.jejuMarket,
        JEJU_MARKET_ABI,
        this.wallet
      );

      this.contracts.elizaToken = new Contract(
        config.contracts.elizaToken,
        ERC20_ABI,
        this.wallet
      );

      this.contracts.predictionOracle = new Contract(
        config.contracts.predictionOracle,
        PREDICTION_ORACLE_ABI,
        this.wallet
      );

      this.contracts.reputationRegistry = new Contract(
        config.contracts.reputationRegistry,
        REPUTATION_REGISTRY_ABI,
        this.wallet
      );

      this.enabled = true;
      console.log('✅ Blockchain adapter initialized');
      console.log(`   Wallet: ${this.wallet.address}`);
      console.log(`   Chain ID: ${config.chainId}`);
    } catch (error) {
      console.error('❌ Failed to initialize blockchain adapter:', error);
      this.enabled = false;
    }
  }

  /**
   * Check if blockchain integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.wallet.address;
  }

  /**
   * Check connection to blockchain
   */
  async checkConnection(): Promise<boolean> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      console.log(`📡 Connected to blockchain (block #${blockNumber})`);
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to blockchain:', error);
      return false;
    }
  }

  /**
   * Commit game to oracle at start
   */
  async commitGame(
    sessionId: string,
    question: string,
    outcome: Outcome
  ): Promise<{ txHash: string; salt: string } | null> {
    if (!this.enabled || !this.contracts.predictionOracle) return null;

    try {
      // Generate salt
      const salt = ethers.hexlify(ethers.randomBytes(32));

      // Convert outcome to boolean (YES = true, NO = false)
      const outcomeBoolean = outcome === Outcome.YES;

      // Create commitment: keccak256(abi.encodePacked(outcome, salt))
      const commitment = ethers.keccak256(
        ethers.solidityPacked(['bool', 'bytes32'], [outcomeBoolean, salt])
      );

      // Convert sessionId to bytes32
      const sessionIdBytes32 = ethers.id(sessionId);

      console.log('📝 Committing game to oracle...');
      console.log('   Session ID:', sessionId);
      console.log('   Question:', question);
      console.log('   Outcome:', outcome);
      console.log('   Commitment:', commitment);

      const tx = await this.contracts.predictionOracle.commitGame(
        sessionIdBytes32,
        question,
        commitment
      );

      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();

      console.log('✅ Game committed! Tx:', receipt.hash);

      return {
        txHash: receipt.hash,
        salt // Store salt for later reveal
      };
    } catch (error) {
      console.error('❌ Failed to commit game:', error);
      return null;
    }
  }

  /**
   * Create market for a game session
   */
  async createMarket(
    sessionId: string,
    question: string,
    liquidityB: number
  ): Promise<string | null> {
    if (!this.enabled || !this.contracts.jejuMarket) return null;

    try {
      const sessionIdBytes32 = ethers.id(sessionId);

      console.log('🎰 Creating market...');
      console.log('   Session ID:', sessionId);
      console.log('   Question:', question);
      console.log('   Liquidity B:', liquidityB);

      // Note: JejuMarket doesn't have a createMarket function
      // Markets are created implicitly on first buy
      // We just log this for now
      console.log('ℹ️  Market will be created on first bet');

      return sessionIdBytes32;
    } catch (error) {
      console.error('❌ Failed to create market:', error);
      return null;
    }
  }

  /**
   * Place a bet on the market
   */
  async placeBet(
    sessionId: string,
    agentAddress: string,
    outcome: Outcome,
    amount: number
  ): Promise<{ shares: bigint; txHash: string } | null> {
    if (!this.enabled || !this.contracts.jejuMarket || !this.contracts.elizaToken) {
      return null;
    }

    try {
      const sessionIdBytes32 = ethers.id(sessionId);
      const outcomeBoolean = outcome === Outcome.YES;
      const amountWei = ethers.parseEther(amount.toString());

      console.log('💰 Placing bet...');
      console.log('   Session ID:', sessionId);
      console.log('   Agent:', agentAddress);
      console.log('   Outcome:', outcome);
      console.log('   Amount:', amount, 'ELIZA');

      // Check allowance
      const allowance = await this.contracts.elizaToken.allowance(
        this.wallet.address,
        this.config.contracts.jejuMarket
      );

      if (allowance < amountWei) {
        console.log('   Approving ELIZA token...');
        const approveTx = await this.contracts.elizaToken.approve(
          this.config.contracts.jejuMarket,
          ethers.MaxUint256
        );
        await approveTx.wait();
        console.log('   ✅ Token approved');
      }

      // Buy shares (minShares = 0 for simplicity)
      const tx = await this.contracts.jejuMarket.buy(
        sessionIdBytes32,
        outcomeBoolean,
        amountWei,
        0 // minShares
      );

      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();

      // Extract shares from event
      const event = receipt.logs
        .map((log: any) => {
          try {
            return this.contracts.jejuMarket!.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === 'SharesPurchased');

      const shares = event ? event.args.shares : 0n;

      console.log('✅ Bet placed! Shares:', ethers.formatEther(shares));

      return {
        shares,
        txHash: receipt.hash
      };
    } catch (error) {
      console.error('❌ Failed to place bet:', error);
      return null;
    }
  }

  /**
   * Get market state (current prices)
   */
  async getMarketState(sessionId: string): Promise<MarketState | null> {
    if (!this.enabled || !this.contracts.jejuMarket) return null;

    try {
      const sessionIdBytes32 = ethers.id(sessionId);

      const [yesPrice, noPrice] = await Promise.all([
        this.contracts.jejuMarket.getYesPrice(sessionIdBytes32),
        this.contracts.jejuMarket.getNoPrice(sessionIdBytes32)
      ]);

      return {
        yesPrice: Number(ethers.formatEther(yesPrice)),
        noPrice: Number(ethers.formatEther(noPrice)),
        yesShares: 0n, // Not available from contract
        noShares: 0n
      };
    } catch (error) {
      console.error('❌ Failed to get market state:', error);
      return null;
    }
  }

  /**
   * Get player position
   */
  async getPosition(sessionId: string, agentAddress: string): Promise<Position | null> {
    if (!this.enabled || !this.contracts.jejuMarket) return null;

    try {
      const sessionIdBytes32 = ethers.id(sessionId);

      const position = await this.contracts.jejuMarket.getPosition(
        sessionIdBytes32,
        agentAddress
      );

      return {
        yesShares: position.yesShares,
        noShares: position.noShares,
        totalSpent: position.totalSpent,
        totalReceived: position.totalReceived,
        hasClaimed: position.hasClaimed
      };
    } catch (error) {
      console.error('❌ Failed to get position:', error);
      return null;
    }
  }

  /**
   * Resolve market (called after game ends)
   */
  async resolveMarket(
    sessionId: string,
    outcome: Outcome,
    salt: string,
    teeQuote: string,
    winners: string[],
    totalPayout: number
  ): Promise<string | null> {
    if (!this.enabled || !this.contracts.predictionOracle || !this.contracts.jejuMarket) {
      return null;
    }

    try {
      const sessionIdBytes32 = ethers.id(sessionId);
      const outcomeBoolean = outcome === Outcome.YES;

      console.log('🎯 Revealing game outcome...');
      console.log('   Session ID:', sessionId);
      console.log('   Outcome:', outcome);
      console.log('   Winners:', winners.length);
      console.log('   Total Payout:', totalPayout);

      // Reveal to oracle first
      const revealTx = await this.contracts.predictionOracle.revealGame(
        sessionIdBytes32,
        outcomeBoolean,
        salt,
        ethers.toUtf8Bytes(teeQuote),
        winners,
        ethers.parseEther(totalPayout.toString())
      );

      console.log('⏳ Waiting for oracle reveal...');
      await revealTx.wait();
      console.log('✅ Oracle revealed');

      // Resolve market
      console.log('⏳ Resolving market...');
      const resolveTx = await this.contracts.jejuMarket.resolveMarket(sessionIdBytes32);
      const resolveReceipt = await resolveTx.wait();

      console.log('✅ Market resolved! Tx:', resolveReceipt.hash);

      return resolveReceipt.hash;
    } catch (error) {
      console.error('❌ Failed to resolve market:', error);
      return null;
    }
  }

  /**
   * Claim payout for winner
   */
  async claimPayout(sessionId: string, agentAddress: string): Promise<bigint | null> {
    if (!this.enabled || !this.contracts.jejuMarket) return null;

    try {
      const sessionIdBytes32 = ethers.id(sessionId);

      console.log('💸 Claiming payout...');
      console.log('   Session ID:', sessionId);
      console.log('   Agent:', agentAddress);

      const tx = await this.contracts.jejuMarket.claimPayout(sessionIdBytes32);
      const receipt = await tx.wait();

      // Extract payout from event
      const event = receipt.logs
        .map((log: any) => {
          try {
            return this.contracts.jejuMarket!.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === 'PayoutClaimed');

      const payout = event ? event.args.amount : 0n;

      console.log('✅ Payout claimed:', ethers.formatEther(payout), 'ELIZA');

      return payout;
    } catch (error) {
      console.error('❌ Failed to claim payout:', error);
      return null;
    }
  }

  /**
   * Submit reputation feedback (simplified version)
   */
  async submitReputation(
    agentId: number,
    score: number,
    tag1: string = '',
    tag2: string = ''
  ): Promise<string | null> {
    if (!this.enabled || !this.contracts.reputationRegistry) return null;

    try {
      console.log('📊 Submitting reputation...');
      console.log('   Agent ID:', agentId);
      console.log('   Score:', score);

      // Convert tags to bytes32
      const tag1Bytes = ethers.zeroPadValue(ethers.toUtf8Bytes(tag1), 32);
      const tag2Bytes = ethers.zeroPadValue(ethers.toUtf8Bytes(tag2), 32);

      // For now, we skip feedbackAuth - would need proper signing
      // This is a simplified version for testing
      console.log('ℹ️  Reputation submission requires proper feedbackAuth - skipping for now');

      return null;
    } catch (error) {
      console.error('❌ Failed to submit reputation:', error);
      return null;
    }
  }

  /**
   * Get reputation score
   */
  async getReputationScore(agentId: number): Promise<{ count: number; average: number } | null> {
    if (!this.enabled || !this.contracts.reputationRegistry) return null;

    try {
      const summary = await this.contracts.reputationRegistry.getSummary(
        agentId,
        [], // Empty array = all clients
        ethers.zeroPadValue('0x', 32), // Empty tag
        ethers.zeroPadValue('0x', 32)
      );

      return {
        count: Number(summary.count),
        average: Number(summary.averageScore)
      };
    } catch (error) {
      console.error('❌ Failed to get reputation:', error);
      return null;
    }
  }

  /**
   * Get ELIZA token balance
   */
  async getBalance(address?: string): Promise<bigint> {
    if (!this.enabled || !this.contracts.elizaToken) return 0n;

    try {
      const addr = address || this.wallet.address;
      const balance = await this.contracts.elizaToken.balanceOf(addr);
      return balance;
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      return 0n;
    }
  }

  /**
   * Transfer ELIZA tokens (for testing)
   */
  async transfer(to: string, amount: number): Promise<string | null> {
    if (!this.enabled || !this.contracts.elizaToken) return null;

    try {
      const amountWei = ethers.parseEther(amount.toString());
      const tx = await this.contracts.elizaToken.transfer(to, amountWei);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('❌ Failed to transfer:', error);
      return null;
    }
  }
}
