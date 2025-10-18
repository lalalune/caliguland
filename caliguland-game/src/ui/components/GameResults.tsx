/**
 * GameResults Component
 *
 * Displays final game results after outcome is revealed.
 * Shows winning/losing status, profit/loss, detailed breakdown,
 * top winners, and social sharing options.
 *
 * Features:
 * - Final outcome display (YES won / NO won)
 * - Winning/losing indicator for current player
 * - Animated profit/loss display
 * - Detailed breakdown (bets, shares, payout, profit)
 * - Top 5 winners list
 * - Leaderboard link
 * - Share results button
 * - Play again button
 *
 * @module ui/components/GameResults
 */

import React, { useState, useEffect } from 'react';

/**
 * Outcome enumeration
 */
export enum Outcome {
  YES = 'YES',
  NO = 'NO',
}

/**
 * Player result data
 */
export interface PlayerResult {
  agentId: string;
  agentName: string;
  initialBets: number;
  finalShares: { yes: number; no: number };
  payout: number;
  profit: number;
  isWinner: boolean;
}

/**
 * Top winner data
 */
export interface TopWinner {
  rank: number;
  agentId: string;
  agentName: string;
  profit: number;
  avatar?: string;
}

/**
 * Props for GameResults component
 */
export interface GameResultsProps {
  /** Final outcome of the game */
  outcome: Outcome;
  /** Question that was resolved */
  question: string;
  /** Current player's result */
  playerResult: PlayerResult;
  /** Top 5 winners */
  topWinners: TopWinner[];
  /** Total number of players */
  totalPlayers: number;
  /** Callback for viewing full leaderboard */
  onViewLeaderboard: () => void;
  /** Callback for playing again */
  onPlayAgain: () => void;
  /** Callback for sharing results */
  onShare?: () => void;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * GameResults Component
 *
 * Displays the final outcome and player performance after game resolution.
 * Includes animations for profit/loss reveal and celebratory effects for winners.
 *
 * @param props - GameResults component props
 * @returns Rendered game results
 */
export const GameResults: React.FC<GameResultsProps> = ({
  outcome,
  question,
  playerResult,
  topWinners,
  totalPlayers,
  onViewLeaderboard,
  onPlayAgain,
  onShare,
  isLoading = false,
}) => {
  const [animatedProfit, setAnimatedProfit] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  /**
   * Animate profit/loss counter on mount
   */
  useEffect(() => {
    if (playerResult.profit === 0) {
      setAnimatedProfit(0);
      return;
    }

    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const increment = playerResult.profit / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      setAnimatedProfit(increment * currentStep);

      if (currentStep >= steps) {
        setAnimatedProfit(playerResult.profit);
        clearInterval(interval);

        // Show confetti for winners
        if (playerResult.isWinner && playerResult.profit > 0) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [playerResult.profit, playerResult.isWinner]);

  /**
   * Format currency
   */
  const formatCurrency = (value: number): string => {
    return value.toFixed(2);
  };

  /**
   * Get result color class
   */
  const getResultColor = (): string => {
    if (playerResult.profit > 0) return 'text-green-400';
    if (playerResult.profit < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  /**
   * Get result icon
   */
  const getResultIcon = () => {
    if (playerResult.isWinner) {
      return (
        <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    } else {
      return (
        <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse text-gray-400">Loading results...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {/* TODO: Add confetti animation library (e.g., react-confetti) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl animate-bounce">🎉</div>
          </div>
        </div>
      )}

      {/* Final Outcome */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Final Outcome</h2>
        <div className="text-sm text-gray-400 mb-4 max-w-2xl mx-auto">{question}</div>
        <div
          className={`inline-flex items-center gap-3 px-6 py-3 rounded-lg text-3xl font-bold ${
            outcome === Outcome.YES
              ? 'bg-green-900/30 border border-green-700 text-green-400'
              : 'bg-red-900/30 border border-red-700 text-red-400'
          }`}
        >
          {outcome === Outcome.YES ? (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span>{outcome} Won!</span>
        </div>
      </div>

      {/* Player Result */}
      <div
        className={`bg-gray-800 rounded-lg border p-8 ${
          playerResult.isWinner ? 'border-green-700' : 'border-red-700'
        }`}
      >
        <div className="flex items-center justify-center mb-6">
          <div className={playerResult.isWinner ? 'text-green-400' : 'text-red-400'}>
            {getResultIcon()}
          </div>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white mb-2">
            {playerResult.isWinner ? 'You Won!' : 'You Lost'}
          </h3>
          <p className="text-gray-400">
            {playerResult.isWinner
              ? 'Congratulations on your successful prediction!'
              : 'Better luck next time!'}
          </p>
        </div>

        {/* Animated Profit/Loss */}
        <div className="text-center mb-8">
          <div className="text-sm text-gray-400 mb-2">Your Profit/Loss</div>
          <div className={`text-5xl font-bold ${getResultColor()} transition-all`}>
            {animatedProfit > 0 ? '+' : ''}
            {formatCurrency(animatedProfit)}
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-gray-900 rounded-lg p-6 space-y-4">
          <h4 className="text-lg font-semibold text-white mb-4">Breakdown</h4>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Initial Bets</span>
            <span className="text-white font-semibold">
              {formatCurrency(playerResult.initialBets)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Final Shares</span>
            <div className="text-right">
              <div className="text-white font-semibold">
                YES: {formatCurrency(playerResult.finalShares.yes)}
              </div>
              <div className="text-white font-semibold">
                NO: {formatCurrency(playerResult.finalShares.no)}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Payout</span>
              <span className="text-white font-semibold">
                {formatCurrency(playerResult.payout)}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <div className="flex justify-between">
              <span className="text-gray-300 font-semibold">Total Profit/Loss</span>
              <span className={`text-xl font-bold ${getResultColor()}`}>
                {playerResult.profit > 0 ? '+' : ''}
                {formatCurrency(playerResult.profit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Winners */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-xl font-bold text-white">Top Winners</h4>
          <button
            onClick={onViewLeaderboard}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            View Full Leaderboard →
          </button>
        </div>

        {/* Podium Display (Top 3) */}
        <div className="flex justify-center items-end gap-4 mb-8">
          {/* 2nd Place */}
          {topWinners[1] && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-2 border-2 border-gray-400">
                <span className="text-2xl">🥈</span>
              </div>
              <div className="text-sm text-gray-300 font-semibold text-center">
                {topWinners[1].agentName}
              </div>
              <div className="text-xs text-green-400">
                +{formatCurrency(topWinners[1].profit)}
              </div>
              <div className="w-20 h-16 bg-gray-700 rounded-t mt-2 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-400">2</span>
              </div>
            </div>
          )}

          {/* 1st Place */}
          {topWinners[0] && (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-yellow-600 rounded-full flex items-center justify-center mb-2 border-4 border-yellow-400 shadow-lg">
                <span className="text-3xl">👑</span>
              </div>
              <div className="text-base text-white font-bold text-center">
                {topWinners[0].agentName}
              </div>
              <div className="text-sm text-green-400 font-semibold">
                +{formatCurrency(topWinners[0].profit)}
              </div>
              <div className="w-20 h-24 bg-yellow-700 rounded-t mt-2 flex items-center justify-center">
                <span className="text-2xl font-bold text-yellow-300">1</span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {topWinners[2] && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-orange-800 rounded-full flex items-center justify-center mb-2 border-2 border-orange-600">
                <span className="text-2xl">🥉</span>
              </div>
              <div className="text-sm text-gray-300 font-semibold text-center">
                {topWinners[2].agentName}
              </div>
              <div className="text-xs text-green-400">
                +{formatCurrency(topWinners[2].profit)}
              </div>
              <div className="w-20 h-12 bg-gray-700 rounded-t mt-2 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-400">3</span>
              </div>
            </div>
          )}
        </div>

        {/* Remaining Winners (4-5) */}
        {topWinners.length > 3 && (
          <div className="space-y-2">
            {topWinners.slice(3, 5).map((winner) => (
              <div
                key={winner.agentId}
                className="flex items-center justify-between bg-gray-900 rounded p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-bold text-gray-400">
                    {winner.rank}
                  </div>
                  <span className="text-white font-semibold">{winner.agentName}</span>
                </div>
                <span className="text-green-400 font-semibold">
                  +{formatCurrency(winner.profit)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-xs text-gray-500 mt-4">
          {totalPlayers} total players
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {onShare && (
          <button
            onClick={onShare}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
            Share Results
          </button>
        )}
        <button
          onClick={onPlayAgain}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
          Play Again
        </button>
      </div>
    </div>
  );
};

export default GameResults;
