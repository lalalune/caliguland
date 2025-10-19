/**
 * Betting Service
 * 
 * Connects to SEPARATE betting A2A server/contract
 * Handles bets independently from game-playing
 * 
 * KEY: Betting is a different A2A server with different skills!
 */

import { Service, type IAgentRuntime, logger } from '@elizaos/core';
import { A2AClientService } from './a2aClient.js';
import { GameDiscoveryService } from './gameDiscoveryService.js';

export interface BettingPosition {
  gameId: string;
  outcome: 'YES' | 'NO';
  amount: number;
  odds: number;
  timestamp: number;
}

export class PredictionService extends Service {
  static serviceType = 'prediction';
  capabilityDescription = 'Manages bets on prediction markets (separate from game-playing)';

  private bettingClient: A2AClientService | null = null;
  private positions: Map<string, BettingPosition> = new Map();

  async initialize(runtime: IAgentRuntime): Promise<void> {
    logger.info('[Prediction] Initializing betting service...');

    // Check if betting server is available
    const discovery = runtime.getService('game-discovery') as GameDiscoveryService;
    
    if (!discovery) {
      logger.warn('[Prediction] No discovery service - betting disabled');
      return;
    }

    const bettingServer = discovery.getBettingServer();
    
    if (!bettingServer) {
      logger.info('[Prediction] No betting server configured - betting disabled');
      logger.info('[Prediction] Set PREDICTION_SERVER_URL to enable predictions');
      return;
    }

    // Create separate A2A client for betting server
    this.bettingClient = new A2AClientService(runtime);
    await this.bettingClient.initialize(runtime, bettingServer.url);

    logger.info(`[Prediction] ✅ Connected to: ${bettingServer.name}`);
    logger.info(`[Prediction] ✅ Skills: ${this.bettingClient.getSkills().length}`);
  }

  /**
   * Place a bet (discovers the bet skill dynamically)
   */
  async placeBet(
    gameId: string,
    outcome: 'YES' | 'NO',
    amount: number
  ): Promise<{ success: boolean; message: string }> {
    if (!this.bettingClient) {
      throw new Error('Betting not available - no betting server configured');
    }

    // Dynamically find the betting skill
    const skills = this.bettingClient.getSkills();
    const betSkill = skills.find(
      s => s.id.includes('bet') || s.id.includes('place') || s.id.includes('wager')
    );

    if (!betSkill) {
      throw new Error('No betting skill found on betting server');
    }

    // Execute bet skill
    const result = await this.bettingClient.sendMessage(betSkill.id, {
      gameId,
      outcome,
      amount
    });

    // Extract odds from result
    let odds = 0;
    if (result && typeof result === 'object') {
      const r = result as Record<string, unknown>;
      if (r.data && typeof r.data === 'object') {
        const data = r.data as Record<string, unknown>;
        if (data.market && typeof data.market === 'object') {
          const market = data.market as Record<string, unknown>;
          odds = outcome === 'YES' ? (market.yesOdds as number || 0) : (market.noOdds as number || 0);
        }
      }
    }

    const position: BettingPosition = {
      gameId,
      outcome,
      amount,
      odds,
      timestamp: Date.now()
    };

    this.positions.set(gameId, position);

    logger.info(`[Prediction] ✅ Bet placed: ${amount} on ${outcome} for game ${gameId}`);
    
    return { success: true, message: 'Bet placed' };
  }

  /**
   * Get current positions
   */
  getPositions(): BettingPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get position for specific game
   */
  getPosition(gameId: string): BettingPosition | null {
    return this.positions.get(gameId) || null;
  }

  hasBettingEnabled(): boolean {
    return this.bettingClient !== null;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  static async start(runtime: IAgentRuntime): Promise<Service> {
    const service = new PredictionService(runtime);
    await service.initialize(runtime);
    return service;
  }

  async stop(): Promise<void> {
    logger.info('[Prediction] Shutting down');
    if (this.bettingClient) {
      await this.bettingClient.cleanup();
    }
  }
}

