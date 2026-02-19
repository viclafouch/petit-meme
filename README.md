# Petit Meme

[petit-meme.io](https://petit-meme.io/)

Meme management and sharing platform with video support, premium subscriptions, and a TikTok-style reels experience. Built as a full-stack React 19 application with server-side rendering.

Currently available in **French only**. English support is planned.

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
| Analytics | [Mixpanel](https://mixpanel.com/) |

## Infrastructure

| Service | Purpose |
|---------|---------|
| [Railway](https://railway.com/) | Hosting (Node.js, auto-deploy from `main`) |
| Railway PostgreSQL | Database |
| [Bunny CDN](https://bunny.net/) | Video storage and HLS delivery |
| [Stripe](https://stripe.com/) | Payment processing and subscriptions |
| [Algolia](https://www.algolia.com/) | Search indexing |
| [Resend](https://resend.com/) | Transactional emails |
| [Mixpanel](https://mixpanel.com/) | Product analytics |

## Prerequisites

- Node.js 24+
- npm 11+
- A PostgreSQL database
- Stripe account (test or live)
- Bunny CDN account with a video library
- Algolia account with a search index
- Resend account

## Getting Started

### 1. Clone and install

```bash
git clone <repository-url>
cd memes-by-lafouch
npm install
```

### 2. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

### 3. Database setup

Push the schema to your database:

```bash
npx prisma migrate dev
```

### 4. Run the development server

```bash
npm run dev
```

## Database Migrations

Prisma Migrate is used to manage schema changes safely across environments.

### Local development

After modifying `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name descriptive_name
```

This creates a migration file, applies it to the local database, and regenerates the Prisma Client.

### Production deployment

Railway auto-deploys on push to `main`. After a deploy that includes new migrations:

```bash
railway run npx prisma migrate deploy
```

This applies only the pending migrations. It is safe and idempotent.

### Checking migration status

```bash
railway run npx prisma migrate status
```

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

The CLI outputs a webhook signing secret (`whsec_...`). Add it to your `.env` as `STRIPE_WEBHOOK_SECRET`.

### Production

1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://yourdomain.com/api/auth/stripe/webhook`
3. Select the relevant subscription and checkout events
4. Copy the signing secret to your production environment

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | TypeScript check + ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run prisma:migrate` | Apply pending migrations (production) |
| `npm run prisma:seed` | Seed database |
| `npm run email:dev` | Preview email templates on port 3001 |

## Project Structure

```
src/
├── routes/        # Pages (TanStack Router file-based routing)
├── server/        # Server functions (auth, memes, admin, payments)
├── components/    # React components organized by domain
├── lib/           # Library integrations (auth, algolia, stripe, bunny)
├── constants/     # App constants, types, and env validation
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

The app is deployed on Railway with automatic deploys from the `main` branch.

Railway automatically installs dependencies, builds the app, and starts the server. Database migrations must be applied separately after each deploy that includes schema changes.

## License

Private - All rights reserved
