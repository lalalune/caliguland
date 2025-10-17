import type { Player } from '../types/game';

interface PlayersListProps {
  players: Player[];
}

export function PlayersList({ players }: PlayersListProps) {
  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4">Players ({players.length})</h3>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between p-2 bg-gray-700 rounded-lg"
            data-cy={`player-${player.id}`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                player.type === 'ai' ? 'bg-blue-400' : 'bg-green-400'
              }`} />
              <span className="font-medium">{player.name}</span>
              {player.isNPC && (
                <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded">
                  NPC
                </span>
              )}
            </div>
            <div className="text-sm text-gray-400">
              {player.wins} wins
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

