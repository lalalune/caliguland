/**
 * Social Features Test Suite
 * Tests for follow, mentions, and reactions systems
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { GameEngine } from '../engine';
import { Agent, Post } from '../../types';

describe('Social Features', () => {
  let engine: GameEngine;
  let alice: Agent;
  let bob: Agent;
  let carol: Agent;

  beforeEach(() => {
    engine = new GameEngine({
      gameDurationMs: 60000,
      maxPlayers: 10,
      minPlayers: 2
    });

    // Create test agents
    alice = {
      id: 'alice-123',
      name: 'Alice',
      type: 'human',
      reputation: 50,
      wins: 0
    };

    bob = {
      id: 'bob-456',
      name: 'Bob',
      type: 'ai',
      reputation: 50,
      wins: 0
    };

    carol = {
      id: 'carol-789',
      name: 'Carol',
      type: 'human',
      reputation: 50,
      wins: 0
    };

    // Join lobby
    engine.joinLobby(alice);
    engine.joinLobby(bob);
    engine.joinLobby(carol);

    // Set up broadcast functions (mock)
    let broadcastMessages: any[] = [];
    let agentMessages: Map<string, any[]> = new Map();

    engine.setBroadcastFunctions(
      (msg) => broadcastMessages.push(msg),
      (agentId, msg) => {
        if (!agentMessages.has(agentId)) {
          agentMessages.set(agentId, []);
        }
        agentMessages.get(agentId)!.push(msg);
      }
    );

    // Store for verification
    (engine as any)._testBroadcasts = broadcastMessages;
    (engine as any)._testAgentMessages = agentMessages;
  });

  describe('Follow System', () => {
    beforeEach(async () => {
      // Start a game to enable social features
      const game = engine.getCurrentGame();
      if (!game) {
        await (engine as any).startNewGame();
      }
    });

    it('should allow following another agent', () => {
      const result = engine.followAgent('alice-123', 'bob-456');
      expect(result).toBe(true);

      const following = engine.getFollowing('alice-123');
      expect(following).toContain('bob-456');
    });

    it('should update followers list when followed', () => {
      engine.followAgent('alice-123', 'bob-456');

      const followers = engine.getFollowers('bob-456');
      expect(followers).toContain('alice-123');
    });

    it('should prevent self-follow', () => {
      const result = engine.followAgent('alice-123', 'alice-123');
      expect(result).toBe(false);

      const following = engine.getFollowing('alice-123');
      expect(following).not.toContain('alice-123');
    });

    it('should prevent duplicate follows', () => {
      engine.followAgent('alice-123', 'bob-456');
      const result = engine.followAgent('alice-123', 'bob-456');
      expect(result).toBe(false);

      const following = engine.getFollowing('alice-123');
      expect(following.filter(id => id === 'bob-456').length).toBe(1);
    });

    it('should send notification to followed agent', () => {
      engine.followAgent('alice-123', 'bob-456');

      const bobMessages = (engine as any)._testAgentMessages.get('bob-456') || [];
      const followNotification = bobMessages.find((m: any) => m.type === 'follow');

      expect(followNotification).toBeDefined();
      expect(followNotification.data.agentId).toBe('alice-123');
    });

    it('should broadcast follow event', () => {
      engine.followAgent('alice-123', 'bob-456');

      const broadcasts = (engine as any)._testBroadcasts || [];
      const followBroadcast = broadcasts.find((m: any) => m.type === 'agent_followed');

      expect(followBroadcast).toBeDefined();
      expect(followBroadcast.data.followerId).toBe('alice-123');
      expect(followBroadcast.data.targetId).toBe('bob-456');
    });

    it('should handle multiple followers', () => {
      engine.followAgent('alice-123', 'bob-456');
      engine.followAgent('carol-789', 'bob-456');

      const followers = engine.getFollowers('bob-456');
      expect(followers).toContain('alice-123');
      expect(followers).toContain('carol-789');
      expect(followers.length).toBe(2);
    });
  });

  describe('Unfollow System', () => {
    beforeEach(async () => {
      // Start a game to enable social features
      const game = engine.getCurrentGame();
      if (!game) {
        await (engine as any).startNewGame();
      }
      engine.followAgent('alice-123', 'bob-456');
    });

    it('should allow unfollowing an agent', () => {
      const result = engine.unfollowAgent('alice-123', 'bob-456');
      expect(result).toBe(true);

      const following = engine.getFollowing('alice-123');
      expect(following).not.toContain('bob-456');
    });

    it('should update followers list when unfollowed', () => {
      engine.unfollowAgent('alice-123', 'bob-456');

      const followers = engine.getFollowers('bob-456');
      expect(followers).not.toContain('alice-123');
    });

    it('should fail when not following', () => {
      const result = engine.unfollowAgent('carol-789', 'bob-456');
      expect(result).toBe(false);
    });

    it('should broadcast unfollow event', () => {
      // Clear previous broadcasts
      (engine as any)._testBroadcasts = [];

      engine.unfollowAgent('alice-123', 'bob-456');

      const broadcasts = (engine as any)._testBroadcasts || [];
      const unfollowBroadcast = broadcasts.find((m: any) => m.type === 'agent_unfollowed');

      expect(unfollowBroadcast).toBeDefined();
      expect(unfollowBroadcast.data.followerId).toBe('alice-123');
    });
  });

  describe('Mentions System', () => {
    beforeEach(async () => {
      // Start a game to enable posting
      const game = engine.getCurrentGame();
      if (!game) {
        // Manually trigger game start for testing
        await (engine as any).startNewGame();
      }
    });

    it('should parse mentions from post content', () => {
      const game = engine.getCurrentGame();
      expect(game).toBeDefined();

      engine.postToFeed({
        authorId: 'alice-123',
        authorName: 'Alice',
        content: 'Hey @bob-456, what do you think about this?'
      });

      const posts = game!.feed;
      const lastPost = posts[posts.length - 1];

      expect(lastPost.mentions).toBeDefined();
      expect(lastPost.mentions).toContain('bob-456');
    });

    it('should parse multiple mentions', () => {
      const game = engine.getCurrentGame();

      engine.postToFeed({
        authorId: 'alice-123',
        authorName: 'Alice',
        content: '@bob-456 and @carol-789, let\'s collaborate!'
      });

      const posts = game!.feed;
      const lastPost = posts[posts.length - 1];

      expect(lastPost.mentions?.length).toBe(2);
      expect(lastPost.mentions).toContain('bob-456');
      expect(lastPost.mentions).toContain('carol-789');
    });

    it('should parse mentions by agent name', () => {
      const game = engine.getCurrentGame();

      engine.postToFeed({
        authorId: 'alice-123',
        authorName: 'Alice',
        content: 'What does @Bob think about this?'
      });

      const posts = game!.feed;
      const lastPost = posts[posts.length - 1];

      expect(lastPost.mentions).toContain('bob-456');
    });

    it('should avoid duplicate mentions', () => {
      const game = engine.getCurrentGame();

      engine.postToFeed({
        authorId: 'alice-123',
        authorName: 'Alice',
        content: '@bob-456 @bob-456 @Bob'
      });

      const posts = game!.feed;
      const lastPost = posts[posts.length - 1];

      expect(lastPost.mentions?.length).toBe(1);
      expect(lastPost.mentions).toContain('bob-456');
    });

    it('should send notification to mentioned agents', () => {
      engine.postToFeed({
        authorId: 'alice-123',
        authorName: 'Alice',
        content: 'Hey @bob-456, check this out!'
      });

      const bobMessages = (engine as any)._testAgentMessages.get('bob-456') || [];
      const mentionNotification = bobMessages.find((m: any) => m.type === 'mention');

      expect(mentionNotification).toBeDefined();
      expect(mentionNotification.data.type).toBe('mention');
      expect(mentionNotification.data.agentId).toBe('alice-123');
      expect(mentionNotification.data.postId).toBeDefined();
    });

    it('should not send notification when mentioning self', () => {
      engine.postToFeed({
        authorId: 'alice-123',
        authorName: 'Alice',
        content: 'I think @alice-123 is great!'
      });

      const aliceMessages = (engine as any)._testAgentMessages.get('alice-123') || [];
      const mentionNotification = aliceMessages.find((m: any) =>
        m.type === 'mention' && m.data.agentId === 'alice-123'
      );

      expect(mentionNotification).toBeUndefined();
    });

    it('should validate mentioned agents exist', () => {
      const game = engine.getCurrentGame();

      engine.postToFeed({
        authorId: 'alice-123',
        authorName: 'Alice',
        content: '@nonexistent-agent hello'
      });

      const posts = game!.feed;
      const lastPost = posts[posts.length - 1];

      expect(lastPost.mentions).not.toContain('nonexistent-agent');
    });
  });

  describe('Reactions System', () => {
    let postId: string;

    beforeEach(async () => {
      // Start a game
      const game = engine.getCurrentGame();
      if (!game) {
        await (engine as any).startNewGame();
      }

      // Create a post
      engine.postToFeed({
        authorId: 'alice-123',
        authorName: 'Alice',
        content: 'What do you all think?'
      });

      const posts = engine.getCurrentGame()!.feed;
      postId = posts[posts.length - 1].id;
    });

    it('should allow reacting to a post', () => {
      const result = engine.reactToPost(postId, 'bob-456', 'like');
      expect(result).toBe(true);

      const reactions = engine.getPostReactions(postId);
      expect(reactions).toBeDefined();
      expect(reactions!.reactions['bob-456']).toBe('like');
    });

    it('should update like count', () => {
      engine.reactToPost(postId, 'bob-456', 'like');
      engine.reactToPost(postId, 'carol-789', 'like');

      const reactions = engine.getPostReactions(postId);
      expect(reactions!.likeCount).toBe(2);
      expect(reactions!.dislikeCount).toBe(0);
    });

    it('should update dislike count', () => {
      engine.reactToPost(postId, 'bob-456', 'dislike');

      const reactions = engine.getPostReactions(postId);
      expect(reactions!.likeCount).toBe(0);
      expect(reactions!.dislikeCount).toBe(1);
    });

    it('should handle mixed reactions', () => {
      engine.reactToPost(postId, 'bob-456', 'like');
      engine.reactToPost(postId, 'carol-789', 'dislike');

      const reactions = engine.getPostReactions(postId);
      expect(reactions!.likeCount).toBe(1);
      expect(reactions!.dislikeCount).toBe(1);
    });

    it('should toggle reaction when reacting twice with same reaction', () => {
      engine.reactToPost(postId, 'bob-456', 'like');
      engine.reactToPost(postId, 'bob-456', 'like');

      const reactions = engine.getPostReactions(postId);
      expect(reactions!.reactions['bob-456']).toBeUndefined();
      expect(reactions!.likeCount).toBe(0);
    });

    it('should change reaction when reacting with different reaction', () => {
      engine.reactToPost(postId, 'bob-456', 'like');
      engine.reactToPost(postId, 'bob-456', 'dislike');

      const reactions = engine.getPostReactions(postId);
      expect(reactions!.reactions['bob-456']).toBe('dislike');
      expect(reactions!.likeCount).toBe(0);
      expect(reactions!.dislikeCount).toBe(1);
    });

    it('should broadcast reaction event', () => {
      // Clear previous broadcasts
      (engine as any)._testBroadcasts = [];

      engine.reactToPost(postId, 'bob-456', 'like');

      const broadcasts = (engine as any)._testBroadcasts || [];
      const reactionBroadcast = broadcasts.find((m: any) => m.type === 'post_reaction');

      expect(reactionBroadcast).toBeDefined();
      expect(reactionBroadcast.data.postId).toBe(postId);
      expect(reactionBroadcast.data.agentId).toBe('bob-456');
      expect(reactionBroadcast.data.reaction).toBe('like');
    });

    it('should fail when post does not exist', () => {
      const result = engine.reactToPost('invalid-post-id', 'bob-456', 'like');
      expect(result).toBe(false);
    });

    it('should return null for non-existent post reactions', () => {
      const reactions = engine.getPostReactions('invalid-post-id');
      expect(reactions).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    beforeEach(async () => {
      const game = engine.getCurrentGame();
      if (!game) {
        await (engine as any).startNewGame();
      }
    });

    it('should handle complete social workflow', () => {
      // Alice follows Bob
      engine.followAgent('alice-123', 'bob-456');
      expect(engine.getFollowing('alice-123')).toContain('bob-456');
      expect(engine.getFollowers('bob-456')).toContain('alice-123');

      // Bob posts and mentions Alice
      engine.postToFeed({
        authorId: 'bob-456',
        authorName: 'Bob',
        content: 'Thanks for following, @alice-123!'
      });

      const game = engine.getCurrentGame();
      const posts = game!.feed;
      const bobPost = posts[posts.length - 1];

      expect(bobPost.mentions).toContain('alice-123');

      // Alice reacts to Bob's post
      const result = engine.reactToPost(bobPost.id, 'alice-123', 'like');
      expect(result).toBe(true);

      const reactions = engine.getPostReactions(bobPost.id);
      expect(reactions!.likeCount).toBe(1);
      expect(reactions!.reactions['alice-123']).toBe('like');

      // Carol also reacts
      engine.reactToPost(bobPost.id, 'carol-789', 'like');
      const updatedReactions = engine.getPostReactions(bobPost.id);
      expect(updatedReactions!.likeCount).toBe(2);
    });

    it('should handle unfollow after follow', () => {
      engine.followAgent('alice-123', 'bob-456');
      engine.followAgent('alice-123', 'carol-789');

      expect(engine.getFollowing('alice-123').length).toBe(2);

      engine.unfollowAgent('alice-123', 'bob-456');

      const following = engine.getFollowing('alice-123');
      expect(following.length).toBe(1);
      expect(following).toContain('carol-789');
      expect(following).not.toContain('bob-456');

      const bobFollowers = engine.getFollowers('bob-456');
      expect(bobFollowers).not.toContain('alice-123');
    });

    it('should handle mentions in complex scenarios', () => {
      engine.postToFeed({
        authorId: 'alice-123',
        authorName: 'Alice',
        content: 'Meeting with @bob-456 and @carol-789 tomorrow!'
      });

      const game = engine.getCurrentGame();
      const posts = game!.feed;
      const post = posts[posts.length - 1];

      expect(post.mentions?.length).toBe(2);

      const bobMessages = (engine as any)._testAgentMessages.get('bob-456') || [];
      const carolMessages = (engine as any)._testAgentMessages.get('carol-789') || [];

      const bobMention = bobMessages.find((m: any) => m.type === 'mention');
      const carolMention = carolMessages.find((m: any) => m.type === 'mention');

      expect(bobMention).toBeDefined();
      expect(carolMention).toBeDefined();
    });
  });
});
