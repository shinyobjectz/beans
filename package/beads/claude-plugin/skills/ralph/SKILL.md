---
name: ralph
description: >
  Autonomous development loop that converts beads issues into working code.
  Uses Gemini + Exa for research, Claude Code for implementation, with
  automatic PR creation and issue closure.
allowed-tools: "Read,Bash(bun:*,./scripts/*,git:*,gh:*,bd:*)"
version: "1.0.0"
author: "Project.Social"
license: "MIT"
---

# Ralph - Autonomous Development Loop

Converts beads issues into working code through iterative Claude Code execution.

## Overview

Ralph automates the full development cycle:
1. **Pick** a beads issue
2. **Research** with Gemini + Exa web search
3. **Generate** PRD (Project Requirements Document)
4. **Execute** Claude Code in a loop until complete
5. **Create** PR and close issue

## Prerequisites

```bash
# Required environment variables in .env.local
OPENROUTER_API_KEY=sk-or-...   # For Gemini PRD generation
GITHUB_TOKEN=ghp_...           # For PR creation
```

## Workflow

### Quick Start
```bash
# Full automation: issue → research → build → PR → close
./scripts/beans auto <issue-id>
```

### Step-by-Step
```bash
# 1. List ready issues
./scripts/beans list

# 2. Pick issue and generate PRD
./scripts/beans pick <issue-id>

# 3. Run Ralph Loop
./scripts/beans run [iterations]
```

## State Files

Ralph stores state in `.beans/` alongside issues:

| File | Purpose |
|------|---------|
| `.beans/current.json` | Active task PRD |
| `.beans/prompt.md` | Claude Code iteration prompt |
| `.beans/progress.txt` | Execution log |
| `.beans/last-research.md` | Gemini research output |

## Exit Conditions

Ralph stops when:
- Claude outputs `<promise>` tag (success)
- Max iterations reached (needs review)
- Error occurs (rollback)

## Integration with Beads

| Beads Command | Ralph Action |
|---------------|--------------|
| `bd ready` | Lists candidates for Ralph |
| `bd show <id>` | Provides issue context for PRD |
| `bd update --status` | Tracks in_progress |
| `bd close` | Marks complete after PR |

## Resources

| Resource | Content |
|----------|---------|
| [PRD_FORMAT.md](resources/PRD_FORMAT.md) | PRD JSON schema |
| [PROMPT_TEMPLATE.md](resources/PROMPT_TEMPLATE.md) | Iteration prompt structure |
| [EXIT_CONDITIONS.md](resources/EXIT_CONDITIONS.md) | When Ralph stops |
