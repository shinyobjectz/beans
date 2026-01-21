---
name: spec-workflow
description: Spec-driven development workflow for building features with research, requirements, design, and task phases
---

# Spec Workflow Skill

## When to Use

Use these commands when user wants to:
- Build a new feature or system
- Create technical specifications
- Plan development work
- Track spec progress
- Execute spec-driven implementation

## Commands

### Starting Work
- `/ralph-specum:start [name] [goal]` - Start or resume a spec (smart entry point)
- `/ralph-specum:new <name> [goal]` - Create new spec and begin research

### Spec Phases
- `/ralph-specum:research` - Run research phase
- `/ralph-specum:requirements` - Generate requirements from research
- `/ralph-specum:design` - Generate technical design
- `/ralph-specum:tasks` - Generate implementation tasks

### Execution
- `/ralph-specum:implement` - Start autonomous task execution

### Management
- `/ralph-specum:status` - Show all specs and progress
- `/ralph-specum:switch <name>` - Change active spec
- `/ralph-specum:cancel` - Cancel active execution

### Help
- `/ralph-specum:help` - Show plugin help
