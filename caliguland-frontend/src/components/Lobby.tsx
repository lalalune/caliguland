import { useState } from 'react';
import { api } from '../services/api';
import { useGameStore } from '../store/gameStore';

export function Lobby() {
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const gameState = useGameStore((state) => state.gameState);

  const handleJoin = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const playerId = `player-${Date.now()}`;
      await api.joinGame({ agentId: playerId });
      useGameStore.getState().setPlayerId(playerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-3xl font-bold mb-4 text-center">Welcome to Caliguland</h2>
        <p className="text-gray-400 text-center mb-8">
          A social prediction market where you bet on outcomes and compete with humans and AI
        </p>

        {gameState && (
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h3 className="font-bold mb-2">Current Game</h3>
            <p className="text-sm text-gray-300 mb-2">{gameState.question}</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Players: {gameState.players.length}</span>
              <span className="text-gray-400">Min Required: 5</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="input"
              data-cy="player-name-input"
              disabled={isJoining}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={isJoining || !playerName.trim()}
            className="btn btn-primary w-full"
            data-cy="join-game-button"
          >
            {isJoining ? 'Joining...' : 'Join Game'}
          </button>
        </div>

        <div className="mt-8 p-4 bg-gray-700/50 rounded-lg">
          <h4 className="font-medium mb-2">How to Play</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Wait for 5+ players to start</li>
            <li>• Read the social feed for clues</li>
            <li>• Bet YES or NO on the outcome</li>
            <li>• Market closes on Day 29</li>
            <li>• Outcome reveals on Day 30</li>
            <li>• Winners split the pot!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

