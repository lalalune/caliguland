/**
 * Type definitions for A2A protocol skill parameters
 * Ensures type safety across the A2A skill execution layer
 */

export interface JoinGameParams {
  agentId: string;
  playerName?: string;
  agentAddress?: string;
  agentDomain?: string;
  signature?: string;
  timestamp?: number;
  skillId?: string;
}

export interface MakePredictionParams {
  agentId: string;
  outcome: 'YES' | 'NO';
  amount: number;
}

export interface SellSharesParams {
  agentId: string;
  outcome: 'YES' | 'NO';
  shares: number;
  numShares?: number;
}

export interface PostToFeedParams {
  agentId: string;
  content: string;
  message?: string;
}

export interface SendDMParams {
  agentId: string;
  to: string;
  targetId?: string;
  content: string;
  message?: string;
}

export interface FollowParams {
  agentId: string;
  targetId: string;
}

export interface ReactToPostParams {
  agentId: string;
  postId: string;
  reaction: 'like' | 'dislike';
}

export interface GetNPCBioParams {
  agentId: string;
  npcId: string;
}

export interface QueryNPCParams {
  agentId: string;
  npcId: string;
  question: string;
  message?: string;
}

export interface SubmitFeedbackParams {
  agentId: string;
  targetId: string;
  category: 'honesty' | 'deception' | 'cooperation' | 'hostility' | 'skill';
  rating: number;
  comment?: string;
}

export interface GetReputationParams {
  agentId: string;
  targetId?: string;
}

export interface GetLeaderboardParams {
  agentId: string;
  limit?: number;
}

export interface CreateGroupParams {
  agentId: string;
  name: string;
  members: string[];
}

export interface SendGroupMessageParams {
  agentId: string;
  groupId: string;
  content: string;
  message?: string;
}

export interface LeaveGroupParams {
  agentId: string;
  groupId: string;
}

export interface InviteToGroupParams {
  agentId: string;
  groupId: string;
  inviteeId: string;
}

