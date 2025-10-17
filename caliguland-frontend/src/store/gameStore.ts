import { create } from 'zustand';
import type { GameState, Player, Post, MarketState, DirectMessage } from '../types/game';

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

  setGameState: (state) => set({ gameState: state }),
  
  setPlayerId: (id) => set({ playerId: id }),
  
  updateMarket: (market) => set((state) => ({
    gameState: state.gameState ? { ...state.gameState, market } : null
  })),
  
  addPost: (post) => set((state) => ({
    gameState: state.gameState ? {
      ...state.gameState,
      feed: [...state.gameState.feed, post]
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

