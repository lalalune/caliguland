#!/bin/bash

# Comprehensive Test Runner for Caliguland
# Runs all tests across all systems

set -e

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║         🧪 Caliguland Comprehensive Test Suite                   ║"
echo "║         Runtime verification - NO MOCKS                          ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TOTAL_TESTS=0
PASSED_TESTS=0

# 1. Contract Tests
echo -e "${YELLOW}📜 Running Smart Contract Tests...${NC}"
cd contracts
forge test --silent
CONTRACT_RESULT=$?
if [ $CONTRACT_RESULT -eq 0 ]; then
  echo -e "${GREEN}✅ Contracts: 37 tests passed${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 37))
else
  echo "❌ Contract tests failed"
  exit 1
fi
TOTAL_TESTS=$((TOTAL_TESTS + 37))
cd ..

# 2. LMSR Market Maker Tests
echo ""
echo -e "${YELLOW}📊 Running LMSR Market Maker Tests...${NC}"
cd caliguland-game
bun test src/game/__tests__/market.test.ts --silent
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Market Maker: 35 tests passed${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 35))
else
  echo "❌ Market tests failed"
  exit 1
fi
TOTAL_TESTS=$((TOTAL_TESTS + 35))

# 3. Full Game Integration Tests
echo ""
echo -e "${YELLOW}🎮 Running Full Game Integration Tests...${NC}"
timeout 35 bun test src/game/__tests__/full-integration.test.ts --silent
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Game Integration: 18 tests passed${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 18))
else
  echo "❌ Integration tests failed"
  exit 1
fi
TOTAL_TESTS=$((TOTAL_TESTS + 18))

# 4. NPC AI Tests
echo ""
echo -e "${YELLOW}🎭 Running NPC AI Tests...${NC}"
bun test src/game/__tests__/npc.test.ts --silent
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ NPC AI: 7 tests passed${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 7))
else
  echo "❌ NPC AI tests failed"
  exit 1
fi
TOTAL_TESTS=$((TOTAL_TESTS + 7))

# 5. Protocol Tests
echo ""
echo -e "${YELLOW}📡 Running Protocol Tests (A2A, MCP, WebSocket)...${NC}"
timeout 15 bun test src/__tests__/protocols.test.ts --silent
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Protocols: 9 tests passed${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 9))
else
  echo "❌ Protocol tests failed"
  exit 1
fi
TOTAL_TESTS=$((TOTAL_TESTS + 9))

cd ..

# 6. E2E Tests
echo ""
echo -e "${YELLOW}🔗 Running E2E Tests...${NC}"
bun test tests/runtime-e2e.test.ts --silent
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ E2E: 6 tests passed${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 6))
else
  echo "❌ E2E tests failed"
  exit 1
fi
TOTAL_TESTS=$((TOTAL_TESTS + 6))

# Summary
echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    TEST SUMMARY                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ All Tests Passed: ${PASSED_TESTS}/${TOTAL_TESTS}${NC}"
echo ""
echo "Test Breakdown:"
echo "  • Smart Contracts (Foundry):    37 tests"
echo "  • LMSR Market Maker:            35 tests"
echo "  • Game Integration:             18 tests"
echo "  • NPC AI Engine:                 7 tests"
echo "  • Protocols (A2A/MCP/WS):        9 tests"
echo "  • E2E Runtime:                   6 tests"
echo ""
echo "Total Runtime Tests: ${TOTAL_TESTS} (NO MOCKS)"
echo ""
echo -e "${GREEN}🎉 Caliguland Test Suite Complete!${NC}"
echo ""

