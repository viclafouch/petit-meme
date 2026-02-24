# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Memes by Lafouch — a meme management and sharing platform with video support, user authentication, bookmarking, and premium subscriptions. Built with TanStack Start (React 19 full-stack framework) on Vite + Nitro.

The site is currently **French-only**. An English migration is planned for later.

The site has very few users, giving us more freedom for breaking changes. Design is **mobile-first**, always responsive, and must work across all major browsers (Safari, Chrome, Firefox, etc.). Hosted on **Vercel**.

## Cost Awareness

Minimize costs on all external services (database, Algolia, Sentry, Vercel, etc.). Always check what is available on free tiers before implementing. When developing, proactively suggest useful free-tier features from existing services. Always consider whether a feature or usage pattern could become expensive.

## Commands

```bash
pnpm run build            # Production build (Vite + Nitro vercel preset)
pnpm start                # Start production server
pnpm run lint             # TypeScript check + ESLint
pnpm run lint:fix         # Auto-fix lint issues
pnpm run prisma:migrate   # Deploy Prisma migrations (prisma migrate deploy)
pnpm run prisma:seed      # Seed database (tsx --env-file=.env prisma/seed.ts)
pnpm run prisma:reset-db  # Reset local DB (prisma migrate reset) — NEVER in production
pnpm run email:dev        # Email preview server (port 3001)
```
**Never start the dev server (`pnpm run dev`)** — this is always done by the user.

After Prisma schema changes: `pnpm exec prisma generate` (also runs on `postinstall`).

See current plan : `.claude/plan.md`. It must be always up to date.

## Code Quality & Reusability

Code must always be clean and readable. Before writing any code, ask whether it can be reused and extracted into a helper, utility, or reusable component. **Zero tolerance for duplication** — both runtime code and types. Strict typing everywhere: no `any`, no loose types, leverage discriminated unions, `satisfies`, and inference where appropriate.

## Post-Task Checklist — MANDATORY, NO EXCEPTIONS

**After EVERY task that writes or modifies code, execute ALL steps IN ORDER before reporting completion to the user.**

1. Run `pnpm run lint:fix`
2. Update the plan (`.claude/plan.md`): check off `[x]` completed items
3. **ALWAYS run the `code-refactoring` agent** on every file created or modified (use the Task tool with `subagent_type: "code-refactoring"`). This is NOT optional — skip only if zero code was written (e.g. pure config/doc change).
4. After major features or changes, proactively suggest running relevant audit agents (security, performance, dead-code, GDPR, Tailwind, React performance, etc.)

**A task is NOT complete until steps 1-3 are done.** Never say "done" or summarize changes before finishing the checklist.

## Uncertainty Rule

Whenever there is any uncertainty (even a single one), use the **deep-dive** skill before writing code. Never proceed with unresolved unknowns.
