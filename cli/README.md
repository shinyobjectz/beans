<p align="center">
  <img src="static/image.png" alt="BEANS Banner" width="100%">
</p>

# BEANS

> **B**eads + r**A**lph + val**U** = BEA**NS**

**Unified autonomous development plugin for Claude Code** combining git-backed issue tracking, spec-driven execution, and code intelligence tools.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What is BEANS?

BEANS is a Claude Code plugin that automates the entire software development lifecycle:

```
/beans "Add OAuth2 authentication"
```

This single command:
1. Creates a tracked issue (Beads)
2. Researches your codebase (Ralph)
3. Generates requirements, design, and tasks
4. Executes tasks autonomously with quality checks
5. Commits, pushes, and closes the issue

## Features

### Integrated Components

| Component | Purpose | Source |
|-----------|---------|--------|
| **Beads** | Git-backed issue tracking | `package/beads/` |
| **Ralph** | Spec-driven autonomous execution | `package/smart-ralph/` |
| **Valyu** | Knowledge retrieval MCP | `package/valyu/` |
| **Code Intelligence** | AST analysis & snapshots | `plugin/lib/` |

### 13 Specialized Subagents

| Agent | Role |
|-------|------|
| `research-analyst` | Codebase research and analysis |
| `product-manager` | Requirements generation |
| `architect-reviewer` | Technical design |
| `task-planner` | Task breakdown |
| `spec-executor` | Autonomous task execution |
| `code-reviewer` | Security, quality, performance review |
| `test-engineer` | Test coverage optimization (85%+) |
| `optimizer` | Fix issues found by reviewer |
| `doc-generator` | Documentation generation |
| `integration-tester` | E2E and integration tests |
| `plan-synthesizer` | Quick mode artifact generation |
| `qa-engineer` | Quality assurance |
| `refactor-specialist` | Code refactoring |

### Code Intelligence Tools

- **ast-grep** - Pattern-based semantic code search
- **repomix** - AI-friendly codebase snapshots
- **tree-sitter** - AST parsing for 100+ languages
- **ctags/cscope** - Symbol navigation

## Quick Start

### Installation

```bash
# Install CLI from npm
npm install -g @morebeans/cli

# Or with bun
bun install -g @morebeans/cli

# Initialize in your project
cd /your/project
beans init
beans config --valyu    # Set Valyu API key (optional)
beans doctor            # Verify setup
```

### CLI Commands

```bash
beans init              # Initialize BEANS in current project
beans config            # Configure API keys interactively
beans config --valyu    # Set Valyu API key
beans config --github   # Set GitHub token  
beans config --show     # Show current configuration
beans doctor            # Check installation status
beans help              # Show help
```

### Configuration

API keys stored in `~/.beans/config.json`:
```json
{
  "valyu_api_key": "val_...",
  "github_token": "ghp_..."
}
```

### Usage

```bash
# In Claude Code:

/beans                              # List ready issues
/beans "Add dark mode toggle"       # Full autonomous flow
/beans "Add dark mode" --quick      # Quick mode (skip spec phases)
/beans task-042                     # Build existing issue

# Individual phases:
/beans:research                     # Research phase only
/beans:requirements                 # Requirements phase only
/beans:design                       # Design phase only
/beans:tasks                        # Task planning only
/beans:implement                    # Execute tasks

# Beads commands:
/bd:create "Bug: login fails"       # Create issue
/bd:show task-042                   # Show issue details
/bd:ready                           # List unblocked issues
/bd:close task-042                  # Close issue
```

## Architecture

```
beans/
├── package/
│   ├── beads/                      # Git-backed issue tracker (Go)
│   │   └── claude-plugin/          # 31 Claude Code commands
│   ├── smart-ralph/                # Spec-driven development
│   │   └── plugins/
│   │       ├── ralph-specum/       # Research→Design→Tasks→Execute
│   │       └── ralph-speckit/      # Constitution-first methodology
│   └── valyu/                      # Knowledge retrieval MCP
│
└── plugin/                         # Unified BEANS plugin
    ├── plugin.json                 # Manifest + hooks
    ├── CLAUDE.md                   # Documentation
    ├── commands/
    │   ├── beans.md                # Main /beans command
    │   ├── bd/                     # 31 beads commands
    │   └── ralph/                  # 13 ralph commands
    ├── agents/                     # 13 subagents
    ├── skills/                     # 10 skill definitions
    ├── templates/                  # Spec templates
    ├── lib/
    │   └── code-intelligence.sh    # AST tools wrapper
    ├── config/
    │   └── hooks.json              # Auto-review hooks
    └── scripts/
        ├── beans-setup.sh          # Environment setup
        ├── verify-beans-setup.sh   # Verify installation
        ├── build-unified.sh        # Rebuild from sources
        └── install.sh              # Install to project
```

## Workflow

### Standard Mode

```
/beans "Add OAuth2 login"
         │
         ▼
┌─────────────────┐
│ Create Issue    │  → task-042
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Research        │  → research.md
└────────┬────────┘
         │ (user reviews, runs /beans:requirements)
         ▼
┌─────────────────┐
│ Requirements    │  → requirements.md
└────────┬────────┘
         │ (user reviews, runs /beans:design)
         ▼
┌─────────────────┐
│ Design          │  → design.md
└────────┬────────┘
         │ (user reviews, runs /beans:tasks)
         ▼
┌─────────────────┐
│ Tasks           │  → tasks.md
└────────┬────────┘
         │ (user runs /beans:implement)
         ▼
┌─────────────────┐
│ Execute         │  Loops through tasks
│ + Quality       │  code-reviewer → optimizer → test-engineer
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Complete        │  Close issue, commit, push
└─────────────────┘
```

### Quick Mode

```bash
/beans "Add OAuth2 login" --quick
```

Skips interactive phases, auto-generates all artifacts, starts execution immediately.

## Hooks

| Event | Action |
|-------|--------|
| `SessionStart` | Load beads context (`bd prime`) |
| `PreCompact` | Preserve beads context |
| `PostEdit` | Auto-review with code-reviewer (haiku) |
| `PreCommit` | Run lint + tests |
| `TaskComplete` | Verify coverage + sync beads |

## Code Intelligence

```bash
# Source the library
source ~/.local/share/beans/code-intelligence.sh

# AST-based code search
ag_find 'console.log($$$)' src/
ag_todos src/

# Codebase snapshots
snapshot_codebase "task-001" "1"

# File analysis
analyze_file src/app.ts

# Directory analysis
analyze_directory src/
```

## Environment Variables

```bash
export VALYU_API_KEY="..."      # For Valyu research (optional)
export GITHUB_TOKEN="..."       # For PR creation (optional)
```

## Development

### Rebuild Plugin

```bash
# Rebuild from source packages
./plugin/scripts/build-unified.sh
```

### Plugin Structure

The unified plugin merges:
- `package/beads/claude-plugin/` → `plugin/commands/bd/`
- `package/smart-ralph/plugins/ralph-specum/` → `plugin/commands/ralph/`, `plugin/agents/`
- Custom agents → `plugin/agents/`
- Code intelligence → `plugin/lib/`

## Related Projects

- [Beads](https://github.com/steveyegge/beads) - Original git-backed issue tracker
- [Smart Ralph](https://github.com/tzachbon/smart-ralph) - Spec-driven development plugins
- [Claude Code Plugins](https://github.com/anthropics/claude-code-plugins) - Official plugin docs

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**BEANS v2.0** - Autonomous development, simplified.
