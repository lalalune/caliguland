#!/usr/bin/env bun
/**
 * Fund Agent Wallets with elizaOS tokens
 * 
 * Reads localnet-wallets.json and funds each agent wallet
 * with elizaOS tokens from the deployer account
 * 
 * Run: bun run tests/fund-agent-wallets.ts
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
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

const AMOUNT_PER_AGENT = '10000'; // 10,000 elizaOS per agent

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║   💰 Funding Caliguland Agent Wallets                       ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
  const elizaTokenAddress = process.env.ELIZA_TOKEN_ADDRESS || process.env.ELIZA_OS_ADDRESS;

  if (!elizaTokenAddress) {
    console.error('❌ ELIZA_TOKEN_ADDRESS or ELIZA_OS_ADDRESS not set');
    console.error('\nSet environment variable:');
    console.error('   export ELIZA_TOKEN_ADDRESS=0x...');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   RPC: ${rpcUrl}`);
  console.log(`   elizaOS Token: ${elizaTokenAddress}`);
  console.log(`   Amount per agent: ${AMOUNT_PER_AGENT} elizaOS\n`);

  // Load wallet config
  const walletsPath = join(__dirname, '../localnet-wallets.json');
  const walletsData = JSON.parse(readFileSync(walletsPath, 'utf-8')) as LocalnetWallets;

  // Connect to network
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployerWallet = new ethers.Wallet(walletsData.deployer.privateKey, provider);

  console.log(`🔐 Using deployer wallet: ${deployerWallet.address}\n`);

  // Check deployer's elizaOS balance
  const elizaToken = new ethers.Contract(elizaTokenAddress, ELIZA_TOKEN_ABI, deployerWallet);
  const deployerBalance = await elizaToken.balanceOf(deployerWallet.address);
  
  console.log(`💰 Deployer elizaOS balance: ${ethers.formatEther(deployerBalance)} elizaOS\n`);

  const totalNeeded = ethers.parseEther((parseFloat(AMOUNT_PER_AGENT) * walletsData.accounts.length).toString());
  
  if (deployerBalance < totalNeeded) {
    console.error(`❌ Insufficient elizaOS balance!`);
    console.error(`   Need: ${ethers.formatEther(totalNeeded)} elizaOS`);
    console.error(`   Have: ${ethers.formatEther(deployerBalance)} elizaOS`);
    console.error('\nMint more elizaOS tokens to the deployer account first');
    process.exit(1);
  }

  console.log('💸 Funding agents...\n');

  // Fund each agent
  for (const walletConfig of walletsData.accounts) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🤖 ${walletConfig.name}`);
    console.log(`   Address: ${walletConfig.address}`);

    const currentBalance = await elizaToken.balanceOf(walletConfig.address);
    console.log(`   Current: ${ethers.formatEther(currentBalance)} elizaOS`);

    const amount = ethers.parseEther(AMOUNT_PER_AGENT);
    console.log(`   Sending: ${AMOUNT_PER_AGENT} elizaOS...`);

    const tx = await elizaToken.transfer(walletConfig.address, amount);
    await tx.wait();

    const newBalance = await elizaToken.balanceOf(walletConfig.address);
    console.log(`   ✅ New balance: ${ethers.formatEther(newBalance)} elizaOS`);
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ All agent wallets funded!');
  console.log(`\n   Total distributed: ${parseFloat(AMOUNT_PER_AGENT) * walletsData.accounts.length} elizaOS`);
  console.log(`   Agents funded: ${walletsData.accounts.length}`);
  console.log('');
}

main();

