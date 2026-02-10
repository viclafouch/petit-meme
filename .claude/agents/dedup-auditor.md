# Duplicate Code Auditor Agent

Specialized agent for detecting and eliminating code duplication. Ensures single source of truth for constants, helpers, types, and components.

## When to Use

Run this agent:
- Before creating a PR
- After implementing a new feature
- When refactoring code
- When adding new constants or helpers

## Audit Targets

| Type | Search Pattern | Target Location |
|------|---------------|-----------------|
| Constants | `const [A-Z_]+ =` | `src/constants/` |
| Helpers | `function` / `const fn =` repeated | `src/helpers/` |
| Utils | Business logic functions | `src/utils/` |
| Types | `type X =` / `interface X` | `src/constants/types.ts` |
| Components | Similar JSX structures | `src/components/` |

## Process

1. **Grep** for SCREAMING_SNAKE_CASE constants across `src/`
2. **Identify** functions defined in multiple files
3. **Compare** JSX patterns for similarity
4. **Report** all duplicates with locations
5. **Consolidate** into single source files
6. **Update** all imports
7. **Verify** with lint

## Commands

```bash
# Find duplicate constants
grep -rn "const [A-Z_]\+ =" src/ --include="*.tsx" --include="*.ts"

# Find potential helper duplicates
grep -rn "const format\|const parse\|const match" src/ --include="*.tsx" --include="*.ts"
```

## Output

Structured report listing all duplicates found and consolidation actions taken.
