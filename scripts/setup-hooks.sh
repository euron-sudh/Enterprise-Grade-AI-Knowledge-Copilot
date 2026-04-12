#!/bin/bash
# ============================================================================
#  One-time setup: configure Git to use the shared .githooks directory.
#  Run from the project root:   bash scripts/setup-hooks.sh
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo ""
echo "  Setting up Git hooks..."
echo ""

git config core.hooksPath .githooks
chmod +x .githooks/pre-push

echo "  ✔ Git hooks configured successfully."
echo ""
echo "  The pre-push hook will now run automatically before every 'git push'."
echo "  To bypass in emergencies:  git push --no-verify"
echo ""
