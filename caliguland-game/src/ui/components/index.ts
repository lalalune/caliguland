/**
 * UI Components for Caliguland Prediction Game
 *
 * Central export file for all UI components
 */

// Phase 3: Social Components
export { ChatPanel } from './ChatPanel';
export { PostCard } from './PostCard';
export { SocialFeed } from './SocialFeed';
export { MentionInput } from './MentionInput';
export { FollowButton } from './FollowButton';

// Phase 4: Game UI Components
export { MarketChart } from './MarketChart';
export { TradingPanel } from './TradingPanel';
export { GameResults } from './GameResults';
export { Leaderboard } from './Leaderboard';
export { GameStatus } from './GameStatus';
export { GameLobby } from './GameLobby';

// Phase 4: Profile Components
export { ProfileHeader } from './ProfileHeader';
export { PlayerProfile } from './PlayerProfile';
export { NPCProfile } from './NPCProfile';
export { StatsCard } from './StatsCard';
export { PredictionHistory } from './PredictionHistory';
export { FollowList } from './FollowList';

// Re-export types for convenience
export type {
  ChatPanelProps,
  PostCardProps,
  SocialFeedProps,
  MentionInputProps,
  FollowButtonProps,
  ChatMessage,
  TypingIndicator,
  FeedFilter,
  FeedSort,
  MentionSuggestion,
  ReactionState,
  FollowResult,
  AgentProfile,
} from '../types';

// Phase 4: Game UI Types
export type {
  MarketChartProps,
  PricePoint,
  TradingPanelProps,
  Outcome,
  MarketState,
  TradePreview,
  GameResultsProps,
  PlayerResult,
  TopWinner,
  LeaderboardProps,
  LeaderboardEntry,
  LeaderboardFilter,
  GameStatusProps,
  GamePhase,
  GameLobbyProps,
  LobbyPlayer,
  LobbyChatMessage,
  ScenarioPreview,
} from './MarketChart';

export type {
  Outcome as TradingOutcome,
  MarketState as TradingMarketState,
  TradePreview as TradingPreview,
} from './TradingPanel';

export { Outcome as GameOutcome } from './GameResults';

export { GamePhase as GamePhaseEnum } from './GameStatus';

// Phase 4: Profile Component Types
export type {
  ProfileHeaderProps,
  ProfileHeaderAgent,
} from './ProfileHeader';

export type {
  PlayerProfileProps,
  PlayerStats,
} from './PlayerProfile';

export type {
  NPCProfileProps,
  NPCProfileData,
} from './NPCProfile';

export type {
  StatsCardProps,
} from './StatsCard';

export type {
  PredictionHistoryProps,
  PredictionHistoryEntry,
} from './PredictionHistory';

export type {
  FollowListProps,
  FollowListAgent,
} from './FollowList';
