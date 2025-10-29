#!/usr/bin/env bash
set -euo pipefail

# Remove incompatible node shim if present
rm -f /vercel/path0/node_modules/.bin/node || true

# Install with dev deps so build-time CLIs (prisma, nest, etc.) are available
# Use absolute paths throughout to avoid any path resolution issues
echo "Installing dependencies with devDependencies..."
cd /vercel/path0/myphoenixphone
npm install --include=dev 2>&1

# Ensure prisma client is generated for the backend workspace
echo "Generating Prisma client..."
npm --workspace apps/backend exec prisma generate --schema ./prisma/schema.prisma 2>&1 || true

echo "Install script complete"
