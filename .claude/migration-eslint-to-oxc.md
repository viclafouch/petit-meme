# Migration Report: ESLint + Prettier → oxlint + oxfmt

**Date:** 2026-03-27
**Project:** Petit Meme (TanStack Start, React 19, ~294 TS/TSX files)
**From:** `@viclafouch/eslint-config-viclafouch` v5.3.0 (ESLint 9 + Prettier 3.8)
**To:** `@viclafouch/oxc-config` v1.0.0-alpha.0 (oxlint 1.57 + oxfmt 0.42)

---

## Timeline

Total migration time: ~45 minutes (including reading docs, fixing all errors, formatting).

| Step | Duration | Notes |
|------|----------|-------|
| Read docs (MIGRATION.md, README, GAPS.md) | 5 min | Clear and well-structured |
| Install / uninstall packages | 2 min | Clean, only 3 packages to install |
| Create config files | 3 min | Straightforward |
| Update scripts, VS Code, husky | 3 min | |
| `oxlint --fix` auto-fix | < 1 min | 11 errors auto-fixed (numeric separators) |
| Config-level fixes | 5 min | Disabling rules, adding ignores/exceptions |
| Remove stale eslint-disable comments | 15 min | ~36 comments across ~25 files, most tedious part |
| Fix remaining individual errors | 10 min | 8 errors after comment cleanup |
| Verify (tsc + oxlint + oxfmt) | 1 min | All green |

---

## What went well

### 1. Documentation quality
The MIGRATION.md is excellent — well-structured, step-by-step, with clear before/after comparisons. The config mapping table is particularly useful. The GAPS.md is a honest and detailed analysis of what's missing.

### 2. Speed
oxlint is drastically faster: **172ms** on 293 files with 272 rules. ESLint took ~15-20s on the same codebase. This alone justifies the migration.

### 3. Config simplicity
Going from a 62-line `eslint.config.js` with 6 spread configs and 12 rule overrides to a 38-line `oxlint.config.ts` is a nice improvement. The TypeScript config with `defineConfig` provides great autocompletion.

### 4. oxfmt formatting
The formatting migration was seamless. `oxfmt` in 45ms vs Prettier through ESLint in seconds. The `sortImports` config replaces `simple-import-sort` cleanly.

### 5. Unified rule names
The unification of `@typescript-eslint/no-unused-vars` → `no-unused-vars` (and similar rules) is a welcome simplification. Less cognitive overhead.

---

## Issues encountered

### 1. Package name confusion in existing config files

I had pre-created `oxlint.config.ts` and `oxfmt.config.ts` with the wrong package name (`@viclafouch/oxlint-config-viclafouch` instead of `@viclafouch/oxc-config`). This is a user error, not a docs issue.

**Suggestion for docs:** The README and MIGRATION.md are very clear about the package name. No action needed.

### 2. `unicorn/filename-case` — no `ignore` option support

oxlint reports `unicorn/filename-case` on `$memeId.tsx` files (TanStack Router convention). In ESLint's unicorn plugin, the rule supports an `ignore: [/^\$/]` option to whitelist patterns. oxlint doesn't support this option, so the rule had to be turned off entirely.

**Impact:** Medium. Frameworks like TanStack Router, Next.js (`[slug].tsx`), and Remix (`$param.tsx`) all use non-kebab-case filenames. Without `ignore` support, users must either disable the rule entirely or accept noise.

**Suggestion:** Implement the `ignore` option for `unicorn/filename-case`, or add a built-in exception for `$`-prefixed and bracket-wrapped filenames.

### 3. `unicorn/prefer-top-level-await` — false positives on Zod `.catch()`

Zod 4's `.catch()` method (e.g., `z.string().optional().catch(undefined)`) is flagged as a "promise chain" by `unicorn/prefer-top-level-await`. This is a false positive — Zod's `.catch()` is not `Promise.catch()`.

**Impact:** High in Zod-heavy codebases. We had 6+ false positives on search schema definitions alone. Had to disable the rule entirely.

**Suggestion:** Improve the heuristic to distinguish `Promise.catch()` from method chains that happen to end with `.catch()`. ESLint's unicorn plugin has the same issue, so this might be inherited.

### 4. `unicorn/filename-case` — file-level `/* eslint-disable */` doesn't suppress it

File-level disable comments (`/* eslint-disable unicorn/filename-case */`) don't suppress filename-case errors. This makes sense (the rule is about the filename, not the code), but it creates a confusing dual error: both "filename should be kebab-case" AND "unused eslint-disable directive" on the same file.

**Suggestion:** Either make the disable comment work for filename-based rules, or don't report "unused disable" when the disable targets a rule that inherently can't be suppressed by a comment.

### 5. `no-shadow-restricted-names` — `declare const globalThis` pattern

The standard Prisma singleton pattern (`declare const globalThis: { ... } & typeof global`) triggers `no-shadow-restricted-names`. This is technically correct but the pattern is canonical in Prisma docs and widely used.

**Suggestion for GAPS.md or FAQ:** Mention this common pattern and the workaround (`oxlint-disable-next-line`).

### 6. Stale eslint-disable comments — the bulk of the work

The most time-consuming part was removing ~36 stale `// eslint-disable-next-line` comments for rules that don't exist in oxlint (`@typescript-eslint/naming-convention`, `no-restricted-syntax`, `react-hooks/purity`, `react-hooks/incompatible-library`, `camelcase`, `react/hook-use-state`).

oxlint correctly flags these as "Unused eslint-disable directive" — but `oxlint --fix` doesn't auto-remove them.

**Suggestion:** `oxlint --fix` should auto-remove unused disable comments. This would have saved ~15 minutes of manual editing across 25 files. The migration guide (step 8) mentions `npx @oxlint/migrate --replace-eslint-comments` for renaming comments, but this tool doesn't remove unused ones.

### 7. `oxlint --fix` removed `return undefined` → introduced `no-useless-return`

When `oxlint --fix` removed a `// eslint-disable-next-line unicorn/no-useless-undefined` comment that was followed by `return undefined`, the rule auto-fixed `return undefined` to `return`. This then triggered `no-useless-return` because the function already had implicit return paths. Two-pass issue.

**Suggestion:** `oxlint --fix` should detect cascading fixes or run a second pass.

### 8. Import sorting reorders on format

When running `oxfmt` with `sortImports`, all imports get reordered on first run. This is expected but produces a large diff. The migration guide could mention this more prominently — running `oxfmt` before committing migration changes helps isolate the formatting diff from the functional changes.

**Suggestion for docs:** Add a note in step 3: "Run `oxfmt` immediately after creating the config and commit the formatting changes separately. This keeps the migration diff reviewable."

---

## Rules lost (no oxlint equivalent)

These ESLint rules were active in the project and have no oxlint equivalent:

| Rule | Impact | Workaround |
|------|--------|------------|
| `@typescript-eslint/naming-convention` | **High** | None. Code review only. |
| `no-restricted-syntax` | **High** | Was used to ban `useMemo`/`useCallback`. Lost entirely. |
| `id-denylist` | **Medium** | Was banning `cb`, `arr`, `acc`, `idx`, etc. Lost entirely. |
| `object-shorthand` | **Medium** | None. |
| `react/function-component-definition` | **Medium** | None. |
| `react/hook-use-state` | **Medium** | None. |
| `react/jsx-no-leaked-render` | **Medium** | None. |
| `react/jsx-no-bind` | **Medium** | None. |
| `promise/prefer-await-to-then` | **Low** | Was already disabled. |
| `@typescript-eslint/no-deprecated` | **Low** | Type-aware, deferred to tsgolint. Was already disabled. |

The most painful losses are `naming-convention` (enforced camelCase/PascalCase conventions) and `no-restricted-syntax` (used to ban React hooks that React Compiler makes unnecessary).

---

## Rules gained (new in oxlint)

oxlint includes rules not in the ESLint config:

- `jsx-a11y/prefer-tag-over-role` — useful but overly strict for some patterns (turned off)
- Various `oxc/*` rules — oxc-specific checks
- Additional `unicorn/*` rules not in the ESLint config

---

## Config differences

### Rules disabled in project
```typescript
rules: {
  'require-await': 'off',
  'no-use-before-define': 'off',
  'react/no-children-prop': 'off',
  'react/iframe-missing-sandbox': 'off',
  'react/no-array-index-key': 'off',
  'no-inline-comments': 'off',
  'unicorn/prefer-top-level-await': 'off',  // Zod .catch() false positives
  'unicorn/filename-case': 'off',           // TanStack Router $param convention
  'jsx-a11y/prefer-tag-over-role': 'off',
  'id-length': ['error', { exceptions: ['R', '_', 'm', 'x', 'y', 'T'] }]
}
```

### ESLint rules dropped (no longer needed)
- `@typescript-eslint/require-await` → unified as `require-await`
- `@typescript-eslint/no-use-before-define` → unified as `no-use-before-define`
- `@typescript-eslint/no-deprecated` → not in oxlint (type-aware)
- `promise/prefer-await-to-then` → no promise plugin in oxlint
- `id-denylist` → not implemented in oxlint

---

## Dependency diff

**Removed (12+ packages including transitives):**
- `eslint` (9.39.3)
- `prettier` (3.8.1)
- `@viclafouch/eslint-config-viclafouch` (5.3.0)
- All transitive ESLint plugins (typescript-eslint, eslint-plugin-react, eslint-plugin-unicorn, eslint-plugin-prettier, prettier-plugin-curly, eslint-plugin-import, eslint-plugin-jsx-a11y, eslint-plugin-promise, simple-import-sort, etc.)

**Added (3 packages):**
- `oxlint` (1.57.0)
- `oxfmt` (0.42.0)
- `@viclafouch/oxc-config` (1.0.0-alpha.0)

**Net: ~220 fewer packages in node_modules.**

---

## Performance comparison

| Metric | ESLint + Prettier | oxlint + oxfmt |
|--------|------------------|----------------|
| Lint time (294 files) | ~15-20s | **172ms** (~100x faster) |
| Format time (369 files) | ~5-8s (via ESLint) | **45ms** (~100x faster) |
| Install size | ~220 packages | ~3 packages |
| Config complexity | 62 lines JS + implicit configs | 38 lines TS |

---

## Recommendations for the library author

### Priority: High
1. **Auto-remove unused disable comments in `--fix`** — This was the biggest time sink. Having `oxlint --fix` remove `// eslint-disable-next-line rule-name` when the rule doesn't exist would save 15+ minutes per migration.
2. **`unicorn/filename-case` `ignore` option** — Framework file conventions (`$param.tsx`, `[slug].tsx`) are extremely common. Without `ignore`, users must disable the rule entirely.
3. **`unicorn/prefer-top-level-await` Zod false positive** — Document in MIGRATION.md or GAPS.md that Zod-heavy projects will need to disable this rule.

### Priority: Medium
4. **Import sorting as separate commit** — Add a note in MIGRATION.md step 3 suggesting to run `oxfmt` and commit formatting separately to keep the migration diff reviewable.
5. **Multi-pass `--fix`** — When auto-fixing creates new violations (e.g., removing a disable + fixing the guarded code → new error), a second pass would catch cascading issues.

### Priority: Low
6. **GAPS.md is great** — Consider linking it from MIGRATION.md step 7 more prominently. It's the single most important reference when deciding which rules to override.
7. **`no-shadow-restricted-names` + Prisma `globalThis`** — Common pattern, worth a FAQ entry.

---

## Files changed

- **Deleted:** `eslint.config.js`
- **Created:** `oxlint.config.ts`, `oxfmt.config.ts`
- **Modified:** `package.json` (scripts + deps), `.vscode/settings.json`, `.husky/pre-commit`, `CLAUDE.md`, `.claude/rules/code-style.md`, `.claude/plan.md`
- **~25 source files:** removed stale `eslint-disable` comments
- **Renamed:** `src/components/icon/Play.tsx` → `play.tsx`
- **Refactored:** `src/routes/admin/users/-components/user-actions-cell.tsx` (broke import cycle using `getRouteApi`)
- **All files:** import order reformatted by oxfmt `sortImports`
