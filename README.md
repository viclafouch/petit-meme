# Petit Meme

[petit-meme.io](https://petit-meme.io/)

Meme management and sharing platform with video support, premium subscriptions, and a TikTok-style reels experience. Built as a full-stack React 19 application with server-side rendering.

Available in **French** and **English**.

## Features

- Video meme library with HLS streaming and reels navigation
- User authentication (email/password, Twitter OAuth)
- Bookmarking and favorites system
- Premium subscriptions via Stripe
- Full-text search powered by Algolia
- Admin dashboard for content management (upload, moderation, analytics)
- Meme import directly from Twitter/X URLs
- SEO-optimized with structured data and dynamic Open Graph images
- Transactional emails (verification, password reset)

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, SSR, Nitro) |
| Routing | [TanStack Router](https://tanstack.com/router) (file-based) |
| Data Fetching | [TanStack Query](https://tanstack.com/query) |
| Forms | [TanStack Form](https://tanstack.com/form) |
| Database | [Prisma ORM](https://www.prisma.io/) + PostgreSQL |
| Auth | [Better Auth](https://better-auth.com/) |
| Payments | [Stripe](https://stripe.com/) |
| Video | [Bunny CDN](https://bunny.net/) + [HLS.js](https://github.com/video-dev/hls.js) |
| Search | [Algolia](https://www.algolia.com/) |
| Email | [Resend](https://resend.com/) + [React Email](https://react.email/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Validation | [Zod](https://zod.dev/) |
| State | [Zustand](https://zustand.docs.pmnd.rs/) |
| Analytics | [Algolia Analytics](https://www.algolia.com/) |

## Infrastructure

| Service | Purpose |
|---------|---------|
| [Vercel](https://vercel.com/) | Hosting (serverless, auto-deploy from `main`) |
| [Neon](https://neon.tech/) | PostgreSQL database |
| [Bunny CDN](https://bunny.net/) | Video storage and HLS delivery |
| [Stripe](https://stripe.com/) | Payment processing and subscriptions |
| [Algolia](https://www.algolia.com/) | Search indexing |
| [Resend](https://resend.com/) | Transactional emails |
| [Algolia](https://www.algolia.com/) | Search and analytics |

## Prerequisites

- Node.js 24
- pnpm 12
- A PostgreSQL database
- Stripe account (test or live)
- Bunny CDN account with a video library
- Algolia account with a search index
- Resend account

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/viclafouch/petit-meme
cd petit-meme
pnpm install
```

### 2. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.development
```

`src/env` holds the schemas. `pnpm run env:check` compares their keys with `.env.example`, `.env.development`, `.env.e2e`, `.env.preview` and Vercel Production and Preview, and names each missing or extra key. CI runs it on `.env.example` only.

Vercel stores every credential as a Secret, write-only after saving, on Production and Preview. Local development reads `.env.development`, never `vercel env pull`.

### 3. Database setup

Push the schema to your database:

```bash
pnpm exec dotenv run -f .env.development -- pnpm exec prisma migrate dev
```

### 4. Run the development server

```bash
pnpm run dev
```

## Database Migrations

Prisma Migrate is used to manage schema changes safely across environments.

### Local development

After modifying `prisma/schema.prisma`:

```bash
pnpm exec dotenv run -f .env.development -- pnpm exec prisma migrate dev --name descriptive_name
```

This creates a migration file, applies it to the local database, and regenerates the Prisma Client.

### Production deployment

Vercel auto-deploys on push to `main`. After a deploy that includes new migrations:

```bash
pnpm run prisma:migrate:prod
```

This uses `.env.production`, which holds only the production `DATABASE_URL`. Copy that connection string from the Neon console: Vercel stores it as a Secret, so `vercel env pull` returns it empty. The command applies only pending migrations and is safe and idempotent.

### Rules

- Migrations must be **additive only**: new optional fields, new indexes, new tables
- Never drop or rename columns, tables, or enums on production
- New required fields must have a `@default()` value
- Never use `prisma db push` on production
- Always review the generated SQL before committing

## Stripe Webhooks

Stripe webhooks handle subscription lifecycle events (creation, renewal, cancellation).

### Local development

Use the Stripe CLI to forward events to your local server:

```bash
stripe listen --forward-to localhost:3000/api/auth/stripe/webhook
```

The CLI outputs a webhook signing secret (`whsec_...`). Add it to your `.env.development` as `STRIPE_WEBHOOK_SECRET`.

### Production

1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://yourdomain.com/api/auth/stripe/webhook`
3. Select the relevant subscription and checkout events
4. Copy the signing secret to your production environment

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start development server |
| `pnpm run build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm run check` | Typecheck, lint, Knip, unit tests and format check, cached by Turbo |
| `pnpm run typecheck` | TypeScript check |
| `pnpm run lint` | oxlint |
| `pnpm run lint:fix` | Auto-fix lint issues |
| `pnpm run knip` | Find unused files, exports and dependencies |
| `pnpm run env:check` | Compare the env schemas with every env file and Vercel |
| `pnpm run prisma:migrate:dev` | Apply pending migrations (via `.env.development`) |
| `pnpm run prisma:migrate:prod` | Apply pending migrations (via `.env.production`) |
| `pnpm run prisma:seed:dev` | Seed database (via `.env.development`) |
| `pnpm run prisma:seed:preview` | Reseed the Preview stack (via `.env.preview`) |
| `pnpm run email:dev` | Preview email templates on port 3001 |

## Project Structure

```
src/
├── routes/        # Pages (TanStack Router file-based routing)
├── server/        # Server functions (auth, memes, admin, payments)
├── components/    # React components organized by domain
├── lib/           # Library integrations (auth, algolia, stripe, bunny)
├── constants/     # App constants and types
├── env/           # Env validation: client.ts for the browser, *.server.ts for the server
├── helpers/       # Pure utility functions
├── utils/         # Business logic utilities
├── hooks/         # Custom React hooks
├── stores/        # Zustand stores
├── db/            # Prisma client and generated types
└── i18n/          # Internationalization

prisma/            # Schema and migrations
emails/            # React Email templates
crons/             # Scheduled jobs (Algolia sync, Bunny updates)
```

## Deployment

The app is deployed on Vercel with automatic deploys from the `main` branch.

Vercel automatically installs dependencies, builds the app, and deploys serverless functions. Database migrations must be applied separately after each deploy that includes schema changes.

## Preview Environment

Every branch other than `main` deploys to Vercel Preview, which runs on its own stack and never reaches a production resource.

| Resource | Preview | Production |
|----------|---------|------------|
| Database | Neon branch `preview`, child of `dev` | Neon branch `production` |
| Payments | Stripe sandbox `petit-meme-preview` | Stripe live mode |
| Search | Algolia indices `preview_*`, through keys scoped to them | Algolia indices `backup_*` |
| Video | Bunny Stream library `memes-preview` on `cdn-preview.petit-meme.io` | Bunny Stream library on `cdn.petit-meme.io` |
| Exports | Bunny Storage zone `petit-meme-watermarked-preview`, no pull zone, read by the server only | `petit-meme-watermarked-prod`, same setup |
| Images | Bunny Storage zone `petit-meme-images-preview` on `images-preview.petit-meme.io` | `petit-meme-images-prod` on `images.petit-meme.io` |
| Uploads | Vercel Blob store `petit-meme-preview-files` | `petit-meme-files` |
| Emails | Resend, every recipient replaced by `EMAIL_OVERRIDE_TO` | Real recipients |

Previews share the rest with production, since none of it holds data: the Sentry project (events tagged `preview`), the Twitter and Discord apps, the Gemini and Anthropic keys, and the Resend account.

- A preview serves on its branch URL: the build derives `VITE_SITE_URL` from `VERCEL_BRANCH_URL`, and Better Auth trusts both the branch URL and the deployment URL. Sign in with an email and a password: Twitter and Discord only know the production callback.
- The preview build applies pending migrations to the `preview` branch before it builds, through `vercel.sh`.
- Stripe and Bunny send their webhooks to one fixed URL, so none reaches a preview. A test checkout still turns the account Premium on its return URL, but a cancellation or a renewal never syncs back, and a new upload waits for its first frame.
- Vercel keeps the schedules of a preview inactive, so nothing wakes the `preview` branch.

`.env.preview`, kept out of Git, holds every Preview value, since Vercel keeps the Secrets write-only. `pnpm run env:check` compares it with Vercel Preview.

### Reseed the Preview stack

The seed empties the Preview database, Algolia indices, Stripe customers and Bunny videos, then imports the mock Memes and the admin account it prints:

```bash
pnpm run prisma:seed:preview
```

Once Bunny has encoded the videos, about a minute later, generate their stored files:

```bash
pnpm exec vite-node --mode preview scripts/backfill-first-frames.ts
pnpm exec vite-node --mode preview scripts/watermark-videos.ts
pnpm exec vite-node --mode preview scripts/backfill-mp3.ts
pnpm exec vite-node --mode preview scripts/check-bunny-zone.ts
```

A migration from a branch that never merges stays on `preview`. Reset the branch to its parent, then reseed:

```bash
neonctl branches reset preview --parent
```

## License

Private - All rights reserved
