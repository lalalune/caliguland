/**
 * Auto-Play Service
 * 
 * Autonomous gameplay using DISCOVERED skills
 * NO hardcoded game knowledge - adapts to any A2A game!
 * 
 * Strategy:
 * 1. Periodically call "get-status" skill (or similar)
 * 2. Parse available actions from status response
 * 3. Use simple heuristics to decide next action
 * 4. Execute via discovered skills
 * 
 * For prediction game specifically:
 * - Monitor feed for sentiment
 * - Track insider tips
 * - Calculate confidence
 * - Place bets when confident
 */

import { Service, type IAgentRuntime, logger } from '@elizaos/core';
import { A2AClientService, type A2ASkill } from './a2aClient.js';
import { BettingService } from './bettingService.js';
import { AgentStrategyEngine, type InformationSignal } from './agentStrategy.js';

// Type definitions for game status and related data structures
interface FeedPost {
  content: string;
  authorId?: string;
  timestamp?: string | number;
  isSystemMessage?: boolean;
}

interface DirectMsg {
  content: string;
  from: string;
  timestamp?: string | number;
}

interface MarketInfo {
  yesOdds?: number;
  noOdds?: number;
  totalVolume?: number;
  yesShares?: number;
  noShares?: number;
}

interface PlayerAgent {
  id: string;
  name: string;
  reputation?: number;
}

interface GameStatus {
  gameId?: string;
  feed?: FeedPost[];
  recentFeed?: FeedPost[];
  dms?: DirectMsg[];
  messages?: DirectMsg[];
  market?: MarketInfo;
  players?: PlayerAgent[];
  agents?: PlayerAgent[];
}

export class AutoPlayService extends Service {
  static serviceType = 'autoplay';
  capabilityDescription = 'Autonomous gameplay using dynamically discovered skills with intelligent strategy';

  private a2aClient: A2AClientService | null = null;
  private bettingService: BettingService | null = null;
  private tickTimer: NodeJS.Timeout | null = null;
  private strategy: AgentStrategyEngine = new AgentStrategyEngine(1000);
  private hasBet: boolean = false;
  private allianceFormed: boolean = false;

  async initialize(runtime: IAgentRuntime): Promise<void> {
    const enabled = (runtime.getSetting('AGENT_AUTOPLAY') || '0').toString();
    
    if (enabled === '0' || enabled.toLowerCase() === 'false') {
      logger.info('[AutoPlay] Disabled (set AGENT_AUTOPLAY=1 to enable)');
      return;
    }

    // Wait for dependencies
    const maxRetries = 20;
    for (let i = 0; i < maxRetries; i++) {
      this.a2aClient = runtime.getService('a2a-client') as A2AClientService;
      this.bettingService = runtime.getService('betting') as BettingService;
      
      if (this.a2aClient) break;
      
      await new Promise(r => setTimeout(r, 250));
    }

    if (!this.a2aClient) {
      logger.warn('[AutoPlay] A2A client not available');
      return;
    }

    logger.info('[AutoPlay] ✅ Enabled - starting autonomous gameplay');
    this.startLoop();
  }

  private startLoop(): void {
    if (this.tickTimer) return;

    this.tickTimer = setInterval(async () => {
      try {
        await this.tick();
      } catch (err) {
        logger.warn(`[AutoPlay] Tick error: ${String(err)}`);
      }
    }, 5000); // Tick every 5 seconds
  }

  private async tick(): Promise<void> {
    if (!this.a2aClient) return;

    // Dynamically find the status skill
    const skills = this.a2aClient.getSkills();
    const statusSkill = skills.find(s => 
      s.id.includes('status') || s.id.includes('state') || s.name.toLowerCase().includes('status')
    );

    if (!statusSkill) {
      logger.debug('[AutoPlay] No status skill found - skipping tick');
      return;
    }

    // Get current status
    const status = await this.a2aClient.sendMessage(statusSkill.id, {});
    const statusData = this.extractData(status);

    if (!statusData) return;

    // Generic game logic based on available skills
    await this.decideNextAction(statusData, skills);
  }

  private async decideNextAction(status: GameStatus, skills: A2ASkill[]): Promise<void> {
    // For prediction games: analyze and bet
    if (this.isPredictionGame(skills)) {
      await this.handlePredictionGame(status, skills);
      return;
    }

    // For other games: use generic heuristics
    logger.debug('[AutoPlay] Generic game detected - using basic heuristics');
  }

  private isPredictionGame(skills: A2ASkill[]): boolean {
    return skills.some(s =>
      s.id.includes('bet') || s.id.includes('predict') || s.id.includes('market')
    );
  }

  private async handlePredictionGame(status: GameStatus, skills: A2ASkill[]): Promise<void> {
    // Extract information signals from feed
    if (status.feed || status.recentFeed) {
      const feed = status.feed || status.recentFeed;
      for (const post of feed.slice(-10)) {
        const signal = this.extractSignalFromPost(post);
        if (signal) {
          this.strategy.addSignal(signal);
        }
      }
    }

    // Extract signals from DMs (insider tips)
    if (status.dms || status.messages) {
      const dms = status.dms || status.messages;
      for (const dm of dms) {
        const signal = this.extractSignalFromDM(dm);
        if (signal) {
          this.strategy.addSignal(signal);
        }
      }
    }

    // Form alliances if we don't have enough information
    if (!this.allianceFormed && this.strategy['signals'].length < 5) {
      await this.attemptAllianceFormation(status, skills);
    }

    // Make betting decision using Kelly criterion
    if (!this.hasBet && status.market) {
      const decision = this.strategy.makeBettingDecision({
        yesOdds: status.market.yesOdds || 50,
        noOdds: status.market.noOdds || 50,
        totalVolume: status.market.totalVolume || 0,
        yesShares: status.market.yesShares || 0,
        noShares: status.market.noShares || 0
      });

      if (decision.shouldBet) {
        logger.info(`[AutoPlay] 📊 Betting decision: ${decision.outcome} for ${decision.amount} (confidence: ${(decision.confidence * 100).toFixed(1)}%)`);
        logger.info(`[AutoPlay] 📊 Reasoning: ${decision.reasoning}`);

        // Try to bet via betting service first
        if (this.bettingService && this.bettingService.hasBettingEnabled()) {
          const result = await this.bettingService.placeBet(
            status.gameId || 'current',
            decision.outcome as any,
            decision.amount
          );

          if (result.success) {
            this.hasBet = true;
            logger.info(`[AutoPlay] ✅ Bet placed via BettingService: ${decision.outcome} for ${decision.amount}`);
          }
        } else {
          // Fallback: try to find bet skill in game server
          const betSkill = skills.find(s => s.id.includes('bet') || s.id.includes('place'));

          if (betSkill && this.a2aClient) {
            await this.a2aClient.sendMessage(betSkill.id, { outcome: decision.outcome, amount: decision.amount });
            this.hasBet = true;
            logger.info(`[AutoPlay] ✅ Bet placed via game server: ${decision.outcome} for ${decision.amount}`);
          }
        }
      }
    }

    // Post to feed occasionally with analysis
    if (Math.random() < 0.1) {
      await this.postAnalysis(skills);
    }
  }

  private extractSignalFromPost(post: FeedPost): InformationSignal | null {
    const content = (post.content || '').toLowerCase();
    const isSystemMessage = post.isSystemMessage || false;

    // Skip system messages
    if (isSystemMessage) return null;

    // Determine direction and confidence
    let direction: 'yes' | 'no' | 'neutral' = 'neutral';
    let confidence = 0.3; // Base confidence for posts

    if (content.match(/succeed|success|yes|confident|ready|good|bullish/)) {
      direction = 'yes';
      confidence = 0.4;
    } else if (content.match(/fail|no|doom|problem|bad|bearish|cancel/)) {
      direction = 'no';
      confidence = 0.4;
    }

    // Higher confidence for posts from known sources
    if (post.authorId) {
      confidence += 0.1;
    }

    return {
      source: 'post',
      content: post.content,
      direction,
      confidence,
      timestamp: new Date(post.timestamp || Date.now()),
      sourceId: post.authorId
    };
  }

  private extractSignalFromDM(dm: DirectMsg): InformationSignal | null {
    const content = (dm.content || '').toLowerCase();

    // DMs are usually insider tips - high confidence
    let direction: 'yes' | 'no' | 'neutral' = 'neutral';
    let confidence = 0.7; // High confidence for DMs

    if (content.match(/succeed|success|track|ready|good|positive|insider.*yes/)) {
      direction = 'yes';
    } else if (content.match(/fail|doom|problem|collapse|negative|insider.*no/)) {
      direction = 'no';
    }

    // Check for explicit insider tips
    if (content.includes('insider') || content.includes('tip') || content.includes('between us')) {
      confidence = 0.9;
    }

    return {
      source: 'dm',
      content: dm.content,
      direction,
      confidence,
      timestamp: new Date(dm.timestamp || Date.now()),
      sourceId: dm.from
    };
  }

  private async attemptAllianceFormation(status: GameStatus, skills: A2ASkill[]): Promise<void> {
    const agents = status.players || status.agents || [];
    if (agents.length === 0) return;

    const belief = this.strategy.analyzeInformation();
    const allianceDecision = this.strategy.makeAllianceDecision(agents, belief);

    if (allianceDecision.shouldFormAlliance && allianceDecision.targetAgents.length > 0) {
      const createGroupSkill = skills.find(s => s.id.includes('create-group') || s.id.includes('alliance'));

      if (createGroupSkill && this.a2aClient) {
        try {
          await this.a2aClient.sendMessage(createGroupSkill.id, {
            name: 'Strategy Alliance',
            members: allianceDecision.targetAgents
          });
          this.allianceFormed = true;
          logger.info(`[AutoPlay] 🤝 Alliance formed with ${allianceDecision.targetAgents.length} agents`);
          logger.info(`[AutoPlay] 📝 Reasoning: ${allianceDecision.reasoning}`);
        } catch (err) {
          logger.warn(`[AutoPlay] Failed to form alliance: ${err}`);
        }
      }
    }
  }

  private async postAnalysis(skills: A2ASkill[]): Promise<void> {
    const postSkill = skills.find(s => s.id.includes('post') || s.id.includes('feed'));

    if (!postSkill || !this.a2aClient) return;

    const belief = this.strategy.analyzeInformation();
    const confidence = Math.abs(belief.yesBelief - belief.noBelief);

    const thoughts = [
      `Analyzing market signals... ${Math.round(confidence * 100)}% confidence`,
      `Information gathering phase - ${this.strategy['signals'].length} data points collected`,
      `Market analysis in progress`,
      belief.yesBelief > 0.6 ? 'Indicators looking positive' : 'Seeing some concerning signals',
      `Monitoring developments closely`
    ];

    const thought = thoughts[Math.floor(Math.random() * thoughts.length)];
    await this.a2aClient.sendMessage(postSkill.id, { content: thought });
  }

  private analyzeSentiment(feed: FeedPost[]): { prediction: 'yes' | 'no'; strength: number } {
    if (!Array.isArray(feed)) return { prediction: 'yes', strength: 0 };

    let positive = 0;
    let negative = 0;

    for (const post of feed.slice(-10)) {
      const content = (post.content || '').toLowerCase();
      
      if (content.match(/succeed|success|yes|confident|ready|good/)) positive++;
      if (content.match(/fail|no|doom|problem|bad|cancel/)) negative++;
    }

    const total = positive + negative;
    if (total === 0) return { prediction: 'yes', strength: 0 };

    return {
      prediction: positive > negative ? 'yes' : 'no',
      strength: Math.abs(positive - negative) * 5
    };
  }

  private extractData(result: unknown): GameStatus | null {
    if (!result || typeof result !== 'object') return null;

    const r = result as Record<string, unknown>;

    // Try to extract data part from A2A message format
    if (Array.isArray(r.parts)) {
      const dataPart = r.parts.find((p: unknown) => {
        return p && typeof p === 'object' && 'kind' in p && (p as Record<string, unknown>).kind === 'data';
      });
      if (dataPart && typeof dataPart === 'object' && 'data' in dataPart) {
        return (dataPart as Record<string, unknown>).data as GameStatus;
      }
      return null;
    }

    // Try to extract from task format
    if (r.kind === 'task' && r.status && typeof r.status === 'object') {
      const status = r.status as Record<string, unknown>;
      if (status.message && typeof status.message === 'object') {
        const message = status.message as Record<string, unknown>;
        if (Array.isArray(message.parts)) {
          const dataPart = message.parts.find((p: unknown) => {
            return p && typeof p === 'object' && 'kind' in p && (p as Record<string, unknown>).kind === 'data';
          });
          if (dataPart && typeof dataPart === 'object' && 'data' in dataPart) {
            return (dataPart as Record<string, unknown>).data as GameStatus;
          }
        }
      }
    }

    // Assume it's already a GameStatus object
    return r as GameStatus;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  static async start(runtime: IAgentRuntime): Promise<Service> {
    const service = new AutoPlayService(runtime);
    await service.initialize(runtime);
    return service;
  }

  async stop(): Promise<void> {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    logger.info('[AutoPlay] Stopped');
  }
}

