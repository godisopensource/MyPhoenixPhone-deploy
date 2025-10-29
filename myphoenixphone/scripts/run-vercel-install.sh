#!/usr/bin/env bash
set -euo pipefail

if [ -f /vercel/path0/scripts/vercel-install.sh ]; then
  bash /vercel/path0/scripts/vercel-install.sh
elif [ -f /vercel/path0/myphoenixphone/scripts/vercel-install.sh ]; then
  bash /vercel/path0/myphoenixphone/scripts/vercel-install.sh
else
  echo "No vercel install script found"
  exit 1
fi
