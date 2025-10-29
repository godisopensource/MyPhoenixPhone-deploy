#!/usr/bin/env bash
set -euo pipefail

# Build backend and web apps from myphoenixphone directory with absolute paths
echo "Building backend..."
cd /vercel/path0/myphoenixphone
npm run -w apps/backend build 2>&1

echo "Building web..."
npm run -w apps/web build 2>&1

echo "Build script complete"
