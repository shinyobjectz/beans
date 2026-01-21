---
description: Create new beads issue and start research (use /beans instead for full auto)
argument-hint: <description> [--quick]
allowed-tools: [Bash, Task, AskUserQuestion]
---

# /beans:new - Create New Issue

Creates a beads issue and starts the research phase. 

**Prefer `/beans "description"` for full automation.**

## Usage

```bash
/beans:new "Add OAuth2 login"           # Create issue, start research
/beans:new "Add OAuth2 login" --quick   # Skip reviews
```

## Create Issue

```bash
ISSUE_ID=$(bd create "$description" -t feature --json | jq -r '.id')
bd update "$ISSUE_ID" --status in_progress
echo "$ISSUE_ID" > .beans-current
echo "Created: $ISSUE_ID"
```

## Research Phase

<mandatory>
Delegate to research-analyst:
</mandatory>

```
Task: Research for: $description

1. WebSearch for best practices
2. Explore codebase patterns
3. Assess feasibility

Return findings as markdown.

subagent_type: research-analyst
```

Store in beads:
```bash
bd comment "$ISSUE_ID" "## Research

$FINDINGS

---
Next: /beans:requirements or let /beans continue"
```

## Output

```
Created issue: $ISSUE_ID
Research added to issue.

Next: Run /beans to continue (auto) or /beans:requirements (manual)
```
