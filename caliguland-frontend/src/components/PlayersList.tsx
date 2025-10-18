import type { Player } from '../types/game';

interface PlayersListProps {
  players?: Player[];
}

export function PlayersList({ players }: PlayersListProps) {
  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-3">Players ({players?.length ?? 0})</h3>
      
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {players?.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between p-2 bg-gray-700 rounded text-xs"
            data-cy={`player-${player.id}`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                player.type === 'ai' ? 'bg-blue-400' : 'bg-green-400'
              }`} />
              <span className="font-medium truncate">{player.name}</span>
              {player.isNPC && (
                <span className="text-xs bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded">
                  NPC
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 flex-shrink-0">
              {player.wins}W
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

