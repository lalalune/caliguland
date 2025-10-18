/**
 * Agent Strategy Engine
 * Implements intelligent betting strategies and alliance decision-making
 */

export interface InformationSignal {
  source: 'npc' | 'post' | 'dm' | 'clue';
  content: string;
  direction: 'yes' | 'no' | 'neutral';
  confidence: number; // 0-1
  timestamp: Date;
  sourceId?: string;
}

export interface MarketState {
  yesOdds: number;
  noOdds: number;
  totalVolume: number;
  yesShares: number;
  noShares: number;
}

export interface BettingDecision {
  shouldBet: boolean;
  outcome: 'YES' | 'NO';
  amount: number;
  confidence: number;
  reasoning: string;
}

export interface AllianceDecision {
  shouldFormAlliance: boolean;
  targetAgents: string[];
  reasoning: string;
}

/**
 * Agent Strategy Engine
 */
export class AgentStrategyEngine {
  private signals: InformationSignal[] = [];
  private trustScores: Map<string, number> = new Map(); // NPC/agent ID -> trust (0-1)
  private bankroll: number = 1000; // Starting bankroll
  private maxBetSize: number = 500;

  /**
   * Strategy 1: Conservative (low risk)
   */
  static STRATEGY_CONSERVATIVE = 'conservative';

  /**
   * Strategy 2: Aggressive (high risk)
   */
  static STRATEGY_AGGRESSIVE = 'aggressive';

  /**
   * Strategy 3: Balanced (medium risk)
   */
  static STRATEGY_BALANCED = 'balanced';

  private currentStrategy: string = AgentStrategyEngine.STRATEGY_BALANCED;

  constructor(initialBankroll: number = 1000) {
    this.bankroll = initialBankroll;
    this.maxBetSize = Math.floor(initialBankroll * 0.5);
  }

  /**
   * Set betting strategy
   */
  public setStrategy(strategy: string): void {
    this.currentStrategy = strategy;
  }

  /**
   * Add information signal
   */
  public addSignal(signal: InformationSignal): void {
    this.signals.push(signal);

    // Update trust scores based on signal source
    if (signal.sourceId) {
      const currentTrust = this.trustScores.get(signal.sourceId) || 0.5;

      // Increase trust for consistent signals
      const newTrust = Math.min(1, currentTrust + 0.05);
      this.trustScores.set(signal.sourceId, newTrust);
    }
  }

  /**
   * Analyze all information and calculate belief
   */
  public analyzeInformation(): { yesBelief: number; noBelief: number } {
    if (this.signals.length === 0) {
      return { yesBelief: 0.5, noBelief: 0.5 };
    }

    let yesWeight = 0;
    let noWeight = 0;
    let totalWeight = 0;

    for (const signal of this.signals) {
      // Get source trust
      const trust = signal.sourceId
        ? (this.trustScores.get(signal.sourceId) || 0.5)
        : 0.5;

      // Weight = confidence * trust * recency
      const age = Date.now() - signal.timestamp.getTime();
      const recencyFactor = Math.exp(-age / (24 * 60 * 60 * 1000)); // Decay over 24 hours
      const weight = signal.confidence * trust * recencyFactor;

      if (signal.direction === 'yes') {
        yesWeight += weight;
      } else if (signal.direction === 'no') {
        noWeight += weight;
      }

      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return { yesBelief: 0.5, noBelief: 0.5 };
    }

    return {
      yesBelief: yesWeight / totalWeight,
      noBelief: noWeight / totalWeight
    };
  }

  /**
   * Kelly Criterion: Calculate optimal bet size
   * f* = (bp - q) / b
   * where:
   *   f* = fraction of bankroll to bet
   *   b = odds received (decimal odds - 1)
   *   p = probability of winning
   *   q = probability of losing (1 - p)
   */
  public calculateKellyCriterion(
    winProbability: number,
    marketOdds: number // e.g., 0.6 for 60%
  ): number {
    // Convert market odds to decimal odds
    const decimalOdds = 1 / marketOdds;
    const b = decimalOdds - 1;

    const p = winProbability;
    const q = 1 - p;

    // Kelly fraction
    const kellyCriterion = (b * p - q) / b;

    // Apply fractional Kelly based on strategy
    let fractionOfKelly = 0.25; // Conservative: 1/4 Kelly

    if (this.currentStrategy === AgentStrategyEngine.STRATEGY_AGGRESSIVE) {
      fractionOfKelly = 0.5; // Aggressive: 1/2 Kelly
    } else if (this.currentStrategy === AgentStrategyEngine.STRATEGY_BALANCED) {
      fractionOfKelly = 0.33; // Balanced: 1/3 Kelly
    }

    // Apply fraction of Kelly
    const betFraction = Math.max(0, kellyCriterion * fractionOfKelly);

    // Calculate bet amount
    const betAmount = Math.floor(this.bankroll * betFraction);

    // Cap at max bet size
    return Math.min(betAmount, this.maxBetSize);
  }

  /**
   * Make betting decision
   */
  public makeBettingDecision(market: MarketState): BettingDecision {
    const belief = this.analyzeInformation();

    // Determine which outcome to bet on
    const yesEdge = belief.yesBelief - (market.yesOdds / 100);
    const noEdge = belief.noBelief - (market.noOdds / 100);

    // Only bet if we have edge
    const threshold = this.currentStrategy === AgentStrategyEngine.STRATEGY_AGGRESSIVE ? 0.05 : 0.10;

    if (yesEdge < threshold && noEdge < threshold) {
      return {
        shouldBet: false,
        outcome: 'YES',
        amount: 0,
        confidence: 0,
        reasoning: 'No edge detected'
      };
    }

    // Choose outcome with higher edge
    const outcome = yesEdge > noEdge ? 'YES' : 'NO';
    const winProbability = outcome === 'YES' ? belief.yesBelief : belief.noBelief;
    const marketOdds = outcome === 'YES' ? (market.yesOdds / 100) : (market.noOdds / 100);

    // Calculate bet size using Kelly Criterion
    const betAmount = this.calculateKellyCriterion(winProbability, marketOdds);

    if (betAmount === 0) {
      return {
        shouldBet: false,
        outcome,
        amount: 0,
        confidence: winProbability,
        reasoning: 'Kelly criterion suggests no bet'
      };
    }

    return {
      shouldBet: true,
      outcome,
      amount: betAmount,
      confidence: winProbability,
      reasoning: `Edge: ${(outcome === 'YES' ? yesEdge : noEdge).toFixed(2)}, Kelly size: ${betAmount}`
    };
  }

  /**
   * Decide whether to form alliances
   */
  public makeAllianceDecision(
    agents: Array<{ id: string; name: string; reputation?: number }>,
    ownBelief: { yesBelief: number; noBelief: number }
  ): AllianceDecision {
    // Strategy: Form alliances with agents likely to agree with our bet
    // This creates information sharing and mutual support

    const potentialAllies: string[] = [];

    // Conservative strategy: only ally with high reputation agents
    // Aggressive strategy: ally with anyone to gain information
    const reputationThreshold = this.currentStrategy === AgentStrategyEngine.STRATEGY_AGGRESSIVE ? 30 : 60;

    for (const agent of agents) {
      const reputation = agent.reputation || 50;

      if (reputation >= reputationThreshold) {
        potentialAllies.push(agent.id);
      }
    }

    // Limit alliance size
    const maxAllianceSize = this.currentStrategy === AgentStrategyEngine.STRATEGY_AGGRESSIVE ? 4 : 2;
    const targetAgents = potentialAllies.slice(0, maxAllianceSize);

    const shouldFormAlliance = targetAgents.length >= 1 && this.signals.length < 5;

    return {
      shouldFormAlliance,
      targetAgents,
      reasoning: shouldFormAlliance
        ? `Forming alliance to share information (need more signals)`
        : `Enough information or no suitable allies`
    };
  }

  /**
   * Analyze NPC trustworthiness based on past signals
   */
  public analyzeNPCTrustworthiness(npcId: string): number {
    return this.trustScores.get(npcId) || 0.5;
  }

  /**
   * Determine if we should betray our alliance
   */
  public shouldBetrayAlliance(
    allianceBelief: { yesBelief: number; noBelief: number },
    ownBelief: { yesBelief: number; noBelief: number }
  ): boolean {
    // Calculate difference in beliefs
    const beliefDifference = Math.abs(
      (allianceBelief.yesBelief - allianceBelief.noBelief) -
      (ownBelief.yesBelief - ownBelief.noBelief)
    );

    // Betray if our belief is very different AND we have high confidence
    const ourConfidence = Math.abs(ownBelief.yesBelief - ownBelief.noBelief);

    // Aggressive strategy: more likely to betray
    const betrayalThreshold = this.currentStrategy === AgentStrategyEngine.STRATEGY_AGGRESSIVE ? 0.15 : 0.30;

    return beliefDifference > betrayalThreshold && ourConfidence > 0.6;
  }

  /**
   * Update bankroll after bet result
   */
  public updateBankroll(result: 'win' | 'loss', amount: number): void {
    if (result === 'win') {
      this.bankroll += amount;
    } else {
      this.bankroll -= amount;
    }

    // Update max bet size
    this.maxBetSize = Math.floor(this.bankroll * 0.5);
  }

  /**
   * Get current bankroll
   */
  public getBankroll(): number {
    return this.bankroll;
  }

  /**
   * Reset for new game
   */
  public reset(initialBankroll: number = 1000): void {
    this.signals = [];
    this.trustScores.clear();
    this.bankroll = initialBankroll;
    this.maxBetSize = Math.floor(initialBankroll * 0.5);
  }
}
