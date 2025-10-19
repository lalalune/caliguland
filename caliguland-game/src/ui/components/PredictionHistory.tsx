/**
 * PredictionHistory Component
 *
 * Displays a table of past prediction history with filtering, sorting, and pagination.
 * Shows prediction details including date, game, outcome, amount, and profit/loss.
 *
 * @component
 * @example
 * ```tsx
 * <PredictionHistory
 *   bets={playerBets}
 *   onBetClick={(bet) => console.log('Bet clicked:', bet)}
 * />
 * ```
 */

import React, { useState, useMemo } from 'react';
import { Bet, Outcome } from '../../types';

/**
 * Extended prediction interface with game information
 */
export interface PredictionHistoryEntry extends Bet {
  /** Unique prediction ID */
  id: string;

  /** Game/session ID */
  gameId: string;

  /** Game title or description */
  gameTitle: string;

  /** Final game outcome */
  finalOutcome?: Outcome;

  /** Profit or loss from this prediction */
  profitLoss?: number;

  /** Bet status */
  status: 'won' | 'lost' | 'pending';
}

/**
 * Props for the PredictionHistory component
 */
export interface PredictionHistoryProps {
  /** Array of prediction history entries */
  bets: PredictionHistoryEntry[];

  /** Callback when a prediction is clicked */
  onBetClick?: (bet: PredictionHistoryEntry) => void;

  /** Show pagination controls */
  showPagination?: boolean;

  /** Items per page */
  itemsPerPage?: number;

  /** Custom CSS classes */
  className?: string;
}

/**
 * Filter options
 */
type FilterOption = 'all' | 'won' | 'lost' | 'pending';

/**
 * Sort options
 */
type SortOption = 'date' | 'amount' | 'profit';
type SortDirection = 'asc' | 'desc';

/**
 * Get status color classes
 */
const getStatusColor = (status: 'won' | 'lost' | 'pending'): string => {
  switch (status) {
    case 'won':
      return 'text-green-600 dark:text-green-400 bg-green-500/10';
    case 'lost':
      return 'text-red-600 dark:text-red-400 bg-red-500/10';
    case 'pending':
      return 'text-gray-600 dark:text-gray-400 bg-gray-500/10';
  }
};

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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * PredictionHistory Component
 *
 * Displays a comprehensive prediction history with filtering and sorting capabilities.
 */
export const PredictionHistory: React.FC<PredictionHistoryProps> = ({
  bets,
  onBetClick,
  showPagination = true,
  itemsPerPage = 10,
  className = '',
}) => {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const wonBets = bets.filter((b) => b.status === 'won');
    const lostBets = bets.filter((b) => b.status === 'lost');

    const totalProfit = bets.reduce((sum, bet) => sum + (bet.profitLoss || 0), 0);
    const totalWon = wonBets.length;
    const totalLost = lostBets.length;
    const totalCompleted = totalWon + totalLost;
    const winRate = totalCompleted > 0 ? (totalWon / totalCompleted) * 100 : 0;

    const totalInvested = lostBets.reduce((sum, bet) => sum + bet.amount, 0);
    const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return {
      totalProfit,
      winRate,
      roi,
      totalBets: bets.length,
      wonBets: totalWon,
      lostBets: totalLost,
      pendingBets: bets.length - totalCompleted,
    };
  }, [bets]);

  // Filter and sort bets
  const processedBets = useMemo(() => {
    // Filter
    let filtered = bets;
    if (filter !== 'all') {
      filtered = bets.filter((bet) => bet.status === filter);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'profit':
          comparison = (a.profitLoss || 0) - (b.profitLoss || 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [bets, filter, sortBy, sortDirection]);

  // Paginate
  const totalPages = Math.ceil(processedBets.length / itemsPerPage);
  const paginatedBets = showPagination
    ? processedBets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : processedBets;

  // Toggle sort
  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('desc');
    }
  };

  // Empty state
  if (bets.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No Prediction History
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Your bets will appear here once you start playing.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 rounded-lg p-4 border border-blue-500/30">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total Profit</div>
          <div className={`text-2xl font-bold ${summaryStats.totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(summaryStats.totalProfit)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-600/20 rounded-lg p-4 border border-purple-500/30">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Win Rate</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {summaryStats.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">
            {summaryStats.wonBets}W / {summaryStats.lostBets}L
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 rounded-lg p-4 border border-green-500/30">
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">ROI</div>
          <div className={`text-2xl font-bold ${summaryStats.roi >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {summaryStats.roi.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'won', 'lost', 'pending'] as FilterOption[]).map((option) => (
            <button
              key={option}
              onClick={() => {
                setFilter(option);
                setCurrentPage(1);
              }}
              className={`
                px-4 py-2 rounded-lg font-medium capitalize transition-all
                ${filter === option
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }
              `}
            >
              {option}
              {option === 'all' && ` (${summaryStats.totalBets})`}
              {option === 'won' && ` (${summaryStats.wonBets})`}
              {option === 'lost' && ` (${summaryStats.lostBets})`}
              {option === 'pending' && ` (${summaryStats.pendingBets})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => handleSort('date')}
              >
                Date {sortBy === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Game
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Bet
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => handleSort('amount')}
              >
                Amount {sortBy === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Outcome
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => handleSort('profit')}
              >
                Profit/Loss {sortBy === 'profit' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedBets.map((bet) => (
              <tr
                key={bet.id}
                onClick={() => onBetClick?.(bet)}
                className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {formatDate(bet.timestamp)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                  {bet.gameTitle}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      bet.outcome === Outcome.YES
                        ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                        : 'bg-red-500/20 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {bet.outcome}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right font-medium text-gray-700 dark:text-gray-300">
                  {formatCurrency(bet.amount)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(bet.status)}`}
                  >
                    {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold">
                  {bet.status === 'pending' ? (
                    <span className="text-gray-500">-</span>
                  ) : (
                    <span
                      className={
                        (bet.profitLoss || 0) >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {(bet.profitLoss || 0) >= 0 ? '+' : ''}
                      {formatCurrency(bet.profitLoss || 0)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, processedBets.length)} of {processedBets.length} bets
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  } transition-colors`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionHistory;
