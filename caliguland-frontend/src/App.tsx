import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { useGameStore } from './store/gameStore';
import { api } from './services/api';
import { wsService } from './services/websocket';
import { GamePhase, type GameState } from './types/game';

function App() {
  const { gameState, playerId, setGameState, setConnected } = useGameStore();

  useEffect(() => {
    // Initial game state fetch
    const fetchGameState = async () => {
      const state = await api.getGameState();
      setGameState(state);
    };

    fetchGameState();

    // Poll for game state every 30 seconds as backup (WebSocket is primary)
    const interval = setInterval(fetchGameState, 30000);

    return () => clearInterval(interval);
  }, [setGameState]);

  useEffect(() => {
    if (playerId) {
      // Connect WebSocket
      wsService.connect(playerId);
      setConnected(true);

      // Listen for game state updates (full state replacement)
      wsService.on('game_state', (data) => {
        setGameState(data as GameState);
      });

      // Note: We rely on full game_state updates instead of incremental updates
      // to avoid duplicate data between WebSocket and polling

      return () => {
        wsService.disconnect();
        setConnected(false);
      };
    }
  }, [playerId, setConnected, setGameState]);

  const showLobby = !gameState || gameState.phase === GamePhase.LOBBY || !playerId;

  return (
    <Layout>
      {showLobby ? <Lobby /> : <GameBoard />}
    </Layout>
  );
}

export default App;

