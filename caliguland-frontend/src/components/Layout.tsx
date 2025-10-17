import { ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';
import { GamePhase } from '../types/game';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { gameState, isConnected } = useGameStore();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Caliguland</h1>
            <p className="text-sm text-gray-400">Social Prediction Market</p>
          </div>
          
          {gameState && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-sm text-gray-400">Phase</div>
                <div className="font-medium">{gameState.phase}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Day</div>
                <div className="font-medium">{gameState.currentDay} / {gameState.maxDay}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Players</div>
                <div className="font-medium">{gameState.players.length}</div>
              </div>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                   title={isConnected ? 'Connected' : 'Disconnected'} />
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-4 mt-12">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-400">
          <p>Powered by TEE Oracle • ERC-8004 • A2A Protocol</p>
        </div>
      </footer>
    </div>
  );
}

