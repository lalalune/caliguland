import { useGameStore } from '../store/gameStore';

export function MarketDisplay() {
  const gameState = useGameStore((state) => state.gameState);

  if (!gameState?.market) return null;

  const { market } = gameState;

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4">Market Odds</h3>

      <div className="space-y-3">
        {/* YES Odds */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-green-400">YES</span>
            <span className="text-xl font-bold text-green-400" data-cy="yes-odds">
              {market.yesOdds}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${market.yesOdds}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Shares: {market.yesShares.toFixed(0)}
          </div>
        </div>

        {/* NO Odds */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-red-400">NO</span>
            <span className="text-xl font-bold text-red-400" data-cy="no-odds">
              {market.noOdds}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${market.noOdds}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Shares: {market.noShares.toFixed(0)}
          </div>
        </div>

        {/* Total Volume */}
        <div className="pt-3 border-t border-gray-700">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Total Volume</span>
            <span className="font-medium" data-cy="total-volume">{market.totalVolume}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-400">Total Bets</span>
            <span className="font-medium">{market.bets?.length ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

