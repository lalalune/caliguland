# InformationEngine Documentation

## Overview

The **InformationEngine** is a core component of the Caliguland prediction game that manages multi-stage clue distribution and information asymmetry across game participants. It creates a dynamic information landscape where different agents receive different clues at different times, simulating real-world scenarios of insider trading, information markets, and social intelligence gathering.

## Architecture

### Core Components

```
InformationEngine
├── ClueNetwork: Graph of all clues with dependencies
├── DistributionPlans: Per-agent clue allocation
└── Query Interface: Access methods for agents
```

### Data Structures

#### Clue
```typescript
interface Clue {
  id: string;                    // Unique identifier
  content: string;               // The actual clue text
  npcId: string;                 // Which NPC provides this clue
  isTruthful: boolean;           // True if clue points to actual outcome
  revealDay: number;             // Which game day this unlocks (1-30)
  tier: 'early' | 'mid' | 'late'; // Information tier
  prerequisiteClues?: string[];  // Dependencies (must receive these first)
  value: number;                 // Information value (-10 to +10)
}
```

#### ClueNetwork
```typescript
interface ClueNetwork {
  clues: Clue[];                              // All clues in the game
  relationships: Map<string, string[]>;       // Dependency graph
}
```

#### InformationDistributionPlan
```typescript
interface InformationDistributionPlan {
  agentId: string;
  clues: Clue[];              // Clues assigned to this agent
  expectedValue: number;      // Total information advantage
}
```

## Key Algorithms

### 1. Clue Network Generation

The system generates 10-15 clues per game distributed across three tiers:

**Distribution:**
- **Early Tier (Days 1-10)**: 40% of clues
- **Mid Tier (Days 11-20)**: 35% of clues
- **Late Tier (Days 21-29)**: 25% of clues

**Truthfulness Rates:**
- Early: 70% truthful
- Mid: 60% truthful
- Late: 80% truthful

**Algorithm:**
```typescript
generateClueNetwork(scenario, numPlayers) {
  1. Generate early clues (3-5 clues)
  2. Generate mid clues (4-7 clues) with optional dependencies on early clues
  3. Generate late clues (2-4 clues) with dependencies on mid clues
  4. Build dependency graph
  5. Return ClueNetwork
}
```

### 2. Distribution Plan Creation

Creates information asymmetry by assigning different clues to different agents:

**Strategy:**
- Designate top 30% as "insiders" (configurable)
- Insiders get 3-5 high-value truthful clues across all tiers
- Outsiders get 1-2 mixed clues (truthful + false)
- No two agents get identical clue sets

**Algorithm:**
```typescript
createDistributionPlans(network, agentIds, insiderPercentage) {
  1. Shuffle agents randomly
  2. Split into insiders and outsiders based on percentage
  3. For each insider:
     - Select 3-5 truthful clues
     - Ensure coverage across all tiers
  4. For each outsider:
     - Select 1-2 random clues (mix of truthful and false)
  5. Return distribution plans for all agents
}
```

### 3. Daily Clue Release

Clues are released progressively as the game advances:

**Rules:**
- Clues unlock on their designated `revealDay`
- Prerequisites must be satisfied (agent must have received prerequisite clues)
- Delivery happens via DM from the NPC
- Delivery is logged in game history

**Algorithm:**
```typescript
getCluesForDay(agentId, day) {
  1. Get agent's distribution plan
  2. Filter clues for this specific day
  3. Check prerequisites:
     - Ensure all prerequisite clues were delivered on previous days
  4. Return eligible clues
}
```

### 4. Dependency Resolution

Clues can depend on other clues, creating an information chain:

**Example Chain:**
```
Day 5: "I work at the facility. They're rushing this project..."
  ↓
Day 15: "Remember what I said? The tests are failing."
  ↓
Day 25: "Final word: it's not going to work."
```

**Algorithm:**
```typescript
getClueChain(clueId) {
  1. Start with target clue
  2. Recursively trace back through prerequisites
  3. Build ordered chain from earliest to latest
  4. Return complete chain
}
```

## Integration Points

### 1. GameEngine Integration

The InformationEngine is initialized within the GameEngine:

```typescript
// In GameEngine.startNewGame()
const clueNetwork = this.informationEngine.generateClueNetwork(scenario, agents.length);
this.informationEngine.createDistributionPlans(
  clueNetwork,
  agents.map(a => a.id),
  0.3 // 30% insiders
);
```

### 2. Daily Distribution

Integrated with the game day cycle:

```typescript
// In GameEngine.onDayChange(day)
this.distributeCluesForDay(day);

private distributeCluesForDay(day: number) {
  for (const agent of this.currentGame.agents) {
    const clues = this.informationEngine.getCluesForDay(agent.id, day);

    for (const clue of clues) {
      // Send as DM from NPC
      this.sendDirectMessage({
        from: clue.npcId,
        to: agent.id,
        content: clue.content
      });
    }
  }
}
```

### 3. A2A Skills Integration

The InformationEngine is accessed through A2A skills:

#### query-npc Skill

Enhanced to return clues when agents query NPCs:

```typescript
// In GameEngine.queryNPC()
const cluesFromNPC = this.informationEngine.getCluesByNPC(
  agentId,
  npcId,
  this.currentGame.currentDay
);

if (cluesFromNPC.length > 0 && isAskingAboutEvent) {
  return latestClue.content;
}
```

#### get-information-advantage Skill

Returns agent's information advantage metrics:

```typescript
{
  "expectedValue": 15.5,      // Total value of agent's clues
  "cluesReceived": 3,         // Clues received so far
  "cluesRemaining": 2,        // Clues still to come
  "percentile": 85            // Agent is in top 15%
}
```

#### get-clue-history Skill

Returns complete history of clues received:

```typescript
{
  "history": [
    {
      "day": 1,
      "clues": [
        {
          "id": "early-0",
          "content": "I've seen the internal docs. We're on track.",
          "npcId": "insider-ian",
          "isTruthful": true,
          "tier": "early"
        }
      ]
    },
    {
      "day": 15,
      "clues": [...]
    }
  ]
}
```

## Query Interface

### Core Methods

#### `generateClueNetwork(scenario, numPlayers): ClueNetwork`
Generates the complete clue network for a game session.

#### `createDistributionPlans(network, agentIds, insiderPercentage): Map<string, InformationDistributionPlan>`
Creates agent-specific distribution plans with information asymmetry.

#### `getCluesForDay(agentId, day): Clue[]`
Returns clues available to an agent on a specific day.

#### `hasClue(agentId, clueId): boolean`
Checks if an agent has access to a specific clue.

#### `getAvailableClues(agentId, currentDay): Clue[]`
Returns all clues agent has received up to current day.

#### `getCluesByNPC(agentId, npcId, currentDay): Clue[]`
Returns all clues from a specific NPC that the agent has received.

#### `getClueHistory(agentId, currentDay): Array<{day, clues}>`
Returns chronological history of clue delivery.

#### `getInformationAdvantage(agentId, currentDay): {expectedValue, cluesReceived, cluesRemaining, percentile}`
Calculates agent's information advantage metrics.

#### `getClueChain(clueId): Clue[]`
Returns complete dependency chain for a clue.

#### `getAgentsWithClue(clueId): string[]`
Returns all agents who have access to a specific clue.

#### `deliverClue(agentId, clueId): Clue | null`
Manually delivers a specific clue to an agent (admin override).

#### `reset(): void`
Clears all state for next game session.

## Example Usage

### Basic Game Flow

```typescript
// 1. Initialize
const infoEngine = new InformationEngine();

// 2. Generate clue network for new game
const scenario = await scenarioGenerator.generate();
const network = infoEngine.generateClueNetwork(scenario, 10);

// 3. Create distribution plans (30% insiders)
const plans = infoEngine.createDistributionPlans(
  network,
  ['agent1', 'agent2', ... 'agent10'],
  0.3
);

// 4. Daily distribution (in game loop)
for (let day = 1; day <= 30; day++) {
  for (const agent of agents) {
    const clues = infoEngine.getCluesForDay(agent.id, day);

    for (const clue of clues) {
      sendDM(clue.npcId, agent.id, clue.content);
    }
  }
}

// 5. Query during gameplay
const advantage = infoEngine.getInformationAdvantage('agent1', 15);
console.log(`Agent has ${advantage.cluesReceived} clues, ${advantage.percentile}th percentile`);

// 6. NPC interaction
const npcClues = infoEngine.getCluesByNPC('agent1', 'insider-ian', 15);
if (npcClues.length > 0) {
  return npcClues[0].content;
}

// 7. Cleanup
infoEngine.reset();
```

### Example Clue Network

```json
{
  "clues": [
    {
      "id": "early-0",
      "content": "Between us, there are serious problems.",
      "npcId": "insider-ian",
      "isTruthful": true,
      "revealDay": 3,
      "tier": "early",
      "value": 3
    },
    {
      "id": "mid-1",
      "content": "Latest intel: it's falling apart.",
      "npcId": "insider-ian",
      "isTruthful": true,
      "revealDay": 15,
      "tier": "mid",
      "prerequisiteClues": ["early-0"],
      "value": 5
    },
    {
      "id": "early-1",
      "content": "Early indicators look positive.",
      "npcId": "channel7-news",
      "isTruthful": false,
      "revealDay": 5,
      "tier": "early",
      "value": -2
    },
    {
      "id": "late-0",
      "content": "Final verdict: total failure.",
      "npcId": "whistleblower-wendy",
      "isTruthful": true,
      "revealDay": 25,
      "tier": "late",
      "prerequisiteClues": ["mid-1"],
      "value": 8
    }
  ],
  "relationships": {
    "early-0": ["mid-1"],
    "mid-1": ["late-0"]
  }
}
```

## Testing

Comprehensive test suite covers:

### Clue Network Generation (8 tests)
- Valid network size (10-15 clues)
- Three-tier distribution
- Correct day ranges per tier
- Dependency relationships
- Distribution percentages
- NPC assignment
- Reliability scoring

### Distribution Plan Creation (5 tests)
- Plans for all agents
- Insider percentage respected
- Information asymmetry
- Multi-tier coverage for insiders
- Fewer clues for outsiders

### Daily Clue Release (4 tests)
- Correct day filtering
- Prerequisite enforcement
- Access control
- Invalid day handling

### Query Interface (4 tests)
- Distribution plan retrieval
- Clue network access
- Non-existent agent handling
- Pre-generation state

### Reset Functionality (1 test)
- Complete state clearing

### Edge Cases (5 tests)
- Single player
- Large player count (50+)
- Zero insider percentage
- 100% insider percentage

### Clue Quality (3 tests)
- Non-empty content
- Tier variation
- Truthfulness alignment

**Test Results:** 29/29 passing, 173 assertions

## Performance Considerations

### Time Complexity
- `generateClueNetwork`: O(n) where n is number of clues (~10-15)
- `createDistributionPlans`: O(m * n) where m is agents, n is clues
- `getCluesForDay`: O(k) where k is clues per agent (~3-5)
- `getAvailableClues`: O(d * k) where d is days, k is clues per agent
- `hasClue`: O(k) linear search through agent's clues

### Space Complexity
- ClueNetwork: O(n) for n clues + O(e) for e edges in dependency graph
- DistributionPlans: O(m * k) for m agents with k clues each
- Total: O(n + m*k) typically ~500 bytes per agent

### Optimization Opportunities
1. **Index clues by NPC**: Create Map<npcId, Clue[]> for faster NPC queries
2. **Cache available clues**: Memoize `getAvailableClues` by (agentId, day)
3. **Prerequisite lookup**: Use Map instead of array for O(1) checks
4. **Binary search**: Use for day-based queries if sorted by revealDay

## Security & Fairness

### Randomization
- Uses `Math.random()` for all random selections
- Agents shuffled before insider selection
- Clue assignments randomized
- No predictable patterns

### Information Isolation
- No agent can see another agent's distribution plan
- Clue content doesn't reveal truthfulness
- NPC credibility not exposed to agents
- Prerequisite chains maintain secrecy

### Anti-Gaming Measures
- Distribution plans created at game start (no runtime manipulation)
- Immutable after generation
- No backdoor access to full clue network
- Admin override (`deliverClue`) logged for auditing

## Future Enhancements

### Planned Features
1. **Dynamic Clue Generation**: Use LLM to generate contextual clues
2. **Reputation-Based Distribution**: Agents with higher rep get better clues
3. **Clue Trading**: Allow agents to exchange clues (with verification)
4. **Clue Verification**: Agents can spend resources to verify truthfulness
5. **Time-Decaying Value**: Clues lose value as outcome approaches
6. **Network Analysis Tools**: Visualize clue dependency graphs
7. **Historical Analytics**: Track which clues led to correct predictions

### Optimization Roadmap
1. Implement clue indexing for O(1) NPC lookups
2. Add caching layer for frequent queries
3. Optimize dependency resolution with topological sort
4. Add parallel processing for large agent counts

## Troubleshooting

### Common Issues

**Issue:** Agents not receiving clues
- Check distribution plans are created
- Verify agent ID matches exactly
- Ensure game day is progressing
- Check prerequisite clues were delivered

**Issue:** Clues appearing out of order
- Verify `revealDay` values are correct
- Check dependency chain is valid
- Ensure no circular dependencies

**Issue:** Information advantage seems wrong
- Confirm clue values are set correctly
- Check percentile calculation includes all agents
- Verify agent has received expected clues

### Debug Methods

```typescript
// Check if agent has a plan
const plan = infoEngine.getDistributionPlan(agentId);
console.log('Plan:', plan);

// View all clues in network
const network = infoEngine.getClueNetwork();
console.log('Total clues:', network.clues.length);

// Check dependency chain
const chain = infoEngine.getClueChain(clueId);
console.log('Chain length:', chain.length);

// View agent's complete history
const history = infoEngine.getClueHistory(agentId, currentDay);
console.log('Clues received:', history.reduce((sum, d) => sum + d.clues.length, 0));
```

## References

- **Game Design Doc**: `/apps/caliguland/CLAUDE.md`
- **Types**: `src/types.ts`
- **Scenarios**: `src/game/scenarios.ts`
- **Engine Integration**: `src/game/engine.ts`
- **A2A Server**: `src/a2a/server.ts`
- **Tests**: `src/game/__tests__/information.test.ts`

## License

Part of the Caliguland prediction game system.
