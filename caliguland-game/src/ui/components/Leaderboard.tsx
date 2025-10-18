/**
 * Leaderboard Component
 *
 * Displays ranked list of players with their performance statistics.
 * Includes podium display for top 3, filtering, search, and pagination.
 *
 * Features:
 * - Ranked list with avatar, name, profit, win rate, games played
 * - Highlight current player
 * - Top 3 podium display with medals/trophies
 * - Filter options (Current Game / All Time / This Week)
 * - Search functionality
 * - Pagination
 * - Click to view profile
 *
 * @module ui/components/Leaderboard
 */

import React, { useState, useMemo } from 'react';

/**
 * Leaderboard entry data
 */
export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  avatar?: string;
  profit: number;
  winRate: number;      // 0-1 (percentage)
  gamesPlayed: number;
  wins: number;
  reputationScore?: number;
}

/**
 * Filter option for leaderboard
 */
export type LeaderboardFilter = 'current' | 'all-time' | 'this-week';

/**
 * Props for Leaderboard component
 */
export interface LeaderboardProps {
  /** Array of leaderboard entries */
  entries: LeaderboardEntry[];
  /** Current player's agent ID */
  currentAgentId?: string;
  /** Initial filter */
  initialFilter?: LeaderboardFilter;
  /** Callback when player profile is clicked */
  onViewProfile?: (agentId: string) => void;
  /** Number of entries per page */
  pageSize?: number;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * Leaderboard Component
 *
 * Displays ranked players with performance metrics.
 * Supports filtering, searching, and pagination.
 *
 * @param props - Leaderboard component props
 * @returns Rendered leaderboard
 */
export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  currentAgentId,
  initialFilter = 'all-time',
  onViewProfile,
  pageSize = 10,
  isLoading = false,
}) => {
  const [filter, setFilter] = useState<LeaderboardFilter>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Filter and search entries
   */
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((entry) =>
        entry.agentName.toLowerCase().includes(query) ||
        entry.agentId.toLowerCase().includes(query)
      );
    }

    // Sort by rank
    result.sort((a, b) => a.rank - b.rank);

    return result;
  }, [entries, searchQuery]);

  /**
   * Paginate entries
   */
  const paginatedEntries = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredEntries.slice(startIdx, startIdx + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  /**
   * Calculate total pages
   */
  const totalPages = Math.ceil(filteredEntries.length / pageSize);

  /**
   * Get top 3 for podium
   */
  const topThree = filteredEntries.slice(0, 3);

  /**
   * Handle page change
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  /**
   * Handle search
   */
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page
  };

  /**
   * Format percentage
   */
  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  /**
   * Format currency
   */
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(2);
  };

  /**
   * Get rank badge/medal
   */
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="text-2xl">👑</span>;
      case 2:
        return <span className="text-xl">🥈</span>;
      case 3:
        return <span className="text-xl">🥉</span>;
      default:
        return (
          <span className="text-gray-400 font-bold text-sm">#{rank}</span>
        );
    }
  };

  /**
   * Get avatar or placeholder
   */
  const getAvatar = (entry: LeaderboardEntry) => {
    if (entry.avatar) {
      return (
        <img
          src={entry.avatar}
          alt={entry.agentName}
          className="w-full h-full object-cover"
        />
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold text-lg">
        {entry.agentName.charAt(0).toUpperCase()}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse text-gray-400">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-white">Leaderboard</h2>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('current')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              filter === 'current'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Current Game
          </button>
          <button
            onClick={() => setFilter('this-week')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              filter === 'this-week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setFilter('all-time')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              filter === 'all-time'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search players..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Podium Display (Top 3) */}
      {topThree.length >= 3 && currentPage === 1 && !searchQuery && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
          <h3 className="text-xl font-bold text-white mb-6 text-center">
            Top Players
          </h3>
          <div className="flex justify-center items-end gap-6">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full overflow-hidden mb-2 border-4 border-gray-400 shadow-lg">
                {getAvatar(topThree[1])}
              </div>
              <div className="text-2xl mb-1">🥈</div>
              <div className="text-sm text-white font-semibold text-center max-w-[100px] truncate">
                {topThree[1].agentName}
              </div>
              <div className="text-xs text-green-400 font-semibold">
                +{formatCurrency(topThree[1].profit)}
              </div>
              <div className="w-24 h-20 bg-gray-700 rounded-t mt-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-400">2</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-full overflow-hidden mb-2 border-4 border-yellow-400 shadow-2xl">
                {getAvatar(topThree[0])}
              </div>
              <div className="text-3xl mb-1">👑</div>
              <div className="text-base text-white font-bold text-center max-w-[120px] truncate">
                {topThree[0].agentName}
              </div>
              <div className="text-sm text-green-400 font-bold">
                +{formatCurrency(topThree[0].profit)}
              </div>
              <div className="w-28 h-28 bg-yellow-700 rounded-t mt-4 flex items-center justify-center">
                <span className="text-3xl font-bold text-yellow-300">1</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full overflow-hidden mb-2 border-4 border-orange-600 shadow-lg">
                {getAvatar(topThree[2])}
              </div>
              <div className="text-2xl mb-1">🥉</div>
              <div className="text-sm text-white font-semibold text-center max-w-[100px] truncate">
                {topThree[2].agentName}
              </div>
              <div className="text-xs text-green-400 font-semibold">
                +{formatCurrency(topThree[2].profit)}
              </div>
              <div className="w-24 h-16 bg-gray-700 rounded-t mt-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-400">3</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-900 border-b border-gray-700 text-sm font-semibold text-gray-400">
          <div className="col-span-1">Rank</div>
          <div className="col-span-4">Player</div>
          <div className="col-span-2 text-right">Profit</div>
          <div className="col-span-2 text-right">Win Rate</div>
          <div className="col-span-2 text-right">Games</div>
          <div className="col-span-1"></div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-700">
          {paginatedEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No players found
            </div>
          ) : (
            paginatedEntries.map((entry) => {
              const isCurrentUser = entry.agentId === currentAgentId;
              return (
                <div
                  key={entry.agentId}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors ${
                    isCurrentUser
                      ? 'bg-blue-900/30 border-l-4 border-blue-500'
                      : 'hover:bg-gray-700/50'
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center">
                    {getRankBadge(entry.rank)}
                  </div>

                  {/* Player */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {getAvatar(entry)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">
                        {entry.agentName}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-blue-400">(You)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {entry.agentId.substring(0, 8)}...
                      </div>
                    </div>
                  </div>

                  {/* Profit */}
                  <div className="col-span-2 text-right">
                    <span
                      className={`font-semibold ${
                        entry.profit > 0
                          ? 'text-green-400'
                          : entry.profit < 0
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {entry.profit > 0 ? '+' : ''}
                      {formatCurrency(entry.profit)}
                    </span>
                  </div>

                  {/* Win Rate */}
                  <div className="col-span-2 text-right">
                    <span className="text-white font-semibold">
                      {formatPercent(entry.winRate)}
                    </span>
                    <div className="text-xs text-gray-500">
                      {entry.wins}W
                    </div>
                  </div>

                  {/* Games Played */}
                  <div className="col-span-2 text-right">
                    <span className="text-white font-semibold">
                      {entry.gamesPlayed}
                    </span>
                  </div>

                  {/* View Profile Button */}
                  <div className="col-span-1 text-right">
                    {onViewProfile && (
                      <button
                        onClick={() => onViewProfile(entry.agentId)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-10 h-10 rounded-lg font-semibold transition-colors ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Stats Summary */}
      <div className="text-center text-sm text-gray-500">
        Showing {paginatedEntries.length} of {filteredEntries.length} players
      </div>
    </div>
  );
};

export default Leaderboard;
