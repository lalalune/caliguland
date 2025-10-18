#!/bin/bash
# Complete Caliguland E2E Test Runner
# Runs ALL tests with NO MOCKS - only real integration testing

set -e

echo "======================================================================"
echo "🎮 CALIGULAND COMPLETE E2E TEST SUITE"
echo "======================================================================"
echo ""
echo "This script runs comprehensive end-to-end tests covering:"
echo "  ✅ Backend game server"
echo "  ✅ Frontend UI in real browsers"
echo "  ✅ Player interactions"
echo "  ✅ Betting and market mechanics"
echo "  ✅ Feed and social features"
echo "  ✅ Complete game flow from start to finish"
echo ""
echo "Mode: FAST_TEST=1 (3-minute games for testing)"
echo "======================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create test results directory
mkdir -p test-results/screenshots
mkdir -p test-results/videos
mkdir -p test-results/traces
mkdir -p test-results/logs

echo -e "${BLUE}Step 1: Building game server...${NC}"
cd caliguland-game
bun install
bun run build
cd ..
echo -e "${GREEN}✅ Game server built${NC}\n"

echo -e "${BLUE}Step 2: Building frontend...${NC}"
cd caliguland-frontend
bun install
cd ..
echo -e "${GREEN}✅ Frontend ready${NC}\n"

echo -e "${BLUE}Step 3: Installing test dependencies...${NC}"
bun install
bunx playwright install chromium
echo -e "${GREEN}✅ Test tools ready${NC}\n"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}🎬 STARTING E2E TESTS${NC}"
echo -e "${YELLOW}========================================${NC}\n"

# Run Playwright E2E tests
# This will automatically:
# - Start backend with FAST_TEST=1
# - Start frontend
# - Run all tests
# - Capture screenshots/videos
# - Shut down cleanly

FAST_TEST=1 bunx playwright test --reporter=list --reporter=html

TEST_EXIT_CODE=$?

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}📊 TEST RESULTS${NC}"
echo -e "${YELLOW}========================================${NC}\n"

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
  echo ""
  echo "Test artifacts saved to:"
  echo "  📸 Screenshots: ./test-results/screenshots/"
  echo "  🎥 Videos: ./test-results/videos/"
  echo "  📊 HTML Report: ./test-results/html/index.html"
  echo ""
  echo "View the HTML report:"
  echo "  bunx playwright show-report test-results/html"
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  echo ""
  echo "Check the logs and artifacts:"
  echo "  📋 Test results: ./test-results/"
  echo "  📊 HTML Report: ./test-results/html/index.html"
  echo ""
  echo "View the HTML report:"
  echo "  bunx playwright show-report test-results/html"
fi

echo ""
echo "======================================================================"

exit $TEST_EXIT_CODE

