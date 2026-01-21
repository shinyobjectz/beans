# BEANS v2.0

> **B**eads + r**A**lph + val**U** = BEA**NS**

Autonomous development plugin for Claude Code.

## Commands

Only 3 commands to remember:

| Command | Description |
|---------|-------------|
| `/beans "Add feature X"` | Full autonomous flow |
| `/beans:status` | Show current task status |
| `/beans:land` | Commit, push, close issue |

### Usage Examples

```bash
/beans                              # List ready issues
/beans "Add OAuth2 login"           # Create issue → research → plan → build → land
/beans "Add OAuth2 login" --quick   # Skip interactive phases
/beans task-001                     # Continue existing issue
/beans:status                       # Check progress
/beans:land                         # Finish and push
```

## What `/beans` Does

```
/beans "Add feature X"
         │
         ├─→ Create Issue (beads)
         │
         ├─→ Research Codebase
         │
         ├─→ Generate Plan
         │     ├── requirements.md
         │     ├── design.md
         │     └── tasks.md
         │
         ├─→ Execute Tasks
         │     └── (with quality checks)
         │
         └─→ Land
               ├── commit
               ├── push
               └── close issue
```

## Subagents

BEANS orchestrates 9 specialized agents via the **Task** tool:

| Agent | Phase | Tools |
|-------|-------|-------|
| research-analyst | Research | Valyu MCP, ast-grep, repomix |
| product-manager | Requirements | Read, Grep |
| architect-reviewer | Design | Read, Grep |
| task-planner | Tasks | Read, Grep |
| spec-executor | Build | Read, Write, Bash |
| code-reviewer | Quality | ReadLints, Grep |
| test-engineer | Testing | Bash (test commands) |
| optimizer | Fix | Write, ReadLints |
| doc-generator | Docs | Read, Write |

### Invoking Subagents

Subagents are invoked using Claude Code's Task tool:

```
Task: Research the codebase for implementing OAuth2 login

Use valyu:knowledge for external docs.
Use ast-grep to find auth patterns.
Output to ./specs/task-001/research.md

subagent_type: research-analyst
```

### Agent Routing

| Agent | Model |
|-------|-------|
| research-analyst | claude-sonnet-4-20250514 |
| code-reviewer | claude-3-5-haiku-latest |
| doc-generator | claude-3-5-haiku-latest |
| (others) | inherit from parent |

## Configuration

API keys stored in `~/.beans/config.json`:

```bash
beans config --valyu    # Set Valyu API key (research)
beans config --github   # Set GitHub token (PRs)
beans config --show     # Show current config
```

## Data Directory

Everything lives in `.beans/` (single unified directory):

```
.beans/                 # All BEANS + Beads data
├── beads.db            # Issue tracker database
├── issues.jsonl        # Issue data (git-tracked)
├── config.yaml         # Beads config
├── analysis/           # Code analysis results
├── context/            # Codebase snapshots
├── cache/              # Cached data
└── logs/               # Subagent logs

specs/                  # Spec artifacts
└── <feature>/
    ├── research.md
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

## Hooks

BEANS registers a **Stop hook** that runs when Claude Code session ends:

```
hooks/
├── hooks.json          # Hook configuration
└── scripts/
    └── stop-watcher.sh # Cleanup on session stop
```

**What the Stop hook does:**
- Syncs beads state (`bd sync`)
- Cleans up `.ralph-state.json` and `.beans-state.json`
- Removes orphaned temp files
- Clears old cache (>7 days)

## Under the Hood

BEANS combines:
- **Beads** - 31 commands for issue tracking (`bd` CLI)
- **Ralph** - 13 commands for spec-driven development
- **Code Intelligence** - ast-grep, repomix, tree-sitter

These are available if needed but abstracted by the `/beans` command.
