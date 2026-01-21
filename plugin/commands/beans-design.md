---
description: Generate technical design from requirements
argument-hint: [spec-name] [--quick]
allowed-tools: [Read, Write, Task, Bash]
---

# /beans:design - Design Phase

Generates technical design, delegating to architect-reviewer subagent.

<mandatory>
Delegate ALL design work to `architect-reviewer` subagent.
</mandatory>

## Determine Active Spec

Read `./specs/.current-spec` or use argument.

## Validate

Check `./specs/$spec/requirements.md` exists.

## Execute Design

```
Task: Create technical design for spec: $spec

Path: ./specs/$spec/
Requirements: [include requirements.md]
Research: [include research.md if exists]

Create:
1. Architecture diagram (mermaid)
2. Component responsibilities
3. Technical decisions with rationale
4. File structure (create/modify)
5. Interfaces (TypeScript)
6. Error handling
7. Test strategy

Output: ./specs/$spec/design.md

subagent_type: architect-reviewer
```

## Update State

```json
{
  "phase": "design",
  "awaitingApproval": true
}
```

## Output

```
Design complete for '$spec'.
Output: ./specs/$spec/design.md

Next: Run /beans:tasks
```
