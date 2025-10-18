/**
 * SocialFeed Component
 *
 * Displays a feed of posts with:
 * - Filter options (All / Following / Mentions)
 * - Sort options (Recent / Popular)
 * - Infinite scroll or pagination
 * - Pull-to-refresh
 * - Empty states
 *
 * @component
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SocialFeedProps, FeedFilter, FeedSort } from '../types';
import { PostCard } from './PostCard';

/**
 * Filter button component
 */
const FilterButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
      active
        ? 'bg-blue-500 dark:bg-blue-600 text-white'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
    }`}
  >
    {children}
  </button>
);

/**
 * Sort button component
 */
const SortButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`}
    title={label}
  >
    <span>{icon}</span>
    <span>{label}</span>
  </button>
);

/**
 * Empty state component
 */
const EmptyState: React.FC<{
  filter: FeedFilter;
  hasFollowing: boolean;
}> = ({ filter, hasFollowing }) => {
  const getMessage = () => {
    switch (filter) {
      case 'following':
        return hasFollowing
          ? {
              title: 'No posts from followed agents',
              message: 'Agents you follow haven\'t posted yet. Check back soon!',
            }
          : {
              title: 'Not following anyone yet',
              message: 'Start following agents to see their posts here.',
            };
      case 'mentions':
        return {
          title: 'No mentions yet',
          message: 'When someone @mentions you, it will appear here.',
        };
      default:
        return {
          title: 'No posts yet',
          message: 'Be the first to post something!',
        };
    }
  };

  const { title, message } = getMessage();

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
      <div className="text-6xl mb-4">📭</div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 max-w-md">{message}</p>
    </div>
  );
};

/**
 * Loading skeleton component
 */
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4 p-4">
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse"
      >
        <div className="flex gap-3">
          <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * Main SocialFeed component
 */
export const SocialFeed: React.FC<SocialFeedProps> = ({
  posts,
  currentUserId,
  filter,
  sort,
  onFilterChange,
  onSortChange,
  onReaction,
  onReply,
  onFollowToggle,
  onAgentClick,
  onLoadMore,
  onRefresh,
  followingAgentIds = [],
  hasMore = false,
  isLoading = false,
  isRefreshing = false,
}) => {
  const feedRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isPullingToRefresh, setIsPullingToRefresh] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef<number>(0);

  /**
   * Filter posts based on selected filter
   */
  const filteredPosts = posts.filter((post) => {
    switch (filter) {
      case 'following':
        return followingAgentIds.includes(post.authorId);
      case 'mentions':
        return post.mentions?.includes(currentUserId) || post.content.includes(`@${currentUserId}`);
      default:
        return true;
    }
  });

  /**
   * Sort posts based on selected sort option
   */
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (sort) {
      case 'popular':
        // Sort by engagement (likes + dislikes)
        const aEngagement = (a.likeCount || 0) + (a.dislikeCount || 0);
        const bEngagement = (b.likeCount || 0) + (b.dislikeCount || 0);
        return bEngagement - aEngagement;
      case 'recent':
      default:
        // Sort by timestamp (newest first)
        return b.timestamp.getTime() - a.timestamp.getTime();
    }
  });

  /**
   * Intersection observer for infinite scroll
   */
  useEffect(() => {
    if (!onLoadMore || !loadMoreRef.current || isLoading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [onLoadMore, isLoading, hasMore]);

  /**
   * Pull-to-refresh handlers (mobile)
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (feedRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!onRefresh || touchStartY.current === 0) return;

    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartY.current;

    if (distance > 0 && feedRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(distance, 100));
      setIsPullingToRefresh(distance > 70);
    }
  }, [onRefresh]);

  const handleTouchEnd = useCallback(() => {
    if (isPullingToRefresh && onRefresh) {
      onRefresh();
    }
    touchStartY.current = 0;
    setPullDistance(0);
    setIsPullingToRefresh(false);
  }, [isPullingToRefresh, onRefresh]);

  /**
   * Manual refresh handler
   */
  const handleRefresh = useCallback(() => {
    if (onRefresh && !isRefreshing) {
      onRefresh();
    }
  }, [onRefresh, isRefreshing]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header with filters and sort */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-10 shadow-sm">
        {/* Filters */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2 overflow-x-auto">
            <FilterButton
              active={filter === 'all'}
              onClick={() => onFilterChange('all')}
            >
              All
            </FilterButton>
            <FilterButton
              active={filter === 'following'}
              onClick={() => onFilterChange('following')}
            >
              Following
            </FilterButton>
            <FilterButton
              active={filter === 'mentions'}
              onClick={() => onFilterChange('mentions')}
            >
              Mentions
            </FilterButton>
          </div>

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              aria-label="Refresh feed"
              title="Refresh feed"
            >
              🔄
            </button>
          )}
        </div>

        {/* Sort options */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
          <SortButton
            active={sort === 'recent'}
            onClick={() => onSortChange('recent')}
            icon="🕒"
            label="Recent"
          />
          <SortButton
            active={sort === 'popular'}
            onClick={() => onSortChange('popular')}
            icon="🔥"
            label="Popular"
          />
        </div>

        {/* Post count */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {sortedPosts.length} post{sortedPosts.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center bg-blue-100 dark:bg-blue-900 transition-all"
          style={{ height: `${pullDistance}px` }}
        >
          <span className="text-blue-600 dark:text-blue-300 text-sm font-medium">
            {isPullingToRefresh ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      )}

      {/* Feed content */}
      <div
        ref={feedRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto"
      >
        {isLoading && sortedPosts.length === 0 ? (
          <LoadingSkeleton />
        ) : sortedPosts.length === 0 ? (
          <EmptyState filter={filter} hasFollowing={followingAgentIds.length > 0} />
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onReaction={onReaction}
                onReply={onReply}
                onFollowToggle={onFollowToggle}
                onAgentClick={onAgentClick}
                isFollowingAuthor={followingAgentIds.includes(post.authorId)}
                showFollowButton={post.authorId !== currentUserId}
              />
            ))}

            {/* Load more trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="p-4 text-center">
                {isLoading ? (
                  <div className="text-gray-600 dark:text-gray-400">Loading more...</div>
                ) : (
                  <button
                    onClick={onLoadMore}
                    className="text-blue-500 dark:text-blue-400 hover:underline font-medium"
                  >
                    Load more posts
                  </button>
                )}
              </div>
            )}

            {/* End of feed */}
            {!hasMore && sortedPosts.length > 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                You've reached the end of the feed
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialFeed;
