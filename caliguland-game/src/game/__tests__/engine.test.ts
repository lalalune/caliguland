/**
 * Game Engine Tests
 * 
 * To run: npm test (add jest configuration first)
 */

import { GameEngine } from '../engine';
import { Agent, Outcome } from '../../types';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine({
      gameDurationMs: 60000, // 1 minute for testing
      maxPlayers: 10,
      minPlayers: 2
    });
    
    // Mock broadcast functions
    engine.setBroadcastFunctions(
      (msg) => console.log('Broadcast:', msg),
      (id, msg) => console.log(`Send to ${id}:`, msg)
    );
  });

  afterEach(() => {
    engine.stop();
  });

  describe('Lobby', () => {
    it('should accept agents to lobby', () => {
      const agent: Agent = {
        id: 'test-agent-1',
        name: 'Test Agent',
        type: 'human',
        reputation: 50,
        wins: 0
      };

      const joined = engine.joinLobby(agent);
      expect(joined).toBe(true);
    });

    it('should reject agents when lobby is full', () => {
      // Fill lobby to max
      for (let i = 0; i < 10; i++) {
        engine.joinLobby({
          id: `agent-${i}`,
          name: `Agent ${i}`,
          type: 'human',
          reputation: 50,
          wins: 0
        });
      }

      // Try to add one more
      const rejected = engine.joinLobby({
        id: 'agent-overflow',
        name: 'Overflow',
        type: 'human',
        reputation: 50,
        wins: 0
      });

      expect(rejected).toBe(false);
    });
  });

  describe('Game Start', () => {
    it('should start game when minimum players reached', (done) => {
      // Add minimum players
      for (let i = 0; i < 2; i++) {
        engine.joinLobby({
          id: `agent-${i}`,
          name: `Agent ${i}`,
          type: 'human',
          reputation: 50,
          wins: 0
        });
      }

      engine.start();

      // Wait for game to start (tick interval)
      setTimeout(() => {
        const game = engine.getCurrentGame();
        expect(game).not.toBeNull();
        expect(game?.agents.length).toBe(2);
        done();
      }, 11000); // Wait for first tick
    }, 15000); // 15 second timeout for this test
  });

  describe('Making Predictions', () => {
    it('should accept valid bets', async () => {
      // Add players
      const agent1: Agent = { id: 'agent-1', name: 'Agent 1', type: 'human', reputation: 50, wins: 0 };
      const agent2: Agent = { id: 'agent-2', name: 'Agent 2', type: 'human', reputation: 50, wins: 0 };
      
      engine.joinLobby(agent1);
      engine.joinLobby(agent2);
      
      // Start game
      await engine.start();
      
      // Wait for game to initialize
      await new Promise(r => setTimeout(r, 11000));
      
      const game = engine.getCurrentGame();
      expect(game).not.toBeNull();
      expect(game?.predictionsOpen).toBe(true);
      
      // Place bet
      const betPlaced = engine.placeBet('agent-1', Outcome.YES, 100);
      expect(betPlaced).toBe(true);
      
      // Verify bet recorded
      const bets = game?.market.bets.filter(b => b.agentId === 'agent-1');
      expect(bets?.length).toBeGreaterThan(0);
    }, 15000);

    it('should update market odds after bet', async () => {
      const agent1: Agent = { id: 'agent-1', name: 'Agent 1', type: 'human', reputation: 50, wins: 0 };
      const agent2: Agent = { id: 'agent-2', name: 'Agent 2', type: 'human', reputation: 50, wins: 0 };
      
      engine.joinLobby(agent1);
      engine.joinLobby(agent2);
      await engine.start();
      await new Promise(r => setTimeout(r, 11000));
      
      const game = engine.getCurrentGame();
      const initialYesOdds = game?.market.yesOdds || 0;
      
      // Place large YES bet
      engine.placeBet('agent-1', Outcome.YES, 1000);
      
      // Verify odds changed
      const newYesOdds = game?.market.yesOdds || 0;
      expect(newYesOdds).not.toBe(initialYesOdds);
    }, 15000);

    it('should reject bets after predictions close', async () => {
      const agent1: Agent = { id: 'agent-1', name: 'Agent 1', type: 'human', reputation: 50, wins: 0 };
      const agent2: Agent = { id: 'agent-2', name: 'Agent 2', type: 'human', reputation: 50, wins: 0 };
      
      engine.joinLobby(agent1);
      engine.joinLobby(agent2);
      await engine.start();
      await new Promise(r => setTimeout(r, 11000));
      
      const game = engine.getCurrentGame();
      
      // Manually close predictions
      if (game) {
        game.predictionsOpen = false;
      }
      
      // Try to place bet
      const betPlaced = engine.placeBet('agent-1', Outcome.YES, 100);
      expect(betPlaced).toBe(false);
    }, 15000);
  });

  describe('Feed', () => {
    it('should add posts to feed', async () => {
      const agent1: Agent = { id: 'agent-1', name: 'Agent 1', type: 'human', reputation: 50, wins: 0 };
      const agent2: Agent = { id: 'agent-2', name: 'Agent 2', type: 'human', reputation: 50, wins: 0 };
      
      engine.joinLobby(agent1);
      engine.joinLobby(agent2);
      await engine.start();
      await new Promise(r => setTimeout(r, 11000));
      
      const game = engine.getCurrentGame();
      const initialFeedSize = game?.feed.length || 0;
      
      // Post to feed
      engine.postToFeed({
        authorId: 'agent-1',
        authorName: 'Agent 1',
        content: 'Test post'
      });
      
      const newFeedSize = game?.feed.length || 0;
      expect(newFeedSize).toBe(initialFeedSize + 1);
      
      // Verify post content
      const lastPost = game?.feed[game.feed.length - 1];
      expect(lastPost?.content).toBe('Test post');
      expect(lastPost?.authorId).toBe('agent-1');
    }, 15000);

    it('should broadcast new posts', async () => {
      let broadcastCount = 0;
      
      const agent1: Agent = { id: 'agent-1', name: 'Agent 1', type: 'human', reputation: 50, wins: 0 };
      const agent2: Agent = { id: 'agent-2', name: 'Agent 2', type: 'human', reputation: 50, wins: 0 };
      
      engine.joinLobby(agent1);
      engine.joinLobby(agent2);
      
      // Set broadcast function
      engine.setBroadcastFunctions(
        (msg) => { broadcastCount++; },
        (id, msg) => {}
      );
      
      await engine.start();
      await new Promise(r => setTimeout(r, 11000));
      
      const initialCount = broadcastCount;
      
      // Post to feed
      engine.postToFeed({
        authorId: 'agent-1',
        authorName: 'Agent 1',
        content: 'Broadcast test'
      });
      
      // Verify broadcast was called
      expect(broadcastCount).toBeGreaterThan(initialCount);
    }, 15000);
  });
});

// Note: This is a basic test structure. 
// Install Jest and configure package.json to run tests:
//
// package.json:
// {
//   "scripts": {
//     "test": "jest"
//   },
//   "devDependencies": {
//     "@types/jest": "^29.5.0",
//     "jest": "^29.5.0",
//     "ts-jest": "^29.1.0"
//   }
// }
//
// jest.config.js:
// module.exports = {
//   preset: 'ts-jest',
//   testEnvironment: 'node',
//   testMatch: ['**/__tests__/**/*.test.ts']
// };

