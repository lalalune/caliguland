/**
 * Unit tests for LMSR Market Maker
 */

import { MarketMaker } from '../market';

describe('MarketMaker - LMSR Implementation', () => {
  let market: MarketMaker;

  beforeEach(() => {
    market = new MarketMaker(100); // liquidity parameter b=100
  });

  describe('Initialization', () => {
    test('should initialize with 50/50 prices', () => {
      const state = market.getMarketState();
      expect(state.yesPrice).toBeCloseTo(0.5, 5);
      expect(state.noPrice).toBeCloseTo(0.5, 5);
      expect(state.yesShares).toBe(0);
      expect(state.noShares).toBe(0);
      expect(state.liquidity).toBe(100);
    });

    test('should support custom liquidity parameter', () => {
      const customMarket = new MarketMaker(200);
      const state = customMarket.getMarketState();
      expect(state.liquidity).toBe(200);
    });
  });

  describe('Price Calculation', () => {
    test('YES price should increase when YES shares are bought', () => {
      const initialYesPrice = market.getYesPrice();
      market.buy('YES', 10);
      const newYesPrice = market.getYesPrice();
      expect(newYesPrice).toBeGreaterThan(initialYesPrice);
    });

    test('NO price should increase when NO shares are bought', () => {
      const initialNoPrice = market.getNoPrice();
      market.buy('NO', 10);
      const newNoPrice = market.getNoPrice();
      expect(newNoPrice).toBeGreaterThan(initialNoPrice);
    });

    test('YES and NO prices should sum to 1', () => {
      market.buy('YES', 10);
      const yesPrice = market.getYesPrice();
      const noPrice = market.getNoPrice();
      expect(yesPrice + noPrice).toBeCloseTo(1, 5);
    });

    test('prices should remain between 0 and 1', () => {
      market.buy('YES', 100);
      expect(market.getYesPrice()).toBeGreaterThan(0);
      expect(market.getYesPrice()).toBeLessThan(1);
      expect(market.getNoPrice()).toBeGreaterThan(0);
      expect(market.getNoPrice()).toBeLessThan(1);
    });
  });

  describe('Buy Operations', () => {
    test('should calculate correct cost for buying shares', () => {
      const cost = market.calculateBuyCost('YES', 10);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(10); // Cost should be less than shares due to LMSR
    });

    test('buying should increase share count', () => {
      market.buy('YES', 10);
      const state = market.getMarketState();
      expect(state.yesShares).toBe(10);
      expect(state.noShares).toBe(0);
    });

    test('buying should return cost and new price', () => {
      const result = market.buy('YES', 10);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.newPrice).toBeGreaterThan(0.5);
      expect(result.shares).toBe(10);
    });

    test('larger purchases should have higher cost', () => {
      const cost1 = market.calculateBuyCost('YES', 10);
      const cost2 = market.calculateBuyCost('YES', 20);
      expect(cost2).toBeGreaterThan(cost1);
    });

    test('should handle zero shares gracefully', () => {
      const cost = market.calculateBuyCost('YES', 0);
      expect(cost).toBe(0);
    });
  });

  describe('Sell Operations', () => {
    beforeEach(() => {
      // Buy some shares first so we can sell them
      market.buy('YES', 20);
    });

    test('should calculate proceeds for selling shares', () => {
      const proceeds = market.calculateSellProceeds('YES', 10);
      expect(proceeds).toBeGreaterThan(0);
    });

    test('selling should decrease share count', () => {
      market.sell('YES', 10);
      const state = market.getMarketState();
      expect(state.yesShares).toBe(10); // Was 20, sold 10
    });

    test('selling should return proceeds and new price', () => {
      const priceBefore = market.getYesPrice();
      const result = market.sell('YES', 10);
      expect(result.proceeds).toBeGreaterThan(0);
      expect(result.newPrice).toBeLessThan(priceBefore);
    });

    test('selling all shares should return to initial state', () => {
      market.sell('YES', 20);
      const state = market.getMarketState();
      expect(state.yesShares).toBe(0);
      expect(market.getYesPrice()).toBeCloseTo(0.5, 5);
    });

    test('should not go negative on oversell', () => {
      market.sell('YES', 100); // Try to sell more than exists
      const state = market.getMarketState();
      expect(state.yesShares).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Price Impact Calculation', () => {
    test('should calculate price impact correctly', () => {
      const impact = market.calculatePriceImpact('YES', 50);
      expect(impact.currentPrice).toBeCloseTo(0.5, 5);
      expect(impact.newPrice).toBeGreaterThan(impact.currentPrice);
      expect(impact.priceImpact).toBeGreaterThan(0);
    });

    test('larger trades should have larger impact', () => {
      const impact1 = market.calculatePriceImpact('YES', 10);
      const impact2 = market.calculatePriceImpact('YES', 50);
      expect(impact2.priceImpact).toBeGreaterThan(impact1.priceImpact);
    });

    test('should calculate slippage percentage', () => {
      const impact = market.calculatePriceImpact('YES', 50);
      expect(impact.slippage).toBeGreaterThan(0);
      expect(impact.slippage).toBeLessThan(100); // Percentage
    });
  });

  describe('Shares for Tokens Calculation', () => {
    test('should calculate shares for given token amount', () => {
      const shares = market.calculateSharesForTokens('YES', 10);
      expect(shares).toBeGreaterThan(0);

      // Verify the calculation by checking actual cost
      const actualCost = market.calculateBuyCost('YES', shares);
      expect(actualCost).toBeCloseTo(10, 1); // Within 1 token tolerance
    });

    test('more tokens should buy more shares', () => {
      const shares1 = market.calculateSharesForTokens('YES', 10);
      const shares2 = market.calculateSharesForTokens('YES', 20);
      expect(shares2).toBeGreaterThan(shares1);
    });

    test('should handle zero tokens', () => {
      const shares = market.calculateSharesForTokens('YES', 0);
      expect(shares).toBe(0);
    });

    test('binary search should be accurate', () => {
      const shares = market.calculateSharesForTokens('YES', 50);
      const cost = market.calculateBuyCost('YES', shares);
      expect(cost).toBeCloseTo(50, 2); // Within 2 tokens
    });
  });

  describe('Buy/Sell Round Trip', () => {
    test('buying then selling should result in minimal loss', () => {
      const initialState = market.getMarketState();

      // Buy shares
      const buyResult = market.buy('YES', 10);
      const cost = buyResult.cost;

      // Sell same shares
      const sellResult = market.sell('YES', 10);
      const proceeds = sellResult.proceeds;

      // Should be back near initial state
      const finalState = market.getMarketState();
      expect(finalState.yesShares).toBeCloseTo(initialState.yesShares, 5);

      // There should be some loss due to spread (or at best break even)
      expect(proceeds).toBeLessThanOrEqual(cost);
    });

    test('multiple buy/sell operations should maintain consistency', () => {
      market.buy('YES', 10);
      market.buy('NO', 10);
      market.sell('YES', 5);
      market.buy('YES', 3);
      market.sell('NO', 7);

      // Prices should still sum to 1
      const yesPrice = market.getYesPrice();
      const noPrice = market.getNoPrice();
      expect(yesPrice + noPrice).toBeCloseTo(1, 5);
    });
  });

  describe('LMSR Cost Function', () => {
    test('should satisfy cost function invariant', () => {
      // The cost function C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))
      // should always increase when shares are added
      const cost1 = market['cost'](0, 0);
      const cost2 = market['cost'](10, 0);
      const cost3 = market['cost'](10, 10);

      expect(cost2).toBeGreaterThan(cost1);
      expect(cost3).toBeGreaterThan(cost2);
    });

    test('marginal cost should equal price', () => {
      // The derivative of cost function equals the instantaneous price
      market.buy('YES', 50);

      const currentPrice = market.getYesPrice();
      const epsilon = 0.001;
      const marginalCost = market.calculateBuyCost('YES', epsilon) / epsilon;

      expect(marginalCost).toBeCloseTo(currentPrice, 2);
    });
  });

  describe('Market Reset', () => {
    test('should reset market to initial state', () => {
      market.buy('YES', 50);
      market.buy('NO', 30);

      market.reset();

      const state = market.getMarketState();
      expect(state.yesShares).toBe(0);
      expect(state.noShares).toBe(0);
      expect(market.getYesPrice()).toBeCloseTo(0.5, 5);
    });

    test('should allow changing liquidity parameter on reset', () => {
      market.reset(200);
      const state = market.getMarketState();
      expect(state.liquidity).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very large purchases', () => {
      const result = market.buy('YES', 1000);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.newPrice).toBeLessThan(1);
    });

    test('should handle very small purchases', () => {
      const result = market.buy('YES', 0.001);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.shares).toBe(0.001);
    });

    test('should maintain numerical stability with extreme imbalance', () => {
      market.buy('YES', 500);
      const yesPrice = market.getYesPrice();
      const noPrice = market.getNoPrice();

      expect(yesPrice).toBeGreaterThan(0.9);
      expect(noPrice).toBeLessThan(0.1);
      expect(yesPrice + noPrice).toBeCloseTo(1, 5);
    });

    test('should handle rapid alternating trades', () => {
      for (let i = 0; i < 10; i++) {
        market.buy('YES', 5);
        market.buy('NO', 5);
      }

      // Price should still be reasonable
      const yesPrice = market.getYesPrice();
      expect(yesPrice).toBeGreaterThan(0.3);
      expect(yesPrice).toBeLessThan(0.7);
    });
  });

  describe('Liquidity Parameter Effects', () => {
    test('higher liquidity should result in lower price impact', () => {
      const lowLiqMarket = new MarketMaker(50);
      const highLiqMarket = new MarketMaker(200);

      const lowImpact = lowLiqMarket.calculatePriceImpact('YES', 10);
      const highImpact = highLiqMarket.calculatePriceImpact('YES', 10);

      expect(lowImpact.priceImpact).toBeGreaterThan(highImpact.priceImpact);
    });

    test('liquidity parameter should affect cost', () => {
      const lowLiqMarket = new MarketMaker(50);
      const highLiqMarket = new MarketMaker(200);

      const lowCost = lowLiqMarket.calculateBuyCost('YES', 10);
      const highCost = highLiqMarket.calculateBuyCost('YES', 10);

      // Higher liquidity means flatter curve, so similar costs for same shares
      expect(highCost).toBeLessThan(lowCost);
    });
  });
});
