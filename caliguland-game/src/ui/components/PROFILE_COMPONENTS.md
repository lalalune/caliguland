# Caliguland Profile Components

## Overview

This document describes the profile components created for Phase 4 of the Caliguland prediction game. These components provide comprehensive player and NPC profile views with stats, prediction history, and social connections.

## Components

### 1. ProfileHeader

**Location**: `/Users/shawwalters/jeju/apps/caliguland/caliguland-game/src/ui/components/ProfileHeader.tsx`

**Purpose**: Displays a rich profile header with avatar, name, bio, stats row, and action buttons.

**Features**:
- Large circular avatar with online indicator
- Name, handle (@username), and bio
- Follow/Edit Profile button (context-aware)
- Stats row: Followers / Following / Reputation / Games Won
- NPC indicator badge with personality type
- Reliability score bar for NPCs
- Responsive design with gradient banner
- Dark mode support

**Usage**:
```tsx
import { ProfileHeader } from './components';

<ProfileHeader
  agent={playerData}
  isOwnProfile={false}
  onFollowToggle={() => handleFollow()}
  onEditProfile={() => navigate('/edit')}
/>
```

**Props**:
- `agent`: ProfileHeaderAgent - Agent data including bio, avatar, stats
- `isOwnProfile`: boolean - Whether viewing own profile
- `onFollowToggle`: () => void - Callback for follow/unfollow
- `onEditProfile`: () => void - Callback for edit profile
- `isLoading`: boolean - Loading state
- `className`: string - Custom CSS classes

---

### 2. PlayerProfile

**Location**: `/Users/shawwalters/jeju/apps/caliguland/caliguland-game/src/ui/components/PlayerProfile.tsx`

**Purpose**: Complete player profile with tabbed interface for posts, bets, stats, and social connections.

**Features**:
- Uses ProfileHeader component
- **5 Tabs**:
  - **Posts**: Feed of player's posts with timestamps
  - **Bets**: Complete prediction history with PredictionHistory component
  - **Stats**: Performance metrics with StatsCard components
    - Win rate, profit/loss, ROI
    - Total games, average bet, total wagered
    - Best prediction highlight
    - Win streak tracking
    - Placeholder for win rate chart
  - **Followers**: List of followers with FollowList
  - **Following**: List of following with FollowList
- Tab badges showing counts
- Responsive grid layouts
- Loading states with skeleton screens

**Usage**:
```tsx
import { PlayerProfile } from './components';

<PlayerProfile
  player={playerData}
  posts={playerPosts}
  bets={bettingHistory}
  stats={playerStats}
  followers={followersList}
  following={followingList}
  isOwnProfile={true}
  currentUserId={userId}
  onFollowToggle={() => handleFollow()}
  onBetClick={(bet) => viewBetDetails(bet)}
  onAgentClick={(agent) => navigate(`/profile/${agent.id}`)}
  onAgentFollowToggle={(agentId) => toggleFollow(agentId)}
/>
```

**Props**:
- `player`: ProfileHeaderAgent - Player data
- `posts`: Post[] - Player's posts
- `bets`: PredictionHistoryEntry[] - Prediction history
- `stats`: PlayerStats - Performance statistics
- `followers`: FollowListAgent[] - Followers list
- `following`: FollowListAgent[] - Following list
- `isOwnProfile`: boolean - Is current user
- `currentUserId`: string - Current user ID
- `onFollowToggle`: () => void - Follow toggle callback
- `onEditProfile`: () => void - Edit profile callback
- `onBetClick`: (bet) => void - Bet click callback
- `onAgentClick`: (agent) => void - Agent click callback
- `onAgentFollowToggle`: (agentId) => void - Follow agent callback

---

### 3. NPCProfile

**Location**: `/Users/shawwalters/jeju/apps/caliguland/caliguland-game/src/ui/components/NPCProfile.tsx`

**Purpose**: Specialized profile for NPCs showing personality, reliability, and hints.

**Features**:
- Uses ProfileHeader with NPC badges
- **Personality Profile Section**:
  - Role description (Insider, Rumor Monger, Celebrity, Media, Organization)
  - Bias indicator (Truthful, Deceptive, Neutral)
  - Personality traits as tags
  - Information advantage display
- **Reliability Analysis**:
  - Overall reliability score (0-100%) with progress bar
  - Accuracy stats: Total hints, Accurate hints, Misleading hints
  - Color-coded reliability (green/yellow/red)
- **Relationship Section**:
  - Following status
  - Mutual connections count
  - List of mutual followers
- **Recent Posts/Hints**:
  - Show/hide full history toggle
  - Clickable post cards
- **Trust Recommendation**:
  - AI-driven recommendation based on reliability and bias

**Usage**:
```tsx
import { NPCProfile } from './components';

<NPCProfile
  npc={npcData}
  isFollowing={false}
  currentUserId={userId}
  onFollowToggle={() => handleFollow()}
  onPostClick={(post) => viewPost(post)}
/>
```

**Props**:
- `npc`: NPCProfileData - NPC data with personality and reliability
- `isFollowing`: boolean - Following status
- `currentUserId`: string - Current user ID
- `onFollowToggle`: () => void - Follow toggle callback
- `onPostClick`: (post) => void - Post click callback
- `isLoading`: boolean - Loading state

---

### 4. StatsCard

**Location**: `/Users/shawwalters/jeju/apps/caliguland/caliguland-game/src/ui/components/StatsCard.tsx`

**Purpose**: Reusable card for displaying individual statistics with animations.

**Features**:
- Animated counter on mount (1-second animation)
- Support for multiple value types:
  - Number (formatted with commas)
  - Percentage (with % symbol)
  - Currency (with $ symbol and decimals)
- Trend indicators (up/down/neutral arrows)
- Color themes: blue, green, red, yellow, purple, gray
- Icon support (emoji or icon classes)
- Hover effects and responsive design
- Dark mode support

**Usage**:
```tsx
import { StatsCard } from './components';

<StatsCard
  label="Win Rate"
  value={75}
  valueType="percentage"
  icon="🏆"
  trend="up"
  trendValue={5}
  color="green"
/>
```

**Props**:
- `label`: string - Label text
- `value`: number - Numeric value
- `valueType`: 'number' | 'percentage' | 'currency' - Format type
- `icon`: string - Icon (emoji or class)
- `trend`: 'up' | 'down' | 'neutral' - Trend direction
- `trendValue`: number - Trend change value
- `color`: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' - Color theme
- `disableAnimation`: boolean - Disable counter animation

---

### 5. PredictionHistory

**Location**: `/Users/shawwalters/jeju/apps/caliguland/caliguland-game/src/ui/components/PredictionHistory.tsx`

**Purpose**: Display and analyze prediction history with filtering, sorting, and pagination.

**Features**:
- **Summary Stats Section**:
  - Total profit/loss with color coding
  - Win rate with W/L breakdown
  - ROI percentage
- **Filtering**:
  - All / Won / Lost / Pending
  - Filter buttons with counts
- **Sortable Columns**:
  - Date (ascending/descending)
  - Amount
  - Profit/Loss
- **Data Table**:
  - Date, Game, Bet (YES/NO), Amount, Outcome, Profit/Loss
  - Color-coded outcomes (green=won, red=lost, gray=pending)
  - Clickable rows
- **Pagination**:
  - Configurable items per page
  - Page navigation with numbered buttons
  - Result count display
- Empty state for no bets
- Responsive design

**Usage**:
```tsx
import { PredictionHistory } from './components';

<PredictionHistory
  bets={playerBets}
  onBetClick={(bet) => viewBetDetails(bet)}
  showPagination={true}
  itemsPerPage={10}
/>
```

**Props**:
- `bets`: PredictionHistoryEntry[] - Array of bets
- `onBetClick`: (bet) => void - Callback when bet clicked
- `showPagination`: boolean - Show pagination controls
- `itemsPerPage`: number - Items per page
- `className`: string - Custom CSS classes

**PredictionHistoryEntry Interface**:
```typescript
interface PredictionHistoryEntry extends Bet {
  id: string;
  gameId: string;
  gameTitle: string;
  finalOutcome?: Outcome;
  profitLoss?: number;
  status: 'won' | 'lost' | 'pending';
}
```

---

### 6. FollowList

**Location**: `/Users/shawwalters/jeju/apps/caliguland/caliguland-game/src/ui/components/FollowList.tsx`

**Purpose**: Display and manage followers or following lists with search functionality.

**Features**:
- **Search Bar**: Real-time search by name or bio
- **Type Filters**: All / Human / AI / NPC
- **Agent Cards**:
  - Avatar with online indicator
  - Name with type badges (NPC, AI)
  - Bio snippet (line-clamped to 2 lines)
  - Stats: Wins, Reputation, Last active/Online
  - Follow/Following button
  - Clickable to navigate to profile
- **Empty States**:
  - No followers/following
  - No search results
- **Loading States**: Skeleton screens
- Responsive grid layout

**Usage**:
```tsx
import { FollowList } from './components';

<FollowList
  agents={followers}
  type="followers"
  currentUserId={userId}
  onFollowToggle={(agentId) => toggleFollow(agentId)}
  onAgentClick={(agent) => navigate(`/profile/${agent.id}`)}
  showSearch={true}
/>
```

**Props**:
- `agents`: FollowListAgent[] - Array of agents
- `type`: 'followers' | 'following' - List type
- `currentUserId`: string - Current user ID (to hide self-follow)
- `onFollowToggle`: (agentId) => void - Follow toggle callback
- `onAgentClick`: (agent) => void - Agent click callback
- `showSearch`: boolean - Show search bar
- `isLoading`: boolean - Loading state

**FollowListAgent Interface**:
```typescript
interface FollowListAgent extends Agent {
  bio?: string;
  avatar?: string;
  isFollowing?: boolean;
  isOnline?: boolean;
  lastActive?: Date | string;
}
```

---

## Component Relationships

```
PlayerProfile
├── ProfileHeader (displays header)
├── PredictionHistory (Bets tab)
├── StatsCard (Stats tab - multiple instances)
└── FollowList (Followers/Following tabs)

NPCProfile
├── ProfileHeader (displays header)
└── Post cards (Recent posts section)

FollowList
└── Agent cards (each with Follow button)

PredictionHistory
└── Stats cards (summary section)
```

## Design System

### Colors
- **Blue**: Primary actions, links
- **Green**: Positive metrics (wins, profit)
- **Red**: Negative metrics (losses, warnings)
- **Yellow**: Caution, moderate reliability
- **Purple**: NPC-specific, special features
- **Gray**: Neutral, disabled states

### Typography
- **Headers**: Bold, 2xl-3xl font size
- **Body**: Regular, base font size
- **Stats**: Bold, 2xl-4xl font size
- **Labels**: Semibold, sm-base font size

### Spacing
- **Card padding**: 4-6 (16-24px)
- **Gap between elements**: 2-4 (8-16px)
- **Section spacing**: 6 (24px)

### Responsiveness
- **Mobile-first**: All components are mobile-responsive
- **Breakpoints**: sm (640px), md (768px), lg (1024px)
- **Grid layouts**: 1 column mobile, 2-3 columns desktop

## Dark Mode

All components support dark mode with:
- `dark:` Tailwind prefixes for colors
- Appropriate contrast for readability
- Consistent color theming

## Accessibility

- Semantic HTML elements
- ARIA labels where appropriate
- Keyboard navigation support (for interactive elements)
- Color contrast meeting WCAG standards
- Screen reader friendly

## TODO Items

### API Integration
All components have TODO comments marking API integration points:
- Fetch player data
- Fetch prediction history
- Fetch followers/following
- Real-time updates

### Chart Library
The PlayerProfile Stats tab has a placeholder for a win rate chart:
- **Recommended libraries**: recharts, chart.js, victory
- Should show win rate over time
- Include trend lines
- Interactive tooltips

### Testing
Components should be tested with:
- Unit tests (component rendering)
- Integration tests (user interactions)
- E2E tests (full profile flows)

### Performance
- Implement virtualization for long lists (react-window)
- Lazy load images
- Memoize expensive calculations

## Usage Examples

### Full Player Profile Page
```tsx
import { PlayerProfile } from '@/ui/components';

export const ProfilePage = () => {
  const { playerId } = useParams();
  const { data: player, isLoading } = usePlayerData(playerId);
  const { data: posts } = usePlayerPosts(playerId);
  const { data: bets } = usePlayerBets(playerId);
  const { data: stats } = usePlayerStats(playerId);
  const { data: followers } = useFollowers(playerId);
  const { data: following } = useFollowing(playerId);

  const currentUserId = useCurrentUserId();
  const isOwnProfile = playerId === currentUserId;

  return (
    <div className="container mx-auto px-4 py-8">
      <PlayerProfile
        player={player}
        posts={posts}
        bets={bets}
        stats={stats}
        followers={followers}
        following={following}
        isOwnProfile={isOwnProfile}
        currentUserId={currentUserId}
        onFollowToggle={handleFollow}
        onBetClick={viewBetDetails}
        onAgentClick={navigateToProfile}
        onAgentFollowToggle={toggleAgentFollow}
        isLoading={isLoading}
      />
    </div>
  );
};
```

### NPC Profile Modal
```tsx
import { NPCProfile } from '@/ui/components';

export const NPCModal = ({ npcId, onClose }) => {
  const { data: npc } = useNPCData(npcId);
  const isFollowing = useIsFollowing(npcId);

  return (
    <Modal onClose={onClose}>
      <NPCProfile
        npc={npc}
        isFollowing={isFollowing}
        onFollowToggle={() => toggleFollow(npcId)}
        onPostClick={viewPost}
      />
    </Modal>
  );
};
```

### Stats Dashboard
```tsx
import { StatsCard } from '@/ui/components';

export const StatsDashboard = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatsCard
        label="Total Players"
        value={stats.totalPlayers}
        valueType="number"
        icon="👥"
        trend="up"
        trendValue={stats.playerGrowth}
        color="blue"
      />
      <StatsCard
        label="Active Games"
        value={stats.activeGames}
        valueType="number"
        icon="🎮"
        color="green"
      />
      <StatsCard
        label="Total Volume"
        value={stats.totalVolume}
        valueType="currency"
        icon="💰"
        trend="up"
        trendValue={stats.volumeGrowth}
        color="purple"
      />
    </div>
  );
};
```

## File Structure

```
/Users/shawwalters/jeju/apps/caliguland/caliguland-game/src/ui/components/
├── ProfileHeader.tsx (12KB)
├── PlayerProfile.tsx (15KB)
├── NPCProfile.tsx (16KB)
├── StatsCard.tsx (5.8KB)
├── PredictionHistory.tsx (14KB)
├── FollowList.tsx (12KB)
├── index.ts (exports)
└── PROFILE_COMPONENTS.md (this file)
```

## Exports

All components and types are exported from the main index file:

```typescript
import {
  // Components
  ProfileHeader,
  PlayerProfile,
  NPCProfile,
  StatsCard,
  PredictionHistory,
  FollowList,

  // Types
  ProfileHeaderProps,
  ProfileHeaderAgent,
  PlayerProfileProps,
  PlayerStats,
  NPCProfileProps,
  NPCProfileData,
  StatsCardProps,
  PredictionHistoryProps,
  PredictionHistoryEntry,
  FollowListProps,
  FollowListAgent,
} from '@/ui/components';
```

## Contributing

When modifying these components:
1. Maintain TypeScript type safety
2. Keep JSDoc comments updated
3. Preserve accessibility features
4. Test in both light and dark modes
5. Ensure responsive behavior
6. Update this documentation

## License

Part of the Caliguland prediction game project.
