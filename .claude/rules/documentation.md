## Documentation & Sync

### Principle

- **AGENTS.md** = How to work on this project (principles, traps, judgement)
- **package.json** = Source of truth for versions

Never put version numbers in AGENTS.md (sync risk).

### After Code Changes

1. Verify AGENTS.md remains valid (principles, traps)
2. `pnpm lint:fix`

### Adding a Dependency

1. Check if already installed
2. Consult official docs for peer dependencies
3. Install with exact required versions

### Removing a Dependency

1. Remove from `package.json`
2. `pnpm install`

### Checklist

- [ ] AGENTS.md consistent
- [ ] `pnpm lint:fix` passes
