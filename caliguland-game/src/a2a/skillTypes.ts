/**
 * Strong TypeScript types for A2A Skills
 * No Record<string, unknown> - every skill has specific typed params
 */

// Base skill response
export interface SkillResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// Join Game
export interface JoinGameParams {
  playerName?: string;
}

export interface JoinGameData {
  playerId: string;
}

// Get Status
export interface GetStatusData {
  active: boolean;
  phase: string;
  gameId?: string;
  question?: string;
  day?: number;
  bettingOpen?: boolean;
  market?: {
    yesOdds: number;
    noOdds: number;
  };
  myBets?: Array<{ outcome: string; amount: number; odds: number }>;
  playerName?: string;
  playerCount?: number;
}

// Place Bet
export interface PlaceBetParams {
  outcome: 'YES' | 'NO';
  amount: number;
}

export interface PlaceBetData {
  betId: string;
  outcome: string;
  amount: number;
  odds: number;
}

// Sell Shares
export interface SellSharesParams {
  outcome: 'YES' | 'NO';
  amount: number;
}

export interface SellSharesData {
  proceeds: number;
  sharesSold: number;
}

// Post to Feed
export interface PostToFeedParams {
  content: string;
}

export interface PostToFeedData {
  postId: string;
}

// Send DM
export interface SendDMParams {
  to: string;
  content: string;
}

export interface SendDMData {
  messageId: string;
  encrypted: boolean;
}

// Follow/Unfollow
export interface FollowParams {
  targetId: string;
}

// React to Post
export interface ReactToPostParams {
  postId: string;
  reaction: 'like' | 'dislike';
}

// Get NPC Bio
export interface GetNPCBioParams {
  npcId: string;
}

export interface GetNPCBioData {
  id: string;
  name: string;
  role: string;
  bias: string;
  bio: string;
}

// Query NPC
export interface QueryNPCParams {
  npcId: string;
  question: string;
}

export interface QueryNPCData {
  npcId: string;
  npcName: string;
  response: string;
}

// Submit Feedback
export interface SubmitFeedbackParams {
  targetId: string;
  category: 'honesty' | 'cooperation' | 'skill' | 'overall';
  rating: number;
  comment?: string;
}

// Get Reputation
export interface GetReputationParams {
  targetId?: string;
}

export interface GetReputationData {
  agentId: string;
  overallScore: number;
  totalGames: number;
  wins: number;
  components: {
    honesty: number;
    cooperation: number;
    skill: number;
  };
}

// Get Leaderboard
export interface GetLeaderboardParams {
  limit?: number;
}

export interface LeaderboardEntry {
  agentId: string;
  score: number;
  rank: number;
  wins: number;
  totalGames: number;
}

export interface GetLeaderboardData {
  leaderboard: LeaderboardEntry[];
}

// Create Group
export interface CreateGroupParams {
  name: string;
  members: string[];
}

export interface CreateGroupData {
  groupId: string;
  name: string;
  memberCount: number;
}

// Send Group Message
export interface SendGroupMessageParams {
  groupId: string;
  content: string;
}

export interface SendGroupMessageData {
  messageId: string;
  groupId: string;
}

// Leave Group
export interface LeaveGroupParams {
  groupId: string;
}

// Invite to Group
export interface InviteToGroupParams {
  groupId: string;
  inviteeId: string;
}
