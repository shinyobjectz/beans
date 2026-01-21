---
description: Auto-build features from prompts or issues
argument-hint: [description or issue-id]
---

# /beans - One-command automation

**Usage**:
- `/beans` - List ready issues
- `/beans Add dark mode toggle` - Create issue + research + build + PR
- `/beans jibe-123` - Build existing issue

**Examples**:
```
/beans
/beans Add user authentication with OAuth
/beans Fix the login page crash on mobile
/beans jibe-42
```

**What happens**:
1. Creates beads issue (if description given)
2. Researches with Gemini + Exa web search
3. Generates PRD in `.beans/current.json`
4. Runs Claude Code in autonomous loop
5. Creates PR and closes issue

**Options** (append to command):
- `--no-confirm` - Skip confirmation prompts
- `--iterations N` - Set max iterations (default: 20)
