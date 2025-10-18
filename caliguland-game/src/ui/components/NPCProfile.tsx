/**
 * NPCProfile Component
 *
 * Specialized profile view for NPC (Non-Player Character) agents.
 * Displays NPC personality, reliability, information advantage, and recent posts/hints.
 *
 * @component
 * @example
 * ```tsx
 * <NPCProfile
 *   npc={npcData}
 *   isFollowing={false}
 *   onFollowToggle={() => handleFollow()}
 * />
 * ```
 */

import React, { useState } from 'react';
import { ProfileHeader, ProfileHeaderAgent } from './ProfileHeader';
import { Post, NPC } from '../../types';

/**
 * NPC profile data interface
 */
export interface NPCProfileData extends ProfileHeaderAgent {
  /** NPC role and characteristics */
  npcData: {
    role: NPC['role'];
    bias: NPC['bias'];
    personalityType: string;
    reliabilityScore: number;
    traits?: string[];
    informationAdvantage?: string;
  };

  /** Recent posts/hints */
  recentPosts?: Post[];

  /** Accuracy stats */
  accuracyStats?: {
    totalHints: number;
    accurateHints: number;
    misleadingHints: number;
    accuracyRate: number;
  };

  /** Relationship status */
  relationship?: {
    mutualFollowers: number;
    followedBy?: string[]; // List of follower names
  };
}

/**
 * Props for the NPCProfile component
 */
export interface NPCProfileProps {
  /** NPC data */
  npc: NPCProfileData;

  /** Whether the current user follows this NPC */
  isFollowing?: boolean;

  /** Current user ID */
  currentUserId?: string;

  /** Callback when follow/unfollow is clicked */
  onFollowToggle?: () => void;

  /** Callback when a post is clicked */
  onPostClick?: (post: Post) => void;

  /** Loading state */
  isLoading?: boolean;

  /** Custom CSS classes */
  className?: string;
}

/**
 * Get role description
 */
const getRoleDescription = (role: NPC['role']): string => {
  const descriptions: Record<NPC['role'], string> = {
    insider: 'Has access to privileged information from within organizations. Their tips often contain genuine insider knowledge.',
    rumor: 'Spreads rumors and speculation. Information may be partially true, exaggerated, or completely fabricated.',
    celebrity: 'Public figure with high visibility. Their statements and actions can influence market sentiment and public opinion.',
    media: 'News outlet or journalist. Publishes reports, investigations, and breaking news that shape the narrative.',
    organization: 'Corporate or institutional entity. Makes official announcements and policy decisions that impact outcomes.',
  };

  return descriptions[role];
};

/**
 * Get bias description
 */
const getBiasDescription = (bias: NPC['bias']): string => {
  const descriptions: Record<NPC['bias'], string> = {
    truthful: 'Generally provides accurate information and honest assessments. A reliable source for making predictions.',
    deceptive: 'Often spreads misinformation or manipulates facts. Treat their information with extreme skepticism.',
    neutral: 'Mixed track record with both accurate and inaccurate information. Requires verification from other sources.',
  };

  return descriptions[bias];
};

/**
 * Format date
 */
const formatDate = (timestamp: Date | string): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get reliability color
 */
const getReliabilityColor = (score: number): string => {
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

/**
 * NPCProfile Component
 *
 * Comprehensive NPC profile with personality insights and reliability metrics.
 */
export const NPCProfile: React.FC<NPCProfileProps> = ({
  npc,
  isFollowing = false,
  currentUserId,
  onFollowToggle,
  onPostClick,
  isLoading = false,
  className = '',
}) => {
  const [showFullHistory, setShowFullHistory] = useState(false);

  // Prepare agent data for ProfileHeader
  const headerAgent: ProfileHeaderAgent = {
    ...npc,
    isFollowing,
  };

  const displayPosts = showFullHistory ? npc.recentPosts : npc.recentPosts?.slice(0, 5);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Header */}
      <ProfileHeader
        agent={headerAgent}
        isOwnProfile={false}
        onFollowToggle={onFollowToggle}
        isLoading={isLoading}
      />

      {/* NPC Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
        {/* Personality Section */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span>🎭</span>
            <span>Personality Profile</span>
          </h3>

          {/* Role */}
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Role: {npc.npcData.role.charAt(0).toUpperCase() + npc.npcData.role.slice(1)}
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {getRoleDescription(npc.npcData.role)}
            </p>
          </div>

          {/* Bias */}
          <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Bias: {npc.npcData.bias.charAt(0).toUpperCase() + npc.npcData.bias.slice(1)}
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {getBiasDescription(npc.npcData.bias)}
            </p>
          </div>

          {/* Traits */}
          {npc.npcData.traits && npc.npcData.traits.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Personality Traits
              </h4>
              <div className="flex flex-wrap gap-2">
                {npc.npcData.traits.map((trait, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Information Advantage */}
          {npc.npcData.informationAdvantage && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <span>💡</span>
                <span>Information Advantage</span>
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {npc.npcData.informationAdvantage}
              </p>
            </div>
          )}
        </div>

        {/* Reliability Section */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span>📊</span>
            <span>Reliability Analysis</span>
          </h3>

          {/* Reliability Score */}
          <div className="mb-4 p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 rounded-lg border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                Overall Reliability Score
              </h4>
              <span className={`text-3xl font-bold ${getReliabilityColor(npc.npcData.reliabilityScore)}`}>
                {npc.npcData.reliabilityScore}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  npc.npcData.reliabilityScore >= 70
                    ? 'bg-green-500'
                    : npc.npcData.reliabilityScore >= 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${npc.npcData.reliabilityScore}%` }}
              />
            </div>
          </div>

          {/* Accuracy Stats */}
          {npc.accuracyStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {npc.accuracyStats.totalHints}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Hints</div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {npc.accuracyStats.accurateHints}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Accurate</div>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700 text-center">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {npc.accuracyStats.misleadingHints}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Misleading</div>
              </div>
            </div>
          )}
        </div>

        {/* Relationship Section */}
        {npc.relationship && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span>🤝</span>
              <span>Your Relationship</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Following Status
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {isFollowing ? (
                    <span className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      You are following this NPC
                    </span>
                  ) : (
                    <span>You are not following this NPC</span>
                  )}
                </p>
              </div>

              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Mutual Connections
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {npc.relationship.mutualFollowers} mutual followers
                </p>
              </div>
            </div>

            {npc.relationship.followedBy && npc.relationship.followedBy.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Also followed by
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {npc.relationship.followedBy.slice(0, 5).join(', ')}
                  {npc.relationship.followedBy.length > 5 && ` and ${npc.relationship.followedBy.length - 5} others`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recent Posts/Hints Section */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span>💬</span>
            <span>Recent Posts & Hints</span>
          </h3>

          {!npc.recentPosts || npc.recentPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <p>No recent posts from this NPC</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {displayPosts?.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => onPostClick?.(post)}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Day {post.gameDay}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(post.timestamp)}
                      </span>
                    </div>
                    <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
                      {post.content}
                    </p>
                    {post.isSystemMessage && (
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs rounded">
                        System Message
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {npc.recentPosts && npc.recentPosts.length > 5 && (
                <button
                  onClick={() => setShowFullHistory(!showFullHistory)}
                  className="mt-4 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {showFullHistory ? 'Show Less' : `Show All ${npc.recentPosts.length} Posts`}
                </button>
              )}
            </>
          )}
        </div>

        {/* Trust Recommendation */}
        <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-600">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <span>💭</span>
            <span>Trust Recommendation</span>
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {npc.npcData.reliabilityScore >= 70 && npc.npcData.bias === 'truthful' && (
              <span className="text-green-600 dark:text-green-400 font-medium">
                ✓ High reliability - Good source for decision making
              </span>
            )}
            {npc.npcData.reliabilityScore >= 40 && npc.npcData.reliabilityScore < 70 && (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                ⚠ Moderate reliability - Verify with other sources
              </span>
            )}
            {npc.npcData.reliabilityScore < 40 && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                ✗ Low reliability - High risk of misinformation
              </span>
            )}
            {npc.npcData.bias === 'deceptive' && (
              <span className="block mt-1 text-red-600 dark:text-red-400 font-medium">
                ⚠ Known for spreading deceptive information
              </span>
            )}
          </p>
        </div>
      </div>

      {/* TODO: Add interaction history - messages exchanged, hints received, etc. */}
    </div>
  );
};

export default NPCProfile;
