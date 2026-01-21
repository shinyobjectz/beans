# Ralph Exit Conditions

When and why Ralph stops executing.

## Success Exit

**Condition**: Claude outputs `<promise>` tag

```
<promise>All requirements implemented and tested</promise>
```

**Actions**:
1. Create PR with issue reference
2. Close beads issue with reason
3. Sync beads to git
4. Push all changes

## Iteration Limit

**Condition**: Max iterations reached (default: 20)

**Actions**:
1. Log partial completion
2. Keep issue in_progress
3. User reviews and continues manually

## Error Exit

**Condition**: Claude Code fails or errors

**Actions**:
1. Log error to progress.txt
2. Revert uncommitted changes
3. Reopen issue if closed
4. Alert user for manual intervention

## Manual Stop

**Condition**: User interrupts (Ctrl+C)

**Actions**:
1. Save current state
2. Commit any changes
3. Issue remains in_progress

## Checking Exit

The loop checks `progress.txt` for the promise tag:

```bash
if grep -q "<promise>" .beans/progress.txt; then
  # Success - wrap up
fi
```
