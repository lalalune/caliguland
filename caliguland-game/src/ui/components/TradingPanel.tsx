/**
 * TradingPanel Component
 *
 * Interface for placing trades in the LMSR prediction market.
 * Allows users to buy YES or NO shares with real-time price calculation.
 *
 * Features:
 * - Toggle between BUY YES and BUY NO
 * - Amount input with max button
 * - Real-time price display
 * - Shares calculation (how many shares for given amount)
 * - New probability calculation (market impact)
 * - Slippage indicator
 * - Balance display
 * - Transaction confirmation modal
 * - Error handling
 *
 * @module ui/components/TradingPanel
 */

import React, { useState, useEffect, useMemo } from 'react';

/**
 * Outcome type for trading
 */
export type Outcome = 'YES' | 'NO';

/**
 * Market state data
 */
export interface MarketState {
  yesPrice: number;     // Current YES price (0-1)
  noPrice: number;      // Current NO price (0-1)
  yesShares: number;    // Outstanding YES shares
  noShares: number;     // Outstanding NO shares
  liquidity: number;    // Liquidity parameter (b)
}

/**
 * Trade preview data
 */
export interface TradePreview {
  outcome: Outcome;
  amount: number;
  sharesReceived: number;
  newPrice: number;
  priceImpact: number;     // Percentage change
  slippage: number;        // Percentage
  costPerShare: number;
}

/**
 * Props for TradingPanel component
 */
export interface TradingPanelProps {
  /** Current market state */
  marketState: MarketState;
  /** User's available balance */
  availableBalance: number;
  /** Whether predictions are currently open */
  predictionsOpen: boolean;
  /** Callback when trade is submitted */
  onTrade: (outcome: Outcome, amount: number) => Promise<void>;
  /** User's current shares */
  userShares?: { yes: number; no: number };
  /** Loading state */
  isLoading?: boolean;
}

/**
 * TradingPanel Component
 *
 * TODO: Import LMSR calculation functions from game/market.ts
 * TODO: import { MarketMaker } from '../../game/market';
 *
 * LMSR Formulas (for reference):
 *
 * Cost Function:
 * C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))
 *
 * Price:
 * P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
 *
 * Cost to buy n shares:
 * cost = C(q_yes + n, q_no) - C(q_yes, q_no)
 *
 * Shares for tokens (binary search to find n):
 * Find n such that cost(n) ≈ tokens
 *
 * @param props - TradingPanel component props
 * @returns Rendered trading panel
 */
export const TradingPanel: React.FC<TradingPanelProps> = ({
  marketState,
  availableBalance,
  predictionsOpen,
  onTrade,
  userShares = { yes: 0, no: 0 },
  isLoading = false,
}) => {
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome>('YES');
  const [amount, setAmount] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Calculate trade preview using LMSR formulas
   * TODO: Replace with actual MarketMaker calculations
   */
  const tradePreview = useMemo<TradePreview | null>(() => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      return null;
    }

    // TODO: Use actual LMSR calculations from MarketMaker
    // This is a simplified approximation for demonstration
    const currentPrice = selectedOutcome === 'YES' ? marketState.yesPrice : marketState.noPrice;

    // Approximate shares (actual calculation uses binary search in MarketMaker.calculateSharesForTokens)
    const approximateShares = numAmount / currentPrice;

    // Approximate new price (actual uses cost function)
    const b = marketState.liquidity;
    const currentYesShares = marketState.yesShares;
    const currentNoShares = marketState.noShares;

    const newYesShares = selectedOutcome === 'YES'
      ? currentYesShares + approximateShares
      : currentYesShares;
    const newNoShares = selectedOutcome === 'NO'
      ? currentNoShares + approximateShares
      : currentNoShares;

    const expYes = Math.exp(newYesShares / b);
    const expNo = Math.exp(newNoShares / b);
    const newPrice = selectedOutcome === 'YES'
      ? expYes / (expYes + expNo)
      : expNo / (expYes + expNo);

    const priceImpact = ((newPrice - currentPrice) / currentPrice) * 100;
    const slippage = Math.abs(priceImpact);
    const costPerShare = numAmount / approximateShares;

    return {
      outcome: selectedOutcome,
      amount: numAmount,
      sharesReceived: approximateShares,
      newPrice,
      priceImpact,
      slippage,
      costPerShare,
    };
  }, [amount, selectedOutcome, marketState]);

  /**
   * Validate trade amount
   */
  useEffect(() => {
    setError('');
    const numAmount = parseFloat(amount);

    if (amount && !isNaN(numAmount)) {
      if (numAmount <= 0) {
        setError('Amount must be greater than 0');
      } else if (numAmount > availableBalance) {
        setError('Insufficient balance');
      } else if (!predictionsOpen) {
        setError('Predictions are closed');
      }
    }
  }, [amount, availableBalance, predictionsOpen]);

  /**
   * Handle max button click
   */
  const handleMaxClick = () => {
    setAmount(availableBalance.toString());
  };

  /**
   * Handle outcome toggle
   */
  const toggleOutcome = (outcome: Outcome) => {
    setSelectedOutcome(outcome);
    setError('');
  };

  /**
   * Handle trade submission
   */
  const handleSubmit = async () => {
    if (!tradePreview || error || !predictionsOpen) return;

    setShowConfirmModal(true);
  };

  /**
   * Confirm and execute trade
   */
  const confirmTrade = async () => {
    if (!tradePreview) return;

    setIsSubmitting(true);
    try {
      await onTrade(selectedOutcome, tradePreview.amount);
      setAmount('');
      setShowConfirmModal(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Cancel confirmation
   */
  const cancelTrade = () => {
    setShowConfirmModal(false);
  };

  /**
   * Format number as currency
   */
  const formatCurrency = (value: number): string => {
    return value.toFixed(2);
  };

  /**
   * Format percentage
   */
  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Place Bet</h3>
        <div className="text-sm text-gray-400">
          Balance: <span className="text-white font-semibold">{formatCurrency(availableBalance)}</span>
        </div>
      </div>

      {/* Outcome Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => toggleOutcome('YES')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            selectedOutcome === 'YES'
              ? 'bg-green-600 text-white shadow-lg scale-105'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          disabled={isLoading || !predictionsOpen}
        >
          <div className="text-lg">BUY YES</div>
          <div className="text-xs mt-1 opacity-80">
            {formatPercent(marketState.yesPrice)}
          </div>
        </button>
        <button
          onClick={() => toggleOutcome('NO')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            selectedOutcome === 'NO'
              ? 'bg-red-600 text-white shadow-lg scale-105'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          disabled={isLoading || !predictionsOpen}
        >
          <div className="text-lg">BUY NO</div>
          <div className="text-xs mt-1 opacity-80">
            {formatPercent(marketState.noPrice)}
          </div>
        </button>
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Amount
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-blue-500 transition-colors"
            disabled={isLoading || !predictionsOpen}
            min="0"
            step="0.01"
          />
          <button
            onClick={handleMaxClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded font-semibold transition-colors"
            disabled={isLoading || !predictionsOpen}
          >
            MAX
          </button>
        </div>
        {error && (
          <div className="mt-2 text-sm text-red-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Trade Preview */}
      {tradePreview && !error && (
        <div className="bg-gray-900 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Shares Received</span>
            <span className="text-white font-semibold">
              {formatCurrency(tradePreview.sharesReceived)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Cost per Share</span>
            <span className="text-white font-semibold">
              {formatCurrency(tradePreview.costPerShare)}
            </span>
          </div>
          <div className="border-t border-gray-700 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">New Price</span>
              <span className="text-white font-semibold">
                {formatPercent(tradePreview.newPrice)}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-400">Price Impact</span>
              <span
                className={`font-semibold ${
                  tradePreview.priceImpact > 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {tradePreview.priceImpact > 0 ? '+' : ''}
                {tradePreview.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-400">Slippage</span>
              <span
                className={`font-semibold ${
                  tradePreview.slippage > 5 ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                {tradePreview.slippage.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Current Holdings */}
      {(userShares.yes > 0 || userShares.no > 0) && (
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <div className="text-xs text-gray-400 mb-2">Your Holdings</div>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="text-green-400 text-xs">YES Shares</div>
              <div className="text-white font-semibold">{formatCurrency(userShares.yes)}</div>
            </div>
            <div className="flex-1">
              <div className="text-red-400 text-xs">NO Shares</div>
              <div className="text-white font-semibold">{formatCurrency(userShares.no)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!tradePreview || !!error || !predictionsOpen || isLoading}
        className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
          !tradePreview || !!error || !predictionsOpen || isLoading
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : selectedOutcome === 'YES'
            ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
            : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl'
        }`}
      >
        {!predictionsOpen
          ? 'Predictions Closed'
          : isLoading
          ? 'Loading...'
          : `Place Bet on ${selectedOutcome}`}
      </button>

      {/* Confirmation Modal */}
      {showConfirmModal && tradePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-md w-full">
            <h4 className="text-xl font-bold text-white mb-4">Confirm Trade</h4>

            <div className="bg-gray-900 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Predicting</span>
                <span
                  className={`font-bold ${
                    tradePreview.outcome === 'YES' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {tradePreview.outcome}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount</span>
                <span className="text-white font-semibold">
                  {formatCurrency(tradePreview.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Shares</span>
                <span className="text-white font-semibold">
                  {formatCurrency(tradePreview.sharesReceived)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">New Price</span>
                <span className="text-white font-semibold">
                  {formatPercent(tradePreview.newPrice)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelTrade}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={confirmTrade}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  tradePreview.outcome === 'YES'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingPanel;
