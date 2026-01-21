#!/bin/bash
# verify-beans-setup.sh - Verify BEANS v2.0 installation

echo "🔍 Verifying BEANS v2.0 setup..."
echo ""

PASS=0
FAIL=0
WARN=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo "  ✓ $name"
    ((PASS++))
  else
    echo "  ✗ $name"
    ((FAIL++))
  fi
}

check_optional() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo "  ✓ $name"
    ((PASS++))
  else
    echo "  ○ $name (optional)"
    ((WARN++))
  fi
}

echo "═══════════════════════════════════════════"
echo "CLI Tools"
echo "═══════════════════════════════════════════"
check "ast-grep" "command -v ast-grep"
check "repomix" "command -v repomix"
check_optional "tree-sitter" "command -v tree-sitter"
check_optional "ctags" "command -v ctags"
check_optional "cscope" "command -v cscope"
check_optional "direnv" "command -v direnv"

echo ""
echo "═══════════════════════════════════════════"
echo "Node.js Tools"
echo "═══════════════════════════════════════════"
check "vitest" "bun pm ls vitest 2>/dev/null || npm ls vitest 2>/dev/null"
check_optional "husky" "bun pm ls husky 2>/dev/null || npm ls husky 2>/dev/null"
check_optional "lint-staged" "bun pm ls lint-staged 2>/dev/null || npm ls lint-staged 2>/dev/null"

echo ""
echo "═══════════════════════════════════════════"
echo "Python Tools"
echo "═══════════════════════════════════════════"
check_optional "pytest" "python -c 'import pytest' 2>/dev/null || python3 -c 'import pytest'"
check_optional "pylint" "command -v pylint"
check_optional "black" "command -v black"

echo ""
echo "═══════════════════════════════════════════"
echo "Directories"
echo "═══════════════════════════════════════════"
check ".claude/agents" "[ -d .claude/agents ]"
check ".beans/analysis" "[ -d .beans/analysis ]"
check ".beans/context" "[ -d .beans/context ]"
check ".beans/cache" "[ -d .beans/cache ]"
check ".beans/logs" "[ -d .beans/logs ]"

echo ""
echo "═══════════════════════════════════════════"
echo "Subagents"
echo "═══════════════════════════════════════════"
for agent in code-reviewer test-engineer optimizer doc-generator integration-tester; do
  check "$agent" "[ -f .claude/agents/${agent}.md ]"
done

echo ""
echo "═══════════════════════════════════════════"
echo "Ralph Agents (from plugin)"
echo "═══════════════════════════════════════════"
for agent in research-analyst product-manager architect-reviewer task-planner spec-executor plan-synthesizer; do
  check "$agent" "[ -f .claude/agents/${agent}.md ] || [ -f .claude/plugins/beans/agents/${agent}.md ]"
done

echo ""
echo "═══════════════════════════════════════════"
echo "Configuration"
echo "═══════════════════════════════════════════"
check "hooks.json" "[ -f .claude/hooks/hooks.json ]"
check "code-intelligence.sh" "[ -f ~/.local/share/beans/code-intelligence.sh ]"
check "beans plugin" "[ -d .claude/plugins/beans ] || [ -L .claude/plugins/beans ]"

echo ""
echo "═══════════════════════════════════════════"
echo "Beads CLI"
echo "═══════════════════════════════════════════"
check "bd command" "command -v bd"
check ".beads directory" "[ -d .beads ]"
check_optional "beads initialized" "[ -f .beads/config.yaml ]"

echo ""
echo "═══════════════════════════════════════════"
echo "Summary"
echo "═══════════════════════════════════════════"
echo ""
echo "  Passed:   $PASS"
echo "  Failed:   $FAIL"
echo "  Optional: $WARN"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "✅ BEANS v2.0 is ready!"
  echo ""
  echo "Quick start:"
  echo "  /beans list              # View ready issues"
  echo "  /beans \"Add feature X\"   # Start new feature"
  exit 0
else
  echo "⚠️  Some required components missing."
  echo ""
  echo "Run setup:"
  echo "  ./submodules/beans/plugin/scripts/beans-setup.sh"
  exit 1
fi
