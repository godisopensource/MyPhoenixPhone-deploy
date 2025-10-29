#!/usr/bin/env bash
set -euo pipefail

if [ -f ./scripts/vercel-install.sh ]; then
  bash ./scripts/vercel-install.sh
elif [ -f myphoenixphone/scripts/vercel-install.sh ]; then
  bash myphoenixphone/scripts/vercel-install.sh
else
  echo "No vercel install script found in ./scripts or myphoenixphone/scripts"
  exit 1
fi
