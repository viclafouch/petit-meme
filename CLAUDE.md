# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Memes by Lafouch — a meme management and sharing platform with video support, user authentication, bookmarking, and premium subscriptions. Built with TanStack Start (React 19 full-stack framework) on Vite + Nitro.

The site is currently **French-only**. An English migration is planned for later.

## Commands

```bash
pnpm run build            # Production build (copies instrument.server.mjs to .output)
pnpm start                # Start production server (with Sentry --import)
pnpm run lint             # TypeScript check + ESLint
pnpm run lint:fix         # Auto-fix lint issues
pnpm run prisma:migrate   # Deploy Prisma migrations (prisma migrate deploy)
pnpm run prisma:seed      # Seed database (tsx --env-file=.env prisma/seed.ts)
pnpm run prisma:reset-db  # Reset local DB (prisma migrate reset) — NEVER in production
pnpm run email:dev        # Email preview server (port 3001)

# Crons (run via vite-node)
pnpm run crons:sync-algolia           # Sync memes to Algolia index
pnpm run crons:update-title-bunny     # Update video titles in Bunny CDN
pnpm run crons:cleanup-retention      # GDPR anonymization (3+ years inactive)
pnpm run crons:unverified-cleanup     # Remove unverified accounts (30+ days)
pnpm run crons:verification-reminder  # Remind unverified users (42-54h window)
```

After Prisma schema changes: `pnpm exec prisma generate` (also runs on `postinstall`).

Database & migration workflow complet : voir `.claude/rules/database.md`.

**Ne jamais démarrer le serveur de dev (`pnpm run dev`)** — c'est toujours l'utilisateur qui s'en occupe.

## Architecture

### Stack

- **Framework:** TanStack Start with TanStack Router (file-based routing)
- **Build:** Vite + Nitro (node-server preset)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Better Auth (Twitter OAuth + email/password)
- **Styling:** Tailwind CSS v4 + Shadcn UI (New York style) + Motion
- **State:** TanStack Query (server state) + Zustand (client state)
- **Forms:** TanStack Form + Zod validation
- **Video:** Bunny CDN + HLS.js
- **Search & Analytics:** Algolia (search, virtual replicas, Recommend, Insights events)
- **Monitoring:** Sentry (error tracking, session replay, performance tracing)
- **Payments:** Stripe
- **Email:** Resend + React Email

### Source Layout (`src/`)

- `routes/` — File-based routing. `__root.tsx` is root layout, `_public__root/` is public layout
- `server/` — Server-only functions (`createServerFn` for RPC, `createServerOnlyFn` for utilities)
- `components/ui/` — Shadcn UI components (do NOT modify — use `eslint-disable` if needed)
- `components/animate-ui/` — Animation components (do NOT modify)
- `components/` — App components organized by domain (Meme/, User/, categories/, admin/)
- `lib/` — Library integrations (auth, algolia, algolia-insights, sentry, stripe, bunny, queries, seo, theme)
- `constants/` — App constants grouped by domain, env vars validated with Zod (`env.ts`)
- `helpers/` — Pure generic utility functions
- `utils/` — Business utilities (wrapped with `createServerOnlyFn` for server-only access)
- `hooks/` — Custom React hooks (`use-*.ts` files)
- `stores/` — Zustand stores
- `db/` — Prisma client + generated types (`db/generated/prisma`)
- `i18n/` — Internationalization
- `emails/` — React Email templates (shared layout, verification, welcome, password, billing)
- `@types/` — TypeScript type definitions

### Other Directories / Root Files

- `prisma/` — Schema and migrations
- `crons/` — Cron scripts (Algolia sync, Bunny updates, GDPR cleanup, verification reminders)
- `scripts/` — Utility scripts
- `public/` — Static assets
- `instrument.server.mjs` — Sentry server-side init (loaded via `--import` flag)

## Conventions

Toutes les conventions de code (TypeScript, React, code style, Tailwind, SEO, Git, etc.) sont définies dans le dossier `.claude/rules/`. Toujours les suivre.

## Agents

| Agent | Quand l'utiliser |
|-------|------------------|
| `code-refactoring` | **Après chaque tâche** |
| `Explore` | Recherche dans le codebase |
| `Plan` | Planifier une tâche complexe |
| `react-performance` | Après implémentation React |
| `tailwind-audit` | Après modification styles |
| `dead-code` | Nettoyage périodique |

---

## Skills

| Skill | Scope |
|-------|-------|
| `/frontend-design` | Web |
| `/react-useeffect` | Universel |
| `/vercel-react-best-practices` | Web |
| `/react-native-best-practices` | Mobile |

---

## Plans

| Plan | Fichier |
|------|---------|
| **Features & Futur** | [`.claude/plan.md`](.claude/plan.md) |

## Workflow

**Avant** :
1. Identifier la plateforme (web/mobile)
2. Lire le plan correspondant

**Après chaque tâche (automatique, sans attendre qu'on demande)** :
1. `pnpm run lint:fix`
2. Mettre à jour le plan : cocher `[x]` les items terminés
3. Lancer `code-refactoring` si code significatif