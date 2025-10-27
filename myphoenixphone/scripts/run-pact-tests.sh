#!/bin/bash

# Pact Contract Testing Workflow
# This script runs the complete contract testing flow:
# 1. Generate contracts from consumer tests (web app)
# 2. Start backend server
# 3. Verify backend against consumer contracts

set -e  # Exit on error

echo "Pact Contract Testing Workflow"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Run consumer tests to generate pact files
echo ""
echo -e "${YELLOW}Step 1: Running consumer tests (web app)...${NC}"
cd apps/web
npm run test:pact

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Consumer tests passed and pact files generated${NC}"
else
    echo -e "${RED}✗ Consumer tests failed${NC}"
    exit 1
fi

# Check if pact files were generated
if [ ! -d "pacts" ] || [ -z "$(ls -A pacts)" ]; then
    echo -e "${RED}✗ No pact files generated in apps/web/pacts/${NC}"
    exit 1
fi

echo ""
echo "📄 Generated pact files:"
ls -lh pacts/

# Step 2: Build and start backend
echo ""
echo -e "${YELLOW}Step 2: Starting backend server...${NC}"
cd ../backend

# Build backend
echo "Building backend..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Backend build failed${NC}"
    exit 1
fi

# Start backend in background
echo "Starting backend on port 3003..."
PORT=3003 npm run start:prod > /tmp/pact-backend.log 2>&1 &
BACKEND_PID=$!

echo "Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:3003/health > /dev/null; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    attempt=$((attempt + 1))
    sleep 1
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}✗ Backend failed to start${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Step 3: Run provider verification
echo ""
echo -e "${YELLOW}Step 3: Verifying provider against consumer contracts...${NC}"

npm run test:pact

VERIFICATION_RESULT=$?

# Cleanup: Stop backend
echo ""
echo "Stopping backend server..."
kill $BACKEND_PID 2>/dev/null || true
wait $BACKEND_PID 2>/dev/null || true

# Final result
echo ""
echo "================================="
if [ $VERIFICATION_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ All contract tests passed!${NC}"
    echo ""
    echo "Summary:"
    echo "  - Consumer tests: ✓ Passed"
    echo "  - Provider verification: ✓ Passed"
    echo "  - API contracts are in sync!"
    exit 0
else
    echo -e "${RED}✗ Provider verification failed${NC}"
    echo ""
    echo "The backend does not satisfy all consumer contracts."
    echo "Check the test output above for details."
    echo ""
    echo "Backend logs:"
    tail -n 20 /tmp/pact-backend.log
    exit 1
fi
