# Plan — Items restants

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

---

## Memory Leaks

### HIGH

- [ ] Rate limiter Better Auth `storage: 'memory'` — accumule les IP en mémoire sans expiration, croissance ~10-50 MB/jour, crash OOM à terme (`src/lib/auth.tsx`). Fix : storage persistant (Redis, DB) ou accepter si restart régulier.

### MEDIUM

- [ ] Double buffer dans l'upload admin — `arrayBuffer()` puis `Buffer.from()` crée deux copies de la vidéo en mémoire (~2x taille). Pour 50 MB = 100 MB alloués (`src/server/admin.ts`). Fix futur : streamer directement vers Bunny CDN.

---

## Backend Performance

### MEDIUM

- [ ] `getListUsers` limité à 100 sans pagination — hardcodé `limit: 100, offset: 0`, au-delà de 100 users le panel admin les ignore (`src/server/admin.ts`)
- [ ] `getFavoritesMemes` refetch redondant du statut subscription — appelle `findActiveSubscription()` alors que le client fetch déjà cette info en parallèle (`src/server/user.ts`)
- [ ] `toggleBookmark` sans transaction Prisma — `findUnique` puis `create`/`delete` sans `$transaction`, race condition TOCTOU possible (`src/server/user.ts`)

### LOW

- [ ] `editMeme` deleteMany + create pour les catégories — supprime TOUTES les relations et les recrée même si seul le titre a changé, write amplification inutile (`src/server/admin.ts`)
- [ ] `getCategories` sans limit — `findMany` sans borne, les catégories changent rarement mais sont fetch à chaque navigation (`src/server/categories.ts`)
- [ ] `checkGeneration` appels DB séparés — fetch `generationCount` puis `findActiveSubscription` séquentiellement, pourrait être parallélisé (`src/server/user.ts`)

---

## Code Refactoring

### MEDIUM

- [ ] `ReelProps` type nommé — le composant `Reel` a ses props définies inline au lieu d'un type nommé (`src/components/Meme/meme-reels.tsx`)
- [ ] `return () => {}` inutiles dans les event handlers — `onTimeUpdate` retourne `() => {}` dans plusieurs branches, inutile hors `useEffect` (`src/hooks/use-register-meme-view.ts`)
- [ ] `let duration` mutation — construit une string par concaténation avec `let`, devrait être une fonction pure (`src/lib/seo.ts`)
- [ ] `let currentLine` mutation dans `wrapText` — devrait être refactoré en approche fonctionnelle (`src/hooks/use-video-processor.ts`)

### LOW

- [ ] `Boolean()` redondant — `if (Boolean(sentRef.current))` alors que `sentRef.current` est déjà un boolean (`src/hooks/use-register-meme-view.ts`)

---

## React Performance

### LOW

- [ ] `getCategoriesListQueryOpts` — `toSorted()` dans le `select` crée une nouvelle référence d'array à chaque accès, le tri devrait être dans le `queryFn` (`src/lib/queries.ts`)
- [ ] `MemeForm` filtre catégories inline — `.filter()` appelé inline dans le JSX au lieu d'être inclus dans le `useMemo` (`src/routes/admin/library/-components/meme-form.tsx`)
- [ ] `Paginator` `getLinkProps` instable — callback recréé à chaque render (`src/components/Meme/Filters/memes-pagination.tsx`)
- [ ] `selectedMeme` avec `.find()` à chaque render — négligeable avec 12-24 items (`src/components/Meme/memes-list.tsx`)

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

## Futur

Items non planifiés, à traiter après les corrections ci-dessus.

### Internationalisation (FR / EN)

Passer le site en bilingue français / anglais. Étudier la meilleure approche avec TanStack Start (routing i18n, détection de langue, etc.).

### Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles : tables en pluriel, colonnes en `snake_case`, timestamps `_at`, booleans `is_*`, prix en centimes (integer), UUIDs partout, `ON DELETE CASCADE` pour auth, `is_anonymized` pour GDPR.

### Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern : `PaymentIntent` → `confirmPayment` avec `redirect: 'if_required'` → polling post-paiement.
