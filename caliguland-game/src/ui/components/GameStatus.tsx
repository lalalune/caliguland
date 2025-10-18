/**
 * GameStatus Component
 *
 * Displays the current state of an active game session.
 * Shows game phase, time remaining, current day, scenario, market odds,
 * volume, and player count.
 *
 * Features:
 * - Current game phase indicator (Early / Mid / Late / Reveal)
 * - Countdown timer (real-time)
 * - Current day display (Day X of 30)
 * - Question/scenario display
 * - Current market odds (YES/NO percentages)
 * - Total volume traded
 * - Number of active players
 * - Game progress bar
 *
 * @module ui/components/GameStatus
 */

import React, { useState, useEffect } from 'react';

/**
 * Game phase enumeration
 */
export enum GamePhase {
  EARLY = 'EARLY',
  MID = 'MID',
  LATE = 'LATE',
  REVEAL = 'REVEAL',
  ENDED = 'ENDED',
}

/**
 * Props for GameStatus component
 */
export interface GameStatusProps {
  /** Current game phase */
  phase: GamePhase;
  /** Current in-game day (1-30) */
  currentDay: number;
  /** Total in-game days */
  totalDays?: number;
  /** Game start timestamp */
  startTime: Date;
  /** Game duration in milliseconds */
  gameDurationMs: number;
  /** Scenario question */
  question: string;
  /** Current YES odds (0-1) */
  yesOdds: number;
  /** Current NO odds (0-1) */
  noOdds: number;
  /** Total volume traded */
  totalVolume: number;
  /** Number of active players */
  activePlayers: number;
  /** Whether betting is open */
  bettingOpen: boolean;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * GameStatus Component
 *
 * Real-time display of game state with countdown timer and progress tracking.
 * Updates every second to show remaining time.
 *
 * @param props - GameStatus component props
 * @returns Rendered game status
 */
export const GameStatus: React.FC<GameStatusProps> = ({
  phase,
  currentDay,
  totalDays = 30,
  startTime,
  gameDurationMs,
  question,
  yesOdds,
  noOdds,
  totalVolume,
  activePlayers,
  bettingOpen,
  isLoading = false,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  /**
   * Update countdown timer every second
   */
  useEffect(() => {
    const updateTimer = () => {
      const elapsed = Date.now() - startTime.getTime();
      const remaining = Math.max(0, gameDurationMs - elapsed);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime, gameDurationMs]);

  /**
   * Format time remaining as MM:SS or HH:MM:SS
   */
  const formatTimeRemaining = (): string => {
    const totalSeconds = Math.floor(timeRemaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Get phase color and label
   */
  const getPhaseInfo = () => {
    switch (phase) {
      case GamePhase.EARLY:
        return {
          label: 'Early Game',
          color: 'text-green-400',
          bgColor: 'bg-green-900/30',
          borderColor: 'border-green-700',
        };
      case GamePhase.MID:
        return {
          label: 'Mid Game',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-900/30',
          borderColor: 'border-yellow-700',
        };
      case GamePhase.LATE:
        return {
          label: 'Late Game',
          color: 'text-orange-400',
          bgColor: 'bg-orange-900/30',
          borderColor: 'border-orange-700',
        };
      case GamePhase.REVEAL:
        return {
          label: 'Reveal Phase',
          color: 'text-purple-400',
          bgColor: 'bg-purple-900/30',
          borderColor: 'border-purple-700',
        };
      case GamePhase.ENDED:
        return {
          label: 'Game Ended',
          color: 'text-gray-400',
          bgColor: 'bg-gray-900/30',
          borderColor: 'border-gray-700',
        };
      default:
        return {
          label: 'Unknown',
          color: 'text-gray-400',
          bgColor: 'bg-gray-900/30',
          borderColor: 'border-gray-700',
        };
    }
  };

  /**
   * Calculate progress percentage (0-100)
   */
  const progressPercent = (currentDay / totalDays) * 100;

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
    return value.toFixed(0);
  };

  /**
   * Format percentage
   */
  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const phaseInfo = getPhaseInfo();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-gray-400">Loading game status...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Status Card */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {/* Header with Phase and Timer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-700">
          {/* Phase Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${phaseInfo.bgColor} ${phaseInfo.borderColor}`}
          >
            <div className={`w-2 h-2 rounded-full ${phaseInfo.color} animate-pulse`}></div>
            <span className={`font-semibold text-sm ${phaseInfo.color}`}>
              {phaseInfo.label}
            </span>
          </div>

          {/* Countdown Timer */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-white font-mono text-lg font-bold">
              {formatTimeRemaining()}
            </span>
            <span className="text-gray-400 text-sm">remaining</span>
          </div>
        </div>

        {/* Day Progress */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Game Progress</span>
            <span className="text-white font-semibold">
              Day {currentDay} of {totalDays}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
            {/* Day markers */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 border-r border-gray-600"
                  style={{ opacity: i < 3 ? 1 : 0 }}
                ></div>
              ))}
            </div>
          </div>

          {/* Phase markers */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Day 1</span>
            <span>Day 10</span>
            <span>Day 20</span>
            <span>Day 30</span>
          </div>
        </div>

        {/* Question/Scenario */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="text-xs text-gray-400 mb-2">Prediction Question</div>
          <div className="text-white font-medium">{question}</div>
        </div>

        {/* Market Odds */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="text-xs text-gray-400 mb-3">Current Market Odds</div>
          <div className="grid grid-cols-2 gap-4">
            {/* YES */}
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
              <div className="text-xs text-green-400 mb-1">YES</div>
              <div className="text-2xl font-bold text-green-500">
                {formatPercent(yesOdds)}
              </div>
            </div>

            {/* NO */}
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <div className="text-xs text-red-400 mb-1">NO</div>
              <div className="text-2xl font-bold text-red-500">
                {formatPercent(noOdds)}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 divide-x divide-gray-700">
          {/* Volume */}
          <div className="px-6 py-4 text-center">
            <div className="text-xs text-gray-400 mb-1">Total Volume</div>
            <div className="text-lg font-bold text-white">
              {formatCurrency(totalVolume)}
            </div>
          </div>

          {/* Players */}
          <div className="px-6 py-4 text-center">
            <div className="text-xs text-gray-400 mb-1">Active Players</div>
            <div className="text-lg font-bold text-white">{activePlayers}</div>
          </div>

          {/* Betting Status */}
          <div className="px-6 py-4 text-center">
            <div className="text-xs text-gray-400 mb-1">Betting</div>
            <div
              className={`text-lg font-bold ${
                bettingOpen ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {bettingOpen ? 'Open' : 'Closed'}
            </div>
          </div>
        </div>
      </div>

      {/* Betting Closed Warning */}
      {!bettingOpen && phase !== GamePhase.ENDED && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <div className="text-red-400 font-semibold">Betting is now closed</div>
            <div className="text-red-300 text-sm">
              Prepare for the final outcome reveal!
            </div>
          </div>
        </div>
      )}

      {/* Mobile Compact View */}
      <div className="md:hidden bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400 text-sm">Quick Stats</span>
          <span className={`text-sm font-semibold ${phaseInfo.color}`}>
            {phaseInfo.label}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-400">Day:</span>
            <span className="text-white font-semibold ml-2">
              {currentDay}/{totalDays}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Time:</span>
            <span className="text-white font-semibold ml-2 font-mono">
              {formatTimeRemaining()}
            </span>
          </div>
          <div>
            <span className="text-gray-400">YES:</span>
            <span className="text-green-400 font-semibold ml-2">
              {formatPercent(yesOdds)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">NO:</span>
            <span className="text-red-400 font-semibold ml-2">
              {formatPercent(noOdds)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStatus;
