#!/bin/bash
set -e
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js 22 or newer, then run this launcher again. See docs/XCODE.md."
  if [ -t 0 ]; then read -r -p "Press Return to close. " unused; fi
  exit 1
fi
if ! node scripts/xcode.js setup; then
  echo "Setup stopped. The message above identifies what to fix."
  if [ -t 0 ]; then read -r -p "Press Return to close. " unused; fi
  exit 1
fi
