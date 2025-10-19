#!/bin/bash
# Setup Caliguland Agents for Localnet
# Run: source setup-localnet.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Setting up Caliguland Agents for Localnet"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Network Configuration
export RPC_URL=http://localhost:8545
export JEJU_RPC_URL=http://localhost:8545

# Game Server (Caliguland Game A2A endpoint)
export GAME_SERVER_URL=http://localhost:8000

# Betting Server (Predimarket or separate betting A2A endpoint) - OPTIONAL
export PREDICTION_SERVER_URL=http://localhost:9000

# ERC-8004 Registry (update after deploying contracts)
export REGISTRY_ADDRESS=${REGISTRY_ADDRESS:-""}

# elizaOS Token (standard localnet deployment address)
export ELIZA_TOKEN_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
export ELIZA_OS_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# Agent Wallets (Pre-funded Anvil accounts)
# ⚠️  ONLY FOR LOCALNET - These are from Anvil's default mnemonic
export PLAYER1_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d  # Analyst
export PLAYER2_PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a  # Contrarian
export PLAYER3_PRIVATE_KEY=0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356  # Insider
export PLAYER4_PRIVATE_KEY=0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97  # Social
export PLAYER5_PRIVATE_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6  # Random

# Auto-play settings
export AGENT_AUTOPLAY=1
export AUTO_SHUTDOWN_MS=300000  # 5 minutes

# AI/LLM Configuration
# REQUIRED for agents to use LLM decision making
if [ -z "$OPENAI_API_KEY" ]; then
  echo "⚠️  OPENAI_API_KEY not set"
  echo "   Agents will fail when trying to use LLM features"
  echo "   This is EXPECTED - it proves agents are trying to use LLMs!"
  echo "   Set OPENAI_API_KEY to enable full functionality"
  echo ""
fi

# Optional: Betting configuration
export MAX_PREDICT_PER_MARKET=${MAX_PREDICT_PER_MARKET:-500}

echo "✅ Environment configured for localnet:"
echo "   RPC: $RPC_URL"
echo "   Game Server: $GAME_SERVER_URL"
echo "   Agents: 5 (Analyst, Contrarian, Insider, Social, Random)"
echo "   Registry: ${REGISTRY_ADDRESS:-"Not set - deploy contracts first"}"
echo ""
echo "Next steps:"
echo "   1. Deploy contracts: cd ../../../contracts && forge script script/DeployAll.s.sol --broadcast --rpc-url http://localhost:8545"
echo "   2. Fund elizaOS tokens: cd ../../../ && bun run scripts/fund-test-accounts.ts"
echo "   3. Update REGISTRY_ADDRESS: export REGISTRY_ADDRESS=0x..."
echo "   4. Test agents: bun run test:registration"
echo "   5. Start agents: bun run dev"
echo ""

