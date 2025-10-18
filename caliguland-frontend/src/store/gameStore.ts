import { create } from 'zustand';
import type { GameState, Post, MarketState, DirectMessage } from '../types/game';

interface GameStore {
  gameState: GameState | null;
  playerId: string | null;
  directMessages: DirectMessage[];
  isConnected: boolean;
  
  // Actions
  setGameState: (state: GameState) => void;
  setPlayerId: (id: string) => void;
  updateMarket: (market: MarketState) => void;
  addPost: (post: Post) => void;
  addDirectMessage: (dm: DirectMessage) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  playerId: null,
  directMessages: [],
  isConnected: false,

  setGameState: (state) => set({ 
    gameState: state ? {
      ...state,
      // Deduplicate players by id
      players: Array.from(
        new Map((state.players ?? []).map(p => [p.id, p])).values()
      ),
      // Deduplicate feed by id
      feed: Array.from(
        new Map((state.feed ?? []).map(p => [p.id, p])).values()
      ),
      market: state.market ? {
        ...state.market,
        // Deduplicate bets by creating composite key
        bets: Array.from(
          new Map(
            (state.market.bets ?? []).map(b => 
              [`${b.agentId}-${b.timestamp}`, b]
            )
          ).values()
        )
      } : state.market
    } : null 
  }),
  
  setPlayerId: (id) => set({ playerId: id }),
  
  updateMarket: (market) => set((state) => ({
    gameState: state.gameState ? { 
      ...state.gameState, 
      market: market ? {
        ...market,
        // Deduplicate bets by composite key
        bets: Array.from(
          new Map(
            (market.bets ?? []).map(b => 
              [`${b.agentId}-${b.timestamp}`, b]
            )
          ).values()
        )
      } : market
    } : null
  })),
  
  addPost: (post) => set((state) => ({
    gameState: state.gameState ? {
      ...state.gameState,
      // Deduplicate feed posts by id
      feed: Array.from(
        new Map(
          [...(state.gameState.feed ?? []), post].map(p => [p.id, p])
        ).values()
      )
    } : null
  })),
  
  addDirectMessage: (dm) => set((state) => ({
    directMessages: [...state.directMessages, dm]
  })),
  
  setConnected: (connected) => set({ isConnected: connected }),
  
  reset: () => set({
    gameState: null,
    playerId: null,
    directMessages: [],
    isConnected: false
  }),
}));

