/**
 * Dstack TEE Integration Utilities
 * PRODUCTION: Requires real @phala/dstack-sdk package
 * TESTING: Can use mock implementation via dependency injection
 */

import { createHash } from 'crypto';

// DstackSDK interface - matches @phala/dstack-sdk API
interface IDstackSDK {
  deriveKey(path: string): Promise<{ key: string }>;
  getInfo(): Promise<{ version: string; [key: string]: unknown }>;
  getQuote(reportData: string): Promise<{ quote: string; [key: string]: unknown }>;
}

interface DstackKeyResponse {
  key: string;
}

interface DstackInfoResponse {
  version: string;
  [key: string]: unknown;
}

interface DstackQuoteResponse {
  quote: string;
  [key: string]: unknown;
}

// Load real Dstack SDK - NO MOCKS
function loadDstackSDK(): IDstackSDK {
  const sdk = require('@phala/dstack-sdk');
  const DstackSDKClass = sdk.DstackSDK || sdk.default || sdk;
  if (!DstackSDKClass) {
    throw new Error('@phala/dstack-sdk not properly installed');
  }
  return new DstackSDKClass();
}

export class DstackHelper {
  private sdk: IDstackSDK;
  private keyCache: Map<string, string>;

  constructor(sdk?: IDstackSDK) {
    this.sdk = sdk || loadDstackSDK();
    this.keyCache = new Map();
  }

  /**
   * Derive a deterministic key from a path
   * @throws If derivation fails
   */
  async deriveKey(path: string): Promise<string> {
    const cached = this.keyCache.get(path);
    if (cached) {
      return cached;
    }

    const response = await this.sdk.deriveKey(path);
    this.keyCache.set(path, response.key);
    return response.key;
  }

  /**
   * Get TEE instance information
   * @throws If TEE info cannot be retrieved
   */
  async getInfo(): Promise<DstackInfoResponse> {
    return await this.sdk.getInfo();
  }

  /**
   * Generate a quote for attestation
   * @throws If quote generation fails
   */
  async getQuote(reportData: string): Promise<DstackQuoteResponse> {
    return await this.sdk.getQuote(reportData);
  }

  /**
   * Create a commitment hash for an outcome
   */
  createCommitment(outcome: string, salt: string): string {
    return createHash('sha256')
      .update(`${outcome}${salt}`)
      .digest('hex');
  }

  /**
   * Verify a commitment
   */
  verifyCommitment(outcome: string, salt: string, commitment: string): boolean {
    const computed = this.createCommitment(outcome, salt);
    return computed === commitment;
  }
}

// Singleton instance
let _dstackHelperInstance: DstackHelper | null = null;

export const dstackHelper = {
  get instance(): DstackHelper {
    if (!_dstackHelperInstance) {
      _dstackHelperInstance = new DstackHelper();
    }
    return _dstackHelperInstance;
  },

  deriveKey: (path: string): Promise<string> =>
    dstackHelper.instance.deriveKey(path),

  getInfo: (): Promise<DstackInfoResponse> =>
    dstackHelper.instance.getInfo(),

  getQuote: (reportData: string): Promise<DstackQuoteResponse> =>
    dstackHelper.instance.getQuote(reportData),

  createCommitment: (outcome: string, salt: string): string =>
    dstackHelper.instance.createCommitment(outcome, salt),

  verifyCommitment: (outcome: string, salt: string, commitment: string): boolean =>
    dstackHelper.instance.verifyCommitment(outcome, salt, commitment),
};
