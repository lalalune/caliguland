/**
 * ReputationEngine extension with Blockchain Integration
 * This file provides methods to sync reputation with on-chain ReputationRegistry
 */

import { ReputationEngine, ReputationScore, OnChainReputationUpdate } from './reputation';
import { BlockchainAdapter } from '../blockchain/adapter';

export class BlockchainReputationEngine extends ReputationEngine {
  private blockchainAdapter?: BlockchainAdapter;

  constructor(blockchainAdapter?: BlockchainAdapter) {
    super();
    this.blockchainAdapter = blockchainAdapter;

    if (this.blockchainAdapter?.isEnabled()) {
      console.log('🔗 Blockchain integration enabled for ReputationEngine');
    }
  }

  /**
   * Submit reputation update to blockchain
   * Note: This is a simplified version - full ERC-8004 requires proper feedbackAuth signing
   */
  async submitToBlockchain(agentId: string): Promise<boolean> {
    if (!this.blockchainAdapter?.isEnabled()) {
      console.warn('⚠️  Blockchain not enabled - skipping reputation submission');
      return false;
    }

    const score = this.getScore(agentId);
    if (!score) {
      console.error(`❌ No reputation score found for agent ${agentId}`);
      return false;
    }

    console.log(`🔗 Submitting reputation for agent ${agentId} to blockchain...`);
    console.log(`   Overall Score: ${score.overallScore}`);
    console.log(`   Honesty: ${score.honestyScore}`);
    console.log(`   Cooperation: ${score.cooperationScore}`);
    console.log(`   Skill: ${score.skillScore}`);

    // For testing purposes, we convert agentId (string) to a numeric ID
    // In production, this would use the actual ERC-8004 agent ID
    const numericAgentId = this.agentIdToNumeric(agentId);

    const result = await this.blockchainAdapter.submitReputation(
      numericAgentId,
      score.overallScore,
      'caliguland',
      'game'
    );

    if (result) {
      console.log(`✅ Reputation submitted! Tx: ${result}`);
      return true;
    } else {
      console.warn('⚠️  Reputation submission failed or not implemented');
      return false;
    }
  }

  /**
   * Fetch reputation from blockchain
   */
  async fetchFromBlockchain(agentId: string): Promise<ReputationScore | null> {
    if (!this.blockchainAdapter?.isEnabled()) {
      return null;
    }

    const numericAgentId = this.agentIdToNumeric(agentId);

    console.log(`🔗 Fetching reputation for agent ${agentId} from blockchain...`);

    const result = await this.blockchainAdapter.getReputationScore(numericAgentId);

    if (result) {
      console.log(`   Found ${result.count} reviews with average ${result.average}`);

      // Create or update local score based on blockchain data
      return {
        agentId,
        overallScore: result.average,
        honestyScore: result.average,
        cooperationScore: result.average,
        skillScore: result.average,
        gamesPlayed: 0, // Not available from basic registry
        wins: 0,
        winRate: 0,
        feedbackReceived: result.count,
        lastUpdated: new Date()
      };
    }

    return null;
  }

  /**
   * Batch submit pending reputation updates to blockchain
   */
  async submitPendingToBlockchain(): Promise<number> {
    if (!this.blockchainAdapter?.isEnabled()) {
      return 0;
    }

    const pendingUpdates = this.getPendingUpdates();
    console.log(`🔗 Submitting ${pendingUpdates.length} pending reputation updates...`);

    let successCount = 0;

    for (const update of pendingUpdates) {
      const success = await this.submitToBlockchain(update.agentId);
      if (success) {
        successCount++;
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (successCount > 0) {
      console.log(`✅ ${successCount}/${pendingUpdates.length} reputation updates submitted`);
      this.clearPendingUpdates();
    }

    return successCount;
  }

  /**
   * Sync all agent reputations with blockchain
   */
  async syncWithBlockchain(): Promise<void> {
    if (!this.blockchainAdapter?.isEnabled()) {
      return;
    }

    console.log('🔄 Syncing reputation scores with blockchain...');

    const allScores = this.getAllScores();

    for (const score of allScores) {
      const blockchainScore = await this.fetchFromBlockchain(score.agentId);

      if (blockchainScore) {
        // Merge blockchain data with local data
        // Blockchain is source of truth for overall score
        score.overallScore = blockchainScore.overallScore;
        score.feedbackReceived += blockchainScore.feedbackReceived;
        score.lastUpdated = new Date();
      }

      // Add small delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('✅ Reputation sync complete');
  }

  /**
   * Convert agent ID (string) to numeric ID for blockchain
   * In production, this would map to the actual ERC-8004 agent token ID
   */
  private agentIdToNumeric(agentId: string): number {
    // Simple hash-based conversion for testing
    // In production, maintain a proper mapping table
    let hash = 0;
    for (let i = 0; i < agentId.length; i++) {
      const char = agentId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 1000000;
  }

  /**
   * Check if blockchain mode is active
   */
  isBlockchainEnabled(): boolean {
    return this.blockchainAdapter?.isEnabled() || false;
  }
}
