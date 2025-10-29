#!/usr/bin/env bash
set -euo pipefail

# Remove incompatible node shim if present
rm -f /vercel/path0/node_modules/.bin/node || true

# We're already in myphoenixphone when this script is used, so install here
echo "Installing dependencies with devDependencies..."
npm install --include=dev 2>&1

# Ensure prisma client is generated for the backend workspace
echo "Generating Prisma client..."
npm --workspace apps/backend exec prisma generate --schema ./prisma/schema.prisma 2>&1 || true

echo "Install script complete"
