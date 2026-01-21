---
description: BEANS - Autonomous development with validation-first workflow
argument-hint: ["description" | issue-id | status | --quick]
allowed-tools: [Read, Write, Edit, Task, Bash, AskUserQuestion]
---

# /beans - Autonomous Development

Single command for the entire development lifecycle. **Beads is the single source of truth. Validation gates closure.**

## Core Principle: Validation-First

<mandatory>
**Issues are NOT complete until validated.** Every feature must:
1. Define acceptance criteria (AC) upfront
2. Specify verification commands
3. Pass all ACs before closure
4. Have test evidence stored in beads

Closing based on "tasks done" is FORBIDDEN. Close only after VERIFICATION_PASS.
</mandatory>

## Usage

```bash
/beans                              # Auto-resume current or list ready issues
/beans "Add OAuth2 login"           # Full flow with validation
/beans "Add OAuth2 login" --quick   # Skip reviews, still validates
/beans issue-abc123                 # Continue specific issue
/beans status                       # Show progress + validation status
```

## Context Continuity (AUTO-MANAGED)

<mandatory>
**ALWAYS DO THIS FIRST** - Check for and resume existing work:

```bash
# Step 0: Auto-resume check (ALWAYS RUN FIRST)
if [ -f .beans/.current ]; then
  ISSUE_ID=$(cat .beans/.current)
  echo "📍 Resuming: $ISSUE_ID"
  bd show "$ISSUE_ID"
  bd comments "$ISSUE_ID" --limit 2  # See where we left off
fi
```

**During work**: After each phase/task, save progress:
```bash
bd comment "$ISSUE_ID" "✓ $PHASE complete. Next: $NEXT_STEP"
```

**The PreCompact hook automatically saves state before context compression.**
**On next `/beans`, you auto-resume from beads. User does nothing extra.**
</mandatory>

## When Research Triggers

<mandatory>
Research happens automatically in these scenarios:

1. **New Feature** (Step 2): Valyu + codebase analysis for best practices
2. **Troubleshooting**: When you hit an error or unexpected behavior
3. **Blocked Tasks**: If a task fails verification, research alternatives
4. **Unknown Patterns**: If codebase doesn't have existing pattern to follow

**Always use structured research:**

```
# Valyu search (auto-stores with issue_id)
knowledge({
  query: "your search query",
  search_type: "all",
  issue_id: "$ISSUE_ID"
})

# Manual storage for WebSearch/codebase findings
research_store({
  issue_id: "$ISSUE_ID",
  source: "web" | "codebase",
  title: "...",
  content: "...",
  relevance: 0.0-1.0
})

# Query stored research
research_query({ issue_id: "$ISSUE_ID" })
```

**Benefits:** Findings are queryable, referenceable by ID, persist across sessions.
</mandatory>

## Philosophy: Beads as Single Source of Truth

<mandatory>
ALL project artifacts are stored in beads, NOT separate files:
- **Research** → Issue comment
- **Requirements** → Issue description + sub-issues
- **Acceptance Criteria** → Issue comment (AC-1, AC-2, etc.)
- **Design** → Issue comment
- **Tasks** → Sub-issues with task type
- **Validation** → `.beans/validation/{issue-id}.json` + issue comment
- **Progress** → Issue comments + status updates

NO separate specs/ directory. Everything lives in beads.
</mandatory>

## Validation Metadata

<mandatory>
Each issue tracks validation state in `.beans/validation/{issue-id}.json`:

```json
{
  "issue_id": "proj-123",
  "acceptance_criteria": [
    {"id": "AC-1", "text": "User can login via Google", "status": "pending", "evidence": null},
    {"id": "AC-2", "text": "Session persists on refresh", "status": "pending", "evidence": null}
  ],
  "verify_command": "bun test src/auth",
  "e2e_tests": ["tests/e2e/auth.spec.ts"],
  "validation_runs": [],
  "final_status": "pending"
}
```

Create this file during Step 3.5 (Acceptance Criteria phase).
</mandatory>

## Determine Action

**FIRST**: Run auto-resume check above.

Parse `$ARGUMENTS`:

1. **No args** → Check `.beans/.current` first, resume if exists, else `bd ready`
2. **"status"** → Show detailed progress via `bd show`
3. **Quoted description** → Create issue, start workflow
4. **Issue ID** → Continue existing issue
5. **--quick** → Auto-generate everything, execute immediately

## New Feature (quoted description)

### Step 1: Create Beads Issue

```bash
# Create the main feature issue
ISSUE_ID=$(bd create "$description" -t feature --json | jq -r '.id')
bd update "$ISSUE_ID" --status in_progress

# Store as current work (for auto-resume across context compactions)
mkdir -p .beans
echo "$ISSUE_ID" > .beans/.current
```

### Step 2: Research Phase

<mandatory>
Delegate to research-analyst, store findings in beads:
</mandatory>

```
Task: Research for implementing: $description

1. WebSearch for best practices
2. Explore codebase for patterns
3. Assess feasibility

Store your findings - I will add them to the beads issue.

subagent_type: research-analyst
```

After research returns, add to beads:
```bash
bd comment "$ISSUE_ID" "## Research Findings

$RESEARCH_CONTENT

---
Phase: research → requirements"
```

### Step 3: Requirements Phase

<mandatory>
Delegate to product-manager, create requirement sub-issues:
</mandatory>

```
Task: Generate requirements for: $description

Research context: [from previous phase]

Output as structured list:
- FR-1: [requirement]
- FR-2: [requirement]
- NFR-1: [non-functional]

subagent_type: product-manager
```

Create sub-issues for each requirement:
```bash
# For each requirement
bd create "FR-1: $requirement_text" -t task --parent "$ISSUE_ID"
bd create "NFR-1: $nfr_text" -t task --parent "$ISSUE_ID"
```

Update main issue description:
```bash
bd edit "$ISSUE_ID" --description "## Goal
$description

## Requirements
- FR-1: ...
- FR-2: ...

## Status: requirements complete"
```

### Step 3.5: Acceptance Criteria (MANDATORY)

<mandatory>
Convert requirements into testable acceptance criteria. This is NOT optional.
</mandatory>

```bash
# Create validation metadata file
mkdir -p .beans/validation
cat > ".beans/validation/$ISSUE_ID.json" << 'EOF'
{
  "issue_id": "$ISSUE_ID",
  "acceptance_criteria": [],
  "verify_command": "",
  "e2e_tests": [],
  "validation_runs": [],
  "final_status": "pending"
}
EOF
```

For each requirement, create a testable AC:
```bash
# AC format: "When [condition], then [expected observable result]"

# Example ACs for OAuth feature:
# AC-1: When user clicks "Login with Google", then OAuth popup appears
# AC-2: When OAuth completes successfully, then user is redirected to /dashboard
# AC-3: When user refreshes page while logged in, then session persists
# AC-4: When user clicks logout, then all tokens are cleared and redirected to /login
```

Add ACs to beads AND validation file:
```bash
bd comment "$ISSUE_ID" "## Acceptance Criteria

- AC-1: When user clicks 'Login with Google', then OAuth popup appears
- AC-2: When OAuth completes successfully, then user redirected to /dashboard
- AC-3: When user refreshes while logged in, then session persists
- AC-4: When user clicks logout, then tokens cleared and redirected to /login

### Verification
- **Command:** \`bun test src/auth\`
- **E2E:** \`tests/e2e/auth.spec.ts\` (to be created)

---
Phase: acceptance-criteria → design"

# Update validation JSON (use jq or write directly)
```

<mandatory>
**Verify command MUST be specified.** If no tests exist yet, specify:
- `verify_command`: "bun test src/{feature}" (will be created during tasks)
- `e2e_tests`: ["tests/e2e/{feature}.spec.ts:generate"] (marked for generation)
</mandatory>

### Step 4: Design Phase

<mandatory>
Delegate to architect-reviewer, store design in beads:
</mandatory>

```
Task: Create technical design for: $description

Requirements: [from beads issue]

Output:
- Architecture overview
- Key technical decisions
- File changes needed

subagent_type: architect-reviewer
```

Add design to beads:
```bash
bd comment "$ISSUE_ID" "## Technical Design

$DESIGN_CONTENT

### Files to Change
- path/to/file.ts: Add X
- path/to/other.ts: Modify Y

---
Phase: design → tasks"
```

### Step 5: Task Planning

<mandatory>
Delegate to task-planner, create task sub-issues:
</mandatory>

```
Task: Break into implementation tasks

Design: [from beads issue]

Output numbered task list with:
- Clear description
- Files to modify
- Verification command
- Commit message

subagent_type: task-planner
```

Create sub-issues for each task:
```bash
# For each task
TASK_ID=$(bd create "Task 1: $task_description" -t task --parent "$ISSUE_ID" --json | jq -r '.id')

# Add task details as comment
bd comment "$TASK_ID" "**Do:** $steps
**Files:** $files
**Verify:** $verify_command
**Commit:** $commit_message"
```

Update parent with task count:
```bash
bd comment "$ISSUE_ID" "## Implementation Plan

Created $TASK_COUNT tasks. Starting execution.

Tasks: $(bd list --parent $ISSUE_ID --json | jq -r '.[].id' | tr '\n' ' ')"
```

### Step 6: Execution Loop

Get tasks and execute each:
```bash
# Get incomplete tasks
TASKS=$(bd list --parent "$ISSUE_ID" --status open --json | jq -r '.[].id')
```

For each task:

<mandatory>
Delegate to spec-executor:
</mandatory>

```
Task: Execute beads task $TASK_ID

Read task details from beads.
Implement exactly as specified.
Output TASK_COMPLETE when done.

subagent_type: spec-executor
```

After task complete:
```bash
bd close "$TASK_ID" --reason "Implemented"
bd comment "$ISSUE_ID" "✓ Completed: $TASK_ID"
```

### On Error/Failure

If a task fails or hits unexpected errors, use **structured research**:

```bash
# 1. Log the error to beads
bd comment "$ISSUE_ID" "## ❌ Error in $TASK_ID
\`\`\`
$ERROR_OUTPUT
\`\`\`"
```

```
# 2. Research via Valyu (auto-stores with issue_id)
knowledge({
  query: "$ERROR_MESSAGE solution $FRAMEWORK",
  search_type: "all",
  issue_id: "$ISSUE_ID"  // Links findings to issue
})

# 3. Check codebase, store findings
Grep("$ERROR_TYPE" .)
research_store({
  issue_id: "$ISSUE_ID",
  query: "codebase error patterns",
  source: "codebase",
  title: "Similar error handling in codebase",
  content: "[grep results and analysis]",
  relevance: 0.9
})

# 4. Query all research for this issue
research_query({ issue_id: "$ISSUE_ID" })
```

```bash
# 5. Summarize and retry
bd comment "$TASK_ID" "## Troubleshooting
Research IDs: res-abc123, res-def456
Fix approach: [based on findings]"
```

Continue until all tasks closed.

### Step 6.5: Validation Gate (BLOCKING)

<mandatory>
**NEVER close an issue without VERIFICATION_PASS.** This step is NOT skippable, even in --quick mode.
</mandatory>

After all tasks complete, run the validation gate:

```bash
# 1. Load validation metadata
VALIDATION_FILE=".beans/validation/$ISSUE_ID.json"
VERIFY_CMD=$(jq -r '.verify_command' "$VALIDATION_FILE")
E2E_TESTS=$(jq -r '.e2e_tests[]' "$VALIDATION_FILE" 2>/dev/null | grep -v ':generate')
```

**Step 6.5.1: Run verification command**
```bash
echo "→ Running verification: $VERIFY_CMD"
if ! eval "$VERIFY_CMD"; then
  bd comment "$ISSUE_ID" "❌ Verification FAILED: \`$VERIFY_CMD\`"
  # Do NOT proceed - fix and retry
fi
```

**Step 6.5.2: Run E2E tests (if specified)**
```bash
if [ -n "$E2E_TESTS" ]; then
  echo "→ Running E2E tests..."
  bunx playwright test $E2E_TESTS
fi
```

**Step 6.5.3: Validate acceptance criteria**

<mandatory>
Delegate to validation-gate agent:
</mandatory>

```
Task: Validate all acceptance criteria for $ISSUE_ID

Read .beans/validation/$ISSUE_ID.json for ACs.
For each AC:
1. Find evidence in code/tests that it's satisfied
2. Run targeted verification if needed
3. Mark status: PASS, FAIL, or SKIP (with reason)

Output VERIFICATION_PASS only if ALL ACs pass.
Output VERIFICATION_FAIL if ANY AC fails.

subagent_type: validation-gate
```

**Step 6.5.4: Handle validation result**

On VERIFICATION_FAIL:
```bash
# Log failure
bd comment "$ISSUE_ID" "## ❌ Validation Failed

Failed ACs:
- AC-2: Session does not persist (cookie not set)

Creating remediation task..."

# Create fix task
TASK_ID=$(bd create "Fix: AC-2 session persistence" -t task --parent "$ISSUE_ID" --json | jq -r '.id')
bd comment "$TASK_ID" "**Problem:** Session cookie not being set
**AC:** When user refreshes while logged in, session persists
**Verify:** Manual test + bun test src/auth/session.test.ts"

# Return to execution loop - do NOT proceed to Land
```

On VERIFICATION_PASS:
```bash
# Update validation file
jq '.final_status = "passed" | .validation_runs += [{"timestamp": "'"$(date -Iseconds)"'", "result": "PASS"}]' \
  "$VALIDATION_FILE" > tmp.json && mv tmp.json "$VALIDATION_FILE"

# Log success
bd comment "$ISSUE_ID" "## ✅ Validation Passed

All acceptance criteria verified:
$(jq -r '.acceptance_criteria[] | "- " + .id + ": " + .status' "$VALIDATION_FILE")

Verification command: PASS
E2E tests: PASS

Proceeding to Land..."
```

### Step 7: Land (Only After Validation)

<mandatory>
This step ONLY runs after Step 6.5 returns VERIFICATION_PASS.
</mandatory>

```bash
# Final sync
bd sync

# Close with validation evidence
bd close "$ISSUE_ID" --reason "Validated: All ACs passed, tests green"

# Git
git add -A
git commit -m "feat($ISSUE_ID): $description

Validated:
- All acceptance criteria passed
- Verification: $VERIFY_CMD ✓
- E2E: $E2E_TESTS ✓"
git push

# Cleanup
rm -f .beans/.current

echo "🎉 Complete! Issue $ISSUE_ID validated and closed."
```

## Continue Existing Issue

```bash
# Load issue and show status
bd show "$ISSUE_ID"

# Get open tasks
OPEN_TASKS=$(bd list --parent "$ISSUE_ID" --status open)

# Continue from first open task
```

## Status Display

```bash
bd show "$ISSUE_ID"
bd list --parent "$ISSUE_ID"
```

Shows:
```
Issue: proj-a1b2c3 (in_progress)
"Add OAuth2 login"

Sub-issues:
  ✓ proj-d4e5f6: FR-1: User login endpoint
  ✓ proj-g7h8i9: Task 1: Create auth service
  ○ proj-j0k1l2: Task 2: Add middleware
  ○ proj-m3n4o5: Task 3: Write tests

Progress: 2/4 tasks
```

## Quick Mode

Skip interactive reviews, **but validation is STILL MANDATORY**:
1. Research → Requirements → ACs → Design → Tasks (no stops)
2. Create all beads sub-issues at once
3. Execute tasks
4. **Run validation gate** (cannot skip)
5. Land only after VERIFICATION_PASS

## Data Model

```
Feature Issue (proj-abc123)
├── Description: Goal + Requirements summary
├── Comments:
│   ├── Research findings
│   ├── Acceptance criteria (AC-1, AC-2, ...)
│   ├── Technical design
│   ├── Progress updates
│   └── Validation report (final)
├── Sub-issues:
│   ├── FR-1: Requirement (task)
│   ├── FR-2: Requirement (task)
│   ├── Task 1: Implementation (task)
│   ├── Task 2: Implementation (task)
│   ├── Task 3: Write tests (task)
│   └── Fix: AC-2 session (task) ← Created by validation failure
└── Validation:
    └── .beans/validation/proj-abc123.json
```

Validation file structure:
```json
{
  "issue_id": "proj-abc123",
  "acceptance_criteria": [
    {"id": "AC-1", "text": "OAuth popup appears", "status": "passed", "evidence": "auth.test.ts:15"},
    {"id": "AC-2", "text": "Session persists", "status": "passed", "evidence": "session.test.ts:32"}
  ],
  "verify_command": "bun test src/auth",
  "e2e_tests": ["tests/e2e/auth.spec.ts"],
  "validation_runs": [
    {"timestamp": "2024-01-15T10:30:00Z", "result": "FAIL", "failed_acs": ["AC-2"]},
    {"timestamp": "2024-01-15T11:45:00Z", "result": "PASS"}
  ],
  "final_status": "passed"
}
```

Everything queryable via `bd list`, `bd show`, `bd search`.
