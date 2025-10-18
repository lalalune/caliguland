/**
 * GameEngine extension with Blockchain Integration
 * This file provides a wrapper around GameEngine that adds blockchain functionality
 */

import { GameEngine, GameEngineConfig } from './engine';
import { BlockchainAdapter } from '../blockchain/adapter';
import { Outcome } from '../types';
import { dstackHelper } from '../utils/dstack';

export interface BlockchainGameEngineConfig extends GameEngineConfig {
  blockchain: BlockchainAdapter;
}

export class BlockchainGameEngine extends GameEngine {
  private blockchainAdapter: BlockchainAdapter;
  private blockchainSalt?: string;

  constructor(config: BlockchainGameEngineConfig) {
    super(config);
    this.blockchainAdapter = config.blockchain;

    if (this.blockchainAdapter.isEnabled()) {
      console.log('🔗 Blockchain integration enabled for GameEngine');
      console.log(`   Game server wallet: ${this.blockchainAdapter.getAddress()}`);
    }
  }

  /**
   * Override startNewGame to include blockchain commitment
   */
  async startNewGameWithBlockchain(): Promise<void> {
    const game = this.getCurrentGame();

    if (!game) {
      throw new Error('No game session available');
    }

    // Commit game to blockchain oracle
    if (this.blockchainAdapter.isEnabled()) {
      console.log('🔗 Committing game to blockchain...');

      const commitResult = await this.blockchainAdapter.commitGame(
        game.id,
        game.scenario.question,
        game.scenario.secretOutcome
      );

      if (commitResult) {
        this.blockchainSalt = commitResult.salt;
        console.log('✅ Game committed to blockchain');
        console.log(`   Tx: ${commitResult.txHash}`);
      } else {
        console.warn('⚠️  Failed to commit game to blockchain - continuing in-memory mode');
      }

      // Create market on blockchain (happens on first bet)
      await this.blockchainAdapter.createMarket(
        game.id,
        game.scenario.question,
        100 // liquidity parameter
      );
    }
  }

  /**
   * Override placeBet to include blockchain transaction
   */
  async placeBetWithBlockchain(
    agentId: string,
    outcome: Outcome.YES | Outcome.NO,
    amount: number
  ): Promise<boolean> {
    // First, place bet in-memory (for game logic)
    const inMemorySuccess = this.placeBet(agentId, outcome, amount);

    if (!inMemorySuccess) {
      return false;
    }

    // Then, place bet on blockchain if enabled
    if (this.blockchainAdapter.isEnabled()) {
      console.log(`🔗 Placing bet on blockchain for ${agentId}...`);

      const game = this.getCurrentGame();
      if (!game) {
        console.error('No active game');
        return false;
      }

      const result = await this.blockchainAdapter.placeBet(
        game.id,
        agentId,
        outcome,
        amount
      );

      if (result) {
        console.log(`✅ Blockchain bet placed: ${result.shares} shares`);
        console.log(`   Tx: ${result.txHash}`);
      } else {
        console.warn('⚠️  Blockchain bet failed - continuing with in-memory only');
      }
    }

    return true;
  }

  /**
   * Override revealOutcome to include blockchain resolution
   */
  async revealOutcomeWithBlockchain(): Promise<void> {
    const game = this.getCurrentGame();

    if (!game) {
      throw new Error('No active game');
    }

    // First, calculate results in-memory
    const result = this.calculateResults();

    // Then, resolve on blockchain if enabled
    if (this.blockchainAdapter.isEnabled() && this.blockchainSalt) {
      console.log('🔗 Resolving game on blockchain...');

      // Get TEE quote
      const attestationData = {
        sessionId: game.id,
        outcome: game.scenario.secretOutcome,
        timestamp: Date.now(),
        winners: result.winners,
        totalPayout: Object.values(result.payouts).reduce((sum: number, p: number) => sum + p, 0)
      };

      const quote = await dstackHelper.getQuote(JSON.stringify(attestationData));

      const txHash = await this.blockchainAdapter.resolveMarket(
        game.id,
        game.scenario.secretOutcome,
        this.blockchainSalt,
        quote.quote,
        result.winners,
        Object.values(result.payouts).reduce((sum: number, p: number) => sum + p, 0)
      );

      if (txHash) {
        console.log('✅ Game resolved on blockchain');
        console.log(`   Tx: ${txHash}`);
      } else {
        console.warn('⚠️  Blockchain resolution failed');
      }
    }

    // Continue with regular reveal
    // (We don't call super.revealOutcome() directly, but the regular flow handles it)
  }

  /**
   * Get blockchain market state
   */
  async getBlockchainMarketState() {
    const game = this.getCurrentGame();
    if (!game || !this.blockchainAdapter.isEnabled()) {
      return null;
    }

    return await this.blockchainAdapter.getMarketState(game.id);
  }

  /**
   * Get player's blockchain position
   */
  async getBlockchainPosition(agentId: string) {
    const game = this.getCurrentGame();
    if (!game || !this.blockchainAdapter.isEnabled()) {
      return null;
    }

    return await this.blockchainAdapter.getPosition(game.id, agentId);
  }

  /**
   * Sync blockchain state with in-memory state
   */
  async syncWithBlockchain(): Promise<void> {
    const game = this.getCurrentGame();
    if (!game || !this.blockchainAdapter.isEnabled()) {
      return;
    }

    console.log('🔄 Syncing game state with blockchain...');

    // Get on-chain market state
    const marketState = await this.blockchainAdapter.getMarketState(game.id);

    if (marketState) {
      // Update in-memory market odds based on blockchain
      game.market.yesOdds = Math.round(marketState.yesPrice * 100);
      game.market.noOdds = Math.round(marketState.noPrice * 100);

      console.log(`   Yes odds: ${game.market.yesOdds}%`);
      console.log(`   No odds: ${game.market.noOdds}%`);
    }

    console.log('✅ Sync complete');
  }

  /**
   * Check if blockchain mode is active
   */
  isBlockchainEnabled(): boolean {
    return this.blockchainAdapter.isEnabled();
  }

  /**
   * Get blockchain adapter (for advanced usage)
   */
  getBlockchainAdapter(): BlockchainAdapter {
    return this.blockchainAdapter;
  }
}
