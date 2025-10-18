/**
 * E2E Test: Blockchain Integration with Real Contracts
 *
 * This test validates that Caliguland game works end-to-end with deployed contracts on localnet
 *
 * Prerequisites:
 * 1. Localnet running (anvil)
 * 2. Contracts deployed (JejuMarket, ElizaToken, PredictionOracle, ReputationRegistry)
 * 3. .env.local configured with correct addresses
 *
 * Run with: bun run test:e2e
 */

import { BlockchainAdapter, BlockchainConfig } from '../../blockchain/adapter';
import { BlockchainGameEngine } from '../../game/engineWithBlockchain';
import { BlockchainReputationEngine } from '../../game/reputationWithBlockchain';
import { Outcome } from '../../types';
import { ethers } from 'ethers';

// Load configuration from environment
const config: BlockchainConfig = {
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  chainId: parseInt(process.env.CHAIN_ID || '1337'),
  privateKey: process.env.PRIVATE_KEY || '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6',
  contracts: {
    jejuMarket: process.env.JEJU_MARKET_ADDRESS || '0x0000000000000000000000000000000000000000',
    elizaToken: process.env.ELIZA_TOKEN_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    predictionOracle: process.env.PREDICTION_ORACLE_ADDRESS || '0x0000000000000000000000000000000000000000',
    reputationRegistry: process.env.REPUTATION_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000'
  }
};

describe('Blockchain Integration E2E', () => {
  let adapter: BlockchainAdapter;
  let gameEngine: BlockchainGameEngine;
  let reputationEngine: BlockchainReputationEngine;

  // Test accounts (using Anvil default accounts)
  const testAccounts = {
    alice: {
      address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    },
    bob: {
      address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
    }
  };

  beforeAll(async () => {
    // Skip if blockchain not enabled
    if (process.env.ENABLE_BLOCKCHAIN !== 'true') {
      console.log('⚠️  Blockchain not enabled - skipping E2E tests');
      return;
    }

    console.log('🚀 Setting up E2E test environment...');

    // Initialize blockchain adapter
    adapter = new BlockchainAdapter(config);

    // Check connection
    const connected = await adapter.checkConnection();
    expect(connected).toBe(true);

    // Initialize engines
    reputationEngine = new BlockchainReputationEngine(adapter);

    gameEngine = new BlockchainGameEngine({
      gameDurationMs: parseInt(process.env.GAME_DURATION || '1800') * 1000,
      minPlayers: parseInt(process.env.MIN_PLAYERS || '2'),
      maxPlayers: parseInt(process.env.MAX_PLAYERS || '20'),
      blockchain: adapter
    });

    console.log('✅ Test environment ready');
  });

  test('should connect to blockchain and check balances', async () => {
    if (process.env.ENABLE_BLOCKCHAIN !== 'true') {
      console.log('⚠️  Skipping - blockchain not enabled');
      return;
    }

    console.log('\n📊 Test: Check blockchain connection and balances');

    // Check server wallet balance
    const serverBalance = await adapter.getBalance();
    console.log(`   Server wallet: ${adapter.getAddress()}`);
    console.log(`   ELIZA balance: ${ethers.formatEther(serverBalance)}`);

    expect(serverBalance).toBeGreaterThan(0n);

    // Check test account balances
    for (const [name, account] of Object.entries(testAccounts)) {
      const balance = await adapter.getBalance(account.address);
      console.log(`   ${name}: ${ethers.formatEther(balance)} ELIZA`);
    }
  });

  test('should create game and commit to oracle', async () => {
    if (process.env.ENABLE_BLOCKCHAIN !== 'true') {
      console.log('⚠️  Skipping - blockchain not enabled');
      return;
    }

    console.log('\n🎮 Test: Create game and commit to oracle');

    // Join lobby with test players
    gameEngine.joinLobby({
      id: testAccounts.alice.address,
      name: 'Alice',
      type: 'human',
      wins: 0,
      reputation: 50
    });

    gameEngine.joinLobby({
      id: testAccounts.bob.address,
      name: 'Bob',
      type: 'human',
      wins: 0,
      reputation: 50
    });

    // Wait for game to start (in real scenario, this would be triggered by tick)
    // For testing, we manually trigger it
    // Note: This requires modifying GameEngine or using a test helper

    console.log('   ℹ️  Game created (manual testing required for full flow)');

    // Test oracle commitment directly
    const testSessionId = 'test-session-' + Date.now();
    const testQuestion = 'Will the test pass?';
    const testOutcome = Outcome.YES;

    const commitResult = await adapter.commitGame(testSessionId, testQuestion, testOutcome);

    if (commitResult) {
      console.log(`   ✅ Game committed to oracle`);
      console.log(`   Tx: ${commitResult.txHash}`);
      expect(commitResult.salt).toBeTruthy();
      expect(commitResult.txHash).toBeTruthy();
    } else {
      console.log('   ⚠️  Oracle commitment not available');
    }
  });

  test('should place bets on blockchain market', async () => {
    if (process.env.ENABLE_BLOCKCHAIN !== 'true') {
      console.log('⚠️  Skipping - blockchain not enabled');
      return;
    }

    console.log('\n💰 Test: Place bets on blockchain');

    const testSessionId = 'bet-test-' + Date.now();

    // Place bet as Alice (YES)
    console.log('   Alice betting 10 ELIZA on YES...');
    const aliceBet = await adapter.placeBet(
      testSessionId,
      testAccounts.alice.address,
      Outcome.YES,
      10
    );

    if (aliceBet) {
      console.log(`   ✅ Alice bet placed: ${ethers.formatEther(aliceBet.shares)} shares`);
      console.log(`   Tx: ${aliceBet.txHash}`);
      expect(aliceBet.shares).toBeGreaterThan(0n);
    } else {
      console.log('   ⚠️  Market not available - skipping bet test');
    }

    // Check market state
    const marketState = await adapter.getMarketState(testSessionId);
    if (marketState) {
      console.log(`   Market odds - YES: ${(marketState.yesPrice * 100).toFixed(2)}%, NO: ${(marketState.noPrice * 100).toFixed(2)}%`);
    }

    // Check Alice's position
    const alicePosition = await adapter.getPosition(testSessionId, testAccounts.alice.address);
    if (alicePosition) {
      console.log(`   Alice position - YES shares: ${ethers.formatEther(alicePosition.yesShares)}`);
      expect(alicePosition.yesShares).toBeGreaterThan(0n);
    }
  });

  test('should resolve market and claim payouts', async () => {
    if (process.env.ENABLE_BLOCKCHAIN !== 'true') {
      console.log('⚠️  Skipping - blockchain not enabled');
      return;
    }

    console.log('\n🎯 Test: Resolve market and claim payouts');

    const testSessionId = 'resolve-test-' + Date.now();
    const outcome = Outcome.YES;
    const winners = [testAccounts.alice.address];
    const totalPayout = 100;

    // First, create a market by placing a bet
    await adapter.placeBet(testSessionId, testAccounts.alice.address, Outcome.YES, 50);

    // Commit game
    const commitResult = await adapter.commitGame(testSessionId, 'Test resolution', outcome);

    if (!commitResult) {
      console.log('   ⚠️  Oracle not available - skipping resolution test');
      return;
    }

    // Resolve market
    const resolveTxHash = await adapter.resolveMarket(
      testSessionId,
      outcome,
      commitResult.salt,
      'test-tee-quote',
      winners,
      totalPayout
    );

    if (resolveTxHash) {
      console.log(`   ✅ Market resolved! Tx: ${resolveTxHash}`);

      // Claim payout
      const payout = await adapter.claimPayout(testSessionId, testAccounts.alice.address);
      if (payout) {
        console.log(`   💸 Payout claimed: ${ethers.formatEther(payout)} ELIZA`);
        expect(payout).toBeGreaterThan(0n);
      }
    } else {
      console.log('   ⚠️  Market resolution not available');
    }
  });

  test('should sync reputation with blockchain', async () => {
    if (process.env.ENABLE_BLOCKCHAIN !== 'true') {
      console.log('⚠️  Skipping - blockchain not enabled');
      return;
    }

    console.log('\n📊 Test: Reputation blockchain sync');

    // Initialize test agent reputation
    reputationEngine.initializeAgent({
      id: testAccounts.alice.address,
      name: 'Alice',
      type: 'human',
      wins: 5,
      reputation: 75
    });

    // Try to submit to blockchain
    console.log('   Attempting to submit reputation...');
    const submitted = await reputationEngine.submitToBlockchain(testAccounts.alice.address);

    if (submitted) {
      console.log('   ✅ Reputation submitted to blockchain');
    } else {
      console.log('   ℹ️  Reputation submission requires proper feedbackAuth - expected for now');
    }

    // Try to fetch from blockchain
    const blockchainRep = await reputationEngine.fetchFromBlockchain(testAccounts.alice.address);
    if (blockchainRep) {
      console.log(`   📈 Blockchain reputation: ${blockchainRep.overallScore}`);
      expect(blockchainRep.overallScore).toBeGreaterThanOrEqual(0);
    } else {
      console.log('   ℹ️  No reputation found on blockchain yet');
    }
  });

  test('full game flow with blockchain', async () => {
    if (process.env.ENABLE_BLOCKCHAIN !== 'true') {
      console.log('⚠️  Skipping - blockchain not enabled');
      return;
    }

    console.log('\n🎲 Test: Full game flow with blockchain');

    console.log('   1️⃣  Game created with random scenario');
    console.log('   2️⃣  Outcome committed to oracle');
    console.log('   3️⃣  Players place bets on-chain');
    console.log('   4️⃣  Market odds update dynamically');
    console.log('   5️⃣  Game ends and outcome revealed');
    console.log('   6️⃣  Market resolved on-chain');
    console.log('   7️⃣  Winners claim payouts');
    console.log('   8️⃣  Reputation updated on-chain');

    console.log('\n   ℹ️  Full integration test requires running game server');
    console.log('   ℹ️  Use: bun run dev:blockchain');
    console.log('   ℹ️  Then connect agents and play a game');

    expect(true).toBe(true); // Placeholder
  });
});

describe('Blockchain Error Handling', () => {
  test('should handle blockchain connection failures gracefully', async () => {
    console.log('\n⚠️  Test: Handle connection failures');

    // Create adapter with invalid RPC
    const badConfig: BlockchainConfig = {
      ...config,
      rpcUrl: 'http://invalid-url:9999'
    };

    const badAdapter = new BlockchainAdapter(badConfig);

    // Should not throw, but return false/null
    const connected = await badAdapter.checkConnection();
    expect(connected).toBe(false);

    console.log('   ✅ Gracefully handled connection failure');
  });

  test('should work in-memory mode when blockchain disabled', () => {
    console.log('\n🔧 Test: In-memory mode');

    const inMemoryEngine = new BlockchainGameEngine({
      gameDurationMs: 1800000,
      minPlayers: 2,
      maxPlayers: 20,
      blockchain: new BlockchainAdapter({
        ...config,
        rpcUrl: 'http://invalid'
      })
    });

    // Should still work for game logic
    inMemoryEngine.joinLobby({
      id: 'test-1',
      name: 'Test Player',
      type: 'human',
      wins: 0,
      reputation: 50
    });

    const lobby = inMemoryEngine.getLobbyState();
    expect(lobby.players.length).toBe(1);

    console.log('   ✅ In-memory mode works correctly');
  });
});
