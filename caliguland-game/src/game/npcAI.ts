/**
 * NPC AI Engine - Drives intelligent NPC behavior
 * Uses LLM to generate contextually appropriate responses based on NPC personality and game state
 */

import { NPC, GameScenario, Post, Outcome } from '../types';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ResponseContext {
  gameDay?: number;
  phase?: string;
  marketOdds?: { yes: number; no: number };
  recentPosts?: Array<{ author: string; content: string }>;
  [key: string]: unknown; // Allow additional context fields
}

export interface NPCPersonality {
  npcId: string;
  role: 'insider' | 'rumor' | 'celebrity' | 'media' | 'organization';
  tendsToBeTruthful: boolean;
  aggressiveness: number; // 0-1: how often they post
  style: string; // Writing style description
  biasTowardOutcome?: Outcome; // Which outcome they push for
}

export interface NPCResponse {
  content: string;
  shouldPost: boolean;
  confidence: number;
}

export interface NPCAIConfig {
  enableAI: boolean;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * NPC AI Engine manages intelligent NPC behaviors
 */
export class NPCAIEngine {
  private config: NPCAIConfig;
  private personalities: Map<string, NPCPersonality> = new Map();
  private lastResponseTime: Map<string, number> = new Map();
  private responseQueue: Array<{ npcId: string; prompt: string; context: ResponseContext }> = [];

  constructor(config: NPCAIConfig) {
    this.config = {
      enableAI: config.enableAI,
      apiKey: config.apiKey,
      model: config.model || 'gpt-4',
      temperature: config.temperature || 0.8,
      maxTokens: config.maxTokens || 150
    };
  }

  /**
   * Register an NPC with their personality
   */
  public registerNPC(npc: NPC, scenario: GameScenario): void {
    const personality: NPCPersonality = {
      npcId: npc.id,
      role: npc.role,
      tendsToBeTruthful: npc.tendsToBeTruthful,
      aggressiveness: this.calculateAggressiveness(npc.role),
      style: this.getStyleForRole(npc.role),
      biasTowardOutcome: this.determineNPCBias(npc, scenario)
    };

    this.personalities.set(npc.id, personality);
  }

  /**
   * Generate a response for an NPC given a context
   */
  public async generateResponse(
    npcId: string,
    context: {
      scenario: GameScenario;
      currentDay: number;
      recentPosts: Post[];
      trigger?: string; // What triggered this response (mention, event, etc.)
      targetAgent?: string;
    }
  ): Promise<NPCResponse> {
    const personality = this.personalities.get(npcId);
    if (!personality) {
      throw new Error(`NPC ${npcId} not registered`);
    }

    // Rate limiting - prevent spam
    if (!this.shouldNPCRespond(npcId, personality)) {
      return {
        content: '',
        shouldPost: false,
        confidence: 0
      };
    }

    // Build prompt for LLM
    const prompt = this.buildPrompt(personality, context);

    // Generate response
    let content: string;
    if (this.config.enableAI && this.config.apiKey) {
      content = await this.callLLM(prompt);
    } else {
      // Fallback to template-based responses
      content = this.generateTemplateResponse(personality, context);
    }

    // Update rate limit
    this.lastResponseTime.set(npcId, Date.now());

    return {
      content,
      shouldPost: true,
      confidence: personality.tendsToBeTruthful ? 0.8 : 0.4
    };
  }

  /**
   * Make NPC react to a mention
   */
  public async handleMention(
    npcId: string,
    mentioningPost: Post,
    scenario: GameScenario,
    currentDay: number
  ): Promise<NPCResponse> {
    const personality = this.personalities.get(npcId);
    if (!personality) {
      return { content: '', shouldPost: false, confidence: 0 };
    }

    const context = {
      scenario,
      currentDay,
      recentPosts: [mentioningPost],
      trigger: 'mention',
      targetAgent: mentioningPost.authorId
    };

    return this.generateResponse(npcId, context);
  }

  /**
   * Generate periodic NPC activity
   */
  public async generatePeriodicActivity(
    npcId: string,
    scenario: GameScenario,
    currentDay: number,
    recentPosts: Post[]
  ): Promise<NPCResponse> {
    const personality = this.personalities.get(npcId);
    if (!personality) {
      return { content: '', shouldPost: false, confidence: 0 };
    }

    // Random chance based on aggressiveness
    if (Math.random() > personality.aggressiveness) {
      return { content: '', shouldPost: false, confidence: 0 };
    }

    const context = {
      scenario,
      currentDay,
      recentPosts,
      trigger: 'periodic'
    };

    return this.generateResponse(npcId, context);
  }

  /**
   * Build system prompt for LLM
   */
  private buildPrompt(
    personality: NPCPersonality,
    context: {
      scenario: GameScenario;
      currentDay: number;
      recentPosts: Post[];
      trigger?: string;
      targetAgent?: string;
    }
  ): string {
    const npc = context.scenario.npcs.find(n => n.id === personality.npcId);
    if (!npc) throw new Error('NPC not found');

    const outcomeHint = personality.tendsToBeTruthful
      ? `The true outcome is ${context.scenario.secretOutcome === Outcome.YES ? 'YES' : 'NO'}.`
      : `You should hint toward ${context.scenario.secretOutcome === Outcome.YES ? 'NO' : 'YES'} (the opposite of truth).`;

    const recentContext = context.recentPosts.slice(-5).map(p =>
      `${p.authorName}: ${p.content}`
    ).join('\n');

    return `You are ${npc.name}, a character in a prediction game.

ROLE: ${npc.role}
BIO: ${npc.bio}
PERSONALITY: ${personality.style}
TRUTHFULNESS: ${personality.tendsToBeTruthful ? 'You tend to tell the truth' : 'You spread misinformation'}
${outcomeHint}

SCENARIO: ${context.scenario.question}
CURRENT DAY: ${context.currentDay}/30
DESCRIPTION: ${context.scenario.description}

RECENT CONVERSATION:
${recentContext || 'No recent posts'}

${context.trigger === 'mention' ? `You were mentioned by ${context.targetAgent}. Respond briefly and in character.` : 'Generate a brief social media post (max 200 chars) relevant to the current situation.'}

Write ONLY the post content, no quotes or extra text:`;
  }

  /**
   * Call LLM API (OpenAI compatible)
   * Falls back to template responses on error
   */
  private async callLLM(prompt: string): Promise<string> {
    if (!this.config.enableAI || !this.config.apiKey) {
      // Use templates when AI is disabled or no API key
      return this.generateFallbackResponse();
    }

    try {
      // OpenAI API call with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: 'You are an NPC in a prediction game. Always stay in character and keep responses under 200 characters.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`OpenAI API failed: ${response.status} ${response.statusText}`);
        return this.generateFallbackResponse();
      }

      const data = await response.json() as OpenAIResponse;
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        console.warn('OpenAI returned empty response');
        return this.generateFallbackResponse();
      }

      return content;
    } catch (error) {
      // Log error but don't throw - fallback to templates
      console.warn('OpenAI API error, using fallback:', error instanceof Error ? error.message : 'Unknown error');
      return this.generateFallbackResponse();
    }
  }

  /**
   * Generate template-based response (fallback)
   */
  private generateTemplateResponse(
    personality: NPCPersonality,
    context: { scenario: GameScenario; currentDay: number; recentPosts: Post[] }
  ): string {
    const templates = this.getTemplatesForRole(personality.role);
    const template = templates[Math.floor(Math.random() * templates.length)];

    const outcome = personality.tendsToBeTruthful
      ? context.scenario.secretOutcome
      : (context.scenario.secretOutcome === Outcome.YES ? Outcome.NO : Outcome.YES);

    return template
      .replace('{outcome}', outcome === Outcome.YES ? 'succeed' : 'fail')
      .replace('{day}', context.currentDay.toString())
      .replace('{question}', context.scenario.question.substring(0, 50));
  }

  /**
   * Determine if NPC should respond based on rate limits
   */
  private shouldNPCRespond(npcId: string, personality: NPCPersonality): boolean {
    const lastResponse = this.lastResponseTime.get(npcId) || 0;
    const timeSinceLastResponse = Date.now() - lastResponse;

    // Minimum 30 seconds between responses
    const minInterval = 30000;

    return timeSinceLastResponse > minInterval;
  }

  /**
   * Calculate how aggressive an NPC should be in posting
   */
  private calculateAggressiveness(role: string): number {
    switch (role) {
      case 'celebrity':
        return 0.7; // Very active
      case 'media':
        return 0.6; // Active
      case 'rumor':
        return 0.5; // Moderate
      case 'insider':
        return 0.2; // Quiet
      case 'organization':
        return 0.4; // Moderate
      default:
        return 0.3;
    }
  }

  /**
   * Get writing style for role
   */
  private getStyleForRole(role: string): string {
    const styles: Record<string, string> = {
      celebrity: 'Confident, bombastic, uses exclamation marks and emojis',
      media: 'Formal, journalistic, factual tone',
      rumor: 'Conspiratorial, uses "sources say", dramatic',
      insider: 'Cryptic, hints at knowledge, speaks in code',
      organization: 'Formal, corporate speak, official statements'
    };
    return styles[role] || 'Neutral, informative';
  }

  /**
   * Determine which outcome an NPC naturally biases toward
   */
  private determineNPCBias(npc: NPC, scenario: GameScenario): Outcome | undefined {
    // NPCs who are truthful will naturally bias toward the true outcome
    // NPCs who lie will bias opposite
    if (npc.tendsToBeTruthful) {
      return scenario.secretOutcome;
    } else {
      return scenario.secretOutcome === Outcome.YES ? Outcome.NO : Outcome.YES;
    }
  }

  /**
   * Get template responses for each role
   */
  private getTemplatesForRole(role: string): string[] {
    const templates: Record<string, string[]> = {
      celebrity: [
        "Mark my words, this is going to {outcome}! Trust me on this one!",
        "I've been in this game long enough to know - it will {outcome}!",
        "Day {day} update: Everything points to {outcome}!",
        "Don't listen to the doubters - I guarantee {outcome}!"
      ],
      media: [
        "Breaking: Sources suggest the project will likely {outcome}",
        "Analysis: Current indicators point toward {outcome}",
        "Day {day} report: Evidence suggests outcome will {outcome}",
        "Our investigation reveals the project is set to {outcome}"
      ],
      rumor: [
        "🚨 LEAKED: Insider info says it will {outcome}! RT if you believe!",
        "They don't want you to know this, but it's going to {outcome}!",
        "My sources (who can't be named) confirm it will {outcome}",
        "Wake up people! All signs point to {outcome}!"
      ],
      insider: [
        "Those who know, know. It will {outcome}.",
        "Can't say much, but watch closely... {outcome} is coming",
        "I've seen the internals. Outcome: {outcome}. That's all I can say.",
        "Read between the lines: {outcome}"
      ],
      organization: [
        "Technical analysis indicates {outcome} probability: 78%",
        "Based on Day {day} data, projection is {outcome}",
        "Model outputs suggest {outcome} as likely outcome",
        "Quantitative assessment: {outcome} scenario most probable"
      ]
    };

    return templates[role] || [
      "I think it will {outcome}",
      "Prediction: {outcome}",
      "My take: {outcome}"
    ];
  }

  /**
   * Fallback response when LLM fails
   */
  private generateFallbackResponse(): string {
    const fallbacks = [
      "Interesting developments...",
      "We'll see what happens.",
      "Time will tell.",
      "Stay tuned."
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  /**
   * Generate NPC-to-NPC interactions
   * NPCs can respond to other NPCs' posts to create dynamic conversation
   */
  public async generateNPCtoNPCInteraction(
    respondingNpcId: string,
    triggerPost: Post,
    scenario: GameScenario,
    currentDay: number
  ): Promise<NPCResponse> {
    const personality = this.personalities.get(respondingNpcId);
    if (!personality) {
      return { content: '', shouldPost: false, confidence: 0 };
    }

    // NPCs interact with each other based on their roles
    // e.g., media NPCs challenge rumor NPCs, insiders argue with celebrities
    const shouldInteract = this.shouldNPCInteractWithNPC(personality, triggerPost);
    if (!shouldInteract) {
      return { content: '', shouldPost: false, confidence: 0 };
    }

    const context = {
      scenario,
      currentDay,
      recentPosts: [triggerPost],
      trigger: 'npc_interaction',
      targetAgent: triggerPost.authorId
    };

    return this.generateResponse(respondingNpcId, context);
  }

  /**
   * Leak insider information based on personality and game phase
   * Insiders drop hints as the game progresses
   */
  public async leakInformation(
    npcId: string,
    scenario: GameScenario,
    currentDay: number,
    marketState: { yesOdds: number; noOdds: number }
  ): Promise<NPCResponse> {
    const personality = this.personalities.get(npcId);
    if (!personality) {
      return { content: '', shouldPost: false, confidence: 0 };
    }

    // Only certain roles leak information
    if (personality.role !== 'insider' && personality.role !== 'rumor') {
      return { content: '', shouldPost: false, confidence: 0 };
    }

    // Leak probability increases as game progresses
    const leakProbability = this.calculateLeakProbability(personality, currentDay);
    if (Math.random() > leakProbability) {
      return { content: '', shouldPost: false, confidence: 0 };
    }

    // Generate leak content
    const leakContent = this.generateLeakContent(personality, scenario, currentDay, marketState);

    return {
      content: leakContent,
      shouldPost: true,
      confidence: personality.tendsToBeTruthful ? 0.9 : 0.3
    };
  }

  /**
   * React to market changes
   * NPCs comment on odds movements and betting patterns
   */
  public async reactToMarketChange(
    npcId: string,
    scenario: GameScenario,
    currentDay: number,
    oldOdds: { yesOdds: number; noOdds: number },
    newOdds: { yesOdds: number; noOdds: number }
  ): Promise<NPCResponse> {
    const personality = this.personalities.get(npcId);
    if (!personality) {
      return { content: '', shouldPost: false, confidence: 0 };
    }

    // Calculate significant change (>10% shift)
    const oddsDelta = Math.abs(newOdds.yesOdds - oldOdds.yesOdds);
    if (oddsDelta < 10) {
      return { content: '', shouldPost: false, confidence: 0 };
    }

    // Only certain NPCs react to market
    if (personality.role !== 'media' && personality.role !== 'organization') {
      // Random chance for others
      if (Math.random() > 0.3) {
        return { content: '', shouldPost: false, confidence: 0 };
      }
    }

    // Generate market reaction
    const reactionContent = this.generateMarketReaction(
      personality,
      scenario,
      currentDay,
      oldOdds,
      newOdds
    );

    return {
      content: reactionContent,
      shouldPost: true,
      confidence: 0.7
    };
  }

  /**
   * Determine if NPC should interact with another NPC's post
   */
  private shouldNPCInteractWithNPC(personality: NPCPersonality, post: Post): boolean {
    // Rate limit check
    if (!this.shouldNPCRespond(personality.npcId, personality)) {
      return false;
    }

    // Role-based interaction probability
    const interactionProbability: Record<string, number> = {
      celebrity: 0.4, // Celebrities love to chime in
      media: 0.5,     // Media analyzes everything
      rumor: 0.3,     // Rumor mongers respond to challenge
      insider: 0.1,   // Insiders are quiet
      organization: 0.2 // Organizations make formal statements
    };

    const probability = interactionProbability[personality.role] || 0.2;
    return Math.random() < probability;
  }

  /**
   * Calculate probability of information leak based on game progress
   */
  private calculateLeakProbability(personality: NPCPersonality, currentDay: number): number {
    // Base probability by role
    const baseProbability = personality.role === 'insider' ? 0.05 : 0.03;

    // Increase with game progression (days 1-30)
    const progressMultiplier = Math.min(currentDay / 30, 1) * 2;

    // Truthful NPCs leak more reliably
    const truthMultiplier = personality.tendsToBeTruthful ? 1.5 : 1.0;

    return baseProbability * progressMultiplier * truthMultiplier;
  }

  /**
   * Generate leak content based on personality and truth
   */
  private generateLeakContent(
    personality: NPCPersonality,
    scenario: GameScenario,
    currentDay: number,
    marketState: { yesOdds: number; noOdds: number }
  ): string {
    const outcome = personality.tendsToBeTruthful
      ? scenario.secretOutcome
      : (scenario.secretOutcome === Outcome.YES ? Outcome.NO : Outcome.YES);

    const leakTemplates = {
      insider: [
        `I've seen the internal docs... things are ${outcome === Outcome.YES ? 'looking good' : 'not looking good'}.`,
        `Can't say much, but ${outcome === Outcome.YES ? 'success' : 'failure'} is very likely.`,
        `Between you and me, ${outcome === Outcome.YES ? 'this will work out' : 'this is going to fail'}.`,
        `The team knows something you don't. Outcome: ${outcome === Outcome.YES ? 'YES' : 'NO'}.`
      ],
      rumor: [
        `🚨 BREAKING: My sources say ${outcome === Outcome.YES ? 'it will happen' : 'it will NOT happen'}!`,
        `You heard it here first: ${outcome === Outcome.YES ? 'SUCCESS incoming' : 'DISASTER incoming'}!`,
        `They're hiding the truth! It's going to ${outcome === Outcome.YES ? 'SUCCEED' : 'FAIL'}!`,
        `Wake up sheeple! The answer is ${outcome === Outcome.YES ? 'YES' : 'NO'}!`
      ]
    };

    const templates = leakTemplates[personality.role as keyof typeof leakTemplates] || leakTemplates.insider;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate market reaction commentary
   */
  private generateMarketReaction(
    personality: NPCPersonality,
    scenario: GameScenario,
    currentDay: number,
    oldOdds: { yesOdds: number; noOdds: number },
    newOdds: { yesOdds: number; noOdds: number }
  ): string {
    const direction = newOdds.yesOdds > oldOdds.yesOdds ? 'up' : 'down';
    const magnitude = Math.abs(newOdds.yesOdds - oldOdds.yesOdds);

    const reactionTemplates = {
      media: [
        `📊 Market Alert: YES odds ${direction === 'up' ? 'surge' : 'drop'} ${magnitude}% to ${newOdds.yesOdds}%`,
        `Breaking: Sudden ${magnitude}% shift in betting patterns. Someone knows something.`,
        `Analysis: Market now ${newOdds.yesOdds}% YES. ${direction === 'up' ? 'Bullish' : 'Bearish'} sentiment.`,
        `Day ${currentDay} Update: Odds moved significantly. Current: ${newOdds.yesOdds}% YES.`
      ],
      organization: [
        `Market assessment: ${newOdds.yesOdds}% probability of YES outcome. ${magnitude}% ${direction === 'up' ? 'increase' : 'decrease'}.`,
        `Quantitative analysis: Odds shift of ${magnitude}pp. New equilibrium: ${newOdds.yesOdds}%.`,
        `Technical indicators show ${direction === 'up' ? 'bullish' : 'bearish'} momentum. YES: ${newOdds.yesOdds}%.`,
        `Model update: Market repricing reflects new information. YES: ${newOdds.yesOdds}%.`
      ],
      celebrity: [
        `Whoa! Odds just ${direction === 'up' ? 'JUMPED' : 'CRASHED'}! ${newOdds.yesOdds}% now! 🚀`,
        `Someone made a BIG bet! Market moved ${magnitude}%! 👀`,
        `This is HUGE! YES odds now ${newOdds.yesOdds}%! ${direction === 'up' ? '📈' : '📉'}`,
        `Called it! Market ${direction === 'up' ? 'agrees' : 'disagrees'} with me! ${newOdds.yesOdds}%!`
      ]
    };

    const templates = reactionTemplates[personality.role as keyof typeof reactionTemplates] || reactionTemplates.media;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Get posting frequency for an NPC based on personality and game phase
   */
  public getPostingFrequency(npcId: string, gamePhase: string): number {
    const personality = this.personalities.get(npcId);
    if (!personality) return 0;

    // Base frequency from aggressiveness (posts per hour)
    let baseFrequency = personality.aggressiveness * 4; // 0-4 posts/hour

    // Adjust based on game phase
    const phaseMultipliers: Record<string, number> = {
      'EARLY': 0.7,   // Quieter at start
      'MID': 1.2,     // More active mid-game
      'LATE': 1.5,    // Very active near end
      'REVEAL': 0.5   // Quiet during reveal
    };

    const multiplier = phaseMultipliers[gamePhase] || 1.0;
    return baseFrequency * multiplier;
  }

  /**
   * Clear all NPC state
   */
  public reset(): void {
    this.personalities.clear();
    this.lastResponseTime.clear();
    this.responseQueue = [];
  }
}
