# Ralph Prompt Template

The prompt given to Claude Code on each iteration.

## Structure

```markdown
# Task: [Project name from PRD]

You are implementing a feature based on this PRD:
[PRD JSON embedded]

## Current Progress
[Contents of progress.txt]

## Instructions

1. Review the PRD and progress
2. Pick the next incomplete task
3. Implement it with tests
4. Update progress.txt with what you completed
5. If ALL tasks are done, output: <promise>All requirements implemented</promise>

## Rules

- One task per iteration
- Run tests after changes
- Commit after each task
- Use existing patterns from codebase
```

## Exit Signal

When Ralph detects `<promise>` in Claude's output, it:
1. Stops the loop
2. Creates a PR
3. Closes the beads issue

## Customization

Edit `.beans/prompt.md` after `beans pick` to customize instructions for specific tasks.
