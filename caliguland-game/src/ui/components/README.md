# Caliguland UI Components

Complete React/TypeScript UI component library for the Caliguland prediction market game.

## Quick Start

```typescript
// Import all components
import {
  MarketChart,
  TradingPanel,
  GameResults,
  Leaderboard,
  GameStatus,
  GameLobby,
} from './ui/components';

// Import types
import type {
  MarketChartProps,
  TradingPanelProps,
  GameResultsProps,
  LeaderboardProps,
  GameStatusProps,
  GameLobbyProps,
} from './ui/components';
```

## Component Overview

### 1. MarketChart
**Purpose**: Display LMSR market probability over time (30-day game period)

**Key Features**:
- Line chart for YES/NO probability
- Real-time price updates
- Hover tooltips
- Responsive (mobile: table view)

**Usage**:
```typescript
<MarketChart
  priceHistory={priceHistory}
  currentDay={15}
  currentYesPrice={0.65}
  currentNoPrice={0.35}
  height={400}
/>
```

**TODO**: Install charting library (`recharts` or `chart.js`)

---

### 2. TradingPanel
**Purpose**: Place bets on YES/NO outcomes with LMSR pricing

**Key Features**:
- Toggle YES/NO selection
- Amount input with max button
- Real-time shares calculation
- Price impact & slippage display
- Transaction confirmation modal

**Usage**:
```typescript
<TradingPanel
  marketState={marketState}
  availableBalance={1000}
  bettingOpen={true}
  onTrade={handleTrade}
  userShares={{ yes: 50, no: 0 }}
/>
```

**TODO**: Import `MarketMaker` from `game/market.ts` for accurate LMSR calculations

---

### 3. GameResults
**Purpose**: Display final outcome and player performance

**Key Features**:
- Animated profit/loss counter
- Detailed breakdown (bets, shares, payout)
- Top 5 winners podium
- Share results & play again buttons

**Usage**:
```typescript
<GameResults
  outcome={Outcome.YES}
  question="Will Project Omega succeed?"
  playerResult={playerResult}
  topWinners={topWinners}
  totalPlayers={20}
  onViewLeaderboard={handleViewLeaderboard}
  onPlayAgain={handlePlayAgain}
/>
```

---

### 4. Leaderboard
**Purpose**: Ranked list of players with performance stats

**Key Features**:
- Top 3 podium display
- Search & filter (current/week/all-time)
- Pagination
- Click to view profile
- Current player highlighting

**Usage**:
```typescript
<Leaderboard
  entries={leaderboardEntries}
  currentAgentId={currentAgentId}
  initialFilter="all-time"
  onViewProfile={handleViewProfile}
  pageSize={10}
/>
```

---

### 5. GameStatus
**Purpose**: Real-time game state display

**Key Features**:
- Phase indicator (Early/Mid/Late/Reveal)
- Countdown timer
- Progress bar (Days 1-30)
- Current market odds
- Volume & player count

**Usage**:
```typescript
<GameStatus
  phase={GamePhase.MID}
  currentDay={15}
  startTime={new Date()}
  gameDurationMs={3600000}
  question="Will Project Omega succeed?"
  yesOdds={0.65}
  noOdds={0.35}
  totalVolume={5000}
  activePlayers={20}
  bettingOpen={true}
/>
```

**Note**: Timer updates every second automatically

---

### 6. GameLobby
**Purpose**: Pre-game waiting room

**Key Features**:
- Player list with avatars
- Auto-start countdown
- Scenario preview
- Real-time chat
- Host controls (start game)

**Usage**:
```typescript
<GameLobby
  players={lobbyPlayers}
  currentAgentId={currentAgentId}
  minPlayers={5}
  maxPlayers={20}
  isHost={true}
  autoStartCountdown={30}
  scenarioPreview={scenarioPreview}
  chatMessages={chatMessages}
  onSendMessage={handleSendMessage}
  onStartGame={handleStartGame}
  onLeaveLobby={handleLeaveLobby}
/>
```

---

## Integration Checklist

### Required Dependencies
```bash
npm install react typescript
npm install -D tailwindcss

# Optional (for charts)
npm install recharts
# OR
npm install chart.js react-chartjs-2
```

### Backend Integration

1. **Connect to GameEngine**:
```typescript
import { GameEngine } from '../game/engine';
import { MarketMaker } from '../game/market';

const gameEngine = new GameEngine(config);
const currentGame = gameEngine.getCurrentGame();
```

2. **Set up WebSocket for real-time updates**:
```typescript
// Subscribe to events
socket.on('market_update', (data) => {
  // Update MarketChart, TradingPanel, GameStatus
});

socket.on('day_changed', (data) => {
  // Update GameStatus
});

socket.on('game_ended', (data) => {
  // Show GameResults
});
```

3. **Integrate LMSR calculations**:
```typescript
// In TradingPanel
import { MarketMaker } from '../game/market';

const marketMaker = new MarketMaker(100);
const shares = marketMaker.calculateSharesForTokens('YES', amount);
const cost = marketMaker.calculateBuyCost('YES', shares);
```

---

## Styling

All components use **Tailwind CSS** with a dark theme:

**Color Scheme**:
- Background: `gray-800`, `gray-900`
- Borders: `gray-700`
- YES (bullish): `green-400`, `green-600`
- NO (bearish): `red-400`, `red-600`
- Actions: `blue-600`

**Responsive Breakpoints**:
- Mobile: `< 640px` (default)
- Tablet: `md: 768px`
- Desktop: `lg: 1024px`

---

## Type Definitions

All components export TypeScript interfaces:

```typescript
// Market types
export interface MarketState {
  yesPrice: number;
  noPrice: number;
  yesShares: number;
  noShares: number;
  liquidity: number;
}

export interface PricePoint {
  day: number;
  yesPrice: number;
  noPrice: number;
  timestamp: Date;
}

// Player types
export interface PlayerResult {
  agentId: string;
  agentName: string;
  initialBets: number;
  finalShares: { yes: number; no: number };
  payout: number;
  profit: number;
  isWinner: boolean;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  avatar?: string;
  profit: number;
  winRate: number;
  gamesPlayed: number;
  wins: number;
}

// Lobby types
export interface LobbyPlayer {
  agentId: string;
  agentName: string;
  avatar?: string;
  isReady: boolean;
  reputationScore?: number;
}
```

---

## Component States

### Loading States
All components support loading states:
```typescript
<Component isLoading={true} />
```

### Error Handling
Components handle errors gracefully with user-friendly messages.

### Empty States
Components display helpful messages when no data is available.

---

## Accessibility

All components include:
- ARIA labels and roles
- Keyboard navigation support
- Focus states
- Screen reader friendly
- Color contrast compliance (WCAG AA)

---

## Testing

### Unit Test Example
```typescript
import { render, screen } from '@testing-library/react';
import { TradingPanel } from './TradingPanel';

test('renders trading panel', () => {
  render(
    <TradingPanel
      marketState={mockMarketState}
      availableBalance={1000}
      bettingOpen={true}
      onTrade={jest.fn()}
    />
  );

  expect(screen.getByText('BUY YES')).toBeInTheDocument();
  expect(screen.getByText('BUY NO')).toBeInTheDocument();
});
```

---

## Performance Considerations

### Memoization
Use `useMemo` for expensive calculations:
```typescript
const tradePreview = useMemo(() => {
  // Calculate trade preview
}, [amount, outcome, marketState]);
```

### Lazy Loading
For chart libraries:
```typescript
const Chart = lazy(() => import('recharts'));
```

### Debouncing
For real-time inputs (e.g., search):
```typescript
const debouncedSearch = useMemo(
  () => debounce(handleSearch, 300),
  []
);
```

---

## Common Patterns

### Formatting Utilities
```typescript
// Percentage (0-1 to 0-100%)
const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

// Currency (with K/M suffixes)
const formatCurrency = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(2);
};

// Time remaining (HH:MM:SS or MM:SS)
const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
```

---

## Troubleshooting

### Chart not displaying
- Ensure charting library is installed
- Replace placeholder in `MarketChart.tsx` with actual chart component

### Real-time updates not working
- Verify WebSocket connection
- Check event listeners are properly attached
- Ensure state updates trigger re-renders

### LMSR calculations incorrect
- Import actual `MarketMaker` class
- Replace approximations in `TradingPanel`
- Verify liquidity parameter (`b`) is correct

### Mobile layout issues
- Check Tailwind breakpoints
- Test on actual devices
- Verify responsive classes (`md:`, `lg:`)

---

## File Structure

```
/ui/components/
├── MarketChart.tsx         # Market probability chart
├── TradingPanel.tsx        # Bet placement interface
├── GameResults.tsx         # Final outcome display
├── Leaderboard.tsx         # Player rankings
├── GameStatus.tsx          # Live game state
├── GameLobby.tsx           # Pre-game waiting room
├── index.ts                # Central exports
├── README.md               # This file
└── PHASE4_SUMMARY.md       # Detailed completion report
```

---

## Resources

- **LMSR Reference**: [Hanson's Market Maker](http://mason.gmu.edu/~rhanson/mktscore.pdf)
- **Game Engine**: `/game/engine.ts`
- **Market Maker**: `/game/market.ts`
- **Type Definitions**: `/types.ts`
- **Tailwind Docs**: [tailwindcss.com](https://tailwindcss.com)

---

## Support

For questions or issues:
1. Check `PHASE4_SUMMARY.md` for detailed component specs
2. Review JSDoc comments in component files
3. Consult game engine documentation in `/game/`

---

**Total Components**: 6
**Total Lines of Code**: ~6,300
**Coverage**: Complete game UI (lobby → gameplay → results)
