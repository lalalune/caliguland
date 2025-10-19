import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { api } from '../services/api';
import { Outcome } from '../types/game';

export function PredictionPanel() {
  const { gameState, playerId } = useGameStore();
  const [amount, setAmount] = useState(100);
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome.YES | Outcome.NO>(Outcome.YES);
  const [isBetting, setIsBetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleBet = async () => {
    if (!playerId) {
      setError('You must join the game first');
      return;
    }

    if (!gameState?.bettingOpen) {
      setError('Predictions are closed');
      return;
    }

    setIsBetting(true);
    setError('');
    setSuccess('');

    try {
      const result = await api.makePrediction({
        agentId: playerId,
        outcome: selectedOutcome,
        amount
      });
      
      if (result.success) {
        setSuccess(`Bet placed: ${amount} on ${selectedOutcome}`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Failed to place bet');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bet');
    } finally {
      setIsBetting(false);
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4">Place Your Bet</h3>

      {!gameState?.bettingOpen && (
        <div className="p-2 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-400 text-xs mb-4">
          Betting is currently closed
        </div>
      )}

      <div className="space-y-3">
        {/* Outcome Selection */}
        <div>
          <label className="block text-xs font-medium mb-2">Outcome</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedOutcome(Outcome.YES)}
              className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                selectedOutcome === Outcome.YES
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              data-cy="prediction-yes-button"
            >
              YES
            </button>
            <button
              onClick={() => setSelectedOutcome(Outcome.NO)}
              className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                selectedOutcome === Outcome.NO
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              data-cy="prediction-no-button"
            >
              NO
            </button>
          </div>
        </div>

        {/* Amount Selection */}
        <div>
          <label className="block text-xs font-medium mb-2">
            Amount: {amount}
          </label>
          <input
            type="range"
            min="10"
            max="1000"
            step="10"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value))}
            className="w-full"
            data-cy="prediction-amount-slider"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>10</span>
            <span>1000</span>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-4 gap-1">
          {[100, 250, 500, 1000].map((value) => (
            <button
              key={value}
              onClick={() => setAmount(value)}
              className="p-1.5 bg-gray-700 rounded text-xs hover:bg-gray-600"
            >
              {value}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-2 bg-red-500/20 border border-red-500 rounded text-red-400 text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="p-2 bg-green-500/20 border border-green-500 rounded text-green-400 text-xs">
            {success}
          </div>
        )}

        <button
          onClick={handleBet}
          disabled={isBetting || !gameState?.bettingOpen || !playerId}
          className="btn btn-primary w-full text-sm py-2"
          data-cy="make-prediction-button"
        >
          {isBetting ? 'Placing Bet...' : `Bet ${amount} on ${selectedOutcome}`}
        </button>
      </div>

      {/* Your Bets */}
      {(gameState?.market?.bets || []).filter(b => b.agentId === playerId).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium mb-2">Your Bets</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(gameState?.market?.bets || [])
              .filter(b => b.agentId === playerId)
              .map((bet, index) => (
                <div key={index} className="p-2 bg-gray-700 rounded text-xs">
                  <div className="flex justify-between">
                    <span className={bet.outcome === Outcome.YES ? 'text-green-400' : 'text-red-400'}>
                      {bet.outcome}
                    </span>
                    <span>{bet.amount}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Day {bet.gameDay} • Odds: {bet.odds}%
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

