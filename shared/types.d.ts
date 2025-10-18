/**
 * Shared TypeScript types for Caliguland
 * Used across game server, agents, and frontend
 */
export declare enum Outcome {
    YES = "YES",
    NO = "NO",
    PENDING = "PENDING"
}
export declare enum GamePhase {
    LOBBY = "LOBBY",
    EARLY = "EARLY",
    MID = "MID",
    LATE = "LATE",
    REVEAL = "REVEAL",
    ENDED = "ENDED"
}
export interface Agent {
    id: string;
    name: string;
    type: 'human' | 'ai';
    reputation: number;
    wins: number;
    isNPC?: boolean;
    following?: string[];
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
    timestamp: Date | string;
    gameDay: number;
    isSystemMessage?: boolean;
    reactions?: Record<string, 'like' | 'dislike'>;
    replyTo?: string;
}
export interface DirectMessage {
    id: string;
    from: string;
    to: string;
    content: string;
    timestamp: Date | string;
    gameDay: number;
    encrypted: boolean;
}
export interface GroupChat {
    id: string;
    name: string;
    members: string[];
    messages: DirectMessage[];
    createdBy: string;
    createdAt: Date | string;
}
export interface Bet {
    agentId: string;
    outcome: Outcome.YES | Outcome.NO;
    amount: number;
    timestamp: Date | string;
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
    deliveredAt: Date | string;
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
    startTime: Date | string;
    endTime?: Date | string;
    market: MarketState;
    feed: Post[];
    directMessages: Map<string, DirectMessage[]> | Record<string, DirectMessage[]>;
    groupChats: GroupChat[];
    insiderClues: InsiderClue[];
    bettingOpen: boolean;
    revealed: boolean;
    finalOutcome?: Outcome;
    oracleAttestation?: OracleAttestation;
}
export interface GameState {
    id: string;
    phase: GamePhase;
    currentDay: number;
    maxDay: number;
    question: string;
    description: string;
    players: Agent[];
    market: MarketState;
    feed: Post[];
    bettingOpen: boolean;
    revealed: boolean;
    finalOutcome?: Outcome;
    startTime?: Date | string;
    endTime?: Date | string;
}
export interface Player extends Agent {
}
export interface ReputationFeedback {
    fromAgentId: string;
    toAgentId: string;
    category: 'honesty' | 'deception' | 'cooperation' | 'hostility' | 'skill';
    rating: number;
    comment?: string;
    gameId: string;
    timestamp: Date | string;
}
export interface ReputationScore {
    agentId: string;
    overallScore: number;
    honestyScore: number;
    cooperationScore: number;
    skillScore: number;
    gamesPlayed: number;
    wins: number;
    winRate: number;
    feedbackReceived: number;
    lastUpdated: Date | string;
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
export interface A2AAgentCard {
    protocolVersion: string;
    name: string;
    description: string;
    url: string;
    preferredTransport: string;
    provider: {
        organization: string;
        url: string;
    };
    version: string;
    capabilities: {
        streaming: boolean;
        pushNotifications: boolean;
        stateTransitionHistory: boolean;
    };
    defaultInputModes: string[];
    defaultOutputModes: string[];
    skills: A2ASkill[];
}
export interface A2ASkill {
    id: string;
    name: string;
    description: string;
    tags: string[];
    examples: string[];
}
export interface A2AMessage {
    role: 'user' | 'agent';
    parts: Array<{
        kind: string;
        text?: string;
        data?: Record<string, unknown>;
    }>;
    messageId: string;
    kind: 'message';
}
export interface ContractAddresses {
    identityRegistry: string;
    reputationRegistry: string;
    validationRegistry: string;
    predictionOracle: string;
    jejuMarket?: string;
    elizaOSToken?: string;
}
//# sourceMappingURL=types.d.ts.map