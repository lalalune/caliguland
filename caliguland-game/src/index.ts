import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { GameEngine, BroadcastMessage } from './game/engine';
import { apiRouter } from './api/routes';
import { A2AServer } from './a2a/server';
import { MCPServer } from './mcp/server';
import { config } from './config';
import { autoRegisterToRegistry } from './a2a/registry';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Swagger configuration
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'VibeVM Prediction Game API',
      version: '0.1.0',
      description: 'ERC-8004 Social Prediction Game with TEE Integration - API for joining games, placing bets, and social interactions',
    },
    servers: [
      {
        url: process.env.SERVER_URL || `http://localhost:${config.port}`,
        description: 'Game server',
      },
    ],
    tags: [
      { name: 'game', description: 'Game state and lobby endpoints' },
      { name: 'social', description: 'Feed and messaging endpoints' },
      { name: 'prediction', description: 'Prediction and market endpoints' },
    ],
    components: {
      schemas: {
        Agent: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['human', 'ai'] },
            reputation: { type: 'number' },
            wins: { type: 'number' },
          },
        },
        GameState: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            question: { type: 'string' },
            description: { type: 'string' },
            phase: { type: 'string', enum: ['LOBBY', 'SOCIAL', 'BETTING', 'RESOLVED'] },
            currentDay: { type: 'number' },
            maxDay: { type: 'number' },
            players: { type: 'array', items: { $ref: '#/components/schemas/Agent' } },
            predictionsOpen: { type: 'boolean' },
            revealed: { type: 'boolean' },
          },
        },
      },
    },
  },
  apis: ['./src/api/routes.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'VibeVM Game API',
}));

// Initialize Game Engine
const gameEngine = new GameEngine({
  gameDurationMs: config.gameDurationMs,
  maxPlayers: config.maxPlayers,
  minPlayers: config.minPlayers
});

// Set up broadcast functions after engine is created
gameEngine.setBroadcastFunctions(broadcast, sendToAgent);

// Initialize A2A Server
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${config.port}`;
const a2aServer = new A2AServer(gameEngine, SERVER_URL);

// Initialize MCP Server
const mcpServer = new MCPServer(gameEngine);

// WebSocket connection handling
const clients = new Map<string, WebSocket>();

wss.on('connection', (ws: WebSocket, req) => {
  const agentId = new URL(req.url || '', `http://${req.headers.host}`).searchParams.get('agentId');
  
  if (!agentId) {
    ws.close(1008, 'Agent ID required');
    return;
  }

  console.log(`🔌 WebSocket connected: ${agentId}`);
  clients.set(agentId, ws);

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      handleWebSocketMessage(agentId, message, ws);
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    console.log(`🔌 WebSocket disconnected: ${agentId}`);
    clients.delete(agentId);
  });

  // Send initial state
  const currentGame = gameEngine.getCurrentGame();
  if (currentGame) {
    ws.send(JSON.stringify({
      type: 'game_state',
      data: {
        phase: currentGame.phase,
        day: currentGame.currentDay,
        market: currentGame.market,
        feed: currentGame.feed.slice(-50) // Last 50 posts
      }
    }));
  }
});

function handleWebSocketMessage(agentId: string, message: BroadcastMessage, ws: WebSocket) {
  // Handle real-time game actions via WebSocket
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    
    case 'subscribe_feed':
      // Client wants real-time feed updates
      ws.send(JSON.stringify({ type: 'subscribed', channel: 'feed' }));
      break;
    
    default:
      ws.send(JSON.stringify({ error: 'Unknown message type' }));
  }
}

// Broadcast to all connected clients
export function broadcast(message: BroadcastMessage) {
  const data = JSON.stringify(message);
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

// Send to specific agent
export function sendToAgent(agentId: string, message: BroadcastMessage) {
  const ws = clients.get(agentId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Serve static game UI
app.use(express.static('src/public'));

// A2A Protocol Routes
app.use(a2aServer.createRouter());

// MCP Protocol Routes
app.use(mcpServer.createRouter());

// API Routes
app.use('/api/v1', apiRouter(gameEngine));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'caliguland-game',
    currentGame: gameEngine.getCurrentGame() ? {
      id: gameEngine.getCurrentGame()!.id,
      phase: gameEngine.getCurrentGame()!.phase,
      day: gameEngine.getCurrentGame()!.currentDay,
      players: gameEngine.getCurrentGame()!.agents.length
    } : null
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'VibeVM Prediction Game',
    version: '0.1.0',
    description: 'ERC-8004 Social Prediction Game with TEE Integration',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      websocket: '/ws',
      docs: '/api/v1/docs'
    }
  });
});

// Start the game engine
gameEngine.start();

// Start server
server.listen(config.port, () => {
  console.log(`🎮 VibeVM Game Server listening on port ${config.port}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${config.port}/ws`);
  console.log(`🌐 HTTP API: http://localhost:${config.port}/api/v1`);
  console.log(`⏱️  Game duration: ${config.gameDurationMs / 60000} minutes`);
  console.log(`👥 Players: ${config.minPlayers}-${config.maxPlayers}`);
  
  // Always try to register to ERC-8004 (smart detection: Jeju → Anvil → graceful skip)
  autoRegisterToRegistry(SERVER_URL, 'VibeVM Prediction Game')
    .then(result => {
      if (result.registered) {
        console.log(`[ERC-8004] ✅ Registered as Agent #${result.agentId}`);
      } else if (result.error && !result.error.includes('not configured')) {
        console.log(`[ERC-8004] Registration skipped: ${result.error}`);
      }
    })
    .catch(error => {
      // Silent fallback - game works without blockchain
      if (!error.message?.includes('not configured')) {
        console.log('[ERC-8004] Registration unavailable:', error.message);
      }
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  gameEngine.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

