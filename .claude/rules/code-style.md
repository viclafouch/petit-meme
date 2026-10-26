## Code Style

Expert code simplification and review specialist. Enhances code clarity, consistency, and maintainability while preserving exact functionality. Prioritizes readable, explicit code over compact solutions.

## Scope

Analyze recently modified code and apply refinements. Focus on code touched in the current session unless instructed otherwise.

## Core Principles

### 1. Preserve Functionality and Type Contracts
Never change what the code does - only how it does it. All original features, outputs, and behaviors must remain intact.

**Never remove explicit types that serve as contracts** — return types that constrain a function's output to a specific shape or union, types validated against library/external types, or `as const satisfies Type` patterns. If an explicit type would catch a bug at compile time that inference alone would miss, it must stay.

### 2. Clarity Over Brevity
- Choose explicit code over compact one-liners
- Dense code is not better code

### 3. Maintain Balance
Avoid over-simplification that could:
- Reduce maintainability
- Create "clever" solutions hard to understand
- Combine too many concerns
- Remove helpful abstractions
- Prioritize "fewer lines" over readability

## Review Checklist

### Naming Conventions
- Variables: descriptive, meaningful names
- No abbreviations unless universal (`id`, `url`, `api`)

### Self-Documented Code
- Complex logic extracted into well-named functions

### No Unnecessary Abstractions
**FORBIDDEN:**
- Wrapper functions that just call another function
- Abstractions "for future use"

**Justified when:**
- Adding error handling, logging, or transformation
- Combining multiple calls
- Providing simpler API for complex operations

### Oxlint Disables

- Before disabling, ask: can the rule be satisfied by fixing the code? If yes, fix it
- A disable is only justified when the rule conflicts with a library API, a specific pattern that cannot be avoided, or a known oxlint false positive
- If the same rule is disabled on many lines in a file, that is a code smell — reconsider the approach

### Code Structure
- Functions do one thing well
- Early returns over nested conditions
- Group related code together

### No Mutations

Never mutate objects or arrays. Always return new instances.

### Modern Web APIs
Always use native modern APIs (Intl, URLSearchParams, structuredClone, etc.) instead of manual implementations or libraries.

### Single Source of Truth

**NEVER duplicate constants, helpers, or types across files.**

**Global constants** (used across multiple features):
- `src/constants/` - One file per domain (`meme.ts`, `bunny.ts`)
- `src/constants/types.ts` - Shared types
- `src/helpers/` - Pure utility functions

**Component-specific constants** (used only by one component/feature):
- Co-locate with the component in a `constants.ts` file
- Example: `cookie-consent/constants.ts` for config used by that component only
- Import with relative path: `from './constants'`

Before creating a constant or helper, search if it already exists.

### Extract & Reuse (CRITICAL)

Before writing ANY function, component, type, or constant inside a feature file, ask: **"Could this be reused elsewhere?"** If yes (or even maybe), extract it immediately — not later.

**What to extract:**
- **Pure functions** (formatting, validation, string manipulation) → shared helpers
- **Generic UI components** (dialogs, confirm modals, badges, cards) → shared components. Never define a reusable UI pattern inline in a page/feature file.
- **Custom hooks** (state logic, effects, mutations) → dedicated hook files
- **Types shared across files** → co-locate with the source or in shared type files

**When writing new code:**
- Scan existing helpers, components, and hooks FIRST — the function you need may already exist
- If you define something locally and realize it's generic, extract it in the same task — don't leave it for later
- If a sub-component is defined locally in a file, ask whether another file could benefit from it

**Red flags (things that should NOT live in feature/page files):**
- Pure functions with no dependency on local state or props
- UI components that receive generic props (title, description, onConfirm, etc.)
- Logic that appears in 2+ files in slightly different forms

### Helpers vs Utils

All utilities live in `src/`:

- `src/lib/` - Generic utilities (cn, etc.)
- `src/helpers/` - Generic pure functions (date formatting, string manipulation)
- `src/utils/` - Business utilities
- `src/constants/` - All constants, grouped by domain

**Rules:**
- Pure functions, no side effects
- One file per domain