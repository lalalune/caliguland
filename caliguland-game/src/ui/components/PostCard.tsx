/**
 * PostCard Component
 *
 * Displays a single post/message with:
 * - Author information (avatar, name, clickable)
 * - Relative timestamp
 * - Content with @mention highlighting
 * - Reaction buttons (like/dislike)
 * - Reply button
 * - Follow/Unfollow button (conditional)
 *
 * @component
 */

import React, { useState, useMemo } from 'react';
import { PostCardProps } from '../types';
import { FollowButton } from './FollowButton';

/**
 * PostCard component - displays a single post with all interactions
 */
export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  onReaction,
  onReply,
  onFollowToggle,
  onAgentClick,
  isFollowingAuthor = false,
  showFollowButton = true,
  compact = false,
}) => {
  const [localReactions, setLocalReactions] = useState({
    likeCount: post.likeCount || 0,
    dislikeCount: post.dislikeCount || 0,
  });

  const isOwnPost = post.authorId === currentUserId;
  const isSystemPost = post.isSystemMessage;

  /**
   * Format timestamp as relative time (e.g., "2 mins ago")
   */
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 10) return 'just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    }

    // Fallback to date
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  /**
   * Parse content and highlight @mentions
   */
  const parseContentWithMentions = useMemo(() => {
    const mentionRegex = /@(\w+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    const content = post.content;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>{content.substring(lastIndex, match.index)}</span>
        );
      }

      // Add highlighted mention
      const mentionName = match[1];
      parts.push(
        <button
          key={`mention-${match.index}`}
          onClick={(e) => {
            e.stopPropagation();
            onAgentClick?.(mentionName);
          }}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-semibold bg-transparent border-none cursor-pointer p-0"
          aria-label={`View ${mentionName}'s profile`}
        >
          @{mentionName}
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? <>{parts}</> : content;
  }, [post.content, onAgentClick]);

  /**
   * Get avatar placeholder color based on name
   */
  const getAvatarColor = (name: string): string => {
    const colors = [
      'bg-purple-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-teal-500',
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  /**
   * Handle reaction button click with optimistic update
   */
  const handleReaction = (reaction: 'like' | 'dislike') => {
    // Optimistic update
    if (reaction === 'like') {
      setLocalReactions((prev) => ({
        ...prev,
        likeCount: prev.likeCount + 1,
      }));
    } else {
      setLocalReactions((prev) => ({
        ...prev,
        dislikeCount: prev.dislikeCount + 1,
      }));
    }

    onReaction(post.id, reaction);
  };

  /**
   * Handle follow toggle
   */
  const handleFollowToggle = async (agentId: string) => {
    if (!onFollowToggle) return;

    // TODO: Return promise from onFollowToggle for proper async handling
    return {
      success: true,
      isFollowing: !isFollowingAuthor,
    };
  };

  // System message display (different styling)
  if (isSystemPost) {
    return (
      <div className={`${compact ? 'py-2' : 'py-3'} px-4`}>
        <div className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-lg text-sm text-center">
          <span className="font-semibold">📢 System:</span> {post.content}
        </div>
      </div>
    );
  }

  return (
    <article
      className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${
        compact ? 'p-3' : 'p-4'
      } hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors`}
      aria-label={`Post by ${post.authorName}`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <button
          onClick={() => onAgentClick?.(post.authorId)}
          className={`flex-shrink-0 ${
            compact ? 'w-10 h-10' : 'w-12 h-12'
          } rounded-full ${getAvatarColor(
            post.authorName
          )} flex items-center justify-center text-white font-bold cursor-pointer hover:opacity-80 transition-opacity border-none`}
          aria-label={`View ${post.authorName}'s profile`}
        >
          {post.authorName.charAt(0).toUpperCase()}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Name, Timestamp, Follow Button */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <button
                onClick={() => onAgentClick?.(post.authorId)}
                className="font-bold text-gray-900 dark:text-gray-100 hover:underline cursor-pointer bg-transparent border-none p-0 text-base"
              >
                {post.authorName}
              </button>

              {isFollowingAuthor && (
                <span
                  className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full"
                  title="You follow this agent"
                >
                  Following
                </span>
              )}

              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatRelativeTime(post.timestamp)}
              </span>
            </div>

            {/* Follow Button - only show if not own post and callback provided */}
            {!isOwnPost && showFollowButton && onFollowToggle && (
              <FollowButton
                agentId={post.authorId}
                isFollowing={isFollowingAuthor}
                onToggle={handleFollowToggle}
                size="small"
                variant="secondary"
              />
            )}
          </div>

          {/* Post Content */}
          <div className="text-gray-900 dark:text-gray-100 text-base leading-relaxed mb-3 whitespace-pre-wrap break-words">
            {parseContentWithMentions}
          </div>

          {/* Reply indicator */}
          {post.replyTo && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              ↩️ Reply to previous message
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-4 text-sm">
            {/* Like Button */}
            <button
              onClick={() => handleReaction('like')}
              className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors bg-transparent border-none cursor-pointer p-0"
              aria-label="Like this post"
            >
              <span className="text-lg" role="img" aria-label="Like">
                👍
              </span>
              {localReactions.likeCount > 0 && (
                <span className="font-medium">{localReactions.likeCount}</span>
              )}
            </button>

            {/* Dislike Button */}
            <button
              onClick={() => handleReaction('dislike')}
              className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer p-0"
              aria-label="Dislike this post"
            >
              <span className="text-lg" role="img" aria-label="Dislike">
                👎
              </span>
              {localReactions.dislikeCount > 0 && (
                <span className="font-medium">{localReactions.dislikeCount}</span>
              )}
            </button>

            {/* Reply Button */}
            <button
              onClick={() => onReply(post.id)}
              className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-transparent border-none cursor-pointer p-0"
              aria-label="Reply to this post"
            >
              <span className="text-lg" role="img" aria-label="Reply">
                💬
              </span>
              <span className="font-medium">Reply</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
