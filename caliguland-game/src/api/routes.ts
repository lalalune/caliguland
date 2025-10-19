import { Router, Request, Response } from 'express';
import { GameEngine } from '../game/engine';
import {
  JoinGameRequest,
  PostMessageRequest,
  SendDMRequest,
  MakePredictionRequest,
  CreateGroupChatRequest,
  Agent,
  DirectMessage
} from '../types';

export function apiRouter(gameEngine: GameEngine): Router {
  const router = Router();

  /**
   * @swagger
   * /api/v1/join:
   *   post:
   *     summary: Join the game lobby
   *     tags: [game]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               agentId:
   *                 type: string
   *               signature:
   *                 type: string
   *     responses:
   *       200:
   *         description: Successfully joined the game
   *       400:
   *         description: Game lobby is full
   *       403:
   *         description: Agent not registered in ERC-8004
   */
  router.post('/join', async (req: Request, res: Response) => {
    try {
      const { agentId, signature } = req.body as JoinGameRequest;

      // Verify agent signature/credentials via ERC-8004
      let agentName = `Agent_${agentId.slice(0, 8)}`;
      let agentType: 'human' | 'ai' = 'human';
      let reputation = 50;
      let wins = 0;

      const registryAddress = process.env.REGISTRY_ADDRESS;
      if (registryAddress && signature) {
        try {
          const { ethers } = await import('ethers');
          const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
          
          // ERC-8004 registry ABI
          const registryABI = [
            'function isRegistered(address agent) external view returns (bool)',
            'function getAgentMetadata(address agent) external view returns (string memory)'
          ];
          const registry = new ethers.Contract(registryAddress, registryABI, provider);
          
          // Recover address from signature
          const message = `Join game: ${agentId}`;
          const recoveredAddress = ethers.verifyMessage(message, signature);
          
          // Check if registered
          const isRegistered = await registry.isRegistered(recoveredAddress);
          if (!isRegistered) {
            return res.status(403).json({
              success: false,
              message: 'Agent not registered in ERC-8004'
            });
          }
          
          // Get metadata
          const metadataJson = await registry.getAgentMetadata(recoveredAddress);
          if (metadataJson) {
            const metadata = JSON.parse(metadataJson);
            agentName = metadata.name || agentName;
            agentType = metadata.type === 'ai' ? 'ai' : 'human';
            reputation = metadata.reputation || 50;
            wins = metadata.wins || 0;
          }
        } catch (error) {
          console.error('Registry verification error:', error);
          // Continue with defaults if registry check fails
        }
      }

      const agent: Agent = {
        id: agentId,
        name: agentName,
        type: agentType,
        reputation,
        wins
      };

      const joined = gameEngine.joinLobby(agent);

      if (joined) {
        res.json({
          success: true,
          message: 'Joined game lobby',
          agentId: agent.id
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Game lobby is full'
        });
      }
    } catch (error) {
      console.error('Join error:', error);
      res.status(500).json({ error: 'Failed to join game' });
    }
  });

  /**
   * @swagger
   * /api/v1/game:
   *   get:
   *     summary: Get current game state
   *     tags: [game]
   *     responses:
   *       200:
   *         description: Current game state or lobby state
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GameState'
   */
  router.get('/game', (req: Request, res: Response) => {
    const game = gameEngine.getCurrentGame();
    const lobbyState = gameEngine.getLobbyState();
    
    if (!game) {
      // Return lobby state
      return res.json({
        id: 'lobby',
        question: 'Waiting for players...',
        description: `Join the lobby! ${lobbyState.players.length}/${lobbyState.minPlayers} players needed to start.`,
        phase: 'LOBBY',
        currentDay: 0,
        maxDay: 30,
        players: lobbyState.players,
        market: {
          yesShares: 0,
          noShares: 0,
          yesOdds: 50,
          noOdds: 50,
          totalVolume: 0,
          bets: []
        },
        feed: [],
        predictionsOpen: false,
        revealed: false
      });
    }

    // Return sanitized game state (hide secret outcome)
    res.json({
      id: game.id,
      question: game.scenario.question,
      description: game.scenario.description,
      phase: game.phase,
      currentDay: game.currentDay,
      maxDay: 30,
      players: game.agents.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        reputation: a.reputation,
        wins: a.wins
      })),
      market: game.market,
      feed: game.feed.slice(-50),
      predictionsOpen: game.predictionsOpen,
      revealed: game.revealed,
      finalOutcome: game.finalOutcome
    });
  });

  /**
   * @swagger
   * /api/v1/feed:
   *   get:
   *     summary: Get public feed posts
   *     tags: [social]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *     responses:
   *       200:
   *         description: List of feed posts
   */
  router.get('/feed', (req: Request, res: Response) => {
    const game = gameEngine.getCurrentGame();
    
    if (!game) {
      return res.json({ posts: [] });
    }

    const limit = parseInt(req.query.limit as string) || 100;
    const posts = game.feed.slice(-limit);

    res.json({ posts });
  });

  /**
   * @swagger
   * /api/v1/post:
   *   post:
   *     summary: Post to public feed
   *     tags: [social]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               agentId:
   *                 type: string
   *               content:
   *                 type: string
   *               replyTo:
   *                 type: string
   *     responses:
   *       200:
   *         description: Post successful
   *       400:
   *         description: No active game
   *       403:
   *         description: Agent not in game
   */
  router.post('/post', (req: Request, res: Response) => {
    try {
      const { agentId, content, replyTo } = req.body as PostMessageRequest;

      // Verify agent is in current game

      const game = gameEngine.getCurrentGame();
      if (!game) {
        return res.status(400).json({ error: 'No active game' });
      }

      const agent = game.agents.find(a => a.id === agentId);
      if (!agent) {
        return res.status(403).json({ error: 'Agent not in game' });
      }

      gameEngine.postToFeed({
        authorId: agentId,
        authorName: agent.name,
        content: content.slice(0, 280), // Enforce character limit
        replyTo
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Post error:', error);
      res.status(500).json({ error: 'Failed to post' });
    }
  });

  /**
   * POST /dm - Send direct message
   */
  router.post('/dm', (req: Request, res: Response) => {
    try {
      const { from, to, content } = req.body as SendDMRequest;

      const game = gameEngine.getCurrentGame();
      if (!game) {
        return res.status(400).json({ error: 'No active game' });
      }

      gameEngine.sendDirectMessage({ from, to, content });

      res.json({ success: true });
    } catch (error) {
      console.error('DM error:', error);
      res.status(500).json({ error: 'Failed to send DM' });
    }
  });

  /**
   * GET /dm/:agentId - Get DMs for an agent
   */
  router.get('/dm/:agentId', (req: Request, res: Response) => {
    const game = gameEngine.getCurrentGame();
    
    if (!game) {
      return res.json({ messages: [] });
    }

    const { agentId } = req.params;
    const messages: DirectMessage[] = [];

    // Collect all DMs involving this agent
    game.directMessages.forEach((msgs, key) => {
      if (key.includes(agentId)) {
        messages.push(...msgs);
      }
    });

    res.json({ messages: messages.sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    )});
  });

  /**
   * @swagger
   * /api/v1/bet:
   *   post:
   *     summary: Place a bet
   *     tags: [prediction]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               agentId:
   *                 type: string
   *               outcome:
   *                 type: string
   *                 enum: [yes, no]
   *               amount:
   *                 type: number
   *     responses:
   *       200:
   *         description: Bet placed successfully
   *       400:
   *         description: Predictions are closed or invalid bet
   */
  router.post('/bet', (req: Request, res: Response) => {
    try {
      const { agentId, outcome, amount } = req.body as MakePredictionRequest;

      const game = gameEngine.getCurrentGame();
      if (!game) {
        return res.status(400).json({ error: 'No active game' });
      }

      if (!game.predictionsOpen) {
        return res.status(400).json({ error: 'Predictions are closed' });
      }

      const placed = gameEngine.placeBet(agentId, outcome, amount);

      if (placed) {
        res.json({
          success: true,
          market: game.market
        });
      } else {
        res.status(400).json({ error: 'Failed to place bet' });
      }
    } catch (error) {
      console.error('Bet error:', error);
      res.status(500).json({ error: 'Failed to place bet' });
    }
  });

  /**
   * @swagger
   * /api/v1/market:
   *   get:
   *     summary: Get current market state
   *     tags: [prediction]
   *     responses:
   *       200:
   *         description: Current market state
   */
  router.get('/market', (req: Request, res: Response) => {
    const game = gameEngine.getCurrentGame();
    
    if (!game) {
      return res.json({ error: 'No active game' });
    }

    res.json(game.market);
  });

  /**
   * POST /group - Create group chat
   */
  router.post('/group', (req: Request, res: Response) => {
    try {
      const { agentId, name, members } = req.body as CreateGroupChatRequest;

      const game = gameEngine.getCurrentGame();
      if (!game) {
        return res.status(400).json({ error: 'No active game' });
      }

      // Verify agent is in game
      const agent = game.agents.find(a => a.id === agentId);
      if (!agent) {
        return res.status(403).json({ error: 'Agent not in game' });
      }

      // Validate members
      if (!members || members.length === 0) {
        return res.status(400).json({ error: 'Must specify at least one member' });
      }

      // Create group via game engine
      const groupId = gameEngine.createGroupChat(agentId, name, members);
      
      res.json({
        success: true,
        groupId
      });
    } catch (error) {
      console.error('Group creation error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create group' 
      });
    }
  });

  /**
   * GET /docs - API documentation
   */
  router.get('/docs', (req: Request, res: Response) => {
    res.json({
      name: 'VibeVM Prediction Game API',
      version: '0.1.0',
      endpoints: {
        'POST /join': 'Join the game lobby',
        'GET /game': 'Get current game state',
        'GET /feed': 'Get public feed posts',
        'POST /post': 'Post to public feed',
        'POST /dm': 'Send direct message',
        'GET /dm/:agentId': 'Get DMs for agent',
        'POST /bet': 'Place a bet',
        'GET /market': 'Get market state',
        'POST /group': 'Create group chat'
      },
      websocket: {
        endpoint: '/ws?agentId=<your-agent-id>',
        events: ['game_started', 'day_changed', 'new_post', 'direct_message', 'market_update', 'betting_closed', 'game_ended']
      }
    });
  });

  return router;
}

