/**
 * Logarithmic Market Scoring Rule (LMSR) Implementation
 * Based on Hanson's market maker algorithm for prediction markets
 *
 * References:
 * - Hanson's LMSR paper: http://mason.gmu.edu/~rhanson/mktscore.pdf
 * - Gnosis PM: https://github.com/gnosis/pm-contracts
 */

export interface LMSRMarket {
  b: number;           // Liquidity parameter (higher = more stable prices)
  yesShares: number;   // Outstanding YES shares
  noShares: number;    // Outstanding NO shares
  liquidity: number;   // Initial liquidity pool
}

/**
 * Automated Market Maker using Logarithmic Market Scoring Rule
 */
export class MarketMaker {
  private market: LMSRMarket;

  constructor(liquidityParameter: number = 100) {
    this.market = {
      b: liquidityParameter,
      yesShares: 0,
      noShares: 0,
      liquidity: liquidityParameter
    };
  }

  /**
   * Cost function: C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))
   * This determines the total cost to reach a given state
   */
  private cost(yesShares: number, noShares: number): number {
    const expYes = Math.exp(yesShares / this.market.b);
    const expNo = Math.exp(noShares / this.market.b);
    return this.market.b * Math.log(expYes + expNo);
  }

  /**
   * Get current price for YES outcome
   * Price = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
   * This is the instantaneous marginal price
   */
  getYesPrice(): number {
    const expYes = Math.exp(this.market.yesShares / this.market.b);
    const expNo = Math.exp(this.market.noShares / this.market.b);
    return expYes / (expYes + expNo);
  }

  /**
   * Get current price for NO outcome
   */
  getNoPrice(): number {
    return 1 - this.getYesPrice();
  }

  /**
   * Calculate cost to buy shares
   * @param outcome YES or NO
   * @param numShares Number of shares to buy
   * @returns Cost in tokens
   */
  calculateBuyCost(outcome: 'YES' | 'NO', numShares: number): number {
    if (numShares <= 0) return 0;

    const currentCost = this.cost(this.market.yesShares, this.market.noShares);

    let newYes = this.market.yesShares;
    let newNo = this.market.noShares;

    if (outcome === 'YES') {
      newYes += numShares;
    } else {
      newNo += numShares;
    }

    const newCost = this.cost(newYes, newNo);
    return Math.max(0, newCost - currentCost);
  }

  /**
   * Calculate proceeds from selling shares
   * @param outcome YES or NO
   * @param numShares Number of shares to sell
   * @returns Proceeds in tokens
   */
  calculateSellProceeds(outcome: 'YES' | 'NO', numShares: number): number {
    if (numShares <= 0) return 0;

    const currentCost = this.cost(this.market.yesShares, this.market.noShares);

    let newYes = this.market.yesShares;
    let newNo = this.market.noShares;

    if (outcome === 'YES') {
      newYes = Math.max(0, newYes - numShares);
    } else {
      newNo = Math.max(0, newNo - numShares);
    }

    const newCost = this.cost(newYes, newNo);
    return Math.max(0, currentCost - newCost);
  }

  /**
   * Execute a buy order
   */
  buy(outcome: 'YES' | 'NO', numShares: number): { cost: number; newPrice: number; shares: number } {
    const cost = this.calculateBuyCost(outcome, numShares);

    if (outcome === 'YES') {
      this.market.yesShares += numShares;
    } else {
      this.market.noShares += numShares;
    }

    const newPrice = outcome === 'YES' ? this.getYesPrice() : this.getNoPrice();
    return { cost, newPrice, shares: numShares };
  }

  /**
   * Execute a sell order
   */
  sell(outcome: 'YES' | 'NO', numShares: number): { proceeds: number; newPrice: number } {
    const proceeds = this.calculateSellProceeds(outcome, numShares);

    if (outcome === 'YES') {
      this.market.yesShares = Math.max(0, this.market.yesShares - numShares);
    } else {
      this.market.noShares = Math.max(0, this.market.noShares - numShares);
    }

    const newPrice = outcome === 'YES' ? this.getYesPrice() : this.getNoPrice();
    return { proceeds, newPrice };
  }

  /**
   * Get market state
   */
  getMarketState(): {
    yesPrice: number;
    noPrice: number;
    yesShares: number;
    noShares: number;
    liquidity: number;
  } {
    return {
      yesPrice: this.getYesPrice(),
      noPrice: this.getNoPrice(),
      yesShares: this.market.yesShares,
      noShares: this.market.noShares,
      liquidity: this.market.liquidity
    };
  }

  /**
   * Calculate price impact of a potential trade
   */
  calculatePriceImpact(outcome: 'YES' | 'NO', numShares: number): {
    currentPrice: number;
    newPrice: number;
    priceImpact: number;
    slippage: number;
  } {
    const currentPrice = outcome === 'YES' ? this.getYesPrice() : this.getNoPrice();

    // Simulate the trade
    const tempMarket = { ...this.market };
    if (outcome === 'YES') {
      tempMarket.yesShares += numShares;
    } else {
      tempMarket.noShares += numShares;
    }

    const expYes = Math.exp(tempMarket.yesShares / tempMarket.b);
    const expNo = Math.exp(tempMarket.noShares / tempMarket.b);
    const newPrice = outcome === 'YES'
      ? expYes / (expYes + expNo)
      : expNo / (expYes + expNo);

    const priceImpact = newPrice - currentPrice;
    const slippage = currentPrice > 0 ? Math.abs(priceImpact / currentPrice) * 100 : 0;

    return {
      currentPrice,
      newPrice,
      priceImpact,
      slippage
    };
  }

  /**
   * Calculate shares received for a given amount of tokens
   * Uses binary search to find the number of shares
   */
  calculateSharesForTokens(outcome: 'YES' | 'NO', tokens: number): number {
    if (tokens <= 0) return 0;

    // Binary search for shares that cost approximately 'tokens'
    let low = 0;
    let high = tokens * 100; // Upper bound guess
    let shares = 0;

    while (high - low > 0.001) {
      const mid = (low + high) / 2;
      const cost = this.calculateBuyCost(outcome, mid);

      if (cost < tokens) {
        low = mid;
        shares = mid;
      } else {
        high = mid;
      }
    }

    return shares;
  }

  /**
   * Reset market to initial state
   */
  reset(liquidityParameter?: number): void {
    if (liquidityParameter !== undefined) {
      this.market.b = liquidityParameter;
      this.market.liquidity = liquidityParameter;
    }
    this.market.yesShares = 0;
    this.market.noShares = 0;
  }
}
