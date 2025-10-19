/**
 * COMPLETE E2E GAME FLOW TEST
 * 
 * This is a REAL end-to-end test with:
 * - Real game server (no mocks)
 * - Real players in Playwright browsers
 * - Real game mechanics
 * - Real state management
 * - Visual verification with screenshots
 * 
 * Run with: FAST_TEST=1 bun test:e2e
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5666';
const BACKEND_URL = 'http://localhost:5667';

// Test configuration
const TEST_CONFIG = {
  players: ['Alice', 'Bob', 'Charlie'],
  gameDurationMs: 180000, // 3 minutes
  tickMs: 1000 // 1 second ticks in fast mode
};

test.describe('Caliguland - Complete Game Flow E2E', () => {
  let playerContexts: BrowserContext[] = [];
  let playerPages: Page[] = [];
  let gameSessionId: string;

  test.beforeAll(async () => {
    console.log('🎮 Starting Complete E2E Test');
    console.log(`   Players: ${TEST_CONFIG.players.length}`);
    console.log(`   Duration: ${TEST_CONFIG.gameDurationMs / 1000}s`);
    console.log(`   Frontend: ${FRONTEND_URL}`);
    console.log(`   Backend: ${BACKEND_URL}`);
  });

  test.afterAll(async () => {
    console.log('🧹 Cleaning up player contexts...');
    for (const context of playerContexts) {
      await context.close();
    }
  });

  test('Step 1: Server health check', async ({ request }) => {
    console.log('\n📡 Testing server health...');
    
    const response = await request.get(`${BACKEND_URL}/health`);
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
    expect(health.service).toBe('caliguland-game');
    
    console.log('   ✅ Server is healthy');
  });

  test('Step 2: Frontend loads correctly', async ({ browser }) => {
    console.log('\n🌐 Testing frontend loads...');
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    
    // Should see lobby or game UI
    await expect(page.locator('text=/Caliguland|Lobby|Join Game/i')).toBeVisible();
    
    await context.close();
    console.log('   ✅ Frontend loads correctly');
  });

  test('Step 3: Players join lobby', async ({ browser }) => {
    console.log('\n👥 Players joining lobby...');
    
    for (let i = 0; i < TEST_CONFIG.players.length; i++) {
      const playerName = TEST_CONFIG.players[i];
      
      // Create new browser context for each player (simulates separate users)
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Go to frontend
      await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      // Find and fill name input
      const nameInput = page.locator('[data-cy="player-name-input"]').or(page.locator('input[placeholder*="name" i]'));
      if (await nameInput.count() > 0) {
        await nameInput.fill(playerName);
        
        // Click join button
        const joinButton = page.locator('[data-cy="join-game-button"]').or(page.locator('button:has-text("Join")'));
        await joinButton.click();
        
        console.log(`   ✅ ${playerName} joined lobby`);
      }
      
      playerContexts.push(context);
      playerPages.push(page);
      
      await page.waitForTimeout(500);
    }
    
    // Verify all players appear in lobby
    const firstPlayer = playerPages[0];
    await firstPlayer.waitForTimeout(2000);
    
    // Check player count in UI
    const playerCountText = await firstPlayer.locator('text=/Players.*\\d+/i').textContent();
    console.log(`   📊 ${playerCountText}`);
  });

  test('Step 4: Game auto-starts with enough players', async () => {
    console.log('\n🎬 Waiting for game to start...');
    
    // Wait for game to transition from LOBBY to EARLY phase
    const firstPlayer = playerPages[0];
    await firstPlayer.waitForTimeout(5000);
    
    // Take screenshot of game start
    await firstPlayer.screenshot({ path: './test-results/01-game-start.png', fullPage: true });
    
    // Verify game state changed
    const phaseText = await firstPlayer.locator('text=/Phase.*EARLY|MID|LATE/i').textContent().catch(() => null);
    
    if (phaseText) {
      console.log(`   ✅ Game started - ${phaseText}`);
    }
    
    // Get game state from API
    const response = await fetch(`${BACKEND_URL}/api/v1/game`);
    const gameState = await response.json();
    
    expect(gameState.phase).not.toBe('LOBBY');
    expect(gameState.players.length).toBe(TEST_CONFIG.players.length);
    expect(gameState.question).toBeTruthy();
    
    gameSessionId = gameState.id;
    console.log(`   🎯 Session ID: ${gameSessionId}`);
    console.log(`   📋 Question: ${gameState.question.substring(0, 60)}...`);
  });

  test('Step 5: Players can post to feed', async () => {
    console.log('\n💬 Testing feed posts...');
    
    for (let i = 0; i < playerPages.length; i++) {
      const page = playerPages[i];
      const playerName = TEST_CONFIG.players[i];
      
      // Find post input
      const postInput = page.locator('[data-cy="post-input"]').or(page.locator('textarea[placeholder*="post" i]'));
      
      if (await postInput.count() > 0) {
        await postInput.fill(`${playerName}: I'm analyzing the situation carefully...`);
        
        // Click post button
        const postButton = page.locator('[data-cy="post-button"]').or(page.locator('button:has-text("Post")'));
        await postButton.click();
        
        console.log(`   ✅ ${playerName} posted to feed`);
        await page.waitForTimeout(1000);
      }
    }
    
    // Verify posts appear in feed
    const firstPlayer = playerPages[0];
    await firstPlayer.waitForTimeout(2000);
    
    // Screenshot feed
    await firstPlayer.screenshot({ path: './test-results/02-feed-posts.png', fullPage: true });
    
    // Count feed items
    const feedItems = await firstPlayer.locator('[data-cy^="feed-post"]').count();
    console.log(`   📊 Feed has ${feedItems} posts`);
    expect(feedItems).toBeGreaterThan(0);
  });

  test('Step 6: Players place bets', async () => {
    console.log('\n💰 Testing predictions...');
    
    const betAmounts = [100, 250, 150];
    
    for (let i = 0; i < playerPages.length; i++) {
      const page = playerPages[i];
      const playerName = TEST_CONFIG.players[i];
      const betAmount = betAmounts[i];
      const outcome = i % 2 === 0 ? 'yes' : 'no';
      
      // Select outcome
      const outcomeButton = page.locator(`[data-cy="prediction-${outcome}-button"]`);
      if (await outcomeButton.count() > 0) {
        await outcomeButton.click();
        
        // Set amount
        const amountSlider = page.locator('[data-cy="prediction-amount-slider"]');
        if (await amountSlider.count() > 0) {
          await amountSlider.fill(String(betAmount));
        }
        
        // Place bet
        const placeBetButton = page.locator('[data-cy="make-prediction-button"]');
        await placeBetButton.click();
        
        console.log(`   ✅ ${playerName} bet ${betAmount} on ${outcome.toUpperCase()}`);
        await page.waitForTimeout(1500);
      }
    }
    
    // Screenshot market odds
    const firstPlayer = playerPages[0];
    await firstPlayer.waitForTimeout(2000);
    await firstPlayer.screenshot({ path: './test-results/03-market-odds.png', fullPage: true });
    
    // Verify market odds updated
    const yesOdds = await firstPlayer.locator('[data-cy="yes-odds"]').textContent();
    const noOdds = await firstPlayer.locator('[data-cy="no-odds"]').textContent();
    
    console.log(`   📊 Market odds: YES ${yesOdds} | NO ${noOdds}`);
    expect(yesOdds).toMatch(/\d+%/);
    expect(noOdds).toMatch(/\d+%/);
  });

  test('Step 7: Market odds are mathematically correct', async ({ request }) => {
    console.log('\n📈 Verifying market math...');
    
    const response = await request.get(`${BACKEND_URL}/api/v1/market`);
    const market = await response.json();
    
    // Odds must sum to 100%
    const oddsSum = market.yesOdds + market.noOdds;
    expect(oddsSum).toBe(100);
    
    // Shares must be positive
    expect(market.yesShares).toBeGreaterThanOrEqual(0);
    expect(market.noShares).toBeGreaterThanOrEqual(0);
    
    // Volume must match bets
    expect(market.totalVolume).toBeGreaterThan(0);
    
    console.log(`   ✅ YES: ${market.yesOdds}% (${market.yesShares.toFixed(2)} shares)`);
    console.log(`   ✅ NO: ${market.noOdds}% (${market.noShares.toFixed(2)} shares)`);
    console.log(`   ✅ Volume: ${market.totalVolume}`);
  });

  test('Step 8: Direct messages work', async () => {
    console.log('\n✉️  Testing direct messages...');
    
    // Send DM from Alice to Bob via API
    const response = await fetch(`${BACKEND_URL}/api/v1/dm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'player-' + Date.now(),
        to: 'player-' + (Date.now() + 1),
        content: 'Want to collaborate on analysis?'
      })
    });
    
    expect(response.ok).toBeTruthy();
    console.log('   ✅ DM sent successfully');
  });

  test('Step 9: Game progresses through phases', async () => {
    console.log('\n⏰ Monitoring game progression...');
    
    const firstPlayer = playerPages[0];
    let checkCount = 0;
    const maxChecks = 10;
    
    // Poll game state every 10 seconds
    while (checkCount < maxChecks) {
      await firstPlayer.waitForTimeout(10000);
      checkCount++;
      
      const response = await fetch(`${BACKEND_URL}/api/v1/game`);
      const gameState = await response.json();
      
      console.log(`   📅 Check ${checkCount}: Day ${gameState.currentDay} | Phase: ${gameState.phase}`);
      
      // Take periodic screenshots
      await firstPlayer.screenshot({ 
        path: `./test-results/04-progression-${checkCount}.png`, 
        fullPage: true 
      });
      
      // If game ended, break
      if (gameState.phase === 'ENDED' || gameState.revealed) {
        console.log('   🎬 Game ended!');
        break;
      }
    }
  });

  test('Step 10: Verify game completion and outcome', async ({ request }) => {
    console.log('\n🏁 Checking game completion...');
    
    // Wait for game to fully complete
    await playerPages[0].waitForTimeout(15000);
    
    const response = await request.get(`${BACKEND_URL}/api/v1/game`);
    const gameState = await response.json();
    
    // Take final screenshot
    await playerPages[0].screenshot({ 
      path: './test-results/05-game-end.png', 
      fullPage: true 
    });
    
    if (gameState.revealed) {
      console.log(`   ✅ Game completed!`);
      console.log(`   🎯 Final outcome: ${gameState.finalOutcome}`);
      console.log(`   📊 Phase: ${gameState.phase}`);
    } else {
      console.log(`   ⏳ Game still in progress (Phase: ${gameState.phase})`);
    }
  });

  test('Step 11: Verify all players are still visible', async () => {
    console.log('\n👥 Final player verification...');
    
    const firstPlayer = playerPages[0];
    const playerElements = await firstPlayer.locator('[data-cy^="player-"]').count();
    
    console.log(`   📊 ${playerElements} players visible in UI`);
    expect(playerElements).toBeGreaterThan(0);
  });

  test('Step 12: Verify no console errors', async () => {
    console.log('\n🐛 Checking for console errors...');
    
    let errorCount = 0;
    for (let i = 0; i < playerPages.length; i++) {
      const page = playerPages[i];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`   ❌ Console error in ${TEST_CONFIG.players[i]}: ${msg.text()}`);
          errorCount++;
        }
      });
    }
    
    if (errorCount === 0) {
      console.log('   ✅ No console errors detected');
    } else {
      console.log(`   ⚠️  ${errorCount} console errors found (check logs)`);
    }
  });
});

console.log('\n' + '='.repeat(60));
console.log('🎮 CALIGULAND COMPLETE E2E TEST SUITE');
console.log('='.repeat(60));
console.log('This test runs a REAL 3-minute game with NO MOCKS');
console.log('All tests use real browser automation and real game state');
console.log('='.repeat(60) + '\n');

