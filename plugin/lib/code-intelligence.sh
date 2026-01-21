#!/bin/bash
# code-intelligence.sh - Local code analysis tools for BEANS
# Usage: source this file or call functions directly

BEANS_CACHE="${BEANS_CACHE:-.beans/cache}"
BEANS_CONTEXT="${BEANS_CONTEXT:-.beans/context}"
BEANS_ANALYSIS="${BEANS_ANALYSIS:-.beans/analysis}"

# ═══════════════════════════════════════════════════════════════════════════════
# TREE-SITTER: AST parsing
# ═══════════════════════════════════════════════════════════════════════════════

ts_parse() {
  local file="$1"
  tree-sitter parse "$file" 2>/dev/null
}

ts_functions() {
  local file="$1"
  tree-sitter parse "$file" 2>/dev/null | grep -E "(function_declaration|method_definition)" | head -50
}

ts_classes() {
  local file="$1"
  tree-sitter parse "$file" 2>/dev/null | grep -E "(class_declaration|class_definition)" | head -50
}

# ═══════════════════════════════════════════════════════════════════════════════
# AST-GREP: Pattern-based search
# ═══════════════════════════════════════════════════════════════════════════════

ag_find() {
  local pattern="$1"
  local path="${2:-.}"
  ast-grep --pattern "$pattern" "$path" 2>/dev/null
}

ag_console_logs() {
  ag_find 'console.log($$$)' "${1:-.}"
}

ag_todos() {
  ag_find 'TODO: $COMMENT' "${1:-.}"
}

ag_unsafe_any() {
  ag_find 'as any' "${1:-.}"
}

ag_count() {
  local pattern="$1"
  local path="${2:-.}"
  ast-grep --pattern "$pattern" "$path" 2>/dev/null | wc -l
}

# ═══════════════════════════════════════════════════════════════════════════════
# REPOMIX: Codebase snapshots
# ═══════════════════════════════════════════════════════════════════════════════

snapshot_codebase() {
  local task_id="${1:-snapshot}"
  local iter="${2:-1}"
  local output="$BEANS_CONTEXT/task-${task_id}_iter-${iter}.md"
  
  mkdir -p "$BEANS_CONTEXT"
  
  repomix \
    --include 'src/**/*.{ts,js,tsx,jsx,py,go,rs}' \
    --exclude '**/*.test.*,**/*.spec.*,node_modules,dist,.git' \
    --output "$output" 2>/dev/null
  
  echo "$output"
}

snapshot_focused() {
  local path="$1"
  local output="${2:-$BEANS_CONTEXT/focused-$(date +%s).md}"
  
  mkdir -p "$(dirname "$output")"
  
  repomix \
    --include "$path" \
    --exclude 'node_modules,dist,.git' \
    --output "$output" 2>/dev/null
  
  echo "$output"
}

snapshot_stats() {
  repomix --stats 2>/dev/null
}

# ═══════════════════════════════════════════════════════════════════════════════
# CSCOPE: Symbol database
# ═══════════════════════════════════════════════════════════════════════════════

cscope_init() {
  local ext="${1:-ts,js,py}"
  find . -name "*.${ext//,/*\" -o -name \"*.}" 2>/dev/null > cscope.files
  cscope -b -i cscope.files 2>/dev/null
}

cscope_find_def() {
  local symbol="$1"
  cscope -L -1 "$symbol" 2>/dev/null
}

cscope_find_refs() {
  local symbol="$1"
  cscope -L -0 "$symbol" 2>/dev/null
}

cscope_find_callers() {
  local func="$1"
  cscope -L -3 "$func" 2>/dev/null
}

# ═══════════════════════════════════════════════════════════════════════════════
# CTAGS: Tag generation
# ═══════════════════════════════════════════════════════════════════════════════

ctags_generate() {
  local path="${1:-.}"
  ctags -R --exclude=node_modules --exclude=dist --exclude=.git "$path" 2>/dev/null
}

ctags_find() {
  local symbol="$1"
  grep "^$symbol" tags 2>/dev/null | head -10
}

# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSIS: Combined analysis
# ═══════════════════════════════════════════════════════════════════════════════

analyze_file() {
  local file="$1"
  local output="$BEANS_ANALYSIS/$(basename "$file").analysis.md"
  
  mkdir -p "$BEANS_ANALYSIS"
  
  {
    echo "# Analysis: $file"
    echo ""
    echo "## Structure"
    echo '```'
    ts_parse "$file" | head -100
    echo '```'
    echo ""
    echo "## Functions"
    echo '```'
    ts_functions "$file"
    echo '```'
    echo ""
    echo "## Issues"
    echo "- Console logs: $(ag_count 'console.log($$$)' "$file")"
    echo "- TODOs: $(ag_count 'TODO' "$file")"
    echo "- Unsafe any: $(ag_count 'as any' "$file")"
  } > "$output"
  
  echo "$output"
}

analyze_directory() {
  local dir="${1:-.}"
  local output="$BEANS_ANALYSIS/directory-$(date +%s).md"
  
  mkdir -p "$BEANS_ANALYSIS"
  
  {
    echo "# Directory Analysis: $dir"
    echo ""
    echo "## Statistics"
    snapshot_stats
    echo ""
    echo "## Code Quality Issues"
    echo "- Console logs: $(ag_count 'console.log($$$)' "$dir")"
    echo "- TODOs: $(ag_count 'TODO' "$dir")"
    echo "- FIXMEs: $(ag_count 'FIXME' "$dir")"
    echo "- Unsafe any: $(ag_count 'as any' "$dir")"
    echo ""
    echo "## File Types"
    find "$dir" -type f -name "*.ts" | wc -l | xargs echo "TypeScript:"
    find "$dir" -type f -name "*.js" | wc -l | xargs echo "JavaScript:"
    find "$dir" -type f -name "*.py" | wc -l | xargs echo "Python:"
  } > "$output"
  
  echo "$output"
}

# ═══════════════════════════════════════════════════════════════════════════════
# CACHING
# ═══════════════════════════════════════════════════════════════════════════════

cache_set() {
  local key="$1"
  local value="$2"
  mkdir -p "$BEANS_CACHE"
  echo "$value" > "$BEANS_CACHE/$key"
}

cache_get() {
  local key="$1"
  cat "$BEANS_CACHE/$key" 2>/dev/null
}

cache_clear() {
  rm -rf "$BEANS_CACHE"/*
}

# ═══════════════════════════════════════════════════════════════════════════════
# DIFF ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════

diff_snapshots() {
  local snap1="$1"
  local snap2="$2"
  diff "$snap1" "$snap2" 2>/dev/null || true
}

changes_since_commit() {
  local commit="${1:-HEAD~1}"
  git diff --name-only "$commit" 2>/dev/null
}

analyze_changes() {
  local commit="${1:-HEAD~1}"
  local output="$BEANS_ANALYSIS/changes-$(date +%s).md"
  
  mkdir -p "$BEANS_ANALYSIS"
  
  {
    echo "# Changes Since $commit"
    echo ""
    echo "## Modified Files"
    changes_since_commit "$commit"
    echo ""
    echo "## Diff Summary"
    git diff --stat "$commit" 2>/dev/null
  } > "$output"
  
  echo "$output"
}

# Export all functions
export -f ts_parse ts_functions ts_classes
export -f ag_find ag_console_logs ag_todos ag_unsafe_any ag_count
export -f snapshot_codebase snapshot_focused snapshot_stats
export -f cscope_init cscope_find_def cscope_find_refs cscope_find_callers
export -f ctags_generate ctags_find
export -f analyze_file analyze_directory
export -f cache_set cache_get cache_clear
export -f diff_snapshots changes_since_commit analyze_changes
