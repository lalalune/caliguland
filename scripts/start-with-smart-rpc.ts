#!/usr/bin/env bun
/**
 * Smart RPC Startup Script
 * 
 * Automatically detects available blockchain (Jeju or Anvil) and starts game server
 * Prefers Jeju if available, starts without blockchain if none available
 */

import { RpcDetector } from '../shared/rpcDetector';

async function waitForBlockchain(maxRetries = 60, delayMs = 2000): Promise<void> {
  console.log('⏳ Waiting for Jeju blockchain to be ready...');
  console.log('   This may take 2-10 minutes if just started');
  console.log('');
  
  for (let i = 0; i < maxRetries; i++) {
    const available = await RpcDetector.isJejuAvailable();
    if (available) {
      console.log('✅ Blockchain is ready!');
      console.log('');
      return;
    }
    
    if (i % 5 === 0 && i > 0) {
      console.log(`   Still waiting... (${i * delayMs / 1000}s elapsed)`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  throw new Error('Timeout waiting for blockchain');
}

async function main() {
  console.log('🚀 Starting Caliguland Game Server with Smart RPC Detection');
  console.log('');
  
  try {
    // Wait for blockchain to be ready
    await waitForBlockchain();
    
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
    
  } catch (error) {
    console.error('');
    console.error('❌ Failed to connect to blockchain:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    console.error('');
    console.error('Solutions:');
    console.error('  1. Ensure Jeju is running: bun run dev (from root)');
    console.error('  2. Wait 2-10 minutes for Kurtosis to finish starting');
    console.error('  3. Or start Anvil: anvil (quick fallback)');
    console.error('');
    process.exit(1);
  }
  
  // Start game server with blockchain
  console.log('🎮 Starting game server...');
  console.log('');
  
  // Import and start game server
  await import('../caliguland-game/src/index.ts');
}

main();

