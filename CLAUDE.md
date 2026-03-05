# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Memes by Lafouch — a meme management and sharing platform with video support, user authentication, bookmarking, and premium subscriptions. Built with TanStack Start (React 19 full-stack framework) on Vite + Nitro.

The site is currently **French-only**. An English migration is planned for later.

The site has very few users, giving us more freedom for breaking changes. Design is **mobile-first**, always responsive, and must work across all major browsers (Safari, Chrome, Firefox, etc.). Hosted on **Vercel (Hobby plan)**.


## Cost Awareness

Minimize costs on all external services (database, Algolia, Sentry, Vercel, etc.). Always check what is available on free tiers before implementing. When developing, proactively suggest useful free-tier features from existing services. Always consider whether a feature or usage pattern could become expensive. Evaluate DB compute impact before adding any cron or polling

## Commands

```bash
pnpm run build            # Production build (Vite + Nitro vercel preset)
pnpm start                # Start production server
pnpm run lint             # TypeScript check + ESLint
pnpm run lint:fix         # Auto-fix lint issues
pnpm run email:dev        # Email preview server (port 3001)
```
**Never start the dev server (`pnpm run dev`)** — this is always done by the user.

### Prisma

Prisma requires `DATABASE_URL` injected via `dotenv -e` (not loaded automatically).

```bash
# Create a new migration (dev)
pnpm exec dotenv -e .env.development -- pnpm exec prisma migrate dev --name <name>

# Apply pending migrations (dev)
pnpm run prisma:migrate:dev    # uses .env.development

# Apply pending migrations (prod) — pull env first
vercel env pull .env.production
pnpm run prisma:migrate:prod   # uses .env.production

# Other
pnpm exec dotenv -e .env.development -- pnpm exec prisma generate  # Regenerate client (also runs on postinstall)
pnpm run prisma:seed:dev       # Seed database (uses .env.development)
pnpm run prisma:reset-db:dev   # Reset DB (uses .env.development) — NEVER in production
```

See current plan : `.claude/plan.md`. It must be always up to date. **Update it immediately after each meaningful change** — not just at the end of a task. If you add a feature, fix a bug, change an approach, or add a dependency mid-task, update the plan right then. A desynchronized plan is a bug.

## Code Quality & Reusability

Code must always be clean and readable. Before writing any code, ask whether it can be reused and extracted into a helper, utility, or reusable component. **Zero tolerance for duplication** — both runtime code and types. Strict typing everywhere: no `any`, no loose types, leverage discriminated unions, `satisfies`, and inference where appropriate.

## Post-Task Checklist — MANDATORY, NO EXCEPTIONS

**After EVERY task that writes or modifies code, execute ALL steps IN ORDER before reporting completion to the user.**

1. Run `pnpm run lint:fix`
2. Update the plan (`.claude/plan.md`): check off `[x]` completed items
3. **ALWAYS run the `code-refactoring` agent** on every file created or modified (use the Task tool with `subagent_type: "code-refactoring"`). This is NOT optional — skip only if zero code was written (e.g. pure config/doc change). If the plan has changed with the refactoring, update the plan again.
4. After major features or changes, proactively suggest running relevant audit agents (security, performance, dead-code, GDPR, Tailwind, React performance, etc.)

**A task is NOT complete until steps 1-3 are done.** Never say "done" or summarize changes before finishing the checklist.

## Design Rule

For any UI/design task, **always use `/frontend-design`** before writing code.

## Uncertainty Rule

Whenever there is any uncertainty (even a single one), use the **deep-dive** skill before writing code. Never proceed with unresolved unknowns.
