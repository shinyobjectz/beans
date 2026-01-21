---
description: Generate requirements as beads sub-issues
argument-hint: [issue-id]
allowed-tools: [Read, Task, Bash]
---

# /beans:requirements - Requirements Phase

Creates requirement sub-issues in beads.

**Usually called automatically by `/beans`.**

## Get Current Issue

```bash
ISSUE_ID=$(cat .beans-current 2>/dev/null)
[ -z "$ISSUE_ID" ] && echo "No current issue." && exit 1
```

## Execute

<mandatory>
Delegate to product-manager:
</mandatory>

```
Task: Generate requirements for $ISSUE_ID

Output structured requirements:
- FR-1: ...
- NFR-1: ...

subagent_type: product-manager
```

Create sub-issues:
```bash
bd create "FR-1: $text" -t task --parent "$ISSUE_ID"
```
