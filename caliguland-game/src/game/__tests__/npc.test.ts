/**
 * NPC AI Engine Tests - NO MOCKS
 * Tests template responses, mention handling, periodic activity
 */

import { NPCAIEngine } from '../npcAI';
import { NPC, GameScenario, Outcome, Post } from '../../types';

describe('NPC AI Engine - Runtime Tests', () => {
  let npcAI: NPCAIEngine;
  let scenario: GameScenario;
  let testNPC: NPC;

  beforeEach(() => {
    npcAI = new NPCAIEngine({
      enableAI: false
    });

    testNPC = {
      id: 'test-insider',
      name: 'Insider Ian',
      role: 'insider',
      bias: 'truthful',
      bio: 'Has inside knowledge',
      tendsToBeTruthful: true
    };

    scenario = {
      id: 'test-scenario',
      title: 'Test Scenario',
      question: 'Will the project succeed?',
      description: 'Test description',
      secretOutcome: Outcome.YES,
      outcomeCommitment: 'test-commitment',
      npcs: [testNPC],
      timeline: []
    };

    npcAI.registerNPC(testNPC, scenario);
  });

  test('should register NPC with personality', () => {
    expect(() => npcAI.registerNPC(testNPC, scenario)).not.toThrow();
  });

  test('should generate template response for insider role', async () => {
    const response = await npcAI.generateResponse(testNPC.id, {
      scenario,
      currentDay: 1,
      recentPosts: [],
      trigger: 'periodic'
    });

    expect(response.content).toBeTruthy();
    expect(response.shouldPost).toBeDefined();
    expect(response.confidence).toBeGreaterThan(0);
  });

  test('should generate truthful response for truthful NPC', async () => {
    const response = await npcAI.generateResponse(testNPC.id, {
      scenario,
      currentDay: 1,
      recentPosts: []
    });

    const content = response.content.toLowerCase();
    const indicatesSuccess = content.includes('succeed') || 
                            content.includes('track') ||  
                            content.includes('positive') ||
                            content.includes('confident');
    
    expect(indicatesSuccess).toBe(true);
  });

  test('should handle mentions from players', async () => {
    const mentionPost: Post = {
      id: 'post-1',
      authorId: 'agent-1',
      authorName: 'TestAgent',
      content: '@InsiderIan what do you know?',
      timestamp: new Date(),
      gameDay: 5,
      isSystemMessage: false
    };

    const response = await npcAI.handleMention(
      testNPC.id,
      mentionPost,
      scenario,
      5
    );

    expect(response.content).toBeTruthy();
    expect(response.shouldPost).toBe(true);
  });

  test('should generate periodic activity based on aggressiveness', async () => {
    const recentPosts: Post[] = [];

    const response = await npcAI.generatePeriodicActivity(
      testNPC.id,
      scenario,
      10,
      recentPosts
    );

    expect(response).toHaveProperty('content');
    expect(response).toHaveProperty('shouldPost');
  });

  test('deceptive NPC should hint at wrong outcome', async () => {
    const liar: NPC = {
      id: 'liar-npc',
      name: 'Conspiracy Carl',
      role: 'rumor',
      bias: 'deceptive',
      bio: 'Spreads misinformation',
      tendsToBeTruthful: false
    };

    const liarScenario = { ...scenario, npcs: [liar] };
    npcAI.registerNPC(liar, liarScenario);

    const response = await npcAI.generateResponse(liar.id, {
      scenario: liarScenario,
      currentDay: 1,
      recentPosts: []
    });

    const content = response.content.toLowerCase();
    const indicatesFailure = content.includes('fail') || 
                             content.includes('doom') ||
                             content.includes('problem');
    
    expect(indicatesFailure).toBe(true);
  });

  test('rate limiting prevents NPC spam', async () => {
    const response1 = await npcAI.generateResponse(testNPC.id, {
      scenario,
      currentDay: 1,
      recentPosts: []
    });

    const response2 = await npcAI.generateResponse(testNPC.id, {
      scenario,
      currentDay: 1,
      recentPosts: []
    });

    expect(response2.shouldPost).toBe(false);
  });
});
