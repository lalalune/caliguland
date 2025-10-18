/**
 * PlayerProfile Component
 *
 * Complete player profile view with tabs for posts, bets, stats, and social connections.
 * Displays comprehensive player information including betting history, performance stats,
 * and social feed.
 *
 * @component
 * @example
 * ```tsx
 * <PlayerProfile
 *   player={playerData}
 *   isOwnProfile={true}
 *   onFollowToggle={() => handleFollow()}
 * />
 * ```
 */

import React, { useState } from 'react';
import { ProfileHeader, ProfileHeaderAgent } from './ProfileHeader';
import { BettingHistory, BettingHistoryEntry } from './BettingHistory';
import { FollowList, FollowListAgent } from './FollowList';
import { StatsCard } from './StatsCard';
import { Post } from '../../types';

/**
 * Tab options for player profile
 */
type ProfileTab = 'posts' | 'bets' | 'stats' | 'followers' | 'following';

/**
 * Player statistics interface
 */
export interface PlayerStats {
  /** Win rate percentage */
  winRate: number;

  /** Total games played */
  totalGames: number;

  /** Total profit/loss */
  totalProfitLoss: number;

  /** Best prediction (highest profit) */
  bestPrediction: {
    gameTitle: string;
    profit: number;
  };

  /** Average bet size */
  averageBetSize: number;

  /** Win streak */
  currentWinStreak: number;

  /** Best win streak */
  bestWinStreak: number;

  /** Total wagered */
  totalWagered: number;

  /** ROI percentage */
  roi: number;
}

/**
 * Props for the PlayerProfile component
 */
export interface PlayerProfileProps {
  /** Player data */
  player: ProfileHeaderAgent;

  /** Posts made by the player */
  posts?: Post[];

  /** Betting history */
  bets?: BettingHistoryEntry[];

  /** Player statistics */
  stats?: PlayerStats;

  /** Followers list */
  followers?: FollowListAgent[];

  /** Following list */
  following?: FollowListAgent[];

  /** Whether this is the current user's profile */
  isOwnProfile?: boolean;

  /** Current user ID */
  currentUserId?: string;

  /** Callback when follow/unfollow is clicked */
  onFollowToggle?: () => void;

  /** Callback when edit profile is clicked */
  onEditProfile?: () => void;

  /** Callback when a bet is clicked */
  onBetClick?: (bet: BettingHistoryEntry) => void;

  /** Callback when an agent is clicked */
  onAgentClick?: (agent: FollowListAgent) => void;

  /** Callback when follow/unfollow on agent list */
  onAgentFollowToggle?: (agentId: string) => void;

  /** Loading state */
  isLoading?: boolean;

  /** Custom CSS classes */
  className?: string;
}

/**
 * Format currency
 */
const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
 * PlayerProfile Component
 *
 * Full-featured player profile with multiple tabs and comprehensive information.
 */
export const PlayerProfile: React.FC<PlayerProfileProps> = ({
  player,
  posts = [],
  bets = [],
  stats,
  followers = [],
  following = [],
  isOwnProfile = false,
  currentUserId,
  onFollowToggle,
  onEditProfile,
  onBetClick,
  onAgentClick,
  onAgentFollowToggle,
  isLoading = false,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');

  // Calculate default stats if not provided
  const defaultStats: PlayerStats = {
    winRate: bets.length > 0 ? (bets.filter((b) => b.status === 'won').length / bets.filter((b) => b.status !== 'pending').length) * 100 : 0,
    totalGames: player.gamesPlayed || bets.length,
    totalProfitLoss: bets.reduce((sum, bet) => sum + (bet.profitLoss || 0), 0),
    bestPrediction: bets.length > 0
      ? bets.reduce((best, bet) => ((bet.profitLoss || 0) > best.profit ? { gameTitle: bet.gameTitle, profit: bet.profitLoss || 0 } : best), { gameTitle: '', profit: 0 })
      : { gameTitle: 'N/A', profit: 0 },
    averageBetSize: bets.length > 0 ? bets.reduce((sum, bet) => sum + bet.amount, 0) / bets.length : 0,
    currentWinStreak: 0, // TODO: Calculate from bet history
    bestWinStreak: 0, // TODO: Calculate from bet history
    totalWagered: bets.reduce((sum, bet) => sum + bet.amount, 0),
    roi: 0, // Calculated below
  };

  const playerStats = stats || defaultStats;
  playerStats.roi = playerStats.totalWagered > 0 ? (playerStats.totalProfitLoss / playerStats.totalWagered) * 100 : 0;

  // Tab definitions
  const tabs: { id: ProfileTab; label: string; icon: string; count?: number }[] = [
    { id: 'posts', label: 'Posts', icon: '📝', count: posts.length },
    { id: 'bets', label: 'Bets', icon: '💰', count: bets.length },
    { id: 'stats', label: 'Stats', icon: '📊' },
    { id: 'followers', label: 'Followers', icon: '👥', count: followers.length },
    { id: 'following', label: 'Following', icon: '➕', count: following.length },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Header */}
      <ProfileHeader
        agent={player}
        isOwnProfile={isOwnProfile}
        onFollowToggle={onFollowToggle}
        onEditProfile={onEditProfile}
        isLoading={isLoading}
      />

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Tab buttons */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-4 font-medium transition-all whitespace-nowrap
                ${activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }
              `}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`
                    px-2 py-0.5 rounded-full text-xs font-bold
                    ${activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }
                  `}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Player Posts
              </h3>
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-gray-500 dark:text-gray-400">
                    {isOwnProfile ? "You haven't posted anything yet" : "This player hasn't posted anything yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Day {post.gameDay} • {formatDate(post.timestamp)}
                            </span>
                          </div>
                          <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
                            {post.content}
                          </p>
                          {post.replyTo && (
                            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              Reply to another post
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* TODO: Add pagination or infinite scroll for large post counts */}
            </div>
          )}

          {/* Bets Tab */}
          {activeTab === 'bets' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Betting History
              </h3>
              <BettingHistory
                bets={bets}
                onBetClick={onBetClick}
                showPagination={true}
                itemsPerPage={10}
              />
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Performance Statistics
              </h3>

              {/* Key metrics grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatsCard
                  label="Win Rate"
                  value={playerStats.winRate}
                  valueType="percentage"
                  icon="🏆"
                  color={playerStats.winRate >= 60 ? 'green' : playerStats.winRate >= 40 ? 'yellow' : 'red'}
                />
                <StatsCard
                  label="Total Profit/Loss"
                  value={playerStats.totalProfitLoss}
                  valueType="currency"
                  icon="💰"
                  color={playerStats.totalProfitLoss >= 0 ? 'green' : 'red'}
                />
                <StatsCard
                  label="ROI"
                  value={playerStats.roi}
                  valueType="percentage"
                  icon="📈"
                  color={playerStats.roi >= 0 ? 'green' : 'red'}
                />
                <StatsCard
                  label="Total Games"
                  value={playerStats.totalGames}
                  valueType="number"
                  icon="🎮"
                  color="blue"
                />
                <StatsCard
                  label="Avg Bet Size"
                  value={playerStats.averageBetSize}
                  valueType="currency"
                  icon="💵"
                  color="purple"
                />
                <StatsCard
                  label="Total Wagered"
                  value={playerStats.totalWagered}
                  valueType="currency"
                  icon="💸"
                  color="gray"
                />
              </div>

              {/* Best prediction */}
              {playerStats.bestPrediction.gameTitle && (
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 dark:from-yellow-500/20 dark:to-orange-500/20 rounded-lg p-6 border border-yellow-500/30">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    🌟 Best Prediction
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-1">
                    {playerStats.bestPrediction.gameTitle}
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    +{formatCurrency(playerStats.bestPrediction.profit)}
                  </p>
                </div>
              )}

              {/* Win streaks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 rounded-lg p-6 border border-green-500/30">
                  <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Win Streak</h4>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {playerStats.currentWinStreak} 🔥
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 rounded-lg p-6 border border-blue-500/30">
                  <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Best Win Streak</h4>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {playerStats.bestWinStreak} ⭐
                  </p>
                </div>
              </div>

              {/* TODO: Add win rate chart using a chart library like recharts or chart.js */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                <p className="text-gray-600 dark:text-gray-400">
                  📊 Win Rate Chart - TODO: Integrate chart library (recharts, chart.js, etc.)
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Will show win rate over time with trend lines
                </p>
              </div>
            </div>
          )}

          {/* Followers Tab */}
          {activeTab === 'followers' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Followers
              </h3>
              <FollowList
                agents={followers}
                type="followers"
                currentUserId={currentUserId}
                onFollowToggle={onAgentFollowToggle}
                onAgentClick={onAgentClick}
                showSearch={true}
              />
            </div>
          )}

          {/* Following Tab */}
          {activeTab === 'following' && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Following
              </h3>
              <FollowList
                agents={following}
                type="following"
                currentUserId={currentUserId}
                onFollowToggle={onAgentFollowToggle}
                onAgentClick={onAgentClick}
                showSearch={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
