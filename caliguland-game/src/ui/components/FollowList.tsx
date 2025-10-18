/**
 * FollowList Component
 *
 * Displays a list of followers or following agents with search/filter functionality.
 * Supports navigation to profiles and follow/unfollow actions.
 *
 * @component
 * @example
 * ```tsx
 * <FollowList
 *   agents={followers}
 *   type="followers"
 *   currentUserId={userId}
 *   onFollowToggle={(agentId) => handleFollow(agentId)}
 *   onAgentClick={(agent) => navigate(`/profile/${agent.id}`)}
 * />
 * ```
 */

import React, { useState, useMemo } from 'react';
import { Agent } from '../../types';

/**
 * Extended agent interface with additional profile information
 */
export interface FollowListAgent extends Agent {
  /** Agent's bio or description */
  bio?: string;

  /** Avatar URL or emoji */
  avatar?: string;

  /** Whether the current user follows this agent */
  isFollowing?: boolean;

  /** Online status */
  isOnline?: boolean;

  /** Last active timestamp */
  lastActive?: Date | string;
}

/**
 * Props for the FollowList component
 */
export interface FollowListProps {
  /** Array of agents to display */
  agents: FollowListAgent[];

  /** Type of list (followers or following) */
  type: 'followers' | 'following';

  /** Current user's ID (to hide follow button on own profile) */
  currentUserId?: string;

  /** Callback when follow/unfollow is clicked */
  onFollowToggle?: (agentId: string) => void;

  /** Callback when an agent is clicked */
  onAgentClick?: (agent: FollowListAgent) => void;

  /** Show search bar */
  showSearch?: boolean;

  /** Custom CSS classes */
  className?: string;

  /** Loading state */
  isLoading?: boolean;
}

/**
 * Format last active time
 */
const formatLastActive = (timestamp: Date | string): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Get agent type badge
 */
const getTypeBadge = (agent: FollowListAgent): JSX.Element | null => {
  if (agent.isNPC) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
        NPC
      </span>
    );
  }

  if (agent.type === 'ai') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
        AI
      </span>
    );
  }

  return null;
};

/**
 * FollowList Component
 *
 * Displays a searchable, filterable list of agents with follow functionality.
 */
export const FollowList: React.FC<FollowListProps> = ({
  agents,
  type,
  currentUserId,
  onFollowToggle,
  onAgentClick,
  showSearch = true,
  className = '',
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'human' | 'ai' | 'npc'>('all');

  // Filter and search agents
  const filteredAgents = useMemo(() => {
    let filtered = agents;

    // Apply type filter
    if (filterType !== 'all') {
      if (filterType === 'npc') {
        filtered = filtered.filter((agent) => agent.isNPC);
      } else {
        filtered = filtered.filter((agent) => !agent.isNPC && agent.type === filterType);
      }
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.bio?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [agents, filterType, searchQuery]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3" />
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (agents.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-6xl mb-4">👥</div>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {type === 'followers' ? 'No Followers Yet' : 'Not Following Anyone'}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {type === 'followers'
            ? 'When other players follow you, they will appear here.'
            : 'Start following other players to see their updates.'}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filter */}
      {showSearch && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>

          {/* Type filter */}
          <div className="flex gap-2">
            {(['all', 'human', 'ai', 'npc'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterType(filter)}
                className={`
                  px-3 py-1 rounded-lg text-sm font-medium capitalize transition-all
                  ${filterType === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }
                `}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agent count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {filteredAgents.length} {type}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Agents list */}
      <div className="space-y-3">
        {filteredAgents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No agents found</p>
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-md group"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className="relative cursor-pointer"
                  onClick={() => onAgentClick?.(agent)}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                    {agent.avatar ? (
                      typeof agent.avatar === 'string' && agent.avatar.startsWith('http') ? (
                        <img
                          src={agent.avatar}
                          alt={agent.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{agent.avatar}</span>
                      )
                    ) : (
                      <span>{agent.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {/* Online indicator */}
                  {agent.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                  )}
                </div>

                {/* Agent info */}
                <div className="flex-1 min-w-0">
                  <div
                    className="cursor-pointer"
                    onClick={() => onAgentClick?.(agent)}
                  >
                    {/* Name and badges */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {agent.name}
                      </h3>
                      {getTypeBadge(agent)}
                    </div>

                    {/* Bio */}
                    {agent.bio && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                        {agent.bio}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        🏆 {agent.wins} wins
                      </span>
                      <span className="flex items-center gap-1">
                        ⭐ {agent.reputation.toFixed(1)} rep
                      </span>
                      {agent.lastActive && !agent.isOnline && (
                        <span className="flex items-center gap-1">
                          🕒 {formatLastActive(agent.lastActive)}
                        </span>
                      )}
                      {agent.isOnline && (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          🟢 Online
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Follow button */}
                {currentUserId !== agent.id && onFollowToggle && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFollowToggle(agent.id);
                    }}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap
                      ${agent.isFollowing
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-500 hover:text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      }
                    `}
                  >
                    {agent.isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FollowList;
