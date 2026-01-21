#!/bin/bash
# beans-setup.sh - BEANS v2.0 complete environment setup
set -e

BEANS_DIR="${BEANS_DIR:-$HOME/.local/share/beans}"
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🫘 Setting up BEANS v2.0..."
echo ""

# Detect OS
OS="$(uname -s)"
echo "Detected OS: $OS"

# Create directories
echo ""
echo "→ Creating directories..."
mkdir -p "$BEANS_DIR"
mkdir -p .claude/agents
mkdir -p .beans/analysis
mkdir -p .beans/context
mkdir -p .beans/cache
mkdir -p .beans/logs

# Install Node tools (dev dependencies)
echo ""
echo "→ Installing Node.js dev tools..."
if command -v bun &> /dev/null; then
  bun add -D vitest husky lint-staged @commitlint/cli 2>/dev/null || true
elif command -v npm &> /dev/null; then
  npm install -D vitest husky lint-staged @commitlint/cli 2>/dev/null || true
fi

# Install global Node tools
echo ""
echo "→ Installing global tools..."
if command -v bun &> /dev/null; then
  bun install -g ast-grep repomix 2>/dev/null || true
elif command -v npm &> /dev/null; then
  npm install -g ast-grep repomix 2>/dev/null || true
fi

# Install system tools
echo ""
echo "→ Installing system tools..."
if [ "$OS" = "Darwin" ]; then
  brew install universal-ctags cscope direnv tree-sitter 2>/dev/null || true
elif [ "$OS" = "Linux" ]; then
  if command -v apt-get &> /dev/null; then
    sudo apt-get install -y universal-ctags cscope direnv 2>/dev/null || true
  elif command -v dnf &> /dev/null; then
    sudo dnf install -y ctags cscope direnv 2>/dev/null || true
  fi
fi

# Install Python tools (if Python available)
echo ""
echo "→ Installing Python tools..."
if command -v pip &> /dev/null; then
  pip install --quiet pylint black pytest pytest-cov 2>/dev/null || true
elif command -v pip3 &> /dev/null; then
  pip3 install --quiet pylint black pytest pytest-cov 2>/dev/null || true
fi

# Copy code intelligence library
echo ""
echo "→ Installing code intelligence library..."
cp "$PLUGIN_DIR/lib/code-intelligence.sh" "$BEANS_DIR/code-intelligence.sh"
chmod +x "$BEANS_DIR/code-intelligence.sh"

# Copy subagents
echo ""
echo "→ Installing subagents..."
for agent in "$PLUGIN_DIR/agents"/*.md; do
  if [ -f "$agent" ]; then
    cp "$agent" .claude/agents/
    echo "  ✓ $(basename "$agent")"
  fi
done

# Copy hooks config
echo ""
echo "→ Installing hooks..."
if [ -f "$PLUGIN_DIR/config/hooks.json" ]; then
  mkdir -p .claude/hooks
  cp "$PLUGIN_DIR/config/hooks.json" .claude/hooks/
  echo "  ✓ hooks.json"
fi

# Setup husky (if package.json exists)
if [ -f "package.json" ]; then
  echo ""
  echo "→ Setting up git hooks..."
  if command -v bun &> /dev/null; then
    bun husky install 2>/dev/null || true
  elif command -v npx &> /dev/null; then
    npx husky install 2>/dev/null || true
  fi
fi

# Verify installation
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ BEANS v2.0 setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Installed tools:"
for cmd in ast-grep repomix ctags cscope; do
  if command -v "$cmd" &> /dev/null; then
    echo "  ✓ $cmd"
  else
    echo "  ✗ $cmd (optional - install manually)"
  fi
done
echo ""
echo "Next steps:"
echo "  1. Review .claude/agents/ for subagent configuration"
echo "  2. Run: /beans list"
echo "  3. Create a task: /beans \"Add feature X\""
echo "  4. Or start loop: /beans:loop"
