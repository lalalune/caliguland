/**
 * Game Configuration
 * Centralized configuration for the prediction game
 */

// Fast test mode: 3 minute game for E2E testing
const IS_FAST_TEST = process.env.FAST_TEST === '1';

export const config = {
  // Server
  port: parseInt(process.env.PORT || '5667'),
  
  // Game timing
  // Fast mode: 3 min game (180s), Normal mode: 60 min game (3600s)
  gameDurationMs: IS_FAST_TEST 
    ? parseInt(process.env.GAME_DURATION_MS || '180000')  // 3 min for testing
    : parseInt(process.env.GAME_DURATION_MS || '3600000'), // 60 min for real games
  tickIntervalMs: IS_FAST_TEST ? 1000 : 10000, // Fast: 1s tick, Normal: 10s tick
  debriefDurationMs: IS_FAST_TEST ? 10000 : 300000, // Fast: 10s, Normal: 5min
  
  // Player limits
  maxPlayers: parseInt(process.env.MAX_PLAYERS || '20'),
  minPlayers: parseInt(process.env.MIN_PLAYERS || (IS_FAST_TEST ? '3' : '5')), // Lower min for fast tests
  
  // Game mechanics
  insiderCluePercentage: 0.3, // 30% of players get clues
  insiderClueAccuracy: 0.7, // 70% are truthful
  
  // Predictions
  startingTokens: 1000,
  maxPredictAmount: 1000,
  minPredictAmount: 10,
  
  // Feed
  maxPostLength: 280,
  maxFeedHistory: 1000,
  
  // Direct messages
  maxDMLength: 1000,
  
  // TEE
  dstackSocketPath: process.env.DSTACK_SOCKET_PATH || '/var/run/dstack.sock',
  
  // Paths for key derivation
  paths: {
    oracleSigningKey: '/game/oracle/signing',
    outcomeCommitment: '/game/commitment',
    sessionEncryption: '/game/session/encryption'
  }
};

