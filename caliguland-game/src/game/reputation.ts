/**
 * Reputation Engine - ERC-8004 Social Integrity System
 * Manages post-game feedback and on-chain reputation scoring
 */

import { Agent, Outcome } from '../types';

export interface ReputationFeedback {
  fromAgentId: string;
  toAgentId: string;
  category: 'honesty' | 'deception' | 'cooperation' | 'hostility' | 'skill';
  rating: number; // 1-5 scale
  comment?: string;
  gameId: string;
  timestamp: Date;
  weight?: number; // Weight based on giver's reputation (calculated)
}

export interface ReputationScore {
  agentId: string;
  overallScore: number; // 0-100
  honestyScore: number;
  cooperationScore: number;
  skillScore: number;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  feedbackReceived: number;
  lastUpdated: Date;
}

export interface ReputationUpdate {
  agentId: string;
  previousScore: number;
  newScore: number;
  change: number;
  reason: string;
}

export interface OnChainReputationUpdate {
  agentAddress: string;
  reputationScore: number;
  honestyScore: number;
  cooperationScore: number;
  skillScore: number;
  gamesPlayed: number;
  wins: number;
}

/**
 * Reputation Engine calculates and manages social integrity scores
 */
export class ReputationEngine {
  private feedbackStore: Map<string, ReputationFeedback[]> = new Map();
  private scores: Map<string, ReputationScore> = new Map();
  private pendingUpdates: ReputationUpdate[] = [];
  private feedbackCooldowns: Map<string, Date> = new Map(); // Prevent spam
  private readonly COOLDOWN_MS = 30000; // 30 seconds between feedback submissions
  private readonly DECAY_FACTOR = 0.95; // 5% decay for feedback older than 30 days
  private readonly DECAY_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  /**
   * Initialize reputation scores for agents
   */
  public initializeAgent(agent: Agent): void {
    if (!this.scores.has(agent.id)) {
      this.scores.set(agent.id, {
        agentId: agent.id,
        overallScore: agent.reputation || 50, // Default to neutral
        honestyScore: 50,
        cooperationScore: 50,
        skillScore: 50,
        gamesPlayed: 0,
        wins: agent.wins || 0,
        winRate: 0,
        feedbackReceived: 0,
        lastUpdated: new Date()
      });
    }
  }

  /**
   * Collect feedback after a game with spam prevention
   */
  public submitFeedback(feedback: ReputationFeedback): boolean {
    // Validate feedback
    if (feedback.rating < 1 || feedback.rating > 5) {
      console.warn(`Invalid rating: ${feedback.rating} (must be 1-5)`);
      return false;
    }

    // Prevent self-rating
    if (feedback.fromAgentId === feedback.toAgentId) {
      console.warn('Cannot rate yourself');
      return false;
    }

    // Validate category
    const validCategories = ['honesty', 'deception', 'cooperation', 'hostility', 'skill'];
    if (!validCategories.includes(feedback.category)) {
      console.warn(`Invalid category: ${feedback.category}`);
      return false;
    }

    // Check cooldown to prevent spam (per from-to-game-category combination)
    const cooldownKey = `${feedback.fromAgentId}-${feedback.toAgentId}-${feedback.gameId}-${feedback.category}`;
    const lastFeedback = this.feedbackCooldowns.get(cooldownKey);
    if (lastFeedback) {
      const timeSince = Date.now() - lastFeedback.getTime();
      if (timeSince < this.COOLDOWN_MS) {
        console.warn(`Cooldown active: wait ${Math.ceil((this.COOLDOWN_MS - timeSince) / 1000)}s`);
        return false;
      }
    }

    // Prevent duplicate feedback for same game/category
    const key = `${feedback.gameId}-${feedback.toAgentId}`;
    const existing = this.feedbackStore.get(key) || [];
    const duplicate = existing.find(
      f => f.fromAgentId === feedback.fromAgentId && f.category === feedback.category
    );
    if (duplicate) {
      console.warn('Duplicate feedback for this game/category');
      return false;
    }

    // Calculate weight based on giver's reputation
    const giverScore = this.scores.get(feedback.fromAgentId);
    feedback.weight = giverScore ? this.calculateFeedbackWeight(giverScore.overallScore) : 1.0;

    // Store feedback
    existing.push(feedback);
    this.feedbackStore.set(key, existing);

    // Update cooldown
    this.feedbackCooldowns.set(cooldownKey, new Date());

    return true;
  }

  /**
   * Calculate weight for feedback based on giver's reputation
   * Higher reputation = more weight (0.5 to 1.5x)
   */
  private calculateFeedbackWeight(giverReputation: number): number {
    // Scale from 0-100 reputation to 0.5-1.5 weight
    // 0 rep = 0.5x, 50 rep = 1.0x, 100 rep = 1.5x
    return 0.5 + (giverReputation / 100) * 1.0;
  }

  /**
   * Calculate updated reputation scores after a game
   */
  public calculatePostGameReputation(
    gameId: string,
    agents: Agent[],
    winners: string[],
    correctBettors: string[], // Agents who bet correctly
    betrayers: string[] // Agents who betrayed alliances
  ): ReputationUpdate[] {
    const updates: ReputationUpdate[] = [];

    for (const agent of agents) {
      this.initializeAgent(agent);
      const currentScore = this.scores.get(agent.id)!;
      const previousScore = currentScore.overallScore;

      // Base game participation bonus
      let scoreChange = 1;

      // Win bonus
      if (winners.includes(agent.id)) {
        scoreChange += 5;
        currentScore.wins += 1;
      }

      // Correct prediction bonus (skill)
      if (correctBettors.includes(agent.id)) {
        scoreChange += 3;
        currentScore.skillScore = Math.min(100, currentScore.skillScore + 2);
      }

      // Betrayal penalty
      if (betrayers.includes(agent.id)) {
        scoreChange -= 10;
        currentScore.honestyScore = Math.max(0, currentScore.honestyScore - 5);
        currentScore.cooperationScore = Math.max(0, currentScore.cooperationScore - 5);
      }

      // Feedback-based adjustments
      const gameFeedback = this.getFeedbackForAgent(gameId, agent.id);
      if (gameFeedback.length > 0) {
        const avgHonesty = this.calculateAverageFeedback(gameFeedback, 'honesty');
        const avgCooperation = this.calculateAverageFeedback(gameFeedback, 'cooperation');
        const avgSkill = this.calculateAverageFeedback(gameFeedback, 'skill');

        // Update component scores
        if (avgHonesty > 0) {
          currentScore.honestyScore = this.blend(currentScore.honestyScore, avgHonesty * 20, 0.3);
        }
        if (avgCooperation > 0) {
          currentScore.cooperationScore = this.blend(currentScore.cooperationScore, avgCooperation * 20, 0.3);
        }
        if (avgSkill > 0) {
          currentScore.skillScore = this.blend(currentScore.skillScore, avgSkill * 20, 0.3);
        }

        // Feedback influences overall score
        const avgOverall = (avgHonesty + avgCooperation + avgSkill) / 3;
        scoreChange += (avgOverall - 3) * 2; // Center around 3 (neutral)

        currentScore.feedbackReceived += gameFeedback.length;
      }

      // Update overall score
      currentScore.overallScore = Math.max(0, Math.min(100, currentScore.overallScore + scoreChange));
      currentScore.gamesPlayed += 1;
      currentScore.winRate = currentScore.wins / currentScore.gamesPlayed;
      currentScore.lastUpdated = new Date();

      // Record update
      const update: ReputationUpdate = {
        agentId: agent.id,
        previousScore,
        newScore: currentScore.overallScore,
        change: currentScore.overallScore - previousScore,
        reason: this.generateUpdateReason(winners, correctBettors, betrayers, agent.id, gameFeedback.length)
      };

      updates.push(update);
      this.pendingUpdates.push(update);
    }

    return updates;
  }

  /**
   * Blend old and new values with a weight
   */
  private blend(oldValue: number, newValue: number, weight: number): number {
    return oldValue * (1 - weight) + newValue * weight;
  }

  /**
   * Calculate weighted average feedback rating for a category with time decay
   */
  private calculateAverageFeedback(
    feedback: ReputationFeedback[],
    category: string
  ): number {
    const categoryFeedback = feedback.filter(f => f.category === category);
    if (categoryFeedback.length === 0) return 0;

    const now = Date.now();
    let weightedSum = 0;
    let totalWeight = 0;

    for (const f of categoryFeedback) {
      // Apply time decay for old feedback
      const age = now - f.timestamp.getTime();
      const timeWeight = age > this.DECAY_THRESHOLD_MS ? this.DECAY_FACTOR : 1.0;

      // Combine time weight and giver reputation weight
      const feedbackWeight = (f.weight || 1.0) * timeWeight;

      weightedSum += f.rating * feedbackWeight;
      totalWeight += feedbackWeight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Get all feedback for an agent in a specific game
   */
  private getFeedbackForAgent(gameId: string, agentId: string): ReputationFeedback[] {
    const key = `${gameId}-${agentId}`;
    return this.feedbackStore.get(key) || [];
  }

  /**
   * Generate human-readable reason for reputation change
   */
  private generateUpdateReason(
    winners: string[],
    correctBettors: string[],
    betrayers: string[],
    agentId: string,
    feedbackCount: number
  ): string {
    const reasons: string[] = [];

    if (winners.includes(agentId)) {
      reasons.push('Won the game');
    }

    if (correctBettors.includes(agentId)) {
      reasons.push('Correct prediction');
    }

    if (betrayers.includes(agentId)) {
      reasons.push('Alliance betrayal');
    }

    if (feedbackCount > 0) {
      reasons.push(`${feedbackCount} peer reviews`);
    }

    if (reasons.length === 0) {
      return 'Game participation';
    }

    return reasons.join(', ');
  }

  /**
   * Get reputation score for an agent
   */
  public getScore(agentId: string): ReputationScore | null {
    return this.scores.get(agentId) || null;
  }

  /**
   * Get all reputation scores
   */
  public getAllScores(): ReputationScore[] {
    return Array.from(this.scores.values());
  }

  /**
   * Get leaderboard (top agents by reputation)
   */
  public getLeaderboard(limit: number = 10): ReputationScore[] {
    return Array.from(this.scores.values())
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);
  }

  /**
   * Get pending reputation updates (for blockchain submission)
   */
  public getPendingUpdates(): ReputationUpdate[] {
    return [...this.pendingUpdates];
  }

  /**
   * Clear pending updates after blockchain submission
   */
  public clearPendingUpdates(): void {
    this.pendingUpdates = [];
  }

  /**
   * Prepare reputation data for ERC-8004 on-chain submission
   */
  public prepareOnChainUpdate(agentId: string): OnChainReputationUpdate | null {
    const score = this.scores.get(agentId);
    if (!score) return null;

    return {
      agentAddress: agentId, // Should be Ethereum address
      reputationScore: Math.floor(score.overallScore),
      honestyScore: Math.floor(score.honestyScore),
      cooperationScore: Math.floor(score.cooperationScore),
      skillScore: Math.floor(score.skillScore),
      gamesPlayed: score.gamesPlayed,
      wins: score.wins
    };
  }

  /**
   * Batch prepare multiple agents for on-chain update
   */
  public prepareBatchOnChainUpdate(agentIds: string[]): OnChainReputationUpdate[] {
    return agentIds
      .map(id => this.prepareOnChainUpdate(id))
      .filter((update): update is OnChainReputationUpdate => update !== null);
  }

  /**
   * Prepare all pending updates for blockchain submission
   */
  public prepareAllPendingOnChainUpdates(): OnChainReputationUpdate[] {
    const agentIds = this.pendingUpdates.map(u => u.agentId);
    const uniqueIds = [...new Set(agentIds)];
    return this.prepareBatchOnChainUpdate(uniqueIds);
  }

  /**
   * Get feedback statistics for an agent
   */
  public getFeedbackStats(agentId: string): {
    totalFeedback: number;
    averageRating: number;
    categoryBreakdown: Record<string, { count: number; average: number }>;
    recentFeedback: ReputationFeedback[];
  } {
    const allFeedback: ReputationFeedback[] = [];

    // Gather all feedback for this agent
    for (const [key, feedbacks] of this.feedbackStore.entries()) {
      if (key.endsWith(`-${agentId}`)) {
        allFeedback.push(...feedbacks);
      }
    }

    const categoryBreakdown: Record<string, { count: number; average: number }> = {};
    const categories = ['honesty', 'deception', 'cooperation', 'hostility', 'skill'];

    for (const category of categories) {
      const categoryFeedback = allFeedback.filter(f => f.category === category);
      if (categoryFeedback.length > 0) {
        const average = this.calculateAverageFeedback(allFeedback, category);
        categoryBreakdown[category] = {
          count: categoryFeedback.length,
          average
        };
      }
    }

    const totalRating = allFeedback.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = allFeedback.length > 0 ? totalRating / allFeedback.length : 0;

    // Get 10 most recent feedback items
    const recentFeedback = allFeedback
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalFeedback: allFeedback.length,
      averageRating,
      categoryBreakdown,
      recentFeedback
    };
  }

  /**
   * Validate Ethereum address format
   */
  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Prepare ERC-8004 compatible feedback data for off-chain storage (IPFS)
   */
  public prepareOffChainFeedback(
    feedback: ReputationFeedback,
    agentAddress: string,
    clientAddress: string,
    chainId: number = 1,
    identityRegistry: string
  ): {
    agentRegistry: string;
    agentId: string;
    clientAddress: string;
    createdAt: string;
    score: number;
    category: string;
    comment?: string;
    gameId: string;
    weight: number;
  } {
    return {
      agentRegistry: `eip155:${chainId}:${identityRegistry}`,
      agentId: feedback.toAgentId,
      clientAddress: `eip155:${chainId}:${clientAddress}`,
      createdAt: feedback.timestamp.toISOString(),
      score: Math.round((feedback.rating / 5) * 100), // Convert 1-5 to 0-100
      category: feedback.category,
      comment: feedback.comment,
      gameId: feedback.gameId,
      weight: feedback.weight || 1.0
    };
  }

  /**
   * Calculate reputation changes summary for all agents
   */
  public getReputationChangesSummary(): {
    totalUpdates: number;
    positiveChanges: number;
    negativeChanges: number;
    averageChange: number;
    topGainers: Array<{ agentId: string; change: number }>;
    topLosers: Array<{ agentId: string; change: number }>;
  } {
    const updates = this.pendingUpdates;
    const positiveChanges = updates.filter(u => u.change > 0).length;
    const negativeChanges = updates.filter(u => u.change < 0).length;
    const totalChange = updates.reduce((sum, u) => sum + u.change, 0);
    const averageChange = updates.length > 0 ? totalChange / updates.length : 0;

    const topGainers = updates
      .filter(u => u.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, 5)
      .map(u => ({ agentId: u.agentId, change: u.change }));

    const topLosers = updates
      .filter(u => u.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, 5)
      .map(u => ({ agentId: u.agentId, change: u.change }));

    return {
      totalUpdates: updates.length,
      positiveChanges,
      negativeChanges,
      averageChange,
      topGainers,
      topLosers
    };
  }

  /**
   * Export reputation data for persistence
   */
  public exportData(): {
    scores: Map<string, ReputationScore>;
    feedback: Map<string, ReputationFeedback[]>;
  } {
    return {
      scores: new Map(this.scores),
      feedback: new Map(this.feedbackStore)
    };
  }

  /**
   * Import reputation data from persistence
   */
  public importData(data: {
    scores: Map<string, ReputationScore>;
    feedback: Map<string, ReputationFeedback[]>;
  }): void {
    this.scores = new Map(data.scores);
    this.feedbackStore = new Map(data.feedback);
  }

  /**
   * Reset reputation engine
   */
  public reset(): void {
    this.feedbackStore.clear();
    this.scores.clear();
    this.pendingUpdates = [];
  }
}
