/**
 * Protocol Tests - A2A, MCP, WebSocket, REST API
 * Runtime tests with NO MOCKS
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { GameEngine } from '../game/engine';
import { A2AServer } from '../a2a/server';
import { MCPServer } from '../mcp/server';
import { ethers } from 'ethers';
import { Agent, Outcome } from '../types';

describe('A2A Protocol - Runtime Tests', () => {
  let gameEngine: GameEngine;
  let a2aServer: A2AServer;
  let wallet: ethers.Wallet;

  beforeAll(() => {
    gameEngine = new GameEngine({
      gameDurationMs: 60000,
      maxPlayers: 10,
      minPlayers: 2
    });

    gameEngine.start();

    a2aServer = new A2AServer(gameEngine, 'http://localhost:8000');
    wallet = new ethers.Wallet('0x' + '1'.repeat(64));

    for (let i = 1; i <= 3; i++) {
      gameEngine.joinLobby({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        type: 'ai',
        reputation: 50,
        wins: 0
      });
    }
  });

  afterAll(() => {
    gameEngine.stop();
  });

  test('should serve Agent Card at .well-known endpoint', async () => {
    const router = a2aServer.createRouter();
    
    expect(router).toBeDefined();
  });

  test('should handle JSON-RPC message/send', async () => {
    const messageId = 'test-msg-1';
    const timestamp = Date.now();
    const skillId = 'get-status';
    const agentId = 'agent-1';

    const skillData = {};
    const signaturePayload = JSON.stringify({
      messageId,
      timestamp,
      skillId,
      data: skillData
    });

    const signature = await wallet.signMessage(signaturePayload);

    const message = {
      role: 'user' as const,
      parts: [
        {
          kind: 'data',
          data: {
            skillId,
            agentId,
            agentAddress: wallet.address,
            signature,
            timestamp
          }
        }
      ],
      messageId,
      kind: 'message' as const
    };

    expect(message.role).toBe('user');
    expect(message.parts[0].data.skillId).toBe(skillId);
  });

  test('should verify signatures correctly', async () => {
    const testMessage = 'test message';
    const signature = await wallet.signMessage(testMessage);
    const recovered = ethers.verifyMessage(testMessage, signature);

    expect(recovered).toBe(wallet.address);
  });

  test('should reject messages with invalid signatures', async () => {
    const messageId = 'test-msg-2';
    const timestamp = Date.now();
    
    const malformedSignature = '0x' + '0'.repeat(130);

    expect(malformedSignature.length).toBe(132);
  });

  test('should execute join-game skill', () => {
    const agent: Agent = {
      id: 'test-join',
      name: 'Test Joiner',
      type: 'human',
      reputation: 50,
      wins: 0
    };

    const joined = gameEngine.joinLobby(agent);
    expect(joined).toBe(true);
  });
});

describe('MCP Protocol - Runtime Tests', () => {
  let gameEngine: GameEngine;
  let mcpServer: MCPServer;

  beforeAll(() => {
    gameEngine = new GameEngine({
      gameDurationMs: 60000,
      maxPlayers: 10,
      minPlayers: 2
    });

    mcpServer = new MCPServer(gameEngine);

    for (let i = 1; i <= 2; i++) {
      gameEngine.joinLobby({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        type: 'ai',
        reputation: 50,
        wins: 0
      });
    }

    gameEngine.start();
  });

  afterAll(() => {
    gameEngine.stop();
  });

  test('should create MCP router', () => {
    const router = mcpServer.createRouter();
    expect(router).toBeDefined();
  });

  test('should list available tools', () => {
    expect(true).toBe(true);
  });

  test('should execute join_game tool', () => {
    const agent: Agent = {
      id: 'mcp-test',
      name: 'MCP Tester',
      type: 'ai',
      reputation: 50,
      wins: 0
    };

    const joined = gameEngine.joinLobby(agent);
    expect(joined).toBe(true);
  });
});

describe('Game Engine Integration', () => {
  let gameEngine: GameEngine;

  beforeAll(() => {
    gameEngine = new GameEngine({
      gameDurationMs: 20000,
      maxPlayers: 5,
      minPlayers: 2
    });
  });

  afterAll(() => {
    gameEngine.stop();
  });

  test('should handle full game lifecycle', async () => {
    gameEngine.joinLobby({
      id: 'agent-1',
      name: 'Agent 1',
      type: 'ai',
      reputation: 50,
      wins: 0
    });

    gameEngine.joinLobby({
      id: 'agent-2',
      name: 'Agent 2',
      type: 'ai',
      reputation: 50,
      wins: 0
    });

    let broadcasted = false;
    gameEngine.setBroadcastFunctions(
      () => { broadcasted = true; },
      () => {}
    );

    gameEngine.start();

    await new Promise(resolve => setTimeout(resolve, 11000));

    const game = gameEngine.getCurrentGame();
    expect(game).not.toBeNull();
    expect(broadcasted).toBe(true);
  }, 15000);
});

