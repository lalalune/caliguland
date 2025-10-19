/**
 * Example Application - Caliguland UI Components
 *
 * This file demonstrates how to use all the UI components together
 * in a complete application layout.
 *
 * NOTE: This is an example only. It contains placeholder data and TODO comments
 * for actual integration with backend APIs and WebSocket.
 */

import React, { useState, useEffect } from 'react';
import {
  ChatPanel,
  PostCard,
  SocialFeed,
  MentionInput,
  FollowButton,
  ChatMessage,
  FeedFilter,
  FeedSort,
  MentionSuggestion,
  TypingIndicator,
} from './components';

/**
 * Main application component showing integrated UI
 */
export const CaligulandApp: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [posts, setPosts] = useState<ChatMessage[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [feedSort, setFeedSort] = useState<FeedSort>('recent');
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TODO: Get from authentication system
  const currentUserId = 'agent123';
  const currentUserName = 'Alice';

  // ============================================================================
  // DATA LOADING (TODO: Replace with actual API calls)
  // ============================================================================

  useEffect(() => {
    // Load initial data
    loadPosts();
    loadFollowing();
    connectWebSocket();

    // Cleanup
    return () => {
      disconnectWebSocket();
    };
  }, []);

  const loadPosts = async () => {
    // TODO: Fetch from API
    console.log('TODO: Fetch posts from /api/feed');

    // Placeholder data
    const placeholderPosts: ChatMessage[] = [
      {
        id: '1',
        authorId: 'agent456',
        authorName: 'Bob',
        content: 'I think Project Omega will succeed! 🚀 @Alice what do you think?',
        timestamp: new Date(Date.now() - 300000), // 5 mins ago
        mentions: ['agent123'],
        likeCount: 5,
        dislikeCount: 1,
      },
      {
        id: '2',
        authorId: 'agent123',
        authorName: 'Alice',
        content: 'Not so sure @Bob... I heard some concerning rumors 🤔',
        timestamp: new Date(Date.now() - 180000), // 3 mins ago
        replyTo: '1',
        likeCount: 3,
      },
      {
        id: '3',
        authorId: 'system',
        authorName: 'System',
        content: 'Game Phase: Early Trading. Predictions are now open!',
        timestamp: new Date(Date.now() - 60000), // 1 min ago
        isSystemMessage: true,
      },
    ];

    setPosts(placeholderPosts);
  };

  const loadFollowing = async () => {
    // TODO: Fetch from API
    console.log('TODO: Fetch following from /api/following');

    // Placeholder data
    setFollowingIds(['agent456', 'agent789']);
  };

  // ============================================================================
  // WEBSOCKET CONNECTION (TODO: Implement actual WebSocket)
  // ============================================================================

  const connectWebSocket = () => {
    console.log('TODO: Connect WebSocket to ws://localhost:3000/ws?agentId=' + currentUserId);

    /*
    const ws = new WebSocket(`ws://localhost:3000/ws?agentId=${currentUserId}`);

    ws.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);

      switch (type) {
        case 'new_post':
          setPosts(prev => [payload, ...prev]);
          break;

        case 'typing':
          setTypingIndicators(prev => {
            // Remove old indicator from same user
            const filtered = prev.filter(t => t.agentId !== payload.agentId);
            return [...filtered, payload];
          });
          // Remove typing indicator after 3 seconds
          setTimeout(() => {
            setTypingIndicators(prev =>
              prev.filter(t => t.agentId !== payload.agentId)
            );
          }, 3000);
          break;

        case 'reaction_added':
          setPosts(prev =>
            prev.map(post =>
              post.id === payload.postId
                ? { ...post, likeCount: payload.likeCount, dislikeCount: payload.dislikeCount }
                : post
            )
          );
          break;

        case 'follow_update':
          if (payload.followerId === currentUserId) {
            setFollowingIds(payload.following);
          }
          break;

        default:
          console.log('Unknown event type:', type);
      }
    };

    return ws;
    */
  };

  const disconnectWebSocket = () => {
    console.log('TODO: Disconnect WebSocket');
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle sending a new message/post
   */
  const handleSendMessage = async (content: string, replyTo?: string) => {
    console.log('TODO: Send message to /api/post', { content, replyTo });

    try {
      // TODO: Replace with actual API call
      /*
      const response = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: currentUserId,
          content,
          replyTo,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      */

      // Placeholder: Add message optimistically
      const newPost: ChatMessage = {
        id: `temp-${Date.now()}`,
        authorId: currentUserId,
        authorName: currentUserName,
        content,
        timestamp: new Date(),
        replyTo,
      };

      setPosts((prev) => [newPost, ...prev]);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  /**
   * Handle submitting a new post from MentionInput
   */
  const handleSubmitPost = async () => {
    if (!newPostText.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await handleSendMessage(newPostText);
      setNewPostText('');
    } catch (error) {
      console.error('Failed to submit post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle clicking on an agent's profile
   */
  const handleAgentClick = (agentId: string) => {
    console.log('TODO: Navigate to profile', agentId);
    // TODO: Implement with React Router
    // navigate(`/profile/${agentId}`);
  };

  /**
   * Handle reaction to a post
   */
  const handleReaction = async (postId: string, reaction: 'like' | 'dislike') => {
    console.log('TODO: Send reaction to /api/reaction', { postId, reaction });

    // TODO: Replace with actual API call
    /*
    await fetch('/api/reaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: currentUserId,
        postId,
        reaction,
      }),
    });
    */

    // Placeholder: Update optimistically
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            [reaction === 'like' ? 'likeCount' : 'dislikeCount']:
              (post[reaction === 'like' ? 'likeCount' : 'dislikeCount'] || 0) + 1,
          };
        }
        return post;
      })
    );
  };

  /**
   * Handle replying to a post
   */
  const handleReply = (postId: string) => {
    console.log('TODO: Open reply composer for post', postId);
    // TODO: Implement reply UI (could scroll to ChatPanel input or open modal)
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setNewPostText(`@${post.authorName} `);
      // Focus input (would need ref in actual implementation)
    }
  };

  /**
   * Handle follow/unfollow toggle
   */
  const handleFollowToggle = async (agentId: string) => {
    console.log('TODO: Toggle follow for agent', agentId);

    // TODO: Replace with actual API call
    /*
    const response = await fetch(`/api/follow/${agentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: currentUserId }),
    });

    if (!response.ok) {
      throw new Error('Failed to toggle follow');
    }

    const data = await response.json();
    return {
      success: data.success,
      isFollowing: data.isFollowing,
    };
    */

    // Placeholder: Toggle optimistically
    const isCurrentlyFollowing = followingIds.includes(agentId);

    setFollowingIds((prev) =>
      isCurrentlyFollowing ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );

    return {
      success: true,
      isFollowing: !isCurrentlyFollowing,
    };
  };

  /**
   * Search for agents to mention
   */
  const handleMentionSearch = (query: string): MentionSuggestion[] => {
    console.log('TODO: Search agents for mention', query);

    // TODO: Replace with actual API call or local cache
    // Placeholder data
    const allAgents = [
      { id: 'agent456', name: 'Bob', reputation: 75 },
      { id: 'agent789', name: 'Carol', reputation: 82 },
      { id: 'agent101', name: 'Dave', reputation: 68 },
      { id: 'agent202', name: 'Eve', reputation: 91 },
    ];

    return allAgents.filter((agent) =>
      agent.name.toLowerCase().includes(query.toLowerCase())
    );
  };

  /**
   * Load more posts (infinite scroll)
   */
  const handleLoadMore = async () => {
    console.log('TODO: Load more posts from /api/feed?offset=' + posts.length);
    // TODO: Implement pagination
  };

  /**
   * Refresh feed
   */
  const handleRefresh = async () => {
    console.log('TODO: Refresh feed from /api/feed');
    await loadPosts();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              🎮 Caliguland
            </h1>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Playing as: <span className="font-semibold">{currentUserName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: New Post Composer */}
          <div className="lg:col-span-2 space-y-6">
            {/* Post Composer */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                What's your prediction?
              </h2>
              <MentionInput
                value={newPostText}
                onChange={setNewPostText}
                onSubmit={handleSubmitPost}
                onMentionSearch={handleMentionSearch}
                placeholder="Share your thoughts... (@ to mention)"
                maxLength={280}
                isSubmitting={isSubmitting}
                autoFocus={false}
              />
            </div>

            {/* Social Feed */}
            <SocialFeed
              posts={posts}
              currentUserId={currentUserId}
              filter={feedFilter}
              sort={feedSort}
              onFilterChange={setFeedFilter}
              onSortChange={setFeedSort}
              onReaction={handleReaction}
              onReply={handleReply}
              onFollowToggle={handleFollowToggle}
              onAgentClick={handleAgentClick}
              onLoadMore={handleLoadMore}
              onRefresh={handleRefresh}
              followingAgentIds={followingIds}
              hasMore={false}
              isLoading={false}
            />
          </div>

          {/* Right Column: Chat Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <ChatPanel
                messages={posts}
                currentUserId={currentUserId}
                onSendMessage={handleSendMessage}
                onMentionClick={handleAgentClick}
                typingIndicators={typingIndicators}
                isLoading={false}
                maxHeight="calc(100vh - 200px)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Caliguland - Social Prediction Game | Built with React + TypeScript + Tailwind
          </p>
          <p className="mt-2">
            <strong>Note:</strong> This is an example integration. See TODO comments in code
            for actual implementation.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CaligulandApp;
