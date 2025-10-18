/**
 * Smart RPC Detection - Prefers Jeju over Anvil
 * 
 * DEPRECATED: Use shared/rpcDetector.ts from root instead
 * This file is kept for backwards compatibility but imports from shared.
 */

export { RpcDetector, getRpcUrl, getChainInfo, isJejuAvailable } from '../../../shared/rpcDetector';
