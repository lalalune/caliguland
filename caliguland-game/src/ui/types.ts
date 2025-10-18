/**
 * Frontend UI Types for Caliguland Prediction Game
 *
 * These types define the UI-specific data structures and component props
 * for the Caliguland social prediction game frontend.
 */

import { Agent, Post } from '../types';

/**
 * UI state for chat messages with author details
 */
export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: Date;
  isSystemMessage?: boolean;
  replyTo?: string;
  mentions?: string[];
  reactions?: Record<string, 'like' | 'dislike'>;
  likeCount?: number;
  dislikeCount?: number;
}

/**
 * Typing indicator for showing who is typing
 */
export interface TypingIndicator {
  agentId: string;
  agentName: string;
  timestamp: Date;
}

/**
 * Feed filter options
 */
export type FeedFilter = 'all' | 'following' | 'mentions';

/**
 * Feed sort options
 */
export type FeedSort = 'recent' | 'popular';

/**
 * Mention suggestion for autocomplete
 */
export interface MentionSuggestion {
  id: string;
  name: string;
  avatar?: string;
  reputation?: number;
}

/**
 * UI state for reactions on posts
 */
export interface ReactionState {
  hasLiked: boolean;
  hasDisliked: boolean;
  likeCount: number;
  dislikeCount: number;
}

/**
 * Follow/unfollow action result
 */
export interface FollowResult {
  success: boolean;
  isFollowing: boolean;
  error?: string;
}

/**
 * Agent profile with social stats
 */
export interface AgentProfile extends Agent {
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isFollowedByCurrentUser?: boolean;
}

/**
 * Props for ChatPanel component
 */
export interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content: string, replyTo?: string) => void;
  onMentionClick?: (agentId: string) => void;
  typingIndicators?: TypingIndicator[];
  isLoading?: boolean;
  error?: string;
  maxHeight?: string;
}

/**
 * Props for PostCard component
 */
export interface PostCardProps {
  post: ChatMessage;
  currentUserId: string;
  onReaction: (postId: string, reaction: 'like' | 'dislike') => void;
  onReply: (postId: string) => void;
  onFollowToggle?: (agentId: string) => void;
  onAgentClick?: (agentId: string) => void;
  isFollowingAuthor?: boolean;
  showFollowButton?: boolean;
  compact?: boolean;
}

/**
 * Props for SocialFeed component
 */
export interface SocialFeedProps {
  posts: ChatMessage[];
  currentUserId: string;
  filter: FeedFilter;
  sort: FeedSort;
  onFilterChange: (filter: FeedFilter) => void;
  onSortChange: (sort: FeedSort) => void;
  onReaction: (postId: string, reaction: 'like' | 'dislike') => void;
  onReply: (postId: string) => void;
  onFollowToggle: (agentId: string) => void;
  onAgentClick?: (agentId: string) => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  followingAgentIds?: string[];
  hasMore?: boolean;
  isLoading?: boolean;
  isRefreshing?: boolean;
}

/**
 * Props for MentionInput component
 */
export interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMentionSearch?: (query: string) => MentionSuggestion[];
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  isSubmitting?: boolean;
  autoFocus?: boolean;
}

/**
 * Props for FollowButton component
 */
export interface FollowButtonProps {
  agentId: string;
  isFollowing: boolean;
  onToggle: (agentId: string) => Promise<FollowResult>;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary';
}

/**
 * WebSocket message types (for reference, not used directly in components)
 */
export type WebSocketMessageType =
  | 'new_post'
  | 'direct_message'
  | 'market_update'
  | 'game_started'
  | 'day_changed'
  | 'betting_closed'
  | 'game_ended'
  | 'typing'
  | 'reaction_added'
  | 'follow_update';

/**
 * WebSocket event payload (for reference)
 */
export interface WebSocketEvent<T = any> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: Date;
}
