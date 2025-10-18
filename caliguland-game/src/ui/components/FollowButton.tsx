/**
 * FollowButton Component
 *
 * Toggle button for following/unfollowing agents with:
 * - Current state display (Following / Follow)
 * - Loading state during API calls
 * - Optimistic UI updates
 * - Error handling with rollback
 * - Multiple size and variant options
 *
 * @component
 */

import React, { useState, useCallback } from 'react';
import { FollowButtonProps, FollowResult } from '../types';

/**
 * FollowButton - handles follow/unfollow actions with optimistic updates
 */
export const FollowButton: React.FC<FollowButtonProps> = ({
  agentId,
  isFollowing,
  onToggle,
  disabled = false,
  size = 'medium',
  variant = 'primary',
}) => {
  const [localIsFollowing, setLocalIsFollowing] = useState(isFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Size classes
  const sizeClasses = {
    small: 'px-3 py-1 text-xs',
    medium: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base',
  };

  // Variant classes
  const getVariantClasses = (following: boolean) => {
    if (variant === 'primary') {
      return following
        ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
        : 'bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700';
    }

    // Secondary variant
    return following
      ? 'bg-transparent border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      : 'bg-transparent border border-blue-500 dark:border-blue-400 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20';
  };

  /**
   * Handle follow/unfollow with optimistic update and rollback on error
   */
  const handleClick = useCallback(async () => {
    if (disabled || isLoading) return;

    // Store original state for rollback
    const originalState = localIsFollowing;

    // Optimistic update
    setLocalIsFollowing(!originalState);
    setIsLoading(true);
    setError(null);

    try {
      const result: FollowResult = await onToggle(agentId);

      if (!result.success) {
        // Rollback on failure
        setLocalIsFollowing(originalState);
        setError(result.error || 'Failed to update follow status');

        // Clear error after 3 seconds
        setTimeout(() => setError(null), 3000);
      } else {
        // Ensure state matches backend response
        setLocalIsFollowing(result.isFollowing);
      }
    } catch (err) {
      // Rollback on exception
      setLocalIsFollowing(originalState);
      setError(err instanceof Error ? err.message : 'An error occurred');

      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);

      console.error('Follow toggle error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, disabled, isLoading, localIsFollowing, onToggle]);

  /**
   * Get button text based on state
   */
  const getButtonText = (): string => {
    if (isLoading) {
      return localIsFollowing ? 'Unfollowing...' : 'Following...';
    }
    return localIsFollowing ? 'Following' : 'Follow';
  };

  /**
   * Get button icon
   */
  const getButtonIcon = (): string => {
    if (isLoading) return '⏳';
    return localIsFollowing ? '✓' : '+';
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`
          ${sizeClasses[size]}
          ${getVariantClasses(localIsFollowing)}
          font-semibold rounded-full transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
          flex items-center gap-1.5
          ${isLoading ? 'cursor-wait' : 'cursor-pointer'}
        `}
        aria-label={localIsFollowing ? 'Unfollow' : 'Follow'}
        aria-pressed={localIsFollowing}
        title={
          localIsFollowing
            ? 'Click to unfollow'
            : 'Click to follow and see posts in your feed'
        }
      >
        <span aria-hidden="true">{getButtonIcon()}</span>
        <span>{getButtonText()}</span>
      </button>

      {/* Error tooltip */}
      {error && (
        <div
          className="absolute z-50 top-full mt-2 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap animate-fadeIn"
          role="alert"
        >
          {error}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-500 rotate-45" />
        </div>
      )}
    </div>
  );
};

export default FollowButton;
