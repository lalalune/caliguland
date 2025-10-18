#!/usr/bin/env bun
/**
 * Smart RPC Startup Script
 * 
 * Automatically detects available blockchain (Jeju or Anvil) and starts game server
 * Prefers Jeju if available, falls back to Anvil
 */

import { RpcDetector } from '../shared/rpcDetector';

async function main() {
  console.log('🚀 Starting Caliguland Game Server with Smart RPC Detection');
  console.log('');
  
  try {
    // Detect available blockchain
    const chainInfo = await RpcDetector.getChainInfo();
    
    // Set environment variables
    process.env.RPC_URL = chainInfo.rpcUrl;
    process.env.CHAIN_ID = chainInfo.chainId.toString();
    
    if (chainInfo.isJeju) {
      console.log('🎯 Using Jeju L2 for integration testing');
      console.log(`   This tests the REAL L2 deployment`);
    } else {
      console.log('⚡ Using Anvil for local development');
      console.log(`   💡 Start Jeju with 'bun run dev' for full L2 testing`);
    }
    
    console.log('');
    console.log('Chain Info:');
    console.log(`  RPC:      ${chainInfo.rpcUrl}`);
    console.log(`  Chain ID: ${chainInfo.chainId}`);
    console.log(`  Block:    ${chainInfo.blockNumber}`);
    console.log('');
    
    // Start game server
    console.log('🎮 Starting game server...');
    console.log('');
    
    // Import and start game server
    await import('../caliguland-game/src/index.ts');
    
  } catch (error) {
    console.error('');
    console.error('❌ Failed to start game server:');
    console.error(error.message);
    console.error('');
    console.error('Solutions:');
    console.error('  1. Start Jeju: bun run dev (recommended for testing)');
    console.error('  2. Start Anvil: anvil (quick local development)');
    console.error('');
    process.exit(1);
  }
}

main();

