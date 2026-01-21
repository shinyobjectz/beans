---
description: Generate requirements from research
argument-hint: [spec-name] [--quick]
allowed-tools: [Read, Write, Task, Bash]
---

# /beans:requirements - Requirements Phase

Generates requirements, delegating to product-manager subagent.

<mandatory>
Delegate ALL requirements work to `product-manager` subagent.
</mandatory>

## Determine Active Spec

Read `./specs/.current-spec` or use argument.

## Execute Requirements

```
Task: Generate requirements for spec: $spec

Path: ./specs/$spec/
Research: [include research.md content]

Create:
1. User stories with acceptance criteria
2. Functional requirements (FR-*)
3. Non-functional requirements (NFR-*)
4. Out-of-scope items
5. Dependencies

Output: ./specs/$spec/requirements.md

subagent_type: product-manager
```

## Update State

```json
{
  "phase": "requirements",
  "awaitingApproval": true
}
```

## Output

```
Requirements complete for '$spec'.
Output: ./specs/$spec/requirements.md

Next: Run /beans:design
```
