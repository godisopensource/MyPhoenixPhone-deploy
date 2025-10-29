#!/usr/bin/env bash
set -euo pipefail

# Remove incompatible node shim if present
rm -f /vercel/path0/node_modules/.bin/node || true

# We're already in myphoenixphone when this script is used, so install here
npm install --include=dev

# Ensure prisma client is generated for the backend workspace
npm --prefix myphoenixphone --workspace apps/backend exec prisma generate --schema ./prisma/schema.prisma || true
