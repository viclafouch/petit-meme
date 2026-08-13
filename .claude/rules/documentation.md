## Documentation & Sync

### Principle

- **CLAUDE.md** = How to work on this project (principles, traps, judgement)
- **CONTEXT.md** = Domain model: ubiquitous language and the constraints the code cannot explain
- **package.json** = Source of truth for versions

Never put version numbers in CLAUDE.md (sync risk).

### After Code Changes

1. Verify CLAUDE.md remains valid (principles, traps)
2. Add any new domain term or non obvious constraint to CONTEXT.md
3. `pnpm lint:fix`

### Adding a Dependency

1. Check if already installed
2. Consult official docs for peer dependencies
3. Install with exact required versions

### Removing a Dependency

1. Remove from `package.json`
2. `pnpm install`
3. Search and remove orphan imports

### Checklist

- [ ] CLAUDE.md consistent
- [ ] CONTEXT.md updated if a term or a constraint appeared
- [ ] No orphan imports
- [ ] `pnpm lint:fix` passes
