import { ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { gameState, isConnected } = useGameStore();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex-shrink-0">
        <div className="max-w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-primary">Caliguland</h1>
              <p className="text-xs text-gray-400">Social Prediction Market</p>
            </div>
          </div>
          
          {gameState && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xs text-gray-400">Phase</div>
                <div className="text-sm font-medium">{gameState.phase}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">Day</div>
                <div className="text-sm font-medium">{gameState.currentDay} / {gameState.maxDay}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">Players</div>
                <div className="text-sm font-medium">{gameState.players?.length ?? 0}</div>
              </div>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                   title={isConnected ? 'Connected' : 'Disconnected'} />
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-full px-6 py-4 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

