/**
 * A2A JSON-RPC Server for Prediction Game
 * Handles A2A protocol requests with signature verification
 */

import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { GameEngine } from '../game/engine';
import { generateAgentCard } from './agentCard';
import { Outcome } from '../types';
import type {
  JoinGameParams,
  MakePredictionParams,
  SellSharesParams,
  PostToFeedParams,
  SendDMParams,
  FollowParams,
  ReactToPostParams,
  GetNPCBioParams,
  QueryNPCParams,
  SubmitFeedbackParams,
  GetReputationParams,
  GetLeaderboardParams,
  CreateGroupParams,
  SendGroupMessageParams,
  LeaveGroupParams,
  InviteToGroupParams
} from './skillTypes';

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id?: string | number;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface A2AMessage {
  role: 'user' | 'agent';
  parts: Array<{ kind: string; text?: string; data?: Record<string, unknown> }>;
  messageId: string;
  kind: 'message';
}

const A2A_ERROR_CODES = {
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SIGNATURE_FAILED: -32001
};

// Validation helpers - throw on invalid input (fail-fast)
function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return value;
}

function requireNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  return value;
}

function requireStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new Error(`${fieldName} must be an array of strings`);
  }
  return value;
}

function optionalString(value: unknown, fallback: string = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function optionalNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && !isNaN(value) ? value : fallback;
}

function firstDefined<T>(...values: (T | undefined | null)[]): T {
  for (const val of values) {
    if (val !== undefined && val !== null) {
      return val;
    }
  }
  throw new Error('No defined value found');
}

export class A2AServer {
  private gameEngine: GameEngine;
  private serverUrl: string;
  private seenMessageIds: Set<string> = new Set();

  constructor(gameEngine: GameEngine, serverUrl: string) {
    this.gameEngine = gameEngine;
    this.serverUrl = serverUrl;
  }

  createRouter(): Router {
    const router = Router();

    // Agent Card
    router.get('/.well-known/agent-card.json', (req: Request, res: Response) => {
      res.json(generateAgentCard(this.serverUrl));
    });

    // A2A JSON-RPC endpoint
    router.post('/a2a', async (req: Request, res: Response) => {
      await this.handleRequest(req, res);
    });

    return router;
  }

  async handleRequest(req: Request, res: Response): Promise<void> {
    const request = req.body as JSONRPCRequest;

    // Validate JSON-RPC
    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      res.json(this.createError(request.id ?? null, A2A_ERROR_CODES.INVALID_REQUEST, 'Invalid JSON-RPC version'));
      return;
    }

    if (!request.method) {
      res.json(this.createError(request.id ?? null, A2A_ERROR_CODES.INVALID_REQUEST, 'Missing method'));
      return;
    }

    // Route to handler
    switch (request.method) {
      case 'message/send':
        await this.handleMessageSend(request, res, false);
        break;
      
      case 'message/stream':
        await this.handleMessageSend(request, res, true);
        break;
      
      default:
        res.json(this.createError(request.id ?? null, A2A_ERROR_CODES.METHOD_NOT_FOUND, `Unknown method: ${request.method}`));
    }
  }

  private async handleMessageSend(request: JSONRPCRequest, res: Response, streaming: boolean): Promise<void> {
    const params = request.params as { message?: A2AMessage };

    if (!params || !params.message) {
      res.json(this.createError(request.id ?? null, A2A_ERROR_CODES.INVALID_PARAMS, 'Missing message'));
      return;
    }

    const message = params.message;

    // Extract data part
    const dataPart = message.parts.find(p => p.kind === 'data');
    if (!dataPart || !dataPart.data) {
      res.json(this.createError(request.id ?? null, A2A_ERROR_CODES.INVALID_PARAMS, 'Missing data part'));
      return;
    }

    const data = dataPart.data;

    // Validate required auth fields
    let skillId: string, agentId: string, agentAddress: string, signature: string, timestamp: number;
    try {
      skillId = requireString(data.skillId, 'skillId');
      agentId = requireString(data.agentId, 'agentId');
      agentAddress = requireString(data.agentAddress, 'agentAddress');
      signature = requireString(data.signature, 'signature');
      timestamp = requireNumber(data.timestamp, 'timestamp');
    } catch (error) {
      res.json(this.createError(request.id ?? null, A2A_ERROR_CODES.INVALID_PARAMS, (error as Error).message));
      return;
    }

    // Verify signature
    const validation = await this.verifySignature(message.messageId, timestamp, skillId, data, signature, agentAddress);
    if (!validation.valid) {
      res.json(this.createError(request.id ?? null, A2A_ERROR_CODES.SIGNATURE_FAILED, validation.error || 'Signature verification failed'));
      return;
    }

    // Prevent replay attacks
    if (this.seenMessageIds.has(message.messageId)) {
      res.json(this.createError(request.id ?? null, A2A_ERROR_CODES.INVALID_REQUEST, 'Duplicate message ID'));
      return;
    }
    this.seenMessageIds.add(message.messageId);

    // Execute skill
    const result = await this.executeSkill(skillId, agentId, data);

    if (!result.success) {
      res.json(this.createError(request.id ?? null, A2A_ERROR_CODES.INTERNAL_ERROR, result.message));
      return;
    }

    // Return response
    const responseMessage: A2AMessage = {
      role: 'agent',
      parts: [
        { kind: 'text', text: result.message },
        ...(result.data ? [{ kind: 'data', data: result.data }] : [])
      ],
      messageId: uuidv4(),
      kind: 'message'
    };

    if (streaming) {
      this.setupSSE(res);
      res.write(`data: ${JSON.stringify(this.createSuccess(request.id ?? null, responseMessage))}\n\n`);
      // Keep connection open for game events
    } else {
      res.json(this.createSuccess(request.id ?? null, responseMessage));
    }
  }

  private async verifySignature(
    messageId: string,
    timestamp: number,
    skillId: string,
    data: Record<string, unknown>,
    signature: string,
    claimedAddress: string
  ): Promise<{ valid: boolean; error?: string }> {
    // Check timestamp
    const age = Date.now() - timestamp;
    if (age > 5 * 60 * 1000) {
      return { valid: false, error: 'Message too old' };
    }

    // Reconstruct signature payload (ONLY skill data, exclude auth fields)
    const { agentId: _, agentAddress: __, agentDomain: ___, playerName: ____, signature: _____, timestamp: ______, skillId: _______, ...skillData } = data;
    
    const payload = JSON.stringify({
      messageId,
      timestamp,
      skillId,
      data: skillData
    });

    // Verify signature
    try {
      const recoveredAddress = ethers.verifyMessage(payload, signature);
      
      if (recoveredAddress.toLowerCase() !== claimedAddress.toLowerCase()) {
        return { valid: false, error: `Signature mismatch: ${recoveredAddress} vs ${claimedAddress}` };
      }

      // Verify agent is registered in ERC-8004
      const registryAddress = process.env.REGISTRY_ADDRESS;
      if (registryAddress) {
        try {
          const { ethers } = await import('ethers');
          const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
          
          // ERC-8004 minimal ABI
          const registryABI = ['function isRegistered(address agent) external view returns (bool)'];
          const registry = new ethers.Contract(registryAddress, registryABI, provider);
          
          const isRegistered = await registry.isRegistered(claimedAddress);
          if (!isRegistered) {
            return { valid: false, error: `Agent ${claimedAddress} not registered in ERC-8004` };
          }
        } catch (error) {
          console.warn('Failed to verify ERC-8004 registration:', error);
          // Non-blocking: allow if registry check fails (for development)
        }
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Signature verification failed: ${error}` };
    }
  }

  private async executeSkill(skillId: string, agentId: string, data: Record<string, unknown>): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> {
    const game = this.gameEngine.getCurrentGame();

    switch (skillId) {
      case 'join-game':
        const agent = {
          id: agentId,
          name: optionalString(data.playerName, `Agent_${agentId.slice(0, 8)}`),
          type: 'ai' as const,
          reputation: 50,
          wins: 0
        };

        const joined = this.gameEngine.joinLobby(agent);

        return {
          success: joined,
          message: joined ? 'Joined game lobby' : 'Lobby is full',
          data: { playerId: agentId }
        };
      
      case 'leave-game':
        if (!game) {
          return { success: false, message: 'No active game to leave' };
        }

        const agentIndex = game.agents.findIndex(a => a.id === agentId);
        if (agentIndex === -1) {
          return { success: false, message: 'Not in game' };
        }

        // Remove agent from game
        game.agents.splice(agentIndex, 1);
        
        // Clean up agent data
        game.market.bets = game.market.bets.filter(b => b.agentId !== agentId);
        
        return { success: true, message: 'Left the game' };
      
      case 'get-status':
        if (!game) {
          return {
            success: true,
            message: 'No active game',
            data: { active: false, phase: 'lobby' }
          };
        }

        const agent_status = game.agents.find(a => a.id === agentId);
        const myBets = game.market.bets.filter(b => b.agentId === agentId);

        return {
          success: true,
          message: 'Status retrieved',
          data: {
            gameId: game.id,
            question: game.scenario.question,
            phase: game.phase,
            day: game.currentDay,
            predictionsOpen: game.predictionsOpen,
            market: {
              yesOdds: game.market.yesOdds,
              noOdds: game.market.noOdds
            },
            myBets: myBets.map(b => ({ outcome: b.outcome, amount: b.amount, odds: b.odds })),
            playerName: agent_status?.name,
            playerCount: game.agents.length
          }
        };
      
      case 'post-to-feed':
        const content = firstDefined(data.content as string | undefined, data.message as string | undefined);
        if (!game) {
          return { success: false, message: 'No active game' };
        }

        const poster = game.agents.find(a => a.id === agentId);
        if (!poster) {
          return { success: false, message: 'Not in game' };
        }

        this.gameEngine.postToFeed({
          authorId: agentId,
          authorName: poster.name,
          content: content.slice(0, 280)
        });

        return { success: true, message: 'Posted to feed' };
      
      case 'send-dm':
        const to = firstDefined(data.to as string | undefined, data.targetId as string | undefined);
        const dmContent = firstDefined(data.content as string | undefined, data.message as string | undefined);

        if (!to || !dmContent) {
          return { success: false, message: 'Missing recipient or content' };
        }

        this.gameEngine.sendDirectMessage({ from: agentId, to, content: dmContent });
        return { success: true, message: 'DM sent' };

      case 'follow':
        const followTargetId = firstDefined(data.targetId as string | undefined, data.agentId as string | undefined);
        if (!followTargetId) {
          return { success: false, message: 'Missing target ID' };
        }

        const followed = this.gameEngine.followAgent(agentId, followTargetId);
        return {
          success: followed,
          message: followed ? `Now following ${followTargetId}` : 'Already following or target not found'
        };

      case 'unfollow':
        const unfollowTargetId = firstDefined(data.targetId as string | undefined, data.agentId as string | undefined);
        if (!unfollowTargetId) {
          return { success: false, message: 'Missing target ID' };
        }

        const unfollowed = this.gameEngine.unfollowAgent(agentId, unfollowTargetId);
        return {
          success: unfollowed,
          message: unfollowed ? `Unfollowed ${unfollowTargetId}` : 'Not following this agent'
        };

      case 'get-following':
        const following = this.gameEngine.getFollowing(agentId);
        return {
          success: true,
          message: `Following ${following.length} agents`,
          data: { following }
        };

      case 'get-followers':
        const followers = this.gameEngine.getFollowers(agentId);
        return {
          success: true,
          message: `${followers.length} followers`,
          data: { followers }
        };

      case 'react-to-post':
        const postId = requireString(data.postId, "postId");
        const reaction = requireString(data.reaction, 'reaction') as 'like' | 'dislike';

        if (!postId || !reaction) {
          return { success: false, message: 'Missing post ID or reaction' };
        }

        const reacted = this.gameEngine.reactToPost(postId, agentId, reaction);
        return {
          success: reacted,
          message: reacted ? `Reacted ${reaction} to post` : 'Post not found'
        };

      case 'get-post-reactions':
        const reactionsPostId = requireString(data.postId, "postId");

        if (!reactionsPostId) {
          return { success: false, message: 'Missing post ID' };
        }

        const reactionsData = this.gameEngine.getPostReactions(reactionsPostId);
        if (!reactionsData) {
          return { success: false, message: 'Post not found' };
        }

        return {
          success: true,
          message: `Post has ${reactionsData.likeCount} likes and ${reactionsData.dislikeCount} dislikes`,
          data: reactionsData
        };

      case 'get-mentions':
        if (!game) {
          return { success: true, message: 'No active game', data: { mentions: [] } };
        }

        // Find all posts that mention this agent
        const mentionedPosts = game.feed.filter(post =>
          post.mentions && post.mentions.includes(agentId)
        );

        return {
          success: true,
          message: `Found ${mentionedPosts.length} mentions`,
          data: {
            mentions: mentionedPosts.map(post => ({
              postId: post.id,
              authorId: post.authorId,
              authorName: post.authorName,
              content: post.content,
              timestamp: post.timestamp,
              gameDay: post.gameDay
            }))
          }
        };
      
      case 'make-prediction':
        const outcome = requireString(data.outcome, 'outcome') as 'YES' | 'NO';
        const amount = requireNumber(data.amount, "amount");

        if (!outcome || !amount) {
          return { success: false, message: 'Missing outcome or amount' };
        }

        if (!game || !game.predictionsOpen) {
          return { success: false, message: 'Predictions are closed' };
        }

        // Convert string to Outcome enum
        const outcomeEnum = outcome === 'YES' ? Outcome.YES : outcome === 'NO' ? Outcome.NO : null;
        if (!outcomeEnum) {
          return { success: false, message: 'Invalid outcome' };
        }

        const betPlaced = this.gameEngine.placeBet(agentId, outcomeEnum, amount);

        return {
          success: betPlaced,
          message: betPlaced ? `Bet placed: ${amount} on ${outcome}` : 'Failed to place bet',
          data: betPlaced ? { market: game.market } : undefined
        };

      case 'sell-shares':
        const sellOutcome = requireString(data.outcome, 'outcome') as 'YES' | 'NO';
        const numShares = firstDefined(data.shares as number | undefined, data.numShares as number | undefined);

        if (!sellOutcome || !numShares) {
          return { success: false, message: 'Missing outcome or shares' };
        }

        if (!game || !game.predictionsOpen) {
          return { success: false, message: 'Trading is closed' };
        }

        // Convert string to Outcome enum
        const sellOutcomeEnum = sellOutcome === 'YES' ? Outcome.YES : sellOutcome === 'NO' ? Outcome.NO : null;
        if (!sellOutcomeEnum) {
          return { success: false, message: 'Invalid outcome' };
        }

        const sharesSold = this.gameEngine.sellShares(agentId, sellOutcomeEnum, numShares);

        return {
          success: sharesSold,
          message: sharesSold ? `Sold ${numShares} ${sellOutcome} shares` : 'Failed to sell shares (insufficient shares or market closed)',
          data: sharesSold ? { market: game.market, shares: this.gameEngine.getAgentShares(agentId) } : undefined
        };
      
      case 'get-feed':
        if (!game) {
          return { success: true, message: 'No active game', data: { posts: [] } };
        }

        const feedLimit = optionalNumber(data.limit, 50);
        const posts = game.feed.slice(-feedLimit);

        return {
          success: true,
          message: `Retrieved ${posts.length} posts`,
          data: { posts }
        };
      
      case 'get-market':
        if (!game) {
          return { success: false, message: 'No active game' };
        }

        return {
          success: true,
          message: 'Market state retrieved',
          data: { market: game.market }
        };

      case 'get-shares':
        if (!game) {
          return { success: false, message: 'No active game' };
        }

        const shares = this.gameEngine.getAgentShares(agentId);
        return {
          success: true,
          message: `You own ${shares.yes.toFixed(2)} YES shares and ${shares.no.toFixed(2)} NO shares`,
          data: { shares }
        };
      
      case 'get-npc-info':
        const npcId = requireString(data.npcId, "npcId");
        if (!game || !npcId) {
          return { success: false, message: 'Missing NPC ID or no active game' };
        }

        const npc = game.scenario.npcs.find(n => n.id === npcId);
        if (!npc) {
          return { success: false, message: 'NPC not found' };
        }

        return {
          success: true,
          message: 'NPC info retrieved',
          data: {
            id: npc.id,
            name: npc.name,
            bio: npc.bio,
            role: npc.role,
            // Don't reveal tendsToBeTruthful - players must figure it out
          }
        };

      case 'query-npc':
        const queryNpcId = requireString(data.npcId, "npcId");
        const question = firstDefined(data.question as string | undefined, data.message as string | undefined);

        if (!game || !queryNpcId || !question) {
          return { success: false, message: 'Missing NPC ID, question, or no active game' };
        }

        const npcResponse = await this.gameEngine.queryNPC(agentId, queryNpcId, question);
        return {
          success: true,
          message: `${game.scenario.npcs.find(n => n.id === queryNpcId)?.name} responded`,
          data: { response: npcResponse }
        };
      
      case 'analyze-sentiment':
        if (!game) {
          return { success: false, message: 'No active game' };
        }

        // Simple sentiment analysis
        const recentPosts = game.feed.slice(-20);
        let positiveCount = 0;
        let negativeCount = 0;

        for (const post of recentPosts) {
          const lower = post.content.toLowerCase();
          if (lower.match(/succeed|success|confident|ready|good|great/)) positiveCount++;
          if (lower.match(/fail|doom|problem|bad|trouble|cancel/)) negativeCount++;
        }

        const total = positiveCount + negativeCount;
        const sentiment = total === 0 ? 'neutral' : positiveCount > negativeCount ? 'positive' : 'negative';
        const confidence = total === 0 ? 0 : Math.max(positiveCount, negativeCount) / total;

        return {
          success: true,
          message: `Sentiment: ${sentiment} (${(confidence * 100).toFixed(0)}% confidence)`,
          data: { sentiment, confidence, positiveCount, negativeCount, total }
        };

      case 'submit-feedback':
        const targetAgentId = firstDefined(data.targetId as string | undefined, data.agentId as string | undefined);
        const category = requireString(data.category, 'category') as 'honesty' | 'deception' | 'cooperation' | 'hostility' | 'skill';
        const rating = requireNumber(data.rating, "rating");
        const comment = optionalString(data.comment);

        if (!targetAgentId || !category || !rating) {
          return { success: false, message: 'Missing targetId, category, or rating' };
        }

        if (rating < 1 || rating > 5) {
          return { success: false, message: 'Rating must be between 1 and 5' };
        }

        const feedbackSubmitted = this.gameEngine.submitFeedback({
          fromAgentId: agentId,
          toAgentId: targetAgentId,
          category,
          rating,
          comment,
          gameId: game?.id || 'unknown',
          timestamp: new Date()
        });

        return {
          success: feedbackSubmitted,
          message: feedbackSubmitted ? 'Feedback submitted' : 'Failed to submit feedback (cannot rate self)'
        };

      case 'get-reputation':
        const repTargetId = firstDefined(data.targetId as string | undefined, data.agentId as string | undefined) || agentId;
        const repScore = this.gameEngine.getReputationScore(repTargetId);

        if (!repScore) {
          return { success: false, message: 'No reputation data found' };
        }

        return {
          success: true,
          message: `Reputation: ${repScore.overallScore}/100`,
          data: repScore as unknown as Record<string, unknown>
        };

      case 'get-leaderboard':
        const leaderboardLimit = optionalNumber(data.limit, 10);
        const leaderboard = this.gameEngine.getReputationLeaderboard(leaderboardLimit);

        return {
          success: true,
          message: `Top ${leaderboard.length} players`,
          data: { leaderboard }
        };

      case 'create-group':
        const groupName = requireString(data.name, "name");
        const memberIds = requireStringArray(data.members, "members");

        if (!groupName || !memberIds || memberIds.length === 0) {
          return { success: false, message: 'Missing name or members' };
        }

        if (!game) {
          return { success: false, message: 'No active game' };
        }

        const groupId = this.gameEngine.createGroupChat(agentId, groupName, memberIds);
        return {
          success: true,
          message: `Group "${groupName}" created`,
          data: { groupId }
        };

      case 'send-group-message':
        const gId = requireString(data.groupId, "groupId");
        const gContent = firstDefined(data.content as string | undefined, data.message as string | undefined);

        if (!gId || !gContent) {
          return { success: false, message: 'Missing groupId or content' };
        }

        if (!game) {
          return { success: false, message: 'No active game' };
        }

        this.gameEngine.sendGroupMessage(gId, agentId, gContent.slice(0, 280));
        return { success: true, message: 'Group message sent' };

      case 'leave-group':
        const leaveGroupId = requireString(data.groupId, "groupId");

        if (!leaveGroupId) {
          return { success: false, message: 'Missing groupId' };
        }

        this.gameEngine.leaveGroupChat(leaveGroupId, agentId);
        return { success: true, message: 'Left group' };

      case 'invite-to-group':
        const inviteGroupId = requireString(data.groupId, "groupId");
        const inviteeId = requireString(data.inviteeId, "inviteeId");

        if (!inviteGroupId || !inviteeId) {
          return { success: false, message: 'Missing groupId or inviteeId' };
        }

        this.gameEngine.inviteToGroupChat(inviteGroupId, agentId, inviteeId);
        return { success: true, message: 'Invitation sent' };

      case 'get-groups':
        const groups = this.gameEngine.getGroupChats(agentId);
        return {
          success: true,
          message: `${groups.length} groups`,
          data: {
            groups: groups.map(g => ({
              id: g.id,
              name: g.name,
              members: g.members,
              messageCount: g.messages.length
            }))
          }
        };

      case 'get-information-advantage':
        if (!game) {
          return { success: false, message: 'No active game' };
        }

        const advantage = this.gameEngine.getAgentInformationAdvantage(agentId);
        return {
          success: true,
          message: `Information advantage: ${advantage.expectedValue.toFixed(1)} (${advantage.percentile}th percentile)`,
          data: advantage
        };

      case 'get-clue-history':
        if (!game) {
          return { success: false, message: 'No active game' };
        }

        const clueHistory = this.gameEngine.getAgentClueHistory(agentId);
        return {
          success: true,
          message: `Received ${clueHistory.reduce((sum, day) => sum + day.clues.length, 0)} clues across ${clueHistory.length} days`,
          data: { history: clueHistory }
        };

      default:
        return { success: false, message: `Unknown skill: ${skillId}` };
    }
  }

  private setupSSE(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
  }

  private createSuccess(id: string | number | null, result: unknown): JSONRPCResponse {
    return { jsonrpc: '2.0', id, result };
  }

  private createError(id: string | number | null, code: number, message: string, data?: unknown): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: { code, message, data }
    };
  }
}

