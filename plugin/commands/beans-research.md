---
description: Run research phase for current spec
argument-hint: [spec-name] [--quick]
allowed-tools: [Read, Write, Task, Bash]
---

# /beans:research - Research Phase

Runs or re-runs the research phase, delegating to research-analyst subagent.

<mandatory>
**YOU ARE A COORDINATOR.** Delegate ALL research to the research-analyst subagent.
</mandatory>

## Determine Active Spec

1. If `$ARGUMENTS` contains spec name, use it
2. Otherwise read `./specs/.current-spec`
3. If none: error "No active spec. Run /beans:new <name> first."

## Execute Research

<mandatory>
Spawn research agents in parallel for speed:
- `research-analyst` for external/web research
- `Explore` for codebase analysis (fast, read-only)
</mandatory>

**Task 1 - External Research:**
```
Task: Research external best practices for this spec

Spec: $spec
Path: ./specs/$spec/

1. WebSearch for best practices and patterns
2. Research relevant libraries/frameworks
3. Document in ./specs/$spec/.research-external.md

subagent_type: research-analyst
```

**Task 2 - Codebase Analysis:**
```
Task: Analyze codebase patterns for this spec

Spec: $spec
Path: ./specs/$spec/

1. Find existing patterns using ast-grep
2. Identify dependencies and constraints
3. Document in ./specs/$spec/.research-codebase.md

subagent_type: Explore
```

## Merge Results

After parallel tasks complete, merge into `./specs/$spec/research.md`:

```markdown
# Research: $spec

## Executive Summary
[Key findings]

## External Research
[From .research-external.md]

## Codebase Analysis
[From .research-codebase.md]

## Recommendations
[Consolidated recommendations]
```

Delete temp files after merge.

## Update State

```json
{
  "phase": "research",
  "awaitingApproval": true
}
```

## Output

```
Research complete for '$spec'.
Output: ./specs/$spec/research.md

Next: Review research.md, then run /beans:requirements
```
