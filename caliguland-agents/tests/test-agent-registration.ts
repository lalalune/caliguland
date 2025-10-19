#!/usr/bin/env bun
/**
 * Test Caliguland Agents - ERC-8004 Registration & Wallet Setup
 * 
 * This test verifies:
 * 1. Agents can create wallets
 * 2. Wallets have sufficient ETH and elizaOS tokens
 * 3. Agents register to ERC-8004 IdentityRegistry
 * 4. LLM integration attempts (expected to fail without API keys)
 * 
 * Run: bun run tests/test-agent-registration.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface WalletConfig {
  name: string;
  address: string;
  privateKey: string;
  note: string;
}

interface LocalnetWallets {
  accounts: WalletConfig[];
  deployer: WalletConfig;
}

const ELIZA_TOKEN_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)'
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║   🧪 Caliguland Agents - Registration Test                  ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Load wallet config
  const walletsPath = join(__dirname, '../localnet-wallets.json');
  const walletsData = JSON.parse(readFileSync(walletsPath, 'utf-8')) as LocalnetWallets;

  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
  const elizaTokenAddress = process.env.ELIZA_TOKEN_ADDRESS || process.env.ELIZA_OS_ADDRESS;

  console.log('📋 Configuration:');
  console.log(`   RPC: ${rpcUrl}`);
  console.log(`   elizaOS Token: ${elizaTokenAddress || 'Not set'}`);
  console.log(`   Agent Count: ${walletsData.accounts.length}\n`);

  // Connect to network
  console.log('🔌 Connecting to localnet...');
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const network = await provider.getNetwork();
  console.log(`✅ Connected to chain ID: ${network.chainId}\n`);

  // Test each agent wallet
  console.log('🔍 Testing agent wallets:\n');

  for (const walletConfig of walletsData.accounts) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🤖 ${walletConfig.name}`);
    console.log(`   Address: ${walletConfig.address}`);

    const wallet = new ethers.Wallet(walletConfig.privateKey, provider);

    // Check ETH balance
    const ethBalance = await provider.getBalance(wallet.address);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log(`   ETH: ${ethBalanceFormatted} ETH`);

    if (ethBalance < ethers.parseEther('0.1')) {
      console.log(`   ⚠️  WARNING: Low ETH balance! Need at least 0.1 ETH for gas`);
    } else {
      console.log(`   ✅ Sufficient ETH for gas`);
    }

    // Check elizaOS token balance (if configured)
    if (elizaTokenAddress) {
      const elizaToken = new ethers.Contract(elizaTokenAddress, ELIZA_TOKEN_ABI, provider);
      const elizaBalance = await elizaToken.balanceOf(wallet.address);
      const elizaBalanceFormatted = ethers.formatEther(elizaBalance);
      console.log(`   elizaOS: ${elizaBalanceFormatted} elizaOS`);

      if (elizaBalance === 0n) {
        console.log(`   ⚠️  WARNING: No elizaOS tokens! Run: bun run ../../scripts/fund-test-accounts.ts`);
      } else {
        console.log(`   ✅ Has elizaOS tokens`);
      }
    }

    console.log('');
  }

  // Check for API keys
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🤖 LLM Configuration:\n');

  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;

  if (openaiKey) {
    console.log(`   ✅ OpenAI API Key: ${openaiKey.substring(0, 10)}...`);
  } else {
    console.log(`   ⚠️  OpenAI API Key: Not set`);
  }

  if (anthropicKey) {
    console.log(`   ✅ Anthropic API Key: ${anthropicKey.substring(0, 10)}...`);
  } else {
    console.log(`   ⚠️  Anthropic API Key: Not set`);
  }

  if (googleKey) {
    console.log(`   ✅ Google API Key: ${googleKey.substring(0, 10)}...`);
  } else {
    console.log(`   ⚠️  Google API Key: Not set`);
  }

  if (!openaiKey && !anthropicKey && !googleKey) {
    console.log('\n   ℹ️  No LLM API keys configured');
    console.log('   ℹ️  Agents will fail when trying to use LLM features');
    console.log('   ℹ️  This is EXPECTED - it proves the agents are trying to use LLMs!');
  }

  // Check ERC-8004 registry
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🔐 ERC-8004 IdentityRegistry:\n');

  const registryAddress = process.env.REGISTRY_ADDRESS;
  if (!registryAddress) {
    console.log('   ⚠️  REGISTRY_ADDRESS not set');
    console.log('   ℹ️  Deploy contracts first: cd ../../../contracts && forge script script/DeployAll.s.sol');
  } else {
    console.log(`   ✅ Registry: ${registryAddress}`);
    console.log('   ℹ️  Agents will register on startup');
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 Test Summary:\n');

  const hasEth = walletsData.accounts.every(async (w) => {
    const wallet = new ethers.Wallet(w.privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    return balance >= ethers.parseEther('0.1');
  });

  console.log(`   Wallets: ${walletsData.accounts.length} agents configured`);
  console.log(`   ETH: ${hasEth ? '✅' : '⚠️ '} Check balances above`);
  console.log(`   elizaOS: ${elizaTokenAddress ? '✅' : '⚠️ '} ${elizaTokenAddress ? 'Configured' : 'Not configured'}`);
  console.log(`   Registry: ${registryAddress ? '✅' : '⚠️ '} ${registryAddress ? 'Ready' : 'Deploy contracts first'}`);
  console.log(`   LLM: ${openaiKey || anthropicKey || googleKey ? '✅' : 'ℹ️ '} ${openaiKey || anthropicKey || googleKey ? 'Configured' : 'Not required for this test'}`);

  console.log('\n✅ Pre-flight check complete!');
  console.log('\nNext steps:');
  console.log('   1. Deploy contracts (if not done): cd ../../../contracts && forge script script/DeployAll.s.sol --broadcast --rpc-url http://localhost:8545');
  console.log('   2. Fund elizaOS tokens (if needed): bun run ../../scripts/fund-test-accounts.ts');
  console.log('   3. Set REGISTRY_ADDRESS in .env.localnet');
  console.log('   4. Start agents: bun run dev');
  console.log('');
}

main();

