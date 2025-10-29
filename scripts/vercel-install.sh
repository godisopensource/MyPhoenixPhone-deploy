#!/usr/bin/env bash
set -euo pipefail

# Remove incompatible node shim if present
rm -f /vercel/path0/node_modules/.bin/node || true

# If repository has the monorepo folder, cd into it
if [ -f myphoenixphone/package.json ]; then
  cd myphoenixphone
fi

# Install with dev deps so build-time CLIs (prisma, nest, etc.) are available
echo "Installing dependencies with devDependencies..."
npm install --include=dev 2>&1

# Ensure prisma client is generated for the backend workspace
# Use npm exec to run the workspace-local prisma binary
echo "Generating Prisma client..."
npm --prefix myphoenixphone --workspace apps/backend exec prisma generate --schema ./prisma/schema.prisma 2>&1 || true

echo "Install script complete"
