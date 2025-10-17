import { useGameStore } from '../store/gameStore';
import { Feed } from './Feed';
import { BettingPanel } from './BettingPanel';
import { MarketDisplay } from './MarketDisplay';
import { PlayersList } from './PlayersList';

export function GameBoard() {
  const gameState = useGameStore((state) => state.gameState);

  if (!gameState) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading game...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Game Info & Market */}
      <div className="lg:col-span-1 space-y-6">
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Question</h3>
          <p className="text-gray-300 mb-4">{gameState.question}</p>
          <p className="text-sm text-gray-400">{gameState.description}</p>
        </div>

        <MarketDisplay />
        
        <PlayersList players={gameState.players} />
      </div>

      {/* Middle Column - Feed */}
      <div className="lg:col-span-1">
        <Feed />
      </div>

      {/* Right Column - Betting Panel */}
      <div className="lg:col-span-1">
        <BettingPanel />
      </div>
    </div>
  );
}

