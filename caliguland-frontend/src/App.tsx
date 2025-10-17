import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { useGameStore } from './store/gameStore';
import { api } from './services/api';
import { wsService } from './services/websocket';
import { GamePhase } from './types/game';

function App() {
  const { gameState, playerId, setGameState, setConnected, addPost, updateMarket } = useGameStore();

  useEffect(() => {
    // Initial game state fetch
    const fetchGameState = async () => {
      try {
        const state = await api.getGameState();
        setGameState(state);
      } catch (error) {
        console.error('Failed to fetch game state:', error);
      }
    };

    fetchGameState();

    // Poll for game state every 5 seconds
    const interval = setInterval(fetchGameState, 5000);

    return () => clearInterval(interval);
  }, [setGameState]);

  useEffect(() => {
    if (playerId) {
      // Connect WebSocket
      wsService.connect(playerId);
      setConnected(true);

      // Listen for game state updates
      wsService.on('game_state', (data) => {
        setGameState(data);
      });

      // Listen for new posts
      wsService.on('new_post', (data) => {
        addPost(data);
      });

      // Listen for market updates
      wsService.on('market_update', (data) => {
        updateMarket(data);
      });

      return () => {
        wsService.disconnect();
        setConnected(false);
      };
    }
  }, [playerId, setConnected, setGameState, addPost, updateMarket]);

  const showLobby = !gameState || gameState.phase === GamePhase.LOBBY || !playerId;

  return (
    <Layout>
      {showLobby ? <Lobby /> : <GameBoard />}
    </Layout>
  );
}

export default App;

