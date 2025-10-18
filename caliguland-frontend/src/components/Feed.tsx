import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { api } from '../services/api';
import type { Post } from '../types/game';

export function Feed() {
  const { gameState, playerId } = useGameStore();
  const [newPost, setNewPost] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.feed]);

  const handlePost = async () => {
    if (!newPost.trim() || !playerId) return;

    setIsPosting(true);
    try {
      await api.postMessage({
        agentId: playerId,
        content: newPost.trim()
      });
      setNewPost('');
    } catch (error) {
      console.error('Failed to post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="card h-[calc(100vh-300px)] flex flex-col">
      <h3 className="text-xl font-bold mb-4">Social Feed</h3>

      {/* Feed Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4" data-cy="feed-messages">
        {gameState?.feed?.map((post: Post) => (
          <div 
            key={post.id}
            className={`p-3 rounded-lg ${
              post.isSystemMessage 
                ? 'bg-blue-500/20 border border-blue-500/50' 
                : 'bg-gray-700'
            }`}
            data-cy={`feed-post-${post.id}`}
          >
            <div className="flex items-start justify-between mb-1">
              <span className="font-medium text-sm">{post.authorName}</span>
              <span className="text-xs text-gray-400">
                Day {post.gameDay} • {formatTimestamp(post.timestamp)}
              </span>
            </div>
            <p className="text-sm text-gray-200">{post.content}</p>
          </div>
        ))}
        <div ref={feedEndRef} />
      </div>

      {/* Post Input */}
      {playerId && gameState && (
        <div className="space-y-2">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share your thoughts... (max 280 chars)"
            maxLength={280}
            rows={3}
            className="input resize-none"
            data-cy="post-input"
            disabled={isPosting}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">
              {newPost.length} / 280
            </span>
            <button
              onClick={handlePost}
              disabled={isPosting || !newPost.trim()}
              className="btn btn-primary"
              data-cy="post-button"
            >
              {isPosting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

