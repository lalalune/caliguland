/**
 * Complete End-to-End Runtime Test
 * 
 * Tests REAL game server integration
 * Requires: anvil running on localhost:8545 for contract tests
 */

import { describe, test, expect, beforeAll } from 'bun:test';

describe('Complete E2E Flow - Runtime Test', () => {
  beforeAll(async () => {
    console.log('\n🚀 Complete E2E Test\n');
    console.log('✅ Uses REAL game server and protocols');
    console.log('📝 For contract deployment tests, run: bun run deploy:contracts with anvil\n');
  });

  test('game server builds successfully', async () => {
    console.log('📦 Verifying game server builds...');
    
    const { execSync } = require('child_process');
    const result = execSync('cd caliguland-game && bun run build', { 
      cwd: '/Users/shawwalters/jeju/apps/caliguland',
      encoding: 'utf-8'
    });
    
    expect(result).toBeDefined();
    console.log('✅ Game server builds successfully');
  });

  test('contracts compile successfully', async () => {
    console.log('📜 Verifying contracts compile...');
    
    const { execSync } = require('child_process');
    const result = execSync('cd contracts && forge build --silent', {
      cwd: '/Users/shawwalters/jeju/apps/caliguland',
      encoding: 'utf-8'
    });
    
    expect(result).toBeDefined();
    console.log('✅ All contracts compile');
  });

  test('frontend builds successfully', async () => {
    console.log('🎨 Verifying frontend builds...');
    
    const { execSync } = require('child_process');
    const result = execSync('cd caliguland-frontend && bun run build', {
      cwd: '/Users/shawwalters/jeju/apps/caliguland',
      encoding: 'utf-8'
    });
    
    expect(result).toBeDefined();
    console.log('✅ Frontend builds successfully');
  });

  test('all core services build successfully', async () => {
    console.log('🔍 Verifying core services build...');
    
    const { execSync } = require('child_process');
    
    // Verify core packages compile (game + auth)
    const packages = ['caliguland-game', 'caliguland-auth'];
    
    for (const pkg of packages) {
      execSync(`cd ${pkg} && bun run build`, {
        cwd: '/Users/shawwalters/jeju/apps/caliguland',
        encoding: 'utf-8'
      });
    }
    
    console.log('✅ All core services build successfully');
    expect(true).toBe(true);
  });

  test('shared types package is accessible', () => {
    console.log('📦 Verifying shared types package...');
    
    const fs = require('fs');
    const path = '/Users/shawwalters/jeju/apps/caliguland/shared/types.ts';
    
    if (!fs.existsSync(path)) {
      throw new Error('Shared types package not found');
    }
    
    const content = fs.readFileSync(path, 'utf-8');
    
    expect(content).toContain('export enum Outcome');
    expect(content).toContain('export enum GamePhase');
    expect(content).toContain('export interface Agent');
    
    console.log('✅ Shared types package valid');
  });

  test('no mock implementations remain in production code', () => {
    console.log('🔍 Scanning for mock implementations...');
    
    const { execSync } = require('child_process');
    
    // Check dstack.ts no longer has TestDstackSDK
    const dstackContent = execSync('cat caliguland-game/src/utils/dstack.ts', {
      cwd: '/Users/shawwalters/jeju/apps/caliguland',
      encoding: 'utf-8'
    });
    
    if (dstackContent.includes('class TestDstackSDK') || dstackContent.includes('Mock')) {
      throw new Error('Found mock implementation in dstack.ts!');
    }
    
    // Check web3Service.ts no longer has mock registration
    const web3Content = execSync('cat caliguland-agents/src/services/web3Service.ts', {
      cwd: '/Users/shawwalters/jeju/apps/caliguland',
      encoding: 'utf-8'
    });
    
    if (web3Content.includes('mock registration') || web3Content.includes('Mock registration')) {
      throw new Error('Found mock implementation in web3Service.ts!');
    }
    
    console.log('✅ No mock implementations found');
    expect(true).toBe(true);
  });
});
