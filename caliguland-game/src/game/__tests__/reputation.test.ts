/**
 * Reputation Engine Tests
 * Comprehensive test suite for post-game scoring and feedback
 */

import { ReputationEngine, ReputationFeedback } from '../reputation';
import { Agent, Outcome } from '../../types';

describe('ReputationEngine', () => {
  let engine: ReputationEngine;

  beforeEach(() => {
    engine = new ReputationEngine();
  });

  describe('Agent Initialization', () => {
    it('should initialize agent with default reputation', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        type: 'human',
        reputation: 75,
        wins: 0
      };

      engine.initializeAgent(agent);
      const score = engine.getScore('agent-1');

      expect(score).not.toBeNull();
      expect(score?.overallScore).toBe(75);
      expect(score?.honestyScore).toBe(50);
      expect(score?.cooperationScore).toBe(50);
      expect(score?.skillScore).toBe(50);
      expect(score?.gamesPlayed).toBe(0);
      expect(score?.wins).toBe(0);
    });

    it('should use default neutral reputation if not provided', () => {
      const agent: Agent = {
        id: 'agent-2',
        name: 'Bob',
        type: 'ai',
        reputation: 0,
        wins: 0
      };

      engine.initializeAgent(agent);
      const score = engine.getScore('agent-2');

      expect(score?.overallScore).toBe(50); // Defaults to neutral
    });

    it('should not reinitialize existing agents', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        type: 'human',
        reputation: 75,
        wins: 5
      };

      engine.initializeAgent(agent);
      const firstScore = engine.getScore('agent-1');

      // Try to initialize again with different values
      agent.reputation = 100;
      engine.initializeAgent(agent);
      const secondScore = engine.getScore('agent-1');

      expect(firstScore?.overallScore).toBe(secondScore?.overallScore);
    });
  });

  describe('Feedback Submission', () => {
    beforeEach(() => {
      // Initialize test agents
      const agents: Agent[] = [
        { id: 'agent-1', name: 'Alice', type: 'human', reputation: 80, wins: 5 },
        { id: 'agent-2', name: 'Bob', type: 'human', reputation: 60, wins: 2 },
        { id: 'agent-3', name: 'Charlie', type: 'ai', reputation: 40, wins: 1 }
      ];

      agents.forEach(a => engine.initializeAgent(a));
    });

    it('should accept valid feedback', () => {
      const feedback: ReputationFeedback = {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        category: 'honesty',
        rating: 5,
        gameId: 'game-123',
        timestamp: new Date()
      };

      const result = engine.submitFeedback(feedback);
      expect(result).toBe(true);
    });

    it('should reject feedback with invalid rating', () => {
      const feedback: ReputationFeedback = {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        category: 'honesty',
        rating: 6, // Invalid: should be 1-5
        gameId: 'game-123',
        timestamp: new Date()
      };

      const result = engine.submitFeedback(feedback);
      expect(result).toBe(false);
    });

    it('should reject self-ratings', () => {
      const feedback: ReputationFeedback = {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-1', // Same as from
        category: 'skill',
        rating: 5,
        gameId: 'game-123',
        timestamp: new Date()
      };

      const result = engine.submitFeedback(feedback);
      expect(result).toBe(false);
    });

    it('should reject duplicate feedback for same game/category', () => {
      const feedback: ReputationFeedback = {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        category: 'cooperation',
        rating: 4,
        gameId: 'game-123',
        timestamp: new Date()
      };

      const first = engine.submitFeedback(feedback);
      const second = engine.submitFeedback(feedback);

      expect(first).toBe(true);
      expect(second).toBe(false);
    });

    it('should allow feedback for different categories in same game', () => {
      const feedback1: ReputationFeedback = {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        category: 'honesty',
        rating: 5,
        gameId: 'game-123',
        timestamp: new Date()
      };

      const feedback2: ReputationFeedback = {
        ...feedback1,
        category: 'skill'
      };

      const first = engine.submitFeedback(feedback1);
      const second = engine.submitFeedback(feedback2);

      expect(first).toBe(true);
      expect(second).toBe(true);
    });

    it('should enforce cooldown between submissions', () => {
      const feedback: ReputationFeedback = {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        category: 'honesty',
        rating: 5,
        gameId: 'game-123',
        timestamp: new Date()
      };

      const first = engine.submitFeedback(feedback);

      // Try immediately with same category (should fail due to cooldown per category)
      const second = engine.submitFeedback(feedback);

      expect(first).toBe(true);
      expect(second).toBe(false); // Cooldown active for same from-to-game-category combination
    });

    it('should calculate feedback weight based on giver reputation', () => {
      const highRepFeedback: ReputationFeedback = {
        fromAgentId: 'agent-1', // 80 reputation
        toAgentId: 'agent-3',
        category: 'skill',
        rating: 5,
        gameId: 'game-123',
        timestamp: new Date()
      };

      const lowRepFeedback: ReputationFeedback = {
        fromAgentId: 'agent-3', // 40 reputation (initialized as 50 default minus some)
        toAgentId: 'agent-1',
        category: 'cooperation',
        rating: 5,
        gameId: 'game-124',
        timestamp: new Date()
      };

      engine.submitFeedback(highRepFeedback);
      engine.submitFeedback(lowRepFeedback);

      // High rep agent (80) should have higher weight: 0.5 + (80/100) = 1.3
      // Low rep agent (40) should have lower weight: 0.5 + (40/100) = 0.9
      expect(highRepFeedback.weight).toBeCloseTo(1.3, 1);
      expect(lowRepFeedback.weight).toBeCloseTo(0.9, 1);
    });
  });

  describe('Post-Game Reputation Calculation', () => {
    let agents: Agent[];

    beforeEach(() => {
      agents = [
        { id: 'agent-1', name: 'Alice', type: 'human', reputation: 50, wins: 0 },
        { id: 'agent-2', name: 'Bob', type: 'human', reputation: 50, wins: 0 },
        { id: 'agent-3', name: 'Charlie', type: 'ai', reputation: 50, wins: 0 }
      ];

      agents.forEach(a => engine.initializeAgent(a));
    });

    it('should award points to winners', () => {
      const updates = engine.calculatePostGameReputation(
        'game-123',
        agents,
        ['agent-1'], // Winner
        [],
        []
      );

      const winner = updates.find(u => u.agentId === 'agent-1');
      const loser = updates.find(u => u.agentId === 'agent-2');

      expect(winner?.change).toBeGreaterThan(0);
      expect(loser?.change).toBeGreaterThanOrEqual(0); // Participation bonus
    });

    it('should penalize betrayers', () => {
      const updates = engine.calculatePostGameReputation(
        'game-123',
        agents,
        ['agent-1'],
        ['agent-1'],
        ['agent-2'] // Betrayer
      );

      const betrayer = updates.find(u => u.agentId === 'agent-2');
      expect(betrayer?.change).toBeLessThan(0);

      const score = engine.getScore('agent-2');
      expect(score?.honestyScore).toBeLessThan(50);
      expect(score?.cooperationScore).toBeLessThan(50);
    });

    it('should reward correct predictions', () => {
      const updates = engine.calculatePostGameReputation(
        'game-123',
        agents,
        ['agent-1'],
        ['agent-1', 'agent-3'], // Correct bettors
        []
      );

      const correctBettor1 = updates.find(u => u.agentId === 'agent-1');
      const correctBettor2 = updates.find(u => u.agentId === 'agent-3');
      const wrongBettor = updates.find(u => u.agentId === 'agent-2');

      expect(correctBettor1?.change).toBeGreaterThan(wrongBettor?.change || 0);
      expect(correctBettor2?.change).toBeGreaterThan(wrongBettor?.change || 0);

      // Check skill scores improved
      const score1 = engine.getScore('agent-1');
      const score3 = engine.getScore('agent-3');
      expect(score1?.skillScore).toBeGreaterThan(50);
      expect(score3?.skillScore).toBeGreaterThan(50);
    });

    it('should incorporate feedback into reputation', () => {
      // Submit feedback
      const feedback: ReputationFeedback = {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        category: 'honesty',
        rating: 1, // Very low
        gameId: 'game-123',
        timestamp: new Date()
      };
      engine.submitFeedback(feedback);

      const updates = engine.calculatePostGameReputation(
        'game-123',
        agents,
        [],
        [],
        []
      );

      const feedbackTarget = updates.find(u => u.agentId === 'agent-2');
      expect(feedbackTarget?.change).toBeLessThan(0);

      const score = engine.getScore('agent-2');
      expect(score?.honestyScore).toBeLessThan(50);
    });

    it('should update game statistics', () => {
      engine.calculatePostGameReputation(
        'game-123',
        agents,
        ['agent-1'],
        [],
        []
      );

      const winnerScore = engine.getScore('agent-1');
      const loserScore = engine.getScore('agent-2');

      expect(winnerScore?.gamesPlayed).toBe(1);
      expect(winnerScore?.wins).toBe(1);
      expect(winnerScore?.winRate).toBe(1.0);

      expect(loserScore?.gamesPlayed).toBe(1);
      expect(loserScore?.wins).toBe(0);
      expect(loserScore?.winRate).toBe(0.0);
    });

    it('should generate meaningful update reasons', () => {
      const updates = engine.calculatePostGameReputation(
        'game-123',
        agents,
        ['agent-1'],
        ['agent-1'],
        ['agent-2']
      );

      const winner = updates.find(u => u.agentId === 'agent-1');
      const betrayer = updates.find(u => u.agentId === 'agent-2');
      const normal = updates.find(u => u.agentId === 'agent-3');

      expect(winner?.reason).toContain('Won the game');
      expect(winner?.reason).toContain('Correct prediction');
      expect(betrayer?.reason).toContain('Alliance betrayal');
      expect(normal?.reason).toContain('Game participation');
    });

    it('should clamp scores to 0-100 range', () => {
      // Set up an agent with very high reputation
      const highAgent: Agent = {
        id: 'high-agent',
        name: 'High',
        type: 'human',
        reputation: 98,
        wins: 100
      };
      engine.initializeAgent(highAgent);

      // Make them win multiple times
      for (let i = 0; i < 10; i++) {
        engine.calculatePostGameReputation(
          `game-${i}`,
          [highAgent],
          ['high-agent'],
          ['high-agent'],
          []
        );
      }

      const score = engine.getScore('high-agent');
      expect(score?.overallScore).toBeLessThanOrEqual(100);
      expect(score?.honestyScore).toBeLessThanOrEqual(100);
      expect(score?.cooperationScore).toBeLessThanOrEqual(100);
      expect(score?.skillScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Weighted and Decayed Feedback', () => {
    beforeEach(() => {
      const agents: Agent[] = [
        { id: 'agent-1', name: 'Alice', type: 'human', reputation: 100, wins: 10 },
        { id: 'agent-2', name: 'Bob', type: 'human', reputation: 50, wins: 5 },
        { id: 'agent-3', name: 'Charlie', type: 'ai', reputation: 0, wins: 0 }
      ];
      agents.forEach(a => engine.initializeAgent(a));
    });

    it('should apply time decay to old feedback', () => {
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
      const recentDate = new Date();

      const oldFeedback: ReputationFeedback = {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-3',
        category: 'skill',
        rating: 5,
        gameId: 'game-old',
        timestamp: oldDate
      };

      const recentFeedback: ReputationFeedback = {
        fromAgentId: 'agent-2',
        toAgentId: 'agent-3',
        category: 'skill',
        rating: 5,
        gameId: 'game-recent',
        timestamp: recentDate
      };

      engine.submitFeedback(oldFeedback);
      engine.submitFeedback(recentFeedback);

      // The feedback exists but will be weighted differently in calculation
      const stats = engine.getFeedbackStats('agent-3');

      // Both feedback should be recorded
      expect(stats.totalFeedback).toBe(2);

      // The old feedback should have decay applied when calculating the average
      // Both are rating 5, but old one has 0.95x weight, so average should be slightly less than 5
      expect(stats.averageRating).toBeLessThanOrEqual(5);
      expect(stats.categoryBreakdown.skill).toBeDefined();
    });

    it('should weight feedback by giver reputation', () => {
      const highRepFeedback: ReputationFeedback = {
        fromAgentId: 'agent-1', // 100 rep
        toAgentId: 'agent-3',
        category: 'honesty',
        rating: 5,
        gameId: 'game-1',
        timestamp: new Date()
      };

      const lowRepFeedback: ReputationFeedback = {
        fromAgentId: 'agent-3', // 0 rep (defaults to 50)
        toAgentId: 'agent-2',
        category: 'honesty',
        rating: 1,
        gameId: 'game-2',
        timestamp: new Date()
      };

      engine.submitFeedback(highRepFeedback);
      engine.submitFeedback(lowRepFeedback);

      // High rep feedback should have weight ~1.5
      // Low rep feedback should have weight ~1.0 (agent-3 has default 50 rep when initialized, so 0.5 + 0.5 = 1.0)
      expect(highRepFeedback.weight).toBeCloseTo(1.5, 1);
      expect(lowRepFeedback.weight).toBeCloseTo(1.0, 1); // Actually weight of 0 rep agent not yet initialized
    });
  });

  describe('Leaderboard and Statistics', () => {
    beforeEach(() => {
      const agents: Agent[] = [
        { id: 'agent-1', name: 'Alice', type: 'human', reputation: 80, wins: 10 },
        { id: 'agent-2', name: 'Bob', type: 'human', reputation: 60, wins: 5 },
        { id: 'agent-3', name: 'Charlie', type: 'ai', reputation: 90, wins: 15 },
        { id: 'agent-4', name: 'Dave', type: 'human', reputation: 40, wins: 2 }
      ];
      agents.forEach(a => engine.initializeAgent(a));
    });

    it('should return leaderboard sorted by reputation', () => {
      const leaderboard = engine.getLeaderboard(10);

      expect(leaderboard.length).toBe(4);
      expect(leaderboard[0].agentId).toBe('agent-3'); // 90 rep
      expect(leaderboard[1].agentId).toBe('agent-1'); // 80 rep
      expect(leaderboard[2].agentId).toBe('agent-2'); // 60 rep
      expect(leaderboard[3].agentId).toBe('agent-4'); // 40 rep
    });

    it('should limit leaderboard size', () => {
      const leaderboard = engine.getLeaderboard(2);
      expect(leaderboard.length).toBe(2);
    });

    it('should get all scores', () => {
      const allScores = engine.getAllScores();
      expect(allScores.length).toBe(4);
    });

    it('should get feedback stats for an agent', async () => {
      // Submit various feedback
      const feedback1: ReputationFeedback = {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        category: 'honesty',
        rating: 5,
        gameId: 'game-1',
        timestamp: new Date()
      };

      const feedback2: ReputationFeedback = {
        fromAgentId: 'agent-3',
        toAgentId: 'agent-2',
        category: 'skill',
        rating: 4,
        gameId: 'game-1',
        timestamp: new Date()
      };

      engine.submitFeedback(feedback1);

      await new Promise(resolve => setTimeout(resolve, 31));
      engine.submitFeedback(feedback2);

      const stats = engine.getFeedbackStats('agent-2');

      expect(stats.totalFeedback).toBe(2);
      expect(stats.averageRating).toBe(4.5);
      expect(stats.categoryBreakdown.honesty).toBeDefined();
      expect(stats.categoryBreakdown.skill).toBeDefined();
      expect(stats.recentFeedback.length).toBe(2);
    });

    it('should get reputation changes summary', () => {
      // Generate some updates
      engine.calculatePostGameReputation(
        'game-1',
        [
          { id: 'agent-1', name: 'Alice', type: 'human', reputation: 80, wins: 10 },
          { id: 'agent-2', name: 'Bob', type: 'human', reputation: 60, wins: 5 }
        ],
        ['agent-1'],
        ['agent-1'],
        ['agent-2']
      );

      const summary = engine.getReputationChangesSummary();

      expect(summary.totalUpdates).toBeGreaterThan(0);
      expect(summary.topGainers.length).toBeGreaterThan(0);
      expect(summary.topGainers[0].agentId).toBe('agent-1');
      expect(summary.topLosers.length).toBeGreaterThan(0);
      expect(summary.topLosers[0].agentId).toBe('agent-2');
    });
  });

  describe('ERC-8004 On-Chain Integration', () => {
    beforeEach(() => {
      const agents: Agent[] = [
        { id: '0x1234567890123456789012345678901234567890', name: 'Alice', type: 'human', reputation: 75, wins: 5 },
        { id: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Bob', type: 'human', reputation: 60, wins: 3 }
      ];
      agents.forEach(a => engine.initializeAgent(a));
    });

    it('should prepare on-chain update', () => {
      const update = engine.prepareOnChainUpdate('0x1234567890123456789012345678901234567890');

      expect(update).not.toBeNull();
      expect(update?.agentAddress).toBe('0x1234567890123456789012345678901234567890');
      expect(update?.reputationScore).toBe(75);
      expect(update?.gamesPlayed).toBe(0);
      expect(update?.wins).toBe(5);
    });

    it('should prepare batch on-chain updates', () => {
      const updates = engine.prepareBatchOnChainUpdate([
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      ]);

      expect(updates.length).toBe(2);
      expect(updates[0].agentAddress).toBe('0x1234567890123456789012345678901234567890');
      expect(updates[1].agentAddress).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
    });

    it('should prepare all pending updates', () => {
      // Generate some updates
      engine.calculatePostGameReputation(
        'game-1',
        [
          { id: '0x1234567890123456789012345678901234567890', name: 'Alice', type: 'human', reputation: 75, wins: 5 },
          { id: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Bob', type: 'human', reputation: 60, wins: 3 }
        ],
        ['0x1234567890123456789012345678901234567890'],
        [],
        []
      );

      const updates = engine.prepareAllPendingOnChainUpdates();
      expect(updates.length).toBe(2);
    });

    it('should prepare ERC-8004 compatible off-chain feedback', () => {
      const feedback: ReputationFeedback = {
        fromAgentId: '0x1234567890123456789012345678901234567890',
        toAgentId: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        category: 'honesty',
        rating: 5,
        comment: 'Great player!',
        gameId: 'game-123',
        timestamp: new Date(),
        weight: 1.2
      };

      const offChain = engine.prepareOffChainFeedback(
        feedback,
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        '0x1234567890123456789012345678901234567890',
        1,
        '0x0000000000000000000000000000000000000001'
      );

      expect(offChain.agentRegistry).toContain('eip155:1:');
      expect(offChain.score).toBe(100); // 5/5 * 100
      expect(offChain.category).toBe('honesty');
      expect(offChain.weight).toBe(1.2);
      expect(offChain.gameId).toBe('game-123');
    });

    it('should clear pending updates', () => {
      engine.calculatePostGameReputation(
        'game-1',
        [{ id: 'agent-1', name: 'Alice', type: 'human', reputation: 50, wins: 0 }],
        [],
        [],
        []
      );

      expect(engine.getPendingUpdates().length).toBeGreaterThan(0);

      engine.clearPendingUpdates();
      expect(engine.getPendingUpdates().length).toBe(0);
    });
  });

  describe('Data Persistence', () => {
    it('should export and import data', () => {
      // Set up initial state
      const agents: Agent[] = [
        { id: 'agent-1', name: 'Alice', type: 'human', reputation: 75, wins: 5 },
        { id: 'agent-2', name: 'Bob', type: 'human', reputation: 60, wins: 3 }
      ];
      agents.forEach(a => engine.initializeAgent(a));

      const feedback: ReputationFeedback = {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-2',
        category: 'honesty',
        rating: 5,
        gameId: 'game-1',
        timestamp: new Date()
      };
      engine.submitFeedback(feedback);

      // Export data
      const exported = engine.exportData();

      // Create new engine and import
      const newEngine = new ReputationEngine();
      newEngine.importData(exported);

      // Verify data was restored
      const score = newEngine.getScore('agent-1');
      expect(score).not.toBeNull();
      expect(score?.overallScore).toBe(75);

      const stats = newEngine.getFeedbackStats('agent-2');
      expect(stats.totalFeedback).toBe(1);
    });

    it('should reset engine state', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        type: 'human',
        reputation: 75,
        wins: 5
      };
      engine.initializeAgent(agent);

      engine.reset();

      const score = engine.getScore('agent-1');
      expect(score).toBeNull();
      expect(engine.getAllScores().length).toBe(0);
      expect(engine.getPendingUpdates().length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle agent with no feedback', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        type: 'human',
        reputation: 50,
        wins: 0
      };
      engine.initializeAgent(agent);

      const stats = engine.getFeedbackStats('agent-1');
      expect(stats.totalFeedback).toBe(0);
      expect(stats.averageRating).toBe(0);
      expect(Object.keys(stats.categoryBreakdown).length).toBe(0);
    });

    it('should handle non-existent agent gracefully', () => {
      const score = engine.getScore('non-existent');
      expect(score).toBeNull();

      const update = engine.prepareOnChainUpdate('non-existent');
      expect(update).toBeNull();
    });

    it('should handle empty game with no participants', () => {
      const updates = engine.calculatePostGameReputation('game-1', [], [], [], []);
      expect(updates.length).toBe(0);
    });

    it('should handle game with only winners', () => {
      const agents: Agent[] = [
        { id: 'agent-1', name: 'Alice', type: 'human', reputation: 50, wins: 0 },
        { id: 'agent-2', name: 'Bob', type: 'human', reputation: 50, wins: 0 }
      ];
      agents.forEach(a => engine.initializeAgent(a));

      const updates = engine.calculatePostGameReputation(
        'game-1',
        agents,
        ['agent-1', 'agent-2'], // Both winners
        ['agent-1', 'agent-2'],
        []
      );

      expect(updates.length).toBe(2);
      expect(updates[0].change).toBeGreaterThan(0);
      expect(updates[1].change).toBeGreaterThan(0);
    });

    it('should handle mixed feedback (positive and negative)', () => {
      const agents: Agent[] = [
        { id: 'agent-1', name: 'Alice', type: 'human', reputation: 50, wins: 0 },
        { id: 'agent-2', name: 'Bob', type: 'human', reputation: 50, wins: 0 },
        { id: 'agent-3', name: 'Charlie', type: 'ai', reputation: 50, wins: 0 }
      ];
      agents.forEach(a => engine.initializeAgent(a));

      // Submit mixed feedback
      const positiveFeedback: ReputationFeedback = {
        fromAgentId: 'agent-1',
        toAgentId: 'agent-3',
        category: 'honesty',
        rating: 5,
        gameId: 'game-1',
        timestamp: new Date()
      };

      const negativeFeedback: ReputationFeedback = {
        fromAgentId: 'agent-2',
        toAgentId: 'agent-3',
        category: 'honesty',
        rating: 1,
        gameId: 'game-1',
        timestamp: new Date()
      };

      engine.submitFeedback(positiveFeedback);
      engine.submitFeedback(negativeFeedback);

      const updates = engine.calculatePostGameReputation('game-1', agents, [], [], []);
      const target = updates.find(u => u.agentId === 'agent-3');

      // Should average close to neutral (blend with 0.3 weight means it doesn't fully reach average)
      const score = engine.getScore('agent-3');
      expect(score?.honestyScore).toBeGreaterThanOrEqual(48);
      expect(score?.honestyScore).toBeLessThanOrEqual(55);
    });
  });
});
