/**
 * Information Asymmetry Engine
 * Manages multi-stage clue distribution across game days
 */

import { GameScenario, Outcome, InsiderClue } from '../types';

export interface Clue {
  id: string;
  content: string;
  npcId: string;
  isTruthful: boolean;
  revealDay: number; // Which game day this clue unlocks
  tier: 'early' | 'mid' | 'late'; // Clue importance tier
  prerequisiteClues?: string[]; // Must receive these clues first
  value: number; // Information value score (1-10)
}

export interface ClueNetwork {
  clues: Clue[];
  relationships: Map<string, string[]>; // clueId -> dependent clueIds
}

export interface InformationDistributionPlan {
  agentId: string;
  clues: Clue[];
  expectedValue: number; // Total information advantage
}

/**
 * Information Engine creates and distributes clues across the game timeline
 */
export class InformationEngine {
  private clueNetwork: ClueNetwork | null = null;
  private distributionPlans: Map<string, InformationDistributionPlan> = new Map();

  /**
   * Generate a multi-stage clue network for a scenario
   */
  public generateClueNetwork(scenario: GameScenario, numPlayers: number): ClueNetwork {
    const clues: Clue[] = [];
    const relationships = new Map<string, string[]>();

    // Create foundational clues (early game)
    const earlyClues = this.generateEarlyClues(scenario);
    clues.push(...earlyClues);

    // Create mid-game clues that build on early ones
    const midClues = this.generateMidClues(scenario, earlyClues);
    clues.push(...midClues);

    // Create late-game clues that reveal more
    const lateClues = this.generateLateClues(scenario, midClues);
    clues.push(...lateClues);

    // Build dependency relationships
    for (const clue of clues) {
      if (clue.prerequisiteClues) {
        for (const prereqId of clue.prerequisiteClues) {
          const dependents = relationships.get(prereqId) || [];
          dependents.push(clue.id);
          relationships.set(prereqId, dependents);
        }
      }
    }

    this.clueNetwork = { clues, relationships };
    return this.clueNetwork;
  }

  /**
   * Create distribution plan for each agent
   * This determines which clues each agent will receive and when
   */
  public createDistributionPlans(
    network: ClueNetwork,
    agentIds: string[],
    insiderPercentage: number = 0.3
  ): Map<string, InformationDistributionPlan> {
    this.distributionPlans.clear();

    // Determine how many agents get insider info
    const numInsiders = Math.max(1, Math.floor(agentIds.length * insiderPercentage));
    const shuffledAgents = [...agentIds].sort(() => Math.random() - 0.5);
    const insiders = shuffledAgents.slice(0, numInsiders);
    const outsiders = shuffledAgents.slice(numInsiders);

    // Insiders get high-value clues
    for (const agentId of insiders) {
      const clues = this.selectCluesForInsider(network);
      const expectedValue = clues.reduce((sum, c) => sum + c.value, 0);

      this.distributionPlans.set(agentId, {
        agentId,
        clues,
        expectedValue
      });
    }

    // Outsiders get fewer, lower-value clues (or potentially false ones)
    for (const agentId of outsiders) {
      const clues = this.selectCluesForOutsider(network);
      const expectedValue = clues.reduce((sum, c) => sum + c.value, 0);

      this.distributionPlans.set(agentId, {
        agentId,
        clues,
        expectedValue
      });
    }

    return this.distributionPlans;
  }

  /**
   * Get clues that should be revealed on a specific game day
   */
  public getCluesForDay(agentId: string, day: number): Clue[] {
    const plan = this.distributionPlans.get(agentId);
    if (!plan) return [];

    return plan.clues.filter(clue => {
      // Check if this clue unlocks today
      if (clue.revealDay !== day) return false;

      // Check if prerequisites are met (agent has received prerequisite clues)
      if (clue.prerequisiteClues) {
        const receivedClues = plan.clues
          .filter(c => c.revealDay < day)
          .map(c => c.id);

        const hasAllPrereqs = clue.prerequisiteClues.every(prereqId =>
          receivedClues.includes(prereqId)
        );

        return hasAllPrereqs;
      }

      return true;
    });
  }

  /**
   * Generate early-game clues (Days 1-10)
   */
  private generateEarlyClues(scenario: GameScenario): Clue[] {
    const clues: Clue[] = [];
    const truthfulNPCs = scenario.npcs.filter(npc => npc.tendsToBeTruthful);
    const liars = scenario.npcs.filter(npc => !npc.tendsToBeTruthful);

    const trueOutcome = scenario.secretOutcome;
    const falseOutcome = trueOutcome === Outcome.YES ? Outcome.NO : Outcome.YES;

    // Generate 3-5 early clues
    const numEarlyClues = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numEarlyClues; i++) {
      const isTruthful = Math.random() > 0.3; // 70% truthful early on
      const npc = isTruthful
        ? truthfulNPCs[Math.floor(Math.random() * truthfulNPCs.length)]
        : liars[Math.floor(Math.random() * liars.length)];

      const outcome = isTruthful ? trueOutcome : falseOutcome;
      const content = this.generateClueContent(outcome, 'early', npc.role);

      clues.push({
        id: `early-${i}`,
        content,
        npcId: npc.id,
        isTruthful,
        revealDay: 1 + Math.floor(Math.random() * 10), // Days 1-10
        tier: 'early',
        value: isTruthful ? 3 : -2 // Truthful clues are valuable, lies are negative
      });
    }

    return clues;
  }

  /**
   * Generate mid-game clues (Days 11-20)
   */
  private generateMidClues(scenario: GameScenario, earlyClues: Clue[]): Clue[] {
    const clues: Clue[] = [];
    const truthfulNPCs = scenario.npcs.filter(npc => npc.tendsToBeTruthful);
    const liars = scenario.npcs.filter(npc => !npc.tendsToBeTruthful);

    const trueOutcome = scenario.secretOutcome;
    const falseOutcome = trueOutcome === Outcome.YES ? Outcome.NO : Outcome.YES;

    const numMidClues = 4 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numMidClues; i++) {
      const isTruthful = Math.random() > 0.4; // 60% truthful mid-game
      const npc = isTruthful
        ? truthfulNPCs[Math.floor(Math.random() * truthfulNPCs.length)]
        : liars[Math.floor(Math.random() * liars.length)];

      const outcome = isTruthful ? trueOutcome : falseOutcome;
      const content = this.generateClueContent(outcome, 'mid', npc.role);

      // Some mid clues depend on early clues
      const prerequisiteClues = Math.random() > 0.5 && earlyClues.length > 0
        ? [earlyClues[Math.floor(Math.random() * earlyClues.length)].id]
        : undefined;

      clues.push({
        id: `mid-${i}`,
        content,
        npcId: npc.id,
        isTruthful,
        revealDay: 11 + Math.floor(Math.random() * 10), // Days 11-20
        tier: 'mid',
        prerequisiteClues,
        value: isTruthful ? 5 : -3
      });
    }

    return clues;
  }

  /**
   * Generate late-game clues (Days 21-28)
   */
  private generateLateClues(scenario: GameScenario, midClues: Clue[]): Clue[] {
    const clues: Clue[] = [];
    const truthfulNPCs = scenario.npcs.filter(npc => npc.tendsToBeTruthful);

    const trueOutcome = scenario.secretOutcome;
    const falseOutcome = trueOutcome === Outcome.YES ? Outcome.NO : Outcome.YES;

    const numLateClues = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < numLateClues; i++) {
      const isTruthful = Math.random() > 0.2; // 80% truthful late game
      const npc = truthfulNPCs[Math.floor(Math.random() * truthfulNPCs.length)];

      const outcome = isTruthful ? trueOutcome : falseOutcome;
      const content = this.generateClueContent(outcome, 'late', npc.role);

      // Late clues often depend on mid clues
      const prerequisiteClues = midClues.length > 0
        ? [midClues[Math.floor(Math.random() * midClues.length)].id]
        : undefined;

      clues.push({
        id: `late-${i}`,
        content,
        npcId: npc.id,
        isTruthful,
        revealDay: 21 + Math.floor(Math.random() * 8), // Days 21-28
        tier: 'late',
        prerequisiteClues,
        value: isTruthful ? 8 : -4
      });
    }

    return clues;
  }

  /**
   * Generate clue content based on outcome and stage
   */
  private generateClueContent(outcome: Outcome, tier: string, role: string): string {
    const willSucceed = outcome === Outcome.YES;

    const templates: Record<string, string[]> = {
      'early-insider': willSucceed
        ? ["I've seen the internal docs. We're on track.", "Quietly confident about this one."]
        : ["Between us, there are serious problems.", "I wouldn't bet on this if I were you."],
      'early-analyst': willSucceed
        ? ["Early indicators look positive.", "Fundamentals are solid."]
        : ["The numbers don't add up.", "Red flags in the data."],
      'mid-insider': willSucceed
        ? ["Just got confirmation. It's happening.", "Everything's falling into place."]
        : ["Latest intel: it's falling apart.", "They're covering up the problems."],
      'mid-media': willSucceed
        ? ["Sources confirm: looking good.", "Behind the scenes, it's progressing well."]
        : ["Off the record: it's a disaster.", "Our sources say it's collapsing."],
      'late-insider': willSucceed
        ? ["Final word: it's done. Success confirmed.", "I've seen the proof. It succeeded."]
        : ["Final verdict: total failure.", "Confirmed: it didn't work."],
      'late-analyst': willSucceed
        ? ["All data points to success.", "Final analysis: positive outcome."]
        : ["Final numbers confirm failure.", "Data shows it failed."]
    };

    const key = `${tier}-${role}` in templates ? `${tier}-${role}` : `${tier}-insider`;
    const options = templates[key] || templates['early-insider'];

    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Select high-value clues for an insider
   */
  private selectCluesForInsider(network: ClueNetwork): Clue[] {
    const truthfulClues = network.clues.filter(c => c.isTruthful);

    // Insiders get 3-5 truthful clues across all tiers
    const numClues = 3 + Math.floor(Math.random() * 3);
    const selected: Clue[] = [];

    // Get at least one from each tier
    const early = truthfulClues.filter(c => c.tier === 'early');
    const mid = truthfulClues.filter(c => c.tier === 'mid');
    const late = truthfulClues.filter(c => c.tier === 'late');

    if (early.length > 0) selected.push(early[Math.floor(Math.random() * early.length)]);
    if (mid.length > 0) selected.push(mid[Math.floor(Math.random() * mid.length)]);
    if (late.length > 0) selected.push(late[Math.floor(Math.random() * late.length)]);

    // Fill remaining slots
    while (selected.length < numClues && truthfulClues.length > selected.length) {
      const remaining = truthfulClues.filter(c => !selected.includes(c));
      if (remaining.length === 0) break;
      selected.push(remaining[Math.floor(Math.random() * remaining.length)]);
    }

    return selected;
  }

  /**
   * Select mixed clues for an outsider
   */
  private selectCluesForOutsider(network: ClueNetwork): Clue[] {
    // Outsiders get 1-2 clues, mix of truthful and false
    const numClues = 1 + Math.floor(Math.random() * 2);
    const selected: Clue[] = [];

    const availableClues = [...network.clues];

    for (let i = 0; i < numClues && availableClues.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableClues.length);
      selected.push(availableClues[randomIndex]);
      availableClues.splice(randomIndex, 1);
    }

    return selected;
  }

  /**
   * Reset the information engine
   */
  public reset(): void {
    this.clueNetwork = null;
    this.distributionPlans.clear();
  }

  /**
   * Get distribution plan for an agent
   */
  public getDistributionPlan(agentId: string): InformationDistributionPlan | undefined {
    return this.distributionPlans.get(agentId);
  }

  /**
   * Get all clues in the network
   */
  public getClueNetwork(): ClueNetwork | null {
    return this.clueNetwork;
  }

  /**
   * Check if agent has access to a specific clue
   */
  public hasClue(agentId: string, clueId: string): boolean {
    const plan = this.distributionPlans.get(agentId);
    if (!plan) return false;

    return plan.clues.some(c => c.id === clueId);
  }

  /**
   * Get all available clues for an agent up to current day
   */
  public getAvailableClues(agentId: string, currentDay: number): Clue[] {
    const plan = this.distributionPlans.get(agentId);
    if (!plan) return [];

    const receivedClueIds = new Set<string>();
    const availableClues: Clue[] = [];

    // Collect all clues up to current day
    for (let day = 1; day <= currentDay; day++) {
      const dayClues = plan.clues.filter(clue => {
        // Check if this clue unlocks on or before this day
        if (clue.revealDay !== day) return false;

        // Check if prerequisites are met
        if (clue.prerequisiteClues) {
          return clue.prerequisiteClues.every(prereqId => receivedClueIds.has(prereqId));
        }

        return true;
      });

      for (const clue of dayClues) {
        receivedClueIds.add(clue.id);
        availableClues.push(clue);
      }
    }

    return availableClues;
  }

  /**
   * Get clue delivery history for an agent
   */
  public getClueHistory(agentId: string, currentDay: number): Array<{
    day: number;
    clues: Clue[];
  }> {
    const plan = this.distributionPlans.get(agentId);
    if (!plan) return [];

    const history: Array<{ day: number; clues: Clue[] }> = [];
    const receivedClueIds = new Set<string>();

    for (let day = 1; day <= currentDay; day++) {
      const dayClues = plan.clues.filter(clue => {
        if (clue.revealDay !== day) return false;

        if (clue.prerequisiteClues) {
          return clue.prerequisiteClues.every(prereqId => receivedClueIds.has(prereqId));
        }

        return true;
      });

      if (dayClues.length > 0) {
        history.push({ day, clues: dayClues });
        dayClues.forEach(clue => receivedClueIds.add(clue.id));
      }
    }

    return history;
  }

  /**
   * Get clues by NPC for an agent (useful for query-npc skill)
   */
  public getCluesByNPC(agentId: string, npcId: string, currentDay: number): Clue[] {
    const availableClues = this.getAvailableClues(agentId, currentDay);
    return availableClues.filter(clue => clue.npcId === npcId);
  }

  /**
   * Get upcoming clues for an agent (spoiler-free preview)
   */
  public getUpcomingClueCount(agentId: string, currentDay: number): {
    early: number;
    mid: number;
    late: number;
    total: number;
  } {
    const plan = this.distributionPlans.get(agentId);
    if (!plan) return { early: 0, mid: 0, late: 0, total: 0 };

    const upcomingClues = plan.clues.filter(clue => clue.revealDay > currentDay);

    return {
      early: upcomingClues.filter(c => c.tier === 'early').length,
      mid: upcomingClues.filter(c => c.tier === 'mid').length,
      late: upcomingClues.filter(c => c.tier === 'late').length,
      total: upcomingClues.length
    };
  }

  /**
   * Get agent's information advantage score
   */
  public getInformationAdvantage(agentId: string, currentDay: number): {
    expectedValue: number;
    cluesReceived: number;
    cluesRemaining: number;
    percentile: number; // 0-100, where 100 is best
  } {
    const plan = this.distributionPlans.get(agentId);
    if (!plan) {
      return { expectedValue: 0, cluesReceived: 0, cluesRemaining: 0, percentile: 0 };
    }

    const receivedClues = this.getAvailableClues(agentId, currentDay);
    const remainingClues = plan.clues.filter(c => c.revealDay > currentDay);

    // Calculate percentile among all agents
    const allExpectedValues = Array.from(this.distributionPlans.values())
      .map(p => p.expectedValue)
      .sort((a, b) => a - b);

    const rank = allExpectedValues.filter(v => v < plan.expectedValue).length;
    const percentile = (rank / allExpectedValues.length) * 100;

    return {
      expectedValue: plan.expectedValue,
      cluesReceived: receivedClues.length,
      cluesRemaining: remainingClues.length,
      percentile: Math.round(percentile)
    };
  }

  /**
   * Get clue dependency chain for a specific clue
   */
  public getClueChain(clueId: string): Clue[] {
    if (!this.clueNetwork) return [];

    const chain: Clue[] = [];
    const visited = new Set<string>();

    const findPrerequisites = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const clue = this.clueNetwork!.clues.find(c => c.id === id);
      if (!clue) return;

      if (clue.prerequisiteClues) {
        for (const prereqId of clue.prerequisiteClues) {
          findPrerequisites(prereqId);
        }
      }

      chain.push(clue);
    };

    findPrerequisites(clueId);
    return chain;
  }

  /**
   * Get all agents with access to a specific clue
   */
  public getAgentsWithClue(clueId: string): string[] {
    const agents: string[] = [];

    for (const [agentId, plan] of this.distributionPlans) {
      if (plan.clues.some(c => c.id === clueId)) {
        agents.push(agentId);
      }
    }

    return agents;
  }

  /**
   * Deliver a specific clue to an agent (manual override, use sparingly)
   * Returns the clue if successful, null otherwise
   */
  public deliverClue(agentId: string, clueId: string): Clue | null {
    if (!this.clueNetwork) return null;

    const clue = this.clueNetwork.clues.find(c => c.id === clueId);
    if (!clue) return null;

    const plan = this.distributionPlans.get(agentId);
    if (!plan) return null;

    // Check if agent already has this clue
    if (plan.clues.some(c => c.id === clueId)) {
      return clue; // Already has it
    }

    // Add clue to agent's plan
    plan.clues.push(clue);
    plan.expectedValue += clue.value;

    return clue;
  }
}
