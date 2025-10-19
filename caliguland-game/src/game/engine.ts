import { v4 as uuidv4 } from 'uuid';
import {
  GameSession,
  GameScenario,
  GamePhase,
  Outcome,
  Agent,
  NPC,
  Post,
  MarketState,
  Bet,
  OracleAttestation
} from '../types';
import { ScenarioGenerator } from './scenarios';
import { dstackHelper } from '../utils/dstack';
import { MarketMaker } from './market';
import { NPCAIEngine, NPCAIConfig } from './npcAI';
import { InformationEngine } from './information';
import { ReputationEngine, ReputationFeedback, ReputationScore } from './reputation';

export interface GameEngineConfig {
  gameDurationMs: number;
  maxPlayers: number;
  minPlayers: number;
  npcAI?: NPCAIConfig;
}

// Broadcast message types
export interface BroadcastMessage {
  type: string;
  data: unknown;
}

// Game result interface
export interface GameResult {
  sessionId: string;
  outcome: Outcome;
  winners: string[];
  payouts: Record<string, number>;
}

// Group chat interface
export interface GroupChat {
  id: string;
  name: string;
  members: string[];
  messages: Array<{
    from: string;
    content: string;
    timestamp: Date;
  }>;
  createdBy: string;
  createdAt: Date;
}

export class GameEngine {
  private config: GameEngineConfig;
  private currentGame: GameSession | null = null;
  private lobbyAgents: Agent[] = [];
  private tickInterval: NodeJS.Timeout | null = null;
  private scenarioGenerator: ScenarioGenerator;
  private broadcastFn?: (message: BroadcastMessage) => void;
  private sendToAgentFn?: (agentId: string, message: BroadcastMessage) => void;
  private marketMaker: MarketMaker | null = null;
  private agentShares: Map<string, { yes: number; no: number }> = new Map();
  private npcAI: NPCAIEngine;
  private npcActivityInterval: NodeJS.Timeout | null = null;
  private informationEngine: InformationEngine;
  private reputationEngine: ReputationEngine;

  constructor(config: GameEngineConfig) {
    this.config = config;
    this.scenarioGenerator = new ScenarioGenerator();

    // Initialize NPC AI engine
    this.npcAI = new NPCAIEngine(config.npcAI || {
      enableAI: false // Default to template-based responses
    });

    // Initialize Information Engine
    this.informationEngine = new InformationEngine();

    // Initialize Reputation Engine
    this.reputationEngine = new ReputationEngine();
  }

  // Set broadcast functions (called from main server)
  setBroadcastFunctions(
    broadcast: (message: BroadcastMessage) => void,
    sendToAgent: (agentId: string, message: BroadcastMessage) => void
  ) {
    this.broadcastFn = broadcast;
    this.sendToAgentFn = sendToAgent;
  }

  private broadcast(message: BroadcastMessage) {
    if (this.broadcastFn) {
      this.broadcastFn(message);
    }
  }

  private sendToAgent(agentId: string, message: BroadcastMessage) {
    if (this.sendToAgentFn) {
      this.sendToAgentFn(agentId, message);
    }
  }

  start() {
    console.log('🎮 Game Engine started');
    // Check for game start every 10 seconds
    this.tickInterval = setInterval(() => this.tick(), 10000);
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
    if (this.npcActivityInterval) {
      clearInterval(this.npcActivityInterval);
    }
    console.log('🎮 Game Engine stopped');
  }

  private tick() {
    // Check if we should start a new game
    if (!this.currentGame && this.lobbyAgents.length >= this.config.minPlayers) {
      this.startNewGame();
    }

    // Update current game state
    if (this.currentGame && this.currentGame.phase !== GamePhase.ENDED) {
      this.updateGameState();
    }
  }

  private async startNewGame() {
    console.log(`🎲 Starting new game with ${this.lobbyAgents.length} players`);

    // Generate scenario
    const scenario = await this.scenarioGenerator.generate();

    // Initialize LMSR market maker with liquidity parameter
    this.marketMaker = new MarketMaker(100);
    this.agentShares.clear();

    // Create game session
    const session: GameSession = {
      id: uuidv4(),
      scenario,
      agents: [...this.lobbyAgents],
      phase: GamePhase.EARLY,
      currentDay: 1,
      startTime: new Date(),
      market: this.initializeMarket(),
      feed: [],
      directMessages: new Map(),
      groupChats: [],
      insiderClues: [],
      predictionsOpen: true,
      revealed: false
    };

    this.currentGame = session;
    this.lobbyAgents = []; // Clear lobby

    // Register NPCs with AI engine
    for (const npc of scenario.npcs) {
      this.npcAI.registerNPC(npc, scenario);
    }

    // Start periodic NPC activity
    this.startNPCActivity();

    // Generate clue network and distribution plans
    const clueNetwork = this.informationEngine.generateClueNetwork(scenario, session.agents.length);
    this.informationEngine.createDistributionPlans(
      clueNetwork,
      session.agents.map(a => a.id),
      0.3 // 30% of players are insiders
    );

    // Post initial system messages
    this.postToFeed({
      authorId: 'SYSTEM',
      authorName: 'Game System',
      content: `🎮 Game Started! Question: ${scenario.question}`,
      isSystemMessage: true
    });

    this.postToFeed({
      authorId: 'SYSTEM',
      authorName: 'Game System',
      content: `📊 Initial odds: 50% YES / 50% NO. Place your bets!`,
      isSystemMessage: true
    });

    // Initial clue distribution will happen on day 1 via onDayChange
    // Call it immediately for day 1
    this.distributeCluesForDay(1);

    // Broadcast game start
    this.broadcast({
      type: 'game_started',
      data: {
        sessionId: session.id,
        question: scenario.question,
        description: scenario.description,
        npcs: scenario.npcs.map(npc => ({ id: npc.id, name: npc.name, bio: npc.bio })),
        players: session.agents.map(a => ({ id: a.id, name: a.name }))
      }
    });
  }

  private updateGameState() {
    if (!this.currentGame) return;

    const elapsed = Date.now() - this.currentGame.startTime.getTime();
    const progress = elapsed / this.config.gameDurationMs;
    
    // Calculate current in-game day (1-30)
    const newDay = Math.min(Math.floor(progress * 30) + 1, 30);
    
    if (newDay !== this.currentGame.currentDay) {
      this.currentGame.currentDay = newDay;
      this.onDayChange(newDay);
    }

    // Update game phase based on day
    if (newDay >= 1 && newDay <= 10) {
      this.currentGame.phase = GamePhase.EARLY;
    } else if (newDay >= 11 && newDay <= 20) {
      this.currentGame.phase = GamePhase.MID;
    } else if (newDay >= 21 && newDay <= 29) {
      this.currentGame.phase = GamePhase.LATE;
    } else if (newDay >= 30) {
      this.currentGame.phase = GamePhase.REVEAL;
      if (!this.currentGame.revealed) {
        this.revealOutcome();
      }
    }

    // Close predictions at Day 29 end
    if (newDay >= 29 && this.currentGame.predictionsOpen) {
      this.closeBetting();
    }
  }

  private onDayChange(day: number) {
    console.log(`📅 Day ${day} begins`);

    // Post day change to feed
    this.postToFeed({
      authorId: 'SYSTEM',
      authorName: 'Game System',
      content: `📅 Day ${day} begins`,
      isSystemMessage: true
    });

    // Process scheduled events for this day
    this.processScheduledEvents(day);

    // Distribute clues for this day
    this.distributeCluesForDay(day);

    this.broadcast({
      type: 'day_changed',
      data: { day, phase: this.currentGame!.phase }
    });
  }

  private processScheduledEvents(day: number) {
    if (!this.currentGame) return;

    const events = this.currentGame.scenario.timeline.filter(e => e.day === day);

    for (const event of events) {
      if (event.isPublic) {
        // Post to public feed
        this.postToFeed({
          authorId: event.author,
          authorName: this.getNPCName(event.author),
          content: event.content,
          isSystemMessage: event.type === 'system'
        });
      } else if (event.targetAgents) {
        // Send as DM to specific agents
        for (const agentId of event.targetAgents) {
          this.sendDirectMessage({
            from: event.author,
            to: agentId,
            content: event.content
          });
        }
      }
    }
  }

  /**
   * Distribute clues for the current game day
   */
  private distributeCluesForDay(day: number) {
    if (!this.currentGame) return;

    for (const agent of this.currentGame.agents) {
      const clues = this.informationEngine.getCluesForDay(agent.id, day);

      for (const clue of clues) {
        // Send clue as DM from the NPC
        this.sendDirectMessage({
          from: clue.npcId,
          to: agent.id,
          content: clue.content
        });

        // Record in insider clues
        this.currentGame.insiderClues.push({
          agentId: agent.id,
          npcId: clue.npcId,
          content: clue.content,
          isTruthful: clue.isTruthful,
          deliveredAt: new Date(),
          gameDay: day
        });

        console.log(`📨 Clue delivered to ${agent.id} from ${clue.npcId} on day ${day}`);
      }
    }
  }

  private closeBetting() {
    if (!this.currentGame) return;

    this.currentGame.predictionsOpen = false;
    
    this.postToFeed({
      authorId: 'SYSTEM',
      authorName: 'Game System',
      content: '🔒 Predictions are now CLOSED. Prepare for the final reveal!',
      isSystemMessage: true
    });

    this.broadcast({
      type: 'betting_closed',
      data: { finalOdds: this.currentGame.market }
    });
  }

  private async revealOutcome() {
    if (!this.currentGame) return;

    this.currentGame.revealed = true;
    this.currentGame.finalOutcome = this.currentGame.scenario.secretOutcome;

    // Post dramatic reveal
    const outcomeText = this.currentGame.scenario.secretOutcome === Outcome.YES
      ? '✅ The outcome is YES! The event succeeded!'
      : '❌ The outcome is NO! The event failed!';

    this.postToFeed({
      authorId: 'SYSTEM',
      authorName: 'Game System',
      content: `🎯 FINAL OUTCOME: ${outcomeText}`,
      isSystemMessage: true
    });

    // Calculate winners and payouts
    const result = this.calculateResults();

    // Post results to oracle (TEE integration)
    await this.publishToOracle(result);

    this.broadcast({
      type: 'game_ended',
      data: result
    });

    // Schedule game end
    setTimeout(() => {
      this.currentGame!.phase = GamePhase.ENDED;
      this.currentGame = null;
    }, 300000); // 5 minutes for debrief
  }

  private calculateResults() {
    if (!this.currentGame) throw new Error('No active game');

    const winners: string[] = [];
    const payouts: { [agentId: string]: number} = {};

    const correctOutcome = this.currentGame.scenario.secretOutcome;
    const correctBets = this.currentGame.market.bets.filter(
      b => b.outcome === correctOutcome && b.amount > 0 // Positive amounts only (not sells)
    );
    const incorrectBets = this.currentGame.market.bets.filter(
      b => b.outcome !== correctOutcome && b.amount > 0
    );

    const totalLost = incorrectBets.reduce((sum, b) => sum + b.amount, 0);
    const totalWon = correctBets.reduce((sum, b) => sum + b.amount, 0);

    if (totalWon > 0) {
      for (const bet of correctBets) {
        const profit = (bet.amount / totalWon) * totalLost;
        payouts[bet.agentId] = bet.amount + profit;
        if (!winners.includes(bet.agentId)) {
          winners.push(bet.agentId);
        }
      }
    }

    // Identify correct predictors (for reputation)
    const correctBettors = correctBets.map(b => b.agentId).filter((id, idx, arr) => arr.indexOf(id) === idx);

    // Identify betrayers (agents in groups who bet against their allies)
    const betrayers = this.identifyBetrayers();

    // Calculate reputation updates
    const reputationUpdates = this.reputationEngine.calculatePostGameReputation(
      this.currentGame.id,
      this.currentGame.agents,
      winners,
      correctBettors,
      betrayers
    );

    // Convert reputation updates to a map
    const reputationChanges: { [agentId: string]: number } = {};
    for (const update of reputationUpdates) {
      reputationChanges[update.agentId] = update.change;
    }

    return {
      sessionId: this.currentGame.id,
      outcome: correctOutcome,
      winners,
      payouts,
      marketHistory: [this.currentGame.market],
      reputationChanges,
      reputationUpdates
    };
  }

  /**
   * Identify agents who betrayed their group chat allies
   */
  private identifyBetrayers(): string[] {
    if (!this.currentGame) return [];

    const betrayers: string[] = [];

    // Check each group chat
    for (const group of this.currentGame.groupChats) {
      // Get bets from group members
      const memberBets = new Map<string, Outcome.YES | Outcome.NO>();

      for (const memberId of group.members) {
        // Get this member's primary bet
        const bets = this.currentGame.market.bets.filter(b => b.agentId === memberId && b.amount > 0);
        if (bets.length > 0) {
          // Use the largest bet as their position
          const largestBet = bets.reduce((max, b) => b.amount > max.amount ? b : max);
          memberBets.set(memberId, largestBet.outcome);
        }
      }

      // If group members bet on different outcomes, they betrayed each other
      const outcomes = Array.from(memberBets.values());
      if (outcomes.length > 1) {
        const hasYes = outcomes.includes(Outcome.YES);
        const hasNo = outcomes.includes(Outcome.NO);

        if (hasYes && hasNo) {
          // Someone betrayed - add all members who bet against the majority
          const yesCount = outcomes.filter(o => o === Outcome.YES).length;
          const noCount = outcomes.filter(o => o === Outcome.NO).length;
          const minorityOutcome = yesCount < noCount ? Outcome.YES : Outcome.NO;

          for (const [memberId, outcome] of memberBets.entries()) {
            if (outcome === minorityOutcome) {
              betrayers.push(memberId);
            }
          }
        }
      }
    }

    return [...new Set(betrayers)]; // Remove duplicates
  }

  private async publishToOracle(result: GameResult): Promise<void> {
    // Use Dstack to sign and publish outcome
    const dstack = dstackHelper;

    // Create attestation data
    const attestationData = {
      sessionId: result.sessionId,
      outcome: result.outcome,
      timestamp: Date.now(),
      winners: result.winners,
      totalPayout: Object.values(result.payouts).reduce((sum: number, p: number) => sum + p, 0)
    };

    // Get quote from TEE - throws on failure
    const quote = await dstack.getQuote(JSON.stringify(attestationData));

    console.log('📜 Oracle result published with TEE attestation');
    console.log('Quote:', quote.quote.substring(0, 64) + '...');
    console.log('Attestation data:', attestationData);

    // Store oracle data for contract submission
    if (this.currentGame) {
      this.currentGame.oracleAttestation = {
        data: attestationData,
        quote: quote.quote,
        timestamp: Date.now()
      };
    }

    // Note: On-chain oracle contract submission would happen here
    // This would require ethers.js and contract ABI
    // For now, we log the attestation for manual verification
  }

  /**
   * Get oracle attestation for current game
   */
  public getOracleAttestation(): OracleAttestation | null {
    if (!this.currentGame) return null;
    return this.currentGame.oracleAttestation || null;
  }

  /**
   * Submit feedback for another agent (post-game)
   */
  public submitFeedback(feedback: ReputationFeedback): boolean {
    return this.reputationEngine.submitFeedback(feedback);
  }

  /**
   * Get reputation score for an agent
   */
  public getReputationScore(agentId: string): ReputationScore | null {
    return this.reputationEngine.getScore(agentId);
  }

  /**
   * Get reputation leaderboard
   */
  public getReputationLeaderboard(limit: number = 10): ReputationScore[] {
    return this.reputationEngine.getLeaderboard(limit);
  }

  /**
   * Prepare reputation updates for blockchain submission
   */
  public getPendingReputationUpdates(): Array<{
    agentAddress: string;
    reputationScore: number;
    honestyScore: number;
    cooperationScore: number;
    skillScore: number;
    gamesPlayed: number;
    wins: number;
  } | null> {
    const updates = this.reputationEngine.getPendingUpdates();
    return updates.map(u => this.reputationEngine.prepareOnChainUpdate(u.agentId));
  }

  // Public methods for API
  public joinLobby(agent: Agent): boolean {
    if (this.currentGame) {
      // Game in progress, add to next lobby
      if (this.lobbyAgents.length >= this.config.maxPlayers) {
        return false;
      }
      this.lobbyAgents.push(agent);
      return true;
    } else {
      // No game, start collecting for next
      if (this.lobbyAgents.length >= this.config.maxPlayers) {
        return false;
      }
      this.lobbyAgents.push(agent);
      console.log(`🎯 Agent ${agent.name} joined lobby (${this.lobbyAgents.length}/${this.config.minPlayers})`);
      return true;
    }
  }

  public getCurrentGame(): GameSession | null {
    return this.currentGame;
  }

  public getLobbyState() {
    return {
      players: this.lobbyAgents,
      minPlayers: this.config.minPlayers,
      maxPlayers: this.config.maxPlayers
    };
  }

  public postToFeed(post: Partial<Post>) {
    if (!this.currentGame) return;

    // Parse mentions from content
    const mentions = this.parseMentions(post.content || '');

    const fullPost: Post = {
      id: uuidv4(),
      authorId: post.authorId || 'UNKNOWN',
      authorName: post.authorName || 'Unknown',
      content: post.content || '',
      timestamp: new Date(),
      gameDay: this.currentGame.currentDay,
      isSystemMessage: post.isSystemMessage || false,
      replyTo: post.replyTo,
      mentions
    };

    this.currentGame.feed.push(fullPost);

    // Broadcast to all players
    this.broadcast({
      type: 'new_post',
      data: fullPost
    });

    // Send mention notifications
    if (!post.isSystemMessage && mentions.length > 0) {
      this.sendMentionNotifications(fullPost, mentions);
    }

    // Check for NPC mentions and trigger responses
    if (!post.isSystemMessage) {
      this.handleNPCMentions(fullPost);
    }
  }

  /**
   * Parse @mentions from post content
   * Supports formats: @agent-id, @AgentName
   */
  private parseMentions(content: string): string[] {
    if (!this.currentGame) return [];

    const mentionRegex = /@([\w-]+)/g;
    const matches = content.match(mentionRegex);

    if (!matches) return [];

    const mentions: string[] = [];

    for (const match of matches) {
      const mentionText = match.substring(1); // Remove @

      // Try to find agent by ID or name
      const agent = this.currentGame.agents.find(a =>
        a.id === mentionText ||
        a.name.toLowerCase() === mentionText.toLowerCase()
      );

      if (agent && !mentions.includes(agent.id)) {
        mentions.push(agent.id);
      }

      // Also check NPCs
      const npc = this.currentGame.scenario.npcs.find(n =>
        n.id === mentionText ||
        n.name.toLowerCase() === mentionText.toLowerCase()
      );

      if (npc && !mentions.includes(npc.id)) {
        mentions.push(npc.id);
      }
    }

    return mentions;
  }

  /**
   * Send notifications to mentioned agents
   */
  private sendMentionNotifications(post: Post, mentions: string[]) {
    if (!this.currentGame) return;

    for (const mentionedId of mentions) {
      // Skip if mentioning self
      if (mentionedId === post.authorId) continue;

      // Check if mentioned agent exists in the game
      const agent = this.currentGame.agents.find(a => a.id === mentionedId);

      if (agent) {
        this.sendToAgent(mentionedId, {
          type: 'mention',
          data: {
            type: 'mention',
            postId: post.id,
            agentId: post.authorId,
            message: `${post.authorName} mentioned you: "${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}"`
          }
        });
      }
    }
  }

  public sendDirectMessage(dm: { from: string; to: string; content: string }) {
    if (!this.currentGame) return;

    const message = {
      id: uuidv4(),
      from: dm.from,
      to: dm.to,
      content: dm.content,
      timestamp: new Date(),
      gameDay: this.currentGame.currentDay,
      encrypted: false
    };

    const key = [dm.from, dm.to].sort().join('-');
    const existing = this.currentGame.directMessages.get(key) || [];
    existing.push(message);
    this.currentGame.directMessages.set(key, existing);

    // Send to recipient
    this.sendToAgent(dm.to, {
      type: 'direct_message',
      data: message
    });
  }

  // Group Chat Methods
  public createGroupChat(creatorId: string, name: string, memberIds: string[]): string {
    if (!this.currentGame) throw new Error('No active game');

    const groupChat = {
      id: uuidv4(),
      name,
      members: [creatorId, ...memberIds],
      messages: [],
      createdBy: creatorId,
      createdAt: new Date()
    };

    this.currentGame.groupChats.push(groupChat);

    // Notify all members
    for (const memberId of groupChat.members) {
      this.sendToAgent(memberId, {
        type: 'group_created',
        data: {
          groupId: groupChat.id,
          name: groupChat.name,
          members: groupChat.members
        }
      });
    }

    return groupChat.id;
  }

  public sendGroupMessage(groupId: string, senderId: string, content: string): void {
    if (!this.currentGame) return;

    const group = this.currentGame.groupChats.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');
    if (!group.members.includes(senderId)) throw new Error('Not a member');

    const message = {
      id: uuidv4(),
      from: senderId,
      to: groupId,
      content,
      timestamp: new Date(),
      gameDay: this.currentGame.currentDay,
      encrypted: false
    };

    group.messages.push(message);

    // Broadcast to all members
    for (const memberId of group.members) {
      this.sendToAgent(memberId, {
        type: 'group_message',
        data: { groupId, message }
      });
    }
  }

  public leaveGroupChat(groupId: string, agentId: string): void {
    if (!this.currentGame) return;

    const group = this.currentGame.groupChats.find(g => g.id === groupId);
    if (!group) return;

    group.members = group.members.filter(m => m !== agentId);

    // Notify remaining members
    for (const memberId of group.members) {
      this.sendToAgent(memberId, {
        type: 'member_left',
        data: { groupId, agentId }
      });
    }
  }

  public inviteToGroupChat(groupId: string, inviterId: string, inviteeId: string): void {
    if (!this.currentGame) return;

    const group = this.currentGame.groupChats.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');
    if (!group.members.includes(inviterId)) throw new Error('Not a member');
    if (group.members.includes(inviteeId)) throw new Error('Already a member');

    group.members.push(inviteeId);

    // Notify new member
    this.sendToAgent(inviteeId, {
      type: 'group_invited',
      data: {
        groupId: group.id,
        name: group.name,
        invitedBy: inviterId,
        members: group.members
      }
    });

    // Notify existing members
    for (const memberId of group.members) {
      if (memberId !== inviteeId) {
        this.sendToAgent(memberId, {
          type: 'member_joined',
          data: { groupId, agentId: inviteeId }
        });
      }
    }
  }

  public getGroupChats(agentId: string): GroupChat[] {
    if (!this.currentGame) return [];
    return this.currentGame.groupChats.filter(g => g.members.includes(agentId));
  }

  /**
   * Follow another agent or NPC
   */
  public followAgent(followerId: string, targetId: string): boolean {
    if (!this.currentGame) return false;

    // Prevent self-follow
    if (followerId === targetId) {
      return false;
    }

    const followerAgent = this.currentGame.agents.find(a => a.id === followerId);
    if (!followerAgent) return false;

    // Initialize following array if needed
    if (!followerAgent.following) {
      followerAgent.following = [];
    }

    // Don't follow if already following
    if (followerAgent.following.includes(targetId)) {
      return false;
    }

    followerAgent.following.push(targetId);

    // Update target's followers list
    const targetAgent = this.currentGame.agents.find(a => a.id === targetId);
    if (targetAgent) {
      if (!targetAgent.followers) {
        targetAgent.followers = [];
      }
      targetAgent.followers.push(followerId);

      // Send notification to the target
      this.sendToAgent(targetId, {
        type: 'follow',
        data: {
          type: 'follow',
          agentId: followerId,
          message: `${followerAgent.name} is now following you`
        }
      });
    }

    // Notify the follower
    this.sendToAgent(followerId, {
      type: 'now_following',
      data: { targetId }
    });

    // Broadcast follow event
    this.broadcast({
      type: 'agent_followed',
      data: { followerId, targetId }
    });

    return true;
  }

  /**
   * Unfollow an agent or NPC
   */
  public unfollowAgent(followerId: string, targetId: string): boolean {
    if (!this.currentGame) return false;

    const followerAgent = this.currentGame.agents.find(a => a.id === followerId);
    if (!followerAgent || !followerAgent.following) return false;

    const index = followerAgent.following.indexOf(targetId);
    if (index === -1) return false;

    followerAgent.following.splice(index, 1);

    // Update target's followers list
    const targetAgent = this.currentGame.agents.find(a => a.id === targetId);
    if (targetAgent && targetAgent.followers) {
      const targetIndex = targetAgent.followers.indexOf(followerId);
      if (targetIndex !== -1) {
        targetAgent.followers.splice(targetIndex, 1);
      }
    }

    // Notify the follower
    this.sendToAgent(followerId, {
      type: 'unfollowed',
      data: { targetId }
    });

    // Broadcast unfollow event
    this.broadcast({
      type: 'agent_unfollowed',
      data: { followerId, targetId }
    });

    return true;
  }

  /**
   * Get list of who an agent is following
   */
  public getFollowing(agentId: string): string[] {
    if (!this.currentGame) return [];

    const agent = this.currentGame.agents.find(a => a.id === agentId);
    return agent?.following || [];
  }

  /**
   * Get list of followers for an agent
   */
  public getFollowers(agentId: string): string[] {
    if (!this.currentGame) return [];

    const agent = this.currentGame.agents.find(a => a.id === agentId);
    return agent?.followers || [];
  }

  /**
   * React to a post
   */
  public reactToPost(postId: string, agentId: string, reaction: 'like' | 'dislike'): boolean {
    if (!this.currentGame) return false;

    const post = this.currentGame.feed.find(p => p.id === postId);
    if (!post) return false;

    // Initialize reactions if needed
    if (!post.reactions) {
      post.reactions = {};
    }

    const previousReaction = post.reactions[agentId];

    // Toggle reaction (remove if same, change if different)
    if (previousReaction === reaction) {
      delete post.reactions[agentId];
    } else {
      post.reactions[agentId] = reaction;
    }

    // Update reaction counts
    this.updateReactionCounts(post);

    // Broadcast reaction update
    this.broadcast({
      type: 'post_reaction',
      data: {
        postId,
        agentId,
        reaction: post.reactions[agentId] || null,
        reactions: post.reactions,
        likeCount: post.likeCount,
        dislikeCount: post.dislikeCount
      }
    });

    return true;
  }

  /**
   * Update like and dislike counts for a post
   */
  private updateReactionCounts(post: Post): void {
    if (!post.reactions) {
      post.likeCount = 0;
      post.dislikeCount = 0;
      return;
    }

    let likes = 0;
    let dislikes = 0;

    for (const reaction of Object.values(post.reactions)) {
      if (reaction === 'like') likes++;
      else if (reaction === 'dislike') dislikes++;
    }

    post.likeCount = likes;
    post.dislikeCount = dislikes;
  }

  /**
   * Get all reactions for a post
   */
  public getPostReactions(postId: string): { reactions: Record<string, 'like' | 'dislike'>; likeCount: number; dislikeCount: number } | null {
    if (!this.currentGame) return null;

    const post = this.currentGame.feed.find(p => p.id === postId);
    if (!post) return null;

    return {
      reactions: post.reactions || {},
      likeCount: post.likeCount || 0,
      dislikeCount: post.dislikeCount || 0
    };
  }

  public placeBet(agentId: string, outcome: Outcome.YES | Outcome.NO, amount: number): boolean {
    if (!this.currentGame || !this.currentGame.predictionsOpen || !this.marketMaker) {
      return false;
    }

    // Validate amount
    if (amount <= 0) {
      return false;
    }

    // Calculate shares using LMSR
    const shares = this.marketMaker.calculateSharesForTokens(
      outcome === Outcome.YES ? 'YES' : 'NO',
      amount
    );

    // Execute the buy on the market maker
    const result = this.marketMaker.buy(
      outcome === Outcome.YES ? 'YES' : 'NO',
      shares
    );

    // Record the bet
    const bet: Bet = {
      agentId,
      outcome,
      amount,
      timestamp: new Date(),
      gameDay: this.currentGame.currentDay,
      odds: Math.round(result.newPrice * 100) // Convert price to percentage odds
    };

    this.currentGame.market.bets.push(bet);

    // Track agent's shares
    const agentShareRecord = this.agentShares.get(agentId) || { yes: 0, no: 0 };
    if (outcome === Outcome.YES) {
      agentShareRecord.yes += shares;
    } else {
      agentShareRecord.no += shares;
    }
    this.agentShares.set(agentId, agentShareRecord);

    // Update market state with LMSR prices
    this.updateMarketState();

    this.broadcast({
      type: 'market_update',
      data: this.currentGame.market
    });

    return true;
  }

  private initializeMarket(): MarketState {
    return {
      yesShares: 0,
      noShares: 0,
      yesOdds: 50,
      noOdds: 50,
      totalVolume: 0,
      bets: []
    };
  }

  private updateMarketState() {
    if (!this.currentGame || !this.marketMaker) return;

    const market = this.currentGame.market;
    const marketState = this.marketMaker.getMarketState();

    // Store old odds for comparison
    const oldOdds = {
      yesOdds: market.yesOdds,
      noOdds: market.noOdds
    };

    // Update market with LMSR-calculated values
    market.yesShares = marketState.yesShares;
    market.noShares = marketState.noShares;
    market.yesOdds = Math.round(marketState.yesPrice * 100);
    market.noOdds = Math.round(marketState.noPrice * 100);

    // Calculate total volume from all bets
    market.totalVolume = market.bets.reduce((sum, bet) => sum + bet.amount, 0);

    // Trigger NPC market reactions if significant change (non-blocking)
    const newOdds = {
      yesOdds: market.yesOdds,
      noOdds: market.noOdds
    };

    const oddsDelta = Math.abs(newOdds.yesOdds - oldOdds.yesOdds);
    if (oddsDelta >= 10) {
      // Trigger market reactions asynchronously
      this.triggerMarketReactions(oldOdds, newOdds).catch(err => {
        console.warn('Market reaction error:', err);
      });
    }
  }

  /**
   * Trigger NPC reactions to market changes (non-blocking)
   */
  private async triggerMarketReactions(
    oldOdds: { yesOdds: number; noOdds: number },
    newOdds: { yesOdds: number; noOdds: number }
  ): Promise<void> {
    if (!this.currentGame) return;

    const scenario = this.currentGame.scenario;
    const currentDay = this.currentGame.currentDay;

    // Check each NPC for potential reaction
    for (const npc of scenario.npcs) {
      const reaction = await this.npcAI.reactToMarketChange(
        npc.id,
        scenario,
        currentDay,
        oldOdds,
        newOdds
      );

      if (reaction.shouldPost) {
        this.postToFeed({
          authorId: npc.id,
          authorName: npc.name,
          content: reaction.content,
          isSystemMessage: false
        });
      }
    }
  }

  public getAgentShares(agentId: string): { yes: number; no: number } {
    return this.agentShares.get(agentId) || { yes: 0, no: 0 };
  }

  public sellShares(agentId: string, outcome: Outcome.YES | Outcome.NO, numShares: number): boolean {
    if (!this.currentGame || !this.currentGame.predictionsOpen || !this.marketMaker) {
      return false;
    }

    // Validate shares
    if (numShares <= 0) {
      return false;
    }

    // Check if agent owns enough shares
    const agentShareRecord = this.agentShares.get(agentId);
    if (!agentShareRecord) {
      return false;
    }

    const sharesOwned = outcome === Outcome.YES ? agentShareRecord.yes : agentShareRecord.no;
    if (sharesOwned < numShares) {
      return false; // Not enough shares
    }

    // Execute the sell on the market maker
    const result = this.marketMaker.sell(
      outcome === Outcome.YES ? 'YES' : 'NO',
      numShares
    );

    // Update agent's shares
    if (outcome === Outcome.YES) {
      agentShareRecord.yes -= numShares;
    } else {
      agentShareRecord.no -= numShares;
    }
    this.agentShares.set(agentId, agentShareRecord);

    // Record the sell as a negative bet (for tracking purposes)
    const sellRecord: Bet = {
      agentId,
      outcome,
      amount: -result.proceeds, // Negative to indicate sell
      timestamp: new Date(),
      gameDay: this.currentGame.currentDay,
      odds: Math.round(result.newPrice * 100)
    };

    this.currentGame.market.bets.push(sellRecord);

    // Update market state with LMSR prices
    this.updateMarketState();

    this.broadcast({
      type: 'market_update',
      data: this.currentGame.market
    });

    // Send proceeds notification to agent
    this.sendToAgent(agentId, {
      type: 'shares_sold',
      data: {
        outcome: outcome === Outcome.YES ? 'YES' : 'NO',
        shares: numShares,
        proceeds: result.proceeds,
        newPrice: result.newPrice
      }
    });

    return true;
  }

  private getNPCName(npcId: string): string {
    if (!this.currentGame) return npcId;
    const npc = this.currentGame.scenario.npcs.find(n => n.id === npcId);
    return npc ? npc.name : npcId;
  }

  /**
   * Start periodic NPC activity
   */
  private startNPCActivity(): void {
    if (this.npcActivityInterval) {
      clearInterval(this.npcActivityInterval);
    }

    // NPCs post periodically every 60-120 seconds
    this.npcActivityInterval = setInterval(async () => {
      if (!this.currentGame || this.currentGame.phase === GamePhase.ENDED) {
        return;
      }

      // Run NPC activities in parallel without blocking
      const npcActivities = this.currentGame.scenario.npcs.map(npc =>
        this.runNPCActivity(npc).catch(err => {
          console.warn(`NPC ${npc.id} activity error:`, err);
        })
      );

      // Don't await - let them run in background
      Promise.all(npcActivities);
    }, 90000); // Every 90 seconds
  }

  /**
   * Run a single NPC's activity (non-blocking)
   */
  private async runNPCActivity(npc: NPC): Promise<void> {
    if (!this.currentGame) return;

    const recentPosts = this.currentGame.feed.slice(-10);
    const currentDay = this.currentGame.currentDay;
    const scenario = this.currentGame.scenario;
    const phase = this.currentGame.phase;

    // 1. Check for periodic posting
    const frequency = this.npcAI.getPostingFrequency(npc.id, phase);
    const shouldAttemptPost = Math.random() < (frequency / 60); // Convert to per-minute probability

    if (shouldAttemptPost) {
      const response = await this.npcAI.generatePeriodicActivity(
        npc.id,
        scenario,
        currentDay,
        recentPosts
      );

      if (response.shouldPost) {
        this.postToFeed({
          authorId: npc.id,
          authorName: npc.name,
          content: response.content,
          isSystemMessage: false
        });
      }
    }

    // 2. Check for information leaks
    const leakResponse = await this.npcAI.leakInformation(
      npc.id,
      scenario,
      currentDay,
      { yesOdds: this.currentGame.market.yesOdds, noOdds: this.currentGame.market.noOdds }
    );

    if (leakResponse.shouldPost) {
      this.postToFeed({
        authorId: npc.id,
        authorName: npc.name,
        content: leakResponse.content,
        isSystemMessage: false
      });
    }

    // 3. Check for NPC-to-NPC interactions
    const recentNPCPosts = recentPosts.filter(p =>
      scenario.npcs.some(n => n.id === p.authorId) && p.authorId !== npc.id
    );

    if (recentNPCPosts.length > 0) {
      const targetPost = recentNPCPosts[Math.floor(Math.random() * recentNPCPosts.length)];
      const interactionResponse = await this.npcAI.generateNPCtoNPCInteraction(
        npc.id,
        targetPost,
        scenario,
        currentDay
      );

      if (interactionResponse.shouldPost) {
        this.postToFeed({
          authorId: npc.id,
          authorName: npc.name,
          content: interactionResponse.content,
          isSystemMessage: false,
          replyTo: targetPost.id
        });
      }
    }
  }

  /**
   * Handle NPC mentions in posts
   */
  private async handleNPCMentions(post: Post): Promise<void> {
    if (!this.currentGame) return;

    // Find @mentions in the post content
    const mentionRegex = /@(\w+)/g;
    const mentions = post.content.match(mentionRegex);

    if (!mentions) return;

    for (const mention of mentions) {
      const mentionedName = mention.substring(1).toLowerCase();

      // Find NPC by name
      const npc = this.currentGame.scenario.npcs.find(
        n => n.name.toLowerCase().includes(mentionedName)
      );

      if (npc) {
        // Generate NPC response
        const response = await this.npcAI.handleMention(
          npc.id,
          post,
          this.currentGame.scenario,
          this.currentGame.currentDay
        );

        if (response.shouldPost) {
          // Post response after a brief delay (seems more natural)
          setTimeout(() => {
            this.postToFeed({
              authorId: npc.id,
              authorName: npc.name,
              content: response.content,
              isSystemMessage: false,
              replyTo: post.id
            });
          }, 2000 + Math.random() * 3000); // 2-5 second delay
        }
      }
    }
  }

  /**
   * Add query-npc skill for direct NPC dialogue
   * Now integrated with InformationEngine to return relevant clues
   */
  public async queryNPC(agentId: string, npcId: string, question: string): Promise<string> {
    if (!this.currentGame) {
      return 'No active game';
    }

    const npc = this.currentGame.scenario.npcs.find(n => n.id === npcId);
    if (!npc) {
      return 'NPC not found';
    }

    // Check if agent has any clues from this NPC via InformationEngine
    const cluesFromNPC = this.informationEngine.getCluesByNPC(
      agentId,
      npcId,
      this.currentGame.currentDay
    );

    // If agent has clues from this NPC and asks about the event, return a clue
    const isAskingAboutEvent = question.toLowerCase().match(
      /info|intel|know|tell me|what|happen|outcome|succeed|fail|omega|project|satellite|launch/
    );

    if (cluesFromNPC.length > 0 && isAskingAboutEvent) {
      // Return the most recent clue they haven't seen in a query yet
      const latestClue = cluesFromNPC[cluesFromNPC.length - 1];

      // Wrap the clue content in a natural response
      const response = `${npc.name} responds: ${latestClue.content}`;
      return response;
    }

    // Fall back to AI-generated response
    const mockPost: Post = {
      id: uuidv4(),
      authorId: agentId,
      authorName: 'Agent',
      content: question,
      timestamp: new Date(),
      gameDay: this.currentGame.currentDay,
      isSystemMessage: false
    };

    const aiResponse = await this.npcAI.handleMention(
      npcId,
      mockPost,
      this.currentGame.scenario,
      this.currentGame.currentDay
    );

    // If AI response is empty and agent has clues, provide general hint
    if (!aiResponse.content && cluesFromNPC.length > 0) {
      return `${npc.name}: I've already told you what I know. Check your messages.`;
    }

    return aiResponse.content || 'No response';
  }

  /**
   * Get agent's information advantage (wrapper for InformationEngine)
   */
  public getAgentInformationAdvantage(agentId: string): {
    expectedValue: number;
    cluesReceived: number;
    cluesRemaining: number;
    percentile: number;
  } {
    if (!this.currentGame) {
      return { expectedValue: 0, cluesReceived: 0, cluesRemaining: 0, percentile: 0 };
    }

    return this.informationEngine.getInformationAdvantage(agentId, this.currentGame.currentDay);
  }

  /**
   * Get agent's clue history (wrapper for InformationEngine)
   */
  public getAgentClueHistory(agentId: string): Array<{
    day: number;
    clues: Array<{
      id: string;
      content: string;
      npcId: string;
      isTruthful: boolean;
      tier: string;
    }>;
  }> {
    if (!this.currentGame) {
      return [];
    }

    return this.informationEngine.getClueHistory(agentId, this.currentGame.currentDay);
  }
}

