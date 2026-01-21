# Ralph Skill

Autonomous development loop for beads issues.

## Quick Reference

```bash
./scripts/beans list              # Show ready issues
./scripts/beans pick <id>         # Generate PRD from issue
./scripts/beans run [iterations]  # Execute Ralph Loop
./scripts/beans auto <id>         # Full automation
```

## Files

- `SKILL.md` - Main skill definition
- `resources/PRD_FORMAT.md` - PRD JSON schema
- `resources/PROMPT_TEMPLATE.md` - Claude iteration prompt
- `resources/EXIT_CONDITIONS.md` - When Ralph stops

## See Also

- [beads/SKILL.md](../beads/SKILL.md) - Beads integration
- [../../commands/ralph.md](../../commands/ralph.md) - Command reference
