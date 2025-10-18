/**
 * StatsCard Component
 *
 * A reusable card component for displaying statistics with icons, trends, and animations.
 * Supports multiple value types (number, percentage, currency) and responsive layouts.
 *
 * @component
 * @example
 * ```tsx
 * <StatsCard
 *   label="Win Rate"
 *   value={75}
 *   valueType="percentage"
 *   icon="trophy"
 *   trend="up"
 *   trendValue={5}
 *   color="green"
 * />
 * ```
 */

import React, { useEffect, useState } from 'react';

/**
 * Props for the StatsCard component
 */
export interface StatsCardProps {
  /** Label text displayed above the value */
  label: string;

  /** The numeric value to display */
  value: number;

  /** Type of value formatting to apply */
  valueType?: 'number' | 'percentage' | 'currency';

  /** Icon identifier (can be emoji or icon class name) */
  icon?: string;

  /** Trend direction */
  trend?: 'up' | 'down' | 'neutral';

  /** Numeric trend value to display */
  trendValue?: number;

  /** Color theme for the card */
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';

  /** Custom CSS classes */
  className?: string;

  /** Disable animation */
  disableAnimation?: boolean;
}

/**
 * Format a value based on its type
 */
const formatValue = (value: number, type: 'number' | 'percentage' | 'currency'): string => {
  switch (type) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'number':
    default:
      return value.toLocaleString('en-US');
  }
};

/**
 * Get color classes based on theme
 */
const getColorClasses = (color: string): { bg: string; text: string; border: string } => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    blue: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500/30',
    },
    green: {
      bg: 'bg-green-500/10 dark:bg-green-500/20',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-500/30',
    },
    red: {
      bg: 'bg-red-500/10 dark:bg-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-500/30',
    },
    yellow: {
      bg: 'bg-yellow-500/10 dark:bg-yellow-500/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-500/30',
    },
    purple: {
      bg: 'bg-purple-500/10 dark:bg-purple-500/20',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-500/30',
    },
    gray: {
      bg: 'bg-gray-500/10 dark:bg-gray-500/20',
      text: 'text-gray-600 dark:text-gray-400',
      border: 'border-gray-500/30',
    },
  };

  return colors[color] || colors.gray;
};

/**
 * Get trend icon and color
 */
const getTrendInfo = (trend?: 'up' | 'down' | 'neutral'): { icon: string; color: string } => {
  switch (trend) {
    case 'up':
      return { icon: '↑', color: 'text-green-500' };
    case 'down':
      return { icon: '↓', color: 'text-red-500' };
    case 'neutral':
    default:
      return { icon: '→', color: 'text-gray-500' };
  }
};

/**
 * StatsCard Component
 *
 * Displays a statistic with optional icon, trend indicator, and animated counter.
 */
export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  valueType = 'number',
  icon,
  trend,
  trendValue,
  color = 'gray',
  className = '',
  disableAnimation = false,
}) => {
  const [displayValue, setDisplayValue] = useState(disableAnimation ? value : 0);
  const colorClasses = getColorClasses(color);
  const trendInfo = getTrendInfo(trend);

  // Animated counter effect on mount
  useEffect(() => {
    if (disableAnimation) {
      setDisplayValue(value);
      return;
    }

    const duration = 1000; // 1 second animation
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;

      if (step >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, disableAnimation]);

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border
        bg-white dark:bg-gray-800
        ${colorClasses.border}
        p-4 sm:p-6
        transition-all duration-200
        hover:shadow-lg hover:scale-105
        ${className}
      `}
    >
      {/* Background decoration */}
      <div className={`absolute inset-0 ${colorClasses.bg} opacity-50`} />

      {/* Content */}
      <div className="relative z-10">
        {/* Header with icon */}
        <div className="flex items-start justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
            {label}
          </span>
          {icon && (
            <span className={`text-2xl ${colorClasses.text}`} aria-label={label}>
              {icon}
            </span>
          )}
        </div>

        {/* Value */}
        <div className="mb-2">
          <span className={`text-3xl sm:text-4xl font-bold ${colorClasses.text}`}>
            {formatValue(displayValue, valueType)}
          </span>
        </div>

        {/* Trend indicator */}
        {trend && trendValue !== undefined && (
          <div className="flex items-center gap-1 text-sm">
            <span className={`font-semibold ${trendInfo.color}`}>
              {trendInfo.icon} {formatValue(Math.abs(trendValue), valueType)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              vs last game
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
