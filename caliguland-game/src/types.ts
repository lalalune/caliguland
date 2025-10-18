/**
 * ERC-8004 Prediction Game Types
 * Based on the game design document
 */

export enum Outcome {
  YES = 'YES',
  NO = 'NO',
  PENDING = 'PENDING'
}

export enum GamePhase {
  LOBBY = 'LOBBY',
  EARLY = 'EARLY',
  MID = 'MID',
  LATE = 'LATE',
  REVEAL = 'REVEAL',
  ENDED = 'ENDED'
}

export interface Agent {
  id: string;
  name: string;
  type: 'human' | 'ai';
  reputation: number;
  wins: number;
  isNPC?: boolean;
  following?: string[];  // Agent IDs being followed
  followers?: string[];  // Agent IDs following this agent
}

export interface NPC {
  id: string;
  name: string;
  role: 'insider' | 'rumor' | 'celebrity' | 'media' | 'organization';
  bias: 'truthful' | 'deceptive' | 'neutral';
  bio: string;
  tendsToBeTruthful: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: Date;
  gameDay: number;
  isSystemMessage?: boolean;
  reactions?: Record<string, 'like' | 'dislike'>;
  likeCount?: number;
  dislikeCount?: number;
  replyTo?: string;
  mentions?: string[];  // @mentioned agent IDs
}

export interface DirectMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  gameDay: number;
  encrypted: boolean;
}

export interface GroupChat {
  id: string;
  name: string;
  members: string[];
  messages: DirectMessage[];
  createdBy: string;
  createdAt: Date;
}

export interface Bet {
  agentId: string;
  outcome: Outcome.YES | Outcome.NO;
  amount: number;
  timestamp: Date;
  gameDay: number;
  odds: number;
}

export interface MarketState {
  yesShares: number;
  noShares: number;
  yesOdds: number;
  noOdds: number;
  totalVolume: number;
  bets: Bet[];
}

export interface GameScenario {
  id: string;
  title: string;
  question: string;
  description: string;
  secretOutcome: Outcome;
  outcomeCommitment: string;
  npcs: NPC[];
  timeline: GameEvent[];
}

export interface GameEvent {
  day: number;
  time?: string;
  type: 'news' | 'announcement' | 'leak' | 'scandal' | 'system';
  author: string;
  content: string;
  isPublic: boolean;
  targetAgents?: string[];
  triggerCondition?: string;
}

export interface InsiderClue {
  agentId: string;
  npcId: string;
  content: string;
  isTruthful: boolean;
  deliveredAt: Date;
  gameDay: number;
}

export interface OracleAttestation {
  data: {
    sessionId: string;
    outcome: Outcome;
    timestamp: number;
    winners: string[];
    totalPayout: number;
  };
  quote: string;
  timestamp: number;
}

export interface GameSession {
  id: string;
  scenario: GameScenario;
  agents: Agent[];
  phase: GamePhase;
  currentDay: number;
  startTime: Date;
  endTime?: Date;
  market: MarketState;
  feed: Post[];
  directMessages: Map<string, DirectMessage[]>;
  groupChats: GroupChat[];
  insiderClues: InsiderClue[];
  bettingOpen: boolean;
  revealed: boolean;
  finalOutcome?: Outcome;
  oracleAttestation?: OracleAttestation;
}

export interface ReputationFeedback {
  fromAgentId: string;
  toAgentId: string;
  helpful: boolean;
  comment?: string;
}

export interface GameResult {
  sessionId: string;
  outcome: Outcome;
  winners: string[];
  payouts: Record<string, number>;
  marketHistory: MarketState[];
  reputationChanges: Record<string, number>;
}

export interface JoinGameRequest {
  agentId: string;
  signature?: string;
}

export interface PostMessageRequest {
  agentId: string;
  content: string;
  replyTo?: string;
}

export interface SendDMRequest {
  from: string;
  to: string;
  content: string;
}

export interface PlaceBetRequest {
  agentId: string;
  outcome: Outcome.YES | Outcome.NO;
  amount: number;
}

export interface CreateGroupChatRequest {
  agentId: string;
  name: string;
  members: string[];
}
