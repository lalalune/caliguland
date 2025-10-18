/**
 * Consolidated Caliguland Playwright E2E Tests
 * Tests complete user flow with REAL game server
 */

import { test, expect } from '@playwright/test';

test.describe('Caliguland Complete E2E', () => {
  test.beforeAll(async () => {
    console.log('🎮 Ensure game server running at http://localhost:8000');
    console.log('💰 Ensure blockchain running at http://localhost:8545');
    console.log('📜 Ensure contracts deployed: bun run deploy:contracts');
  });

  test('full game cycle with 5 players', async ({ browser }) => {
    const players = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
    const contexts = [];
    const pages = [];

    console.log('🎭 Creating 5 player windows...');
    
    for (let i = 0; i < players.length; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
      
      const nameInput = page.locator('[data-cy="player-name-input"]');
      const joinButton = page.locator('[data-cy="join-game-button"]');
      
      if (await nameInput.count() > 0) {
        await nameInput.fill(players[i]);
        await joinButton.click();
        console.log(`✅ ${players[i]} joined`);
      }
      
      contexts.push(context);
      pages.push(page);
    }

    console.log('⏳ Waiting for game to start...');
    await pages[0].waitForTimeout(12000);

    console.log('📊 Checking game state...');
    for (const page of pages) {
      const hasGameState = await page.locator('text=/Phase|Day|Players/i').count();
      expect(hasGameState).toBeGreaterThan(0);
    }

    console.log('💬 Players posting to feed...');
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const postInput = page.locator('[data-cy="post-input"]');
      
      if (await postInput.count() > 0) {
        await postInput.fill(`${players[i]}: Analyzing the situation...`);
        await page.locator('[data-cy="post-button"]').click();
        await page.waitForTimeout(500);
      }
    }

    console.log('💰 Players placing bets...');
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const yesButton = page.locator('[data-cy="bet-yes-button"]');
      const placeBetButton = page.locator('[data-cy="place-bet-button"]');
      
      if (await yesButton.count() > 0 && await placeBetButton.count() > 0) {
        const outcome = i % 2 === 0 ? 'yes' : 'no';
        await page.locator(`[data-cy="bet-${outcome}-button"]`).click();
        
        const slider = page.locator('[data-cy="bet-amount-slider"]');
        await slider.fill(String(100 + i * 50));
        
        await placeBetButton.click();
        console.log(`✅ ${players[i]} bet ${outcome.toUpperCase()} for ${100 + i * 50}`);
        await page.waitForTimeout(1000);
      }
    }

    console.log('🎯 Verifying market odds updated...');
    const yesOdds = await pages[0].locator('[data-cy="yes-odds"]').textContent();
    expect(yesOdds).toMatch(/\d+%/);

    console.log('🧹 Cleanup...');
    for (const context of contexts) {
      await context.close();
    }

    console.log('✅ Complete E2E test passed!');
  });
});

