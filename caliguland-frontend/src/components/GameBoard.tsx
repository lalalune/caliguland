import { useGameStore } from '../store/gameStore';
import { SocialPanel } from './SocialPanel';
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
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      {/* Left Side - Social & Chat (Wide, flexible) */}
      <div className="flex-1 min-w-0">
        <SocialPanel />
      </div>

      {/* Right Side - Betting & Market (Fixed width) */}
      <div className="w-[400px] flex-shrink-0 space-y-6 overflow-y-auto">
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Question</h3>
          <p className="text-gray-300 mb-4">{gameState.question}</p>
          <p className="text-sm text-gray-400">{gameState.description}</p>
        </div>

        <MarketDisplay />
        
        <BettingPanel />
        
        <PlayersList players={gameState.players ?? []} />
      </div>
    </div>
  );
}

