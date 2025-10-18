/**
 * ProfileHeader Component
 *
 * Displays a profile header with avatar, name, bio, stats, and follow button.
 * Supports both human players and AI NPCs with appropriate badges and indicators.
 *
 * @component
 * @example
 * ```tsx
 * <ProfileHeader
 *   agent={playerData}
 *   isOwnProfile={false}
 *   onFollowToggle={() => handleFollow()}
 *   onEditProfile={() => navigate('/edit')}
 * />
 * ```
 */

import React from 'react';
import { Agent, NPC } from '../../types';

/**
 * Extended agent interface with profile information
 */
export interface ProfileHeaderAgent extends Agent {
  /** Agent's bio or description */
  bio?: string;

  /** Avatar URL or emoji */
  avatar?: string;

  /** Whether the current user follows this agent */
  isFollowing?: boolean;

  /** Online status */
  isOnline?: boolean;

  /** Number of followers */
  followersCount?: number;

  /** Number of following */
  followingCount?: number;

  /** Total games played */
  gamesPlayed?: number;

  /** NPC-specific data (if this is an NPC) */
  npcData?: {
    role: NPC['role'];
    bias: NPC['bias'];
    personalityType?: string;
    reliabilityScore?: number;
  };
}

/**
 * Props for the ProfileHeader component
 */
export interface ProfileHeaderProps {
  /** Agent data to display */
  agent: ProfileHeaderAgent;

  /** Whether this is the current user's profile */
  isOwnProfile?: boolean;

  /** Callback when follow/unfollow is clicked */
  onFollowToggle?: () => void;

  /** Callback when edit profile is clicked */
  onEditProfile?: () => void;

  /** Loading state */
  isLoading?: boolean;

  /** Custom CSS classes */
  className?: string;
}

/**
 * Get NPC role badge
 */
const getNPCRoleBadge = (role: NPC['role']): { emoji: string; label: string; color: string } => {
  const badges: Record<NPC['role'], { emoji: string; label: string; color: string }> = {
    insider: {
      emoji: '🔐',
      label: 'Insider',
      color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
    },
    rumor: {
      emoji: '📢',
      label: 'Rumor Monger',
      color: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
    },
    celebrity: {
      emoji: '⭐',
      label: 'Celebrity',
      color: 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30',
    },
    media: {
      emoji: '📰',
      label: 'Media',
      color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
    },
    organization: {
      emoji: '🏢',
      label: 'Organization',
      color: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
    },
  };

  return badges[role];
};

/**
 * Get bias indicator
 */
const getBiasIndicator = (bias: NPC['bias']): { emoji: string; label: string; color: string } => {
  const indicators: Record<NPC['bias'], { emoji: string; label: string; color: string }> = {
    truthful: {
      emoji: '✓',
      label: 'Tends to be truthful',
      color: 'text-green-600 dark:text-green-400',
    },
    deceptive: {
      emoji: '⚠',
      label: 'Often deceptive',
      color: 'text-red-600 dark:text-red-400',
    },
    neutral: {
      emoji: '~',
      label: 'Mixed reliability',
      color: 'text-gray-600 dark:text-gray-400',
    },
  };

  return indicators[bias];
};

/**
 * Format large numbers
 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

/**
 * ProfileHeader Component
 *
 * Displays comprehensive profile information in a header section.
 */
export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  agent,
  isOwnProfile = false,
  onFollowToggle,
  onEditProfile,
  isLoading = false,
  className = '',
}) => {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-32 h-32 bg-gray-300 dark:bg-gray-600 rounded-full" />
            <div className="flex-1 space-y-4">
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3" />
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3" />
              <div className="flex gap-4">
                <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded w-20" />
                <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded w-20" />
                <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded w-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isNPC = agent.isNPC && agent.npcData;
  const npcRoleBadge = isNPC ? getNPCRoleBadge(agent.npcData!.role) : null;
  const biasIndicator = isNPC ? getBiasIndicator(agent.npcData!.bias) : null;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Cover/Banner */}
      <div className="h-32 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

      {/* Profile Content */}
      <div className="px-6 pb-6">
        {/* Avatar and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end -mt-16 mb-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden shadow-xl">
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
              <div
                className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white dark:border-gray-800 shadow-lg"
                title="Online"
              />
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons */}
          <div className="flex gap-2 mt-4 sm:mt-0">
            {isOwnProfile ? (
              <button
                onClick={onEditProfile}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Edit Profile
              </button>
            ) : (
              <button
                onClick={onFollowToggle}
                className={`
                  px-6 py-2 rounded-lg font-medium transition-all
                  ${agent.isFollowing
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-red-500 hover:text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {agent.isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        {/* Name, Handle, and Badges */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {agent.name}
            </h1>

            {/* Type badges */}
            {isNPC && npcRoleBadge && (
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${npcRoleBadge.color}`}
              >
                <span>{npcRoleBadge.emoji}</span>
                <span>{npcRoleBadge.label}</span>
              </span>
            )}

            {!isNPC && agent.type === 'ai' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                <span>🤖</span>
                <span>AI Agent</span>
              </span>
            )}

            {agent.isOnline && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-500/20 text-green-700 dark:text-green-300 border border-green-500/30">
                <span>🟢</span>
                <span>Online</span>
              </span>
            )}
          </div>

          {/* Handle */}
          <p className="text-gray-600 dark:text-gray-400 mb-2">@{agent.id}</p>

          {/* Bio */}
          {agent.bio && (
            <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-3">
              {agent.bio}
            </p>
          )}

          {/* NPC personality type */}
          {isNPC && agent.npcData?.personalityType && (
            <div className="mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Personality: <span className="font-semibold text-gray-800 dark:text-gray-200">{agent.npcData.personalityType}</span>
              </span>
            </div>
          )}

          {/* NPC bias indicator */}
          {isNPC && biasIndicator && (
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xl ${biasIndicator.color}`}>{biasIndicator.emoji}</span>
              <span className={`text-sm font-medium ${biasIndicator.color}`}>
                {biasIndicator.label}
              </span>
            </div>
          )}

          {/* NPC reliability score */}
          {isNPC && agent.npcData?.reliabilityScore !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Reliability:</span>
              <div className="flex-1 max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-full rounded-full ${
                    agent.npcData.reliabilityScore >= 70
                      ? 'bg-green-500'
                      : agent.npcData.reliabilityScore >= 40
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${agent.npcData.reliabilityScore}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {agent.npcData.reliabilityScore}%
              </span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Followers */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatNumber(agent.followersCount || 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Followers</div>
          </div>

          {/* Following */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatNumber(agent.followingCount || 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Following</div>
          </div>

          {/* Reputation */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {agent.reputation.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Reputation</div>
          </div>

          {/* Games Won */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {agent.wins}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Games Won
              {agent.gamesPlayed && agent.gamesPlayed > 0 && (
                <span className="block text-xs">
                  ({((agent.wins / agent.gamesPlayed) * 100).toFixed(0)}% win rate)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
