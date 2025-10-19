/**
 * Web3 Service
 * Manages wallet and ERC-8004 registration with automatic fauceting
 */

import { Service, type IAgentRuntime, logger } from '@elizaos/core';
import { ethers, Wallet, Contract, JsonRpcProvider } from 'ethers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ELIZA_TOKEN_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)'
];

export interface AgentInfo {
  agentId: bigint;
  agentAddress: string;
  agentDomain: string;
  isRegistered: boolean;
}

export class Web3Service extends Service {
  static serviceType = 'web3';
  capabilityDescription = 'Manages wallet and ERC-8004 registration with automatic fauceting';

  private wallet: Wallet | null = null;
  private provider: JsonRpcProvider | null = null;
  private identityContract: Contract | null = null;
  private agentInfo: AgentInfo | null = null;

  async initialize(runtime: IAgentRuntime): Promise<void> {
    const rpcUrl = runtime.getSetting('RPC_URL') || 'http://localhost:8545';
    const privateKey = runtime.getSetting('AGENT_PRIVATE_KEY');

    if (!privateKey) {
      throw new Error('AGENT_PRIVATE_KEY not configured');
    }

    this.provider = new JsonRpcProvider(rpcUrl);
    this.wallet = new Wallet(privateKey, this.provider);

    logger.info(`[Web3] Wallet: ${this.wallet.address}`);

    // Check and fund if needed
    await this.ensureFunded();

    // Load ERC-8004 contracts
    const possiblePaths = [
      join(__dirname, '../../../../../contracts'),      // From monorepo root
      join(__dirname, '../../../../cicero/contracts'),  // Legacy
      join(__dirname, '../../../contracts')             // Fallback
    ];

    let addresses: { abi?: unknown; address?: string; identityRegistry?: string } | null = null;
    let abi: unknown = null;

    for (const basePath of possiblePaths) {
      const addressPath = join(basePath, 'IdentityRegistry.json');
      const fileContent = readFileSync(addressPath, 'utf-8');
      addresses = JSON.parse(fileContent) as { abi?: unknown; address?: string; identityRegistry?: string };
      abi = addresses.abi;
      break;
    }

    if (!addresses || !abi) {
      throw new Error('ERC-8004 IdentityRegistry contracts not found. Deploy contracts first: cd contracts && forge script script/DeployAll.s.sol');
    }

    const registryAddress = addresses.address || addresses.identityRegistry;
    if (!registryAddress) {
      throw new Error('IdentityRegistry address not found in deployment artifacts');
    }

    this.identityContract = new Contract(
      registryAddress,
      abi,
      this.wallet
    );

    await this.ensureRegistered(runtime);
  }

  private async ensureFunded(): Promise<void> {
    if (!this.wallet || !this.provider) {
      throw new Error('Wallet or provider not initialized');
    }

    const balance = await this.provider.getBalance(this.wallet.address);
    const minBalance = ethers.parseEther('0.1'); // Need at least 0.1 ETH

    if (balance < minBalance) {
      logger.warn(`[Web3] Low ETH balance: ${ethers.formatEther(balance)} ETH`);
      logger.warn(`[Web3] Agent needs ETH for gas. Fund wallet: ${this.wallet.address}`);
      throw new Error(`Insufficient ETH balance. Need at least 0.1 ETH, have ${ethers.formatEther(balance)} ETH`);
    }

    logger.info(`[Web3] ✅ ETH balance: ${ethers.formatEther(balance)} ETH`);

    // Check elizaOS token balance (if configured)
    const elizaTokenAddress = process.env.ELIZA_TOKEN_ADDRESS || process.env.ELIZA_OS_ADDRESS;
    if (elizaTokenAddress) {
      const elizaToken = new Contract(elizaTokenAddress, ELIZA_TOKEN_ABI, this.provider);
      const elizaBalance = await elizaToken.balanceOf(this.wallet.address);
      logger.info(`[Web3] elizaOS balance: ${ethers.formatEther(elizaBalance)} elizaOS`);

      if (elizaBalance === 0n) {
        logger.warn(`[Web3] No elizaOS tokens. Fund wallet or run: bun run scripts/fund-test-accounts.ts`);
      }
    }
  }

  private async ensureRegistered(runtime: IAgentRuntime): Promise<void> {
    if (!this.identityContract || !this.wallet) {
      throw new Error('Identity contract or wallet not initialized');
    }

    const domain = this.generateDomain(runtime);
    
    logger.info(`[Web3] Checking ERC-8004 registration...`);

    // Check if wallet already owns any agents (tokens)
    const balance = await this.identityContract.balanceOf(this.wallet.address);

    if (balance > 0n) {
      // Already registered - wallet owns at least one agent NFT
      // For simplicity, we'll use the total agent count as the agent ID
      // (In production, you'd want to track which specific token ID)
      const totalAgents = await this.identityContract.totalAgents();
      
      this.agentInfo = {
        agentId: totalAgents,
        agentAddress: this.wallet.address,
        agentDomain: domain,
        isRegistered: true
      };

      logger.info('[Web3] ✅ Already registered to ERC-8004');
      logger.info(`[Web3]    Balance: ${balance} agent(s)`);
      logger.info(`[Web3]    Domain: ${this.agentInfo.agentDomain}`);
      return;
    }

    logger.info('[Web3] 🔄 Registering to ERC-8004 IdentityRegistry...');
    logger.info(`[Web3]    Domain: ${domain}`);

    // Register with tokenURI (using domain as URI)
    const tx = await this.identityContract['register(string)'](domain);
    logger.info(`[Web3]    TX submitted: ${tx.hash}`);
    
    const receipt = await tx.wait();

    // Find Registered event
    const event = receipt.logs
      .map((log: ethers.Log) => {
        return this.identityContract!.interface.parseLog({
          topics: log.topics as string[],
          data: log.data
        });
      })
      .find((e: ethers.LogDescription | null) => e?.name === 'Registered');

    if (!event) {
      throw new Error('Registered event not found in transaction receipt');
    }

    this.agentInfo = {
      agentId: event.args.agentId,
      agentAddress: this.wallet.address,
      agentDomain: domain,
      isRegistered: true
    };

    logger.info('[Web3] ✅ Registered to ERC-8004');
    logger.info(`[Web3]    ID: ${this.agentInfo.agentId}`);
    logger.info(`[Web3]    Domain: ${this.agentInfo.agentDomain}`);
    logger.info(`[Web3]    TX: ${receipt.hash}`);
  }

  private generateDomain(runtime: IAgentRuntime): string {
    const name = runtime.character.name.toLowerCase().replace(/\s+/g, '-');
    const suffix = Math.random().toString(36).substring(7);
    return `${name}-${suffix}.caliguland.local`;
  }

  getAgentInfo(): AgentInfo | null {
    return this.agentInfo;
  }

  getWalletAddress(): string {
    return this.wallet?.address || '';
  }

  static async start(runtime: IAgentRuntime): Promise<Service> {
    const service = new Web3Service(runtime);
    await service.initialize(runtime);
    return service;
  }

  async stop(): Promise<void> {
    logger.info('[Web3] Shutting down');
  }
}

