# Plan — Items restants

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

---

## GDPR

### MEDIUM

- [ ] Ajouter l'édition de profil (nom, email avec re-vérification) — Art. 16 droit de rectification (`src/routes/_public__root/_default/settings/`)
- [ ] Vérifier et documenter les DPA signés avec chaque sous-traitant (Stripe, Resend, Bunny, Algolia, Mixpanel, Railway) — Art. 28

### LOW

- [ ] Auto-héberger Google Fonts (Bricolage Grotesque) — tribunal de Munich 2022, IP envoyée à Google sans consentement (`src/routes/__root.tsx`)
- [ ] Activer les adresses email de contact (hello@petit-meme.io, legal@petit-meme.io)
- [ ] Ajouter un audit log pour l'export de données utilisateur

---

## Algolia — Optimisation coûts (complété 2026-02-19)

- [x] `staleTime` client — 5 min public, 2 min admin (`src/lib/queries.ts`)
- [x] Cache serveur in-memory — `withAlgoliaCache` TTL 5 min + invalidation sur mutations (`src/lib/algolia.ts`)
- [x] `attributesToRetrieve` — exclut les champs dérivés Algolia-only des réponses
- [x] `attributesToHighlight: []` / `attributesToSnippet: []` — désactive le highlighting inutile
- [x] Date reconstruction dans `getAdminMemes` — corrige le cast `as` qui mentait sur les types
- [x] Images dashboard Algolia — `imageURL` configuré comme attribut image
- [x] Cron `sync-algolia` — déjà hebdomadaire, OK comme filet de sécurité
- [x] Déduplication requêtes concurrentes — `algoliaPendingRequests` Map
- [x] Cache borné — max 200 entrées FIFO + sweep toutes les 10 min (anti memory leak)
- [x] Single-loop `memeToAlgoliaRecord` — 1 boucle au lieu de 3 `.map()`
- [x] Validation input — `query.max(200)`, `page.max(1000)`, `category.regex(/^[\da-z-]{1,60}$/)`
- [x] Cache keys déterministes — concaténation explicite au lieu de `JSON.stringify`
- [x] `normalizeAlgoliaHit` helper — extraction de la duplication entre `getMemes`/`getAdminMemes`
- [ ] Slimmer `memeToAlgoliaRecord` — supprimer `...meme` spread, ne stocker que les champs nécessaires (refactor types)

---

## Sécurité — Items issus de l'audit Algolia

### HIGH

- [x] Clé admin Algolia pour les lectures publiques — séparer en `ALGOLIA_ADMIN_KEY` + `ALGOLIA_SEARCH_KEY` (`src/lib/algolia.ts`)
- [x] `getMemeById` / `shareMeme` exposent les memes PENDING/REJECTED/ARCHIVED — ajouter `status: PUBLISHED` dans le `where` (`src/server/meme.ts`)

---

## Futur

Items non planifiés, à traiter après les corrections ci-dessus.

### Internationalisation (FR / EN)

Passer le site en bilingue français / anglais. Étudier la meilleure approche avec TanStack Start (routing i18n, détection de langue, etc.).

### Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles : tables en pluriel, colonnes en `snake_case`, timestamps `_at`, booleans `is_*`, prix en centimes (integer), UUIDs partout, `ON DELETE CASCADE` pour auth, `is_anonymized` pour GDPR.

### Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern : `PaymentIntent` → `confirmPayment` avec `redirect: 'if_required'` → polling post-paiement.

### Migration npm → pnpm

Remplacer npm par pnpm. Supprimer `package-lock.json`, générer `pnpm-lock.yaml`, mettre à jour les scripts CI/Railway et le `packageManager` dans `package.json`.

### Dependabot — Vulnérabilités

Traiter les 5 vulnérabilités signalées par GitHub (1 high, 4 moderate) : https://github.com/viclafouch/petit-meme/security/dependabot
