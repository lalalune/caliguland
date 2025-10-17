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

export interface Player {
  id: string;
  name: string;
  type: 'human' | 'ai';
  reputation: number;
  wins: number;
  isNPC?: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
  gameDay: number;
  isSystemMessage?: boolean;
}

export interface Bet {
  agentId: string;
  outcome: Outcome;
  amount: number;
  timestamp: string;
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

export interface GameState {
  id: string;
  phase: GamePhase;
  currentDay: number;
  maxDay: number;
  question: string;
  description: string;
  players: Player[];
  market: MarketState;
  feed: Post[];
  bettingOpen: boolean;
  revealed: boolean;
  finalOutcome?: Outcome;
  startTime?: string;
  endTime?: string;
}

export interface DirectMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  gameDay: number;
}

export interface JoinGameRequest {
  agentId: string;
  signature?: string;
}

export interface PlaceBetRequest {
  agentId: string;
  outcome: Outcome.YES | Outcome.NO;
  amount: number;
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

