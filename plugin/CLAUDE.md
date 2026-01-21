# BEANS v2.0

> **B**eads + r**A**lph + val**U** = BEA**NS** + Code Intelligence

Unified Claude Code plugin combining:
- **Beads** - Git-backed issue tracking (`bd` CLI)
- **Ralph** - Spec-driven autonomous execution
- **Valyu** - Knowledge retrieval MCP
- **Code Intelligence** - AST analysis, snapshots, quality tools

## Quick Start

```bash
# Setup (one time)
./plugin/scripts/beans-setup.sh

# Verify
./plugin/scripts/verify-beans-setup.sh

# Use
/beans "Add OAuth2 login"           # Full flow: issue → spec → execute
/beans "Add OAuth2 login" --quick   # Quick mode: auto-generate, execute
/beans list                         # Show ready issues
```

## Architecture

```
plugin/
├── plugin.json                 # Manifest + hooks
├── mcp.json                    # Valyu MCP config
├── CLAUDE.md                   # This file
│
├── commands/
│   ├── beans.md                # Main entry: /beans
│   ├── bd/                     # 31 beads commands
│   └── ralph/                  # 13 ralph-specum commands
│
├── agents/                     # 13 subagents total
│   ├── code-reviewer.md        # Security, quality, performance review
│   ├── test-engineer.md        # Test coverage optimization
│   ├── optimizer.md            # Fix issues found by reviewer
│   ├── doc-generator.md        # Documentation generation
│   ├── integration-tester.md   # E2E and integration tests
│   ├── research-analyst.md     # (from ralph) Codebase research
│   ├── product-manager.md      # (from ralph) Requirements
│   ├── architect-reviewer.md   # (from ralph) Design
│   ├── task-planner.md         # (from ralph) Task breakdown
│   ├── spec-executor.md        # (from ralph) Task execution
│   └── ...
│
├── skills/                     # Combined skills
├── templates/                  # Spec templates
│
├── lib/
│   └── code-intelligence.sh    # Local analysis tools
│
├── config/
│   └── hooks.json              # Auto-review hooks
│
└── scripts/
    ├── beans-setup.sh          # Full environment setup
    ├── verify-beans-setup.sh   # Verify installation
    ├── build-unified.sh        # Rebuild from sources
    └── install.sh              # Install to project
```

## Commands

### Main Entry
| Command | Description |
|---------|-------------|
| `/beans` | List ready issues |
| `/beans "goal"` | Full flow: create issue → spec → execute |
| `/beans "goal" --quick` | Quick mode: auto-generate and execute |
| `/beans <issue-id>` | Build from existing beads issue |
| `/beans status` | Show current spec + issue status |

### Beads (`/bd:*`)
| Command | Description |
|---------|-------------|
| `/bd:create` | Create new issue |
| `/bd:show <id>` | Show issue details |
| `/bd:update <id>` | Update issue |
| `/bd:close <id>` | Close issue |
| `/bd:ready` | List ready (unblocked) issues |
| `/bd:sync` | Sync with git |
| `/bd:prime` | Load AI context |

### Ralph (`/ralph:*`)
| Command | Description |
|---------|-------------|
| `/ralph:start` | Smart entry point |
| `/ralph:research` | Research phase |
| `/ralph:requirements` | Requirements phase |
| `/ralph:design` | Design phase |
| `/ralph:tasks` | Task planning phase |
| `/ralph:implement` | Execute tasks |

## Code Intelligence Tools

### AST-Grep (Pattern Search)
```bash
# Find console.logs
ast-grep --pattern 'console.log($$$)' src/

# Find TODOs
ast-grep --pattern 'TODO: $COMMENT' src/

# Find unsafe any
ast-grep --pattern 'as any' src/
```

### Repomix (Codebase Snapshots)
```bash
# Full snapshot
repomix --output codebase.md

# Filtered snapshot
repomix --include 'src/**/*.ts' --exclude 'node_modules' --output context.md

# Statistics
repomix --stats
```

### Tree-Sitter (AST Parsing)
```bash
# Parse file
tree-sitter parse src/app.ts

# Query functions
tree-sitter query -c 'src/' <<'QUERY'
(function_declaration name: (identifier) @func)
QUERY
```

### Code Intelligence Library
```bash
# Source the library
source ~/.local/share/beans/code-intelligence.sh

# Analyze file
analyze_file src/app.ts

# Snapshot codebase for task
snapshot_codebase "task-001" "1"

# Find all console.logs
ag_console_logs src/
```

## Subagents

### Quality Pipeline
```
Code Change
    │
    ▼
┌─────────────────┐
│ code-reviewer   │  Security, performance, quality analysis
└────────┬────────┘
         │ Issues found?
         ▼
┌─────────────────┐
│ optimizer       │  Fix identified issues
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ test-engineer   │  Ensure 85%+ coverage
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ integration-    │  E2E validation
│ tester          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ doc-generator   │  Update documentation
└─────────────────┘
```

### Model Routing
| Agent | Default Model | Quick Model |
|-------|---------------|-------------|
| code-reviewer | claude-sonnet-4 | claude-3.5-haiku |
| test-engineer | claude-sonnet-4 | - |
| optimizer | claude-sonnet-4 | - |
| doc-generator | claude-3.5-haiku | - |
| integration-tester | claude-sonnet-4 | - |

## Hooks

Configured in `config/hooks.json`:

| Hook | Trigger | Action |
|------|---------|--------|
| SessionStart | Session begins | `bd prime` |
| PreCompact | Before compaction | `bd prime` |
| PostEdit | After file edit | code-reviewer (haiku) |
| PreCommit | Before commit | lint + test |
| TaskComplete | Task finishes | test-engineer + `bd sync` |

## Workflow

### Standard Mode
```
/beans "Add OAuth2 login"
         │
         ▼
┌─────────────────┐
│ Create Issue    │  bd create → task-042
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Research        │  research-analyst → research.md
└────────┬────────┘
         │ User: /beans:requirements
         ▼
┌─────────────────┐
│ Requirements    │  product-manager → requirements.md
└────────┬────────┘
         │ User: /beans:design
         ▼
┌─────────────────┐
│ Design          │  architect-reviewer → design.md
└────────┬────────┘
         │ User: /beans:tasks
         ▼
┌─────────────────┐
│ Tasks           │  task-planner → tasks.md
└────────┬────────┘
         │ User: /beans:implement
         ▼
┌─────────────────┐
│ Execute         │  spec-executor (loops)
│ + Quality       │  code-reviewer → optimizer → test-engineer
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Complete        │  bd close + bd sync + git push
└─────────────────┘
```

### Quick Mode
```
/beans "Add OAuth2 login" --quick
         │
         ▼
    plan-synthesizer generates all artifacts
         │
         ▼
    spec-executor + quality agents run all tasks
         │
         ▼
    Auto-commit and close
```

## Installation

### Full Setup
```bash
# Run setup script
./plugin/scripts/beans-setup.sh

# Verify
./plugin/scripts/verify-beans-setup.sh
```

### Manual Install
```bash
# Link plugin
ln -s /path/to/beans/plugin ~/.claude/plugins/beans

# Install tools
npm install -g ast-grep repomix
```

## Environment

```bash
export VALYU_API_KEY="..."      # For research (optional)
export GITHUB_TOKEN="..."       # For PR creation (optional)
```

## Source Packages

Unified from:
- `package/beads/claude-plugin/` - 31 commands
- `package/smart-ralph/plugins/ralph-specum/` - 13 commands, 8 agents
- `package/valyu/` - MCP server

Rebuild: `./scripts/build-unified.sh`

## Monitoring

```bash
# View subagent activity
cat .beans/logs/subagent-activity.log

# View analysis results
cat .beans/analysis/task-001-*.md

# Compare snapshots
diff .beans/context/task-001_iter-1.md .beans/context/task-001_iter-2.md
```
