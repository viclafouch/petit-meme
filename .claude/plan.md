# Plan — Features & Futur

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

---

## Refonte page Pricing — Conversion & Plan annuel

Objectif : maximiser la conversion free → paid. Refonte complète de `/pricing` avec plan annuel, sections de persuasion, et fix du composant Card shadcn.

### Phase 0 — Prérequis manuels (user)

- [ ] Créer le Price ID annuel (29,99 €/an, récurrent yearly) dans Stripe Dashboard
- [ ] Ajouter `STRIPE_ANNUAL_PRICE_ID` dans les env vars Vercel + `.env`

### Phase 1 — Fix composant Card shadcn

- [x] Réinstaller la Card via `pnpm dlx shadcn@latest add card` — vérifié identique à l'original
- [x] Styling adapté dans `pricing.tsx` — supprimé le `py-1` override, utilise le padding Card par défaut

### Phase 2 — Plan annuel (Stripe + Better Auth)

- [x] Refacto `src/constants/plan.ts` : type `Plan` avec `pricing: Record<BillingPeriod, PlanPricing>`, `BillingPeriod`, `BILLING_PERIOD_LABELS`, `ANNUAL_DISCOUNT_PERCENT`
- [x] Ajouté plan `premium-annual` dans la config Stripe Better Auth (`src/lib/auth.tsx`)
- [x] Nouvelle env var `STRIPE_ANNUAL_PRICE_ID` dans `src/env/server.ts`
- [x] `src/hooks/use-stripe-checkout.ts` : `checkoutPremium(billingPeriod)` route vers le bon plan
- [x] Email confirmation : période dynamique (mensuel/annuel) via `stripePrice.recurring.interval`
- [x] `src/helpers/subscription.ts` : nouveau helper `getSubscriptionDisplayInfo()` pour affichage dynamique
- [x] Settings page : affiche le bon prix/période via `getSubscriptionDisplayInfo()`

### Phase 3 — Redesign page Pricing

#### Toggle mensuel/annuel
- [x] Toggle pill `BillingToggle` au-dessus des pricing cards avec `role="radiogroup"`
- [x] **Annuel sélectionné par défaut** (`useState('yearly')`)
- [x] Badge "−37%" à côté du toggle en amber
- [x] Prix dynamiques dans les cards selon le toggle + mention "soit ~X/mois" pour l'annuel

#### Section social proof (stats fictives)
- [x] 3 compteurs hardcodés en constante `STAT_ITEMS` : "500+ mèmes", "10 000+ vidéos", "1 000+ utilisateurs"
- [x] Section `StatsSection` avec dividers horizontaux sur desktop

#### Section garantie / rassurance
- [x] Bandeau `GuaranteeBanner` avec 3 icônes Lucide : Lock, MousePointerClick, ShieldCheck
- [x] Positionné juste sous les pricing cards

#### Section FAQ
- [x] 4 questions en Accordion dans `PricingFaq` (annulation, génération, sécurité, plan annuel)
- [x] Positionnée en bas de page

### Phase 4 — SEO & finitions

- [x] JSON-LD pricing mis à jour avec `flatMap` pour inclure les offres annuelles (unitCode `ANN`)
- [x] Meta tags vérifiés (titre, description inchangés)
- [x] Design responsive mobile-first vérifié
- [x] `/frontend-design` utilisé pour le design
- [x] Ajout classe `container` sur la page pricing (cohérence avec les autres pages)
- [x] Cards max-width élargi à `max-w-3xl`
- [x] Plan gratuit affiche "Gratuit" au lieu de "0 €"
- [x] Équivalent mensuel annuel formaté avec `minimumFractionDigits: 2` (~2,50 €/mois)
- [x] Renommé `STRIPE_PRICE_ID` → `STRIPE_MONTHLY_PRICE_ID` (env, server config, auth)
- [x] `.env.example` mis à jour avec les deux price IDs

### Phase 5 — Audit accessibilité, performance, SEO

#### Accessibilité (WCAG 2.1 AA)
- [x] **A-1** (Critical) : Keyboard navigation radio group — arrow keys toggle billing period, `tabIndex` management
- [x] **A-2** (Critical) : Icône distincte pour features limitées — `MinusCircle` (jaune) vs `CheckCircle2` (vert)
- [x] **A-3** (Critical) : Status feature communiqué aux screen readers — `sr-only` label (Inclus/Limité/Non inclus)
- [x] **A-4** (Major) : Card titles rendus en `<h2>` pour hiérarchie de headings
- [x] **A-5/A-6** (Major) : Stats et guarantee wrappés en `<section>` avec `aria-label`
- [x] **A-7** (Major) : Feature list rendu en `<ul>`/`<li>` sémantique avec `aria-label`
- [x] **A-8** (Minor) : Badge "Populaire" avec contexte sr-only "Plan recommandé"
- [x] **A-10** (Major) : Bouton "Actif" — `disabled` → `aria-disabled` (respecte la règle UX)
- [x] **A-11** (Major) : Touch targets toggle ≥ 44px (`min-h-11`, `py-2.5`)
- [x] **A-12** (Minor) : Bouton free plan "Plan actuel" → "Choisir ce plan" (plus clair)
- [x] **A-13** (Minor) : `aria-label="Comparaison des plans"` sur la section pricing cards

#### SEO
- [x] **S-1** (Major) : `twitter:card: 'summary'` fallback quand pas d'image
- [x] **S-3** (Major) : FAQPage JSON-LD structuré ajouté au graph pricing
- [x] **S-5** (Minor) : Meta keywords ajoutés sur la page pricing
- [x] **S-6** (Minor) : `hreflang="x-default"` ajouté en fallback

#### Code quality (agents)
- [x] Code refactoring : `import type React`, booleans extraits, attribute-driven styling, `amber-badge` utility
- [x] Tailwind audit : utility `amber-badge` extraite dans `styles.css`
- [x] React performance : aucun problème détecté

### Hors scope (reporté)
- Tableau comparatif des features
- Témoignages / avis utilisateurs
- A/B testing du pricing

---

## Algolia — Items reportés

### Activer les modèles Recommend (quand suffisamment d'events)

- [ ] Activer "Related Items" dans le dashboard Algolia → Recommend
- [ ] Activer "Trending Items" dans le dashboard Algolia → Recommend
- [ ] Vérifier que les fallbacks (Prisma + `fallbackParameters`) se désactivent naturellement quand les modèles ML fonctionnent

### Synonymes anglais (dépend du passage bilingue)

- [ ] Ajouter les synonymes anglais (`"lmao" <-> "lol" <-> "rofl"`, `"bruh" <-> "bro"`, etc.)
- [ ] Mettre à jour `queryLanguages`, `indexLanguages`, `ignorePlurals`, `removeStopWords` à `["fr", "en"]`

### Boucle d'amélioration continue

- [ ] Consulter régulièrement le dashboard Algolia Analytics (recherches sans résultats, recherches populaires, click position, taux de conversion)

---

## Migration Railway → Vercel — Items restants

Migration terminée (preset Vercel, DNS, env vars, docs). Reste :

- [x] Configurer les crons (Vercel Cron Jobs) — 4 endpoints API (`/api/cron/cleanup`, `/api/cron/verification-reminder`, `/api/cron/sync-algolia`, `/api/cron/sync-bunny-titles`) avec `vercel.json` scheduling. Ancien dossier `crons/` supprimé. Auth via `CRON_SECRET` (env var à ajouter dans Vercel Dashboard).
- [x] Amélioration `vercel.json` : `$schema` (autocomplétion IDE), `regions: ["cdg1"]` (explicite Paris), `headers` sécurité edge (`Permissions-Policy`, `X-DNS-Prefetch-Control`), `functions` maxDuration 60s pour les crons.
- [ ] Réactiver Sentry server-side tracing (`instrument-server.ts` + `wrapFetchWithSentry`) — bloqué par `require-in-the-middle` incompatible ESM dans Vercel serverless. Bug connu : [sentry-javascript#18859](https://github.com/getsentry/sentry-javascript/issues/18859). Surveiller les updates Sentry/OpenTelemetry.

---

## Admin — Page Services

Page `/admin/services` — page statique avec liens vers les dashboards des 8 services (Algolia, Bunny, Stripe, Resend, Database, Sentry, Vercel, Gemini). Aucun appel serveur, données purement statiques.

- [x] Composant `ServiceCard` — icône, titre, lien dashboard (carte cliquable)
- [x] Composant `ServicesGrid` — grid statique
- [x] Page route `/admin/services`
- [x] Lien sidebar "Services" avec icône `Blocks`

---

## Admin — Refonte Tables, UX, Dashboard

Phases 1 à 6 terminées (sécurité admin, GDPR, performance backend, hardening Better Auth, AdminTable upgrade, Users enrichissement + audit log).

**Ordre d'exécution restant :** Tables UI (7-7b) → Error handling (8) → Dashboard & UX (9-10) → Audits (11)

**Item reporté Phase 1 :**
- [ ] Activer le rate limiting sur les preview deployments Vercel — reporté (infra)

### Phase 5 — Upgrade `AdminTable` (composant générique)

**Fichiers :** `src/components/admin/admin-table.tsx`, `src/routes/admin/users.tsx`, `src/routes/admin/categories/index.tsx`

**Décisions deep-dive :**
- `useReactTable` reste dans les pages consommatrices — AdminTable reçoit l'instance `table` en prop
- AdminTable détecte les features activées via l'API TanStack Table (pas de props `enableSorting`/`enablePagination`)
- Footer pagination toujours visible (même si 1 seule page, boutons disabled)
- Pas de composant Pagination séparé — boutons `<Button>` shadcn directement dans AdminTable

- [x] Typer proprement : remplacer `Table<any>` par `Table<TData>` (composant générique)
- [x] Ajouter le tri : headers cliquables avec icônes `ArrowUpDown` (neutre) → `ArrowUp` (asc) / `ArrowDown` (desc). Contrôle par colonne via `enableSorting: false` dans la column definition. `getSortedRowModel()` dans les pages.
- [x] Ajouter la pagination : footer minimal "Page X sur Y" + boutons Précédent/Suivant (`<Button>` shadcn). 20 items/page fixe. `getPaginationRowModel()` dans les pages. Footer toujours affiché.
- [x] Activer tri + pagination sur `users.tsx` : colonnes triables = Name, Email, Role, Date de création (pas ID ni Actions)
- [x] Activer tri + pagination sur `categories/index.tsx` : colonnes triables = Titre, Slug, Date de création (pas ID, Mots clés ni Actions)

### Phase 6 — Users table (enrichissement + confirmations + server functions)

Inclut l'enrichissement des données affichées, la migration ban/unban/delete vers des server functions sécurisées, la création du modèle `AdminAuditLog`, et les confirmations UI.

**Fichiers :** `src/routes/admin/users.tsx`, `src/server/admin.ts`, `prisma/schema.prisma`

**Migration Prisma — `AdminAuditLog`**
- [x] Créer le modèle `AdminAuditLog` (action, actingAdminId, targetId, targetType, metadata Json, createdAt) — audit trail officiel en DB

**Server functions ban/unban**
- [x] Créer `banUserById` dans `src/server/admin.ts` avec `adminRequiredMiddleware` + guard anti-self-ban (`userId === context.user.id`) + log dans `AdminAuditLog`
- [x] Créer `unbanUserById` dans `src/server/admin.ts` avec `adminRequiredMiddleware` + log dans `AdminAuditLog`
- [x] Migrer `DropdownMenuUser` pour appeler les server functions au lieu de `authClient.admin.banUser/unbanUser`
- [x] Permettre un choix de raison de ban (raisons prédéfinies) au lieu du hardcoded "Spamming"

**Server function removeUser**
- [x] Ajouter guard server-side `userId === context.user.id` (auto-suppression)
- [x] Log dans `AdminAuditLog` avec `actingAdminId`
- [x] Supprimer le `findUnique` pré-vol redondant — laisser `auth.api.removeUser` gérer le not-found

**Enrichissement données Users (deep-dive 2026-02-25)**

Objectif : donner une vision complète de chaque user sans navigation. Colonne ID retirée. Colonnes regroupées en badges pour limiter à ~9 colonnes.

Layout final : `Avatar+Name | Email | Role | Provider | Statut | Abo | Engagement | Dernière activité | Actions`

*Data fetching :* query Prisma directe (bypass `auth.api.listUsers` — perf: élimine 2 queries séquentielles BA dont un COUNT inutile + récupère `generationCount` gratuitement). Enrichissement côté serveur avec queries Prisma batch `WHERE id IN (...)`. 3 index ajoutés (`account.userId`, `session.userId`, `subscription(referenceId, status)`).

- [x] Enrichir `getListUsers` dans `src/server/admin.ts` : query Prisma directe + queries batch pour :
  - `Account.providerId` (provider auth : Twitter ou Email)
  - `Subscription` via `referenceId` (statut : active / past / none + dates pour tooltip)
  - Count `UserBookmark` WHERE `userId` (bookmarks)
  - Max `Session.updatedAt` WHERE `userId` (dernière activité)
  - `User.generationCount` (inclus dans la query user directe)
- [x] Retirer la colonne ID
- [x] Colonne **Avatar + Name** : `user.image` (avatar rond) + nom. Fallback initiales si pas d'image.
- [x] Colonne **Provider** : badge `Twitter` / `Email` — basé sur `Account.providerId`
- [x] Colonne **Statut** (badges multiples) :
  - Badge vert "Actif" = vérifié, pas banni, pas premium (cas par défaut — toujours au moins 1 badge)
  - Badge rouge "Banni" = `user.banned === true`
  - Badge orange "Non vérifié" = `user.emailVerified === false`
- [x] Colonne **Abo** : badge doré "Premium" (active), badge outline "Ancien" (past), tiret (none). Tooltip avec durée d'abonnement + date de fin.
- [x] Colonne **Engagement** : format compact `Xb Xg` (X bookmarks, X générations studio)
- [x] Colonne **Dernière activité** : format relatif (`formatDistanceToNow` de date-fns, ex: "il y a 2j") + tooltip avec date exacte au hover
- [x] Retirer la colonne **Date de création** (redondante avec Dernière activité)
- [x] Colonnes triables : Name, Email, Role, Dernière activité

**Confirmations + feedback**
- [x] Confirmation ban/unban/delete : wraper avec `ConfirmAlert` (`src/components/confirm-alert.tsx`)
- [x] Toast feedback : `toast.promise()` pour ban, unban et delete
- [x] `onError` avec toast + `Sentry.captureException` sur chaque mutation
- [x] Dropdown vide pour admin propre compte : retourne `null` au lieu d'un menu vide

**Optimisations perf (audit backend)**
- [x] Bypass `auth.api.listUsers` → query Prisma directe (élimine 2 queries séquentielles BA + COUNT inutile)
- [x] Suppression query `generationCount` redondante (incluse dans query user directe)
- [x] 3 index DB ajoutés : `account(userId)`, `session(userId)`, `subscription(referenceId, status)` (`meme(submittedBy)` supprimé avec le champ)
- [x] Types dérivés depuis Prisma (`UserGetPayload`, `SubscriptionGetPayload`) au lieu de types manuels

**Migration Prisma requise :** `pnpm exec prisma migrate dev --name add_admin_query_indexes`

### Phase 7 — Categories table (enrichissement + tri + confirmation delete)

**Fichiers :** `src/routes/admin/categories/index.tsx`, `src/routes/admin/categories/-components/category-dropdown.tsx`, `src/server/categories.ts`

**Décisions deep-dive :**
- Layout colonnes : `Titre | Slug | Memes publiés | Mots clés | Date de création | Actions` (colonne ID retirée, cohérent avec Users)
- Colonne Slug préfixée avec `/` (ex: `/animaux`)
- Colonne Memes publiés : nombre brut, "0" en `text-muted-foreground`
- Count filtré `PUBLISHED` uniquement (via `_count` Prisma avec `where meme.status = PUBLISHED`)
- Confirmation delete : pattern contrôlé comme Users (`isDeleteDialogOpen` + `AlertDialog` contrôlé, pas `ConfirmAlert` trigger)
- DropdownMenuItem : migrer `onClick` → `onSelect` (cohérence Users)
- Toast : `toast.promise()` pattern Users ("Suppression en cours..." / "Catégorie supprimée")
- Sentry : `captureException` dans `onError` avec tag `{ feature: 'admin-category-delete' }`
- Invalidation : `router.invalidate()` + `queryClient.invalidateQueries(getCategoriesListQueryOpts.all)` après suppression
- Audit log : sur les 3 actions (add, edit, delete), `targetType: 'category'`, `metadata: { title, slug }`

**Enrichissement données Categories**

- [x] Enrichir `fetchCategories` dans `src/server/categories.ts` : ajouter `include: { _count: { select: { memes: { where: { meme: { status: 'PUBLISHED' } } } } } }` — type retourné change (Category + `_count`). Type exporté `EnrichedCategory` dérivé de `ReturnType<typeof fetchCategories>[number]`
- [x] Retirer la colonne ID de la table
- [x] Ajouter colonne **Memes publiés** après Slug : nombre brut triable, "0" en `text-muted-foreground`
- [x] Colonne **Slug** : afficher avec `/` devant (ex: `/animaux`) en `font-mono text-sm text-muted-foreground`
- [x] Adapter le type générique `createColumnHelper` pour `EnrichedCategory`

**Tri**
- [x] Colonnes triables : Titre, Slug, Memes publiés, Date de création (tri déjà configuré via `getSortedRowModel()`)

**Refonte `CategoryDropdown` (pattern Users)**
- [x] Migrer vers dialog contrôlé (`isDeleteDialogOpen` state + `AlertDialog` contrôlé open/onOpenChange)
- [x] Migrer `DropdownMenuItem` de `onClick` vers `onSelect`
- [x] `toast.promise()` dans `mutationFn` + `handleMutationSuccess` (close dialog + `router.invalidate()` + `queryClient.invalidateQueries`)
- [x] `Sentry.captureException(error, { tags: { feature: 'admin-category-delete' } })` dans `onError`

**Audit log (3 actions)**
- [x] `deleteCategory` : ajouter `context` au handler + `AdminAuditLog.create({ action: 'delete', targetType: 'category', metadata: { title, slug } })`
- [x] `addCategory` : ajouter `context` au handler + `AdminAuditLog.create({ action: 'create', targetType: 'category', metadata: { title, slug } })`
- [x] `editCategory` : ajouter `context` au handler + `AdminAuditLog.create({ action: 'edit', targetType: 'category', metadata: { title, slug } })`

**Extractions réutilisables (post-phase)**
- [x] Extraire `ConfirmAlertDialog` de `users.tsx` → `src/components/confirm-alert-dialog.tsx` (réutilisé dans Users + Categories)
- [x] Extraire `getUserInitials` de `users.tsx` → `src/helpers/format.ts`

**Audits post-implémentation**
- [x] Security : fix mass assignment dans `editCategory` (destructuration explicite `{ id, title, slug, keywords }`)
- [x] Security : slug format validation via `CATEGORY_SLUG_REGEX` partagé (exporté depuis `constants/meme.ts`)
- [x] Security : `logAuditAction` wrappé dans try/catch (ne fait plus échouer la mutation)
- [x] Dead code : suppression `src/components/confirm-alert.tsx`, migration `delete-meme-button.tsx` → `ConfirmAlertDialog`
- [x] Tailwind : suppression `w-full` redondant dans `index.tsx`
- [x] React perf : aucun problème détecté

### Phase 7b — Library cards (enrichissement léger)

**Fichiers :** `src/server/admin.ts`, `src/components/admin/meme-list-item.tsx`, `src/helpers/format.ts`, `src/routes/admin/library/$memeId.tsx`, `prisma/schema.prisma`

**Décisions deep-dive :**
- Data source : post-fetch Prisma batch (`groupBy` sur les memeIds retournés par Algolia, 30 max/page). Count toujours frais (pas caché avec `withAlgoliaCache`).
- Type enrichi : `AdminMemeRecord = AlgoliaMemeRecord & { bookmarkCount: number }` exporté depuis `server/admin.ts`
- Affichage grille : même pattern que view count / category count — icône `Bookmark` (lucide) + count formaté. `0` en `text-muted-foreground`.
- Helper : `formatBookmarkCount` dans `helpers/format.ts`. Zéro = `"0 bookmark"`, pluriel = `"X bookmarks"`.
- Page détail : bookmark count ajouté via `_count: { select: { bookmarkedBy: true } }` dans `MEME_FULL_INCLUDE`
- Index DB : `@@index([memeId])` sur `UserBookmark` (migration additive)
- Scope : admin seulement, pas de changement côté public

**Index DB**
- [x] Ajouter `@@index([memeId])` sur `UserBookmark` dans `prisma/schema.prisma`

**Server — enrichissement bookmark counts**
- [x] Modifier `getAdminMemes` dans `src/server/admin.ts` : après le fetch Algolia (caché), extraire les `memeId` des hits → `prismaClient.userBookmark.groupBy({ by: ['memeId'], where: { memeId: { in: memeIds } }, _count: { id: true } })` → merger `bookmarkCount` sur chaque hit
- [x] Exporter le type `AdminMemeRecord = AlgoliaMemeRecord & { bookmarkCount: number }` depuis `src/server/admin.ts`
- [x] Ajouter `_count: { select: { bookmarkedBy: true } }` dans `MEME_FULL_INCLUDE` pour `getAdminMemeById`

**Helpers**
- [x] Ajouter `formatBookmarkCount` dans `src/helpers/format.ts` : `"0 bookmark"` / `"X bookmarks"`

**UI — Grille Library**
- [x] Modifier `MemeListItem` (`src/components/admin/meme-list-item.tsx`) : accepter `AdminMemeRecord` au lieu de `AlgoliaMemeRecord`, afficher stats en format compact icône + nombre (`Eye`, `Tag`, `Bookmark`) avec `title` tooltip pour le texte complet. `tabular-nums` pour alignement. Catégories = 0 en `text-destructive-foreground`.

**UI — Page détail meme**
- [x] Afficher le bookmark count sur `/admin/library/$memeId` à côté du view count, même pattern label

**Migration Prisma requise :** `pnpm exec prisma migrate dev --name add_user_bookmark_meme_id_index`

### Phase 8 — Gestion d'erreurs (client + serveur + Sentry)

Audit complet : zéro erreur silencieuse, remontée Sentry systématique, feedback utilisateur cohérent, logging serveur exploitable.

**Décisions deep-dive :**
- Tous les `Sentry.captureException` utilisent `captureWithFeature(error, SENTRY_FEATURES.XXX)` — helper + constantes dans `src/lib/sentry.ts`
- Tags `feature` partout (client + serveur) pour catégoriser dans Sentry
- Timeouts : `fetchWithZod` 15s (configurable), Sentry tunnel 10s, Bunny CDN `shareMeme` 15s

**Nouveau fichier : `src/lib/sentry.ts`**
- [x] Objet `SENTRY_FEATURES` (`as const satisfies`) : `STRIPE_CHECKOUT`, `STRIPE_PAYMENT`, `STRIPE_BILLING_PORTAL`, `BUNNY_WEBHOOK`, `BUNNY_CLEANUP`, `AI_GENERATION`, `RESEND_EMAIL`, `BOOKMARK`, `SHARE`, `DOWNLOAD`, `ADMIN_MEME_EDIT`, `DELETE_ACCOUNT`, `UPDATE_PASSWORD`, `DATA_EXPORT`, `FILE_UPLOAD`, `STUDIO`
- [x] Helper `captureWithFeature(error: unknown, feature: SentryFeature)` → wrappe `Sentry.captureException(error, { tags: { feature } })`

#### P0 — Critique (paiements, webhooks, emails)

**Stripe checkout** (`src/hooks/use-stripe-checkout.ts`)
- [x] Ajouter `captureWithFeature(error, SENTRY_FEATURES.STRIPE_CHECKOUT)` dans les deux catch blocks (billing portal + checkout premium)
- [x] **Fix bug** : ajouter `return` après `showDialog` dans le check `!user` de `goToBillingPortal` (l'exécution tombe dans l'appel auth sans user)

**Webhook Bunny** (`src/routes/api/bunny.ts`)
- [x] Wrapper `request.json()` + `WEBHOOK_RESPONSE_SCHEMA.parse()` dans un try/catch → retourner **400** si JSON invalide ou Zod fail (pas de retry Bunny)
- [x] Déplacer `getVideoPlayData()` dans le try/catch interne (actuellement hors bloc)
- [x] Retourner **500** dans le catch principal (erreur DB/interne) — Bunny retry sur 5xx
- [x] Logger les erreurs en `.error()` au lieu de `.debug()`
- [x] `invalidateAlgoliaCache()` est synchrone (void) — pas de `.catch()` nécessaire

**Appel Gemini AI** (`src/server/ai.ts`)
- [x] Wrapper `ai.models.generateContent()` + parse dans un try/catch avec `captureWithFeature(error, SENTRY_FEATURES.AI_GENERATION)`
- [x] Remplacer `result.text!` par un check explicite (`if (!result.text) throw new Error('La génération AI a échoué')`)
- [x] Throw avec message clair — l'appelant (`generateContentMutation.onError`) gère le toast

**Emails Resend** (`src/lib/resend.ts`)
- [x] Ajouter `captureWithFeature(error, SENTRY_FEATURES.RESEND_EMAIL)` dans le `.catch()` réseau et dans le `.then({ error })`

**Stripe payment_failed** (`src/lib/auth.tsx`)
- [x] Ajouter `captureWithFeature` (tag `STRIPE_PAYMENT`) quand user not found pour un `payment_failed`
- [x] Wrapper `billingPortal.sessions.create()` dans try/catch + `captureWithFeature` (tag `STRIPE_BILLING_PORTAL`) + log. **Sans re-throw** (ne pas casser le hook BA)
- [x] Extraction de `handlePaymentFailed` en fonction dédiée (250 lignes max)

#### P1 — High (erreurs silencieuses côté utilisateur)

**Mutations sans `onError`**
- [x] `src/hooks/use-toggle-bookmark.ts` — ajouter `onError` avec `toast.error('Erreur lors de la mise à jour du favori')` + `captureWithFeature(error, SENTRY_FEATURES.BOOKMARK)`
- [x] `src/components/admin/download-from-twitter-form.tsx` — ajouter `onError` sur clipboard mutation avec **toast seul** (`toast.error('Impossible de lire le presse-papiers')`) — pas de Sentry (permission navigateur)
- [x] `src/components/Meme/MemeForm/twitter-form.tsx` — idem clipboard mutation, toast seul

**`shareBlob` / `downloadBlob` fire-and-forget**
- [x] `src/utils/download.ts` — remplacer `.catch(() => {})` dans `shareBlob` par un catch qui filtre `AbortError`/`NotAllowedError` (user cancel) et appelle `captureWithFeature(error, SENTRY_FEATURES.SHARE)` pour les vraies erreurs
- [x] `src/hooks/use-share-meme.ts` — erreurs remontent (`await` au lieu de `void`) + `captureWithFeature` dans `onError`
- [x] `src/hooks/use-download-meme.ts` — `captureWithFeature` dans `onError`

**Timeout manquant sur fetch**
- [x] `src/lib/utils.ts` (`fetchWithZod`) — ajouter `AbortController` avec timeout configurable via `FetchWithZodInit` (default **15s**)
- [x] `src/routes/api/sentry-tunnel.ts` — ajouter timeout **10s** sur le `fetch()` upstream
- [x] `src/server/meme.ts` (`shareMeme`) — ajouter error handling + timeout **15s** + check `response.ok`

**`findActiveSubscription` throw en erreur API** (`src/server/customer.ts`)
- [x] Retirer le try/catch qui retourne `null` en cas d'erreur API — l'erreur throw maintenant. `null` = uniquement "pas d'abonnement"

#### P2 — Medium (robustesse, Sentry manquant, UX)

**Dialogs fermés avant fin de mutation**
- [x] `src/components/Meme/MemeForm/file-form.tsx` — déplacer `closeDialog()` dans `onSuccess`
- [x] `src/components/Meme/MemeForm/twitter-form.tsx` — idem `closeDialog()` dans `onSuccess`

**Catch blocks sans Sentry**
- [x] `src/hooks/use-video-processor.ts` — toast générique pour erreurs non-StudioError + migration vers `captureWithFeature`
- [x] `src/routes/admin/library/-components/meme-form.tsx` — `editMutation` : clé `error` dans `toast.promise` + `onError` Sentry. `generateContentMutation` : `captureWithFeature` dans `onError`
- [x] `src/components/User/delete-account-dialog.tsx` — `onError` avec `captureWithFeature(error, SENTRY_FEATURES.DELETE_ACCOUNT)`
- [x] `src/components/User/update-password-dialog.tsx` — idem `captureWithFeature(error, SENTRY_FEATURES.UPDATE_PASSWORD)`
- [x] `src/routes/_public__root/_default/settings/-components/profile-content.tsx` — `captureWithFeature(error, SENTRY_FEATURES.DATA_EXPORT)` dans `onError`
**HTTP status non vérifié**
- [x] `src/lib/react-tweet.ts` (`getTweetMedia`) — check `response.ok` dans `fetchBlob` helper

**Algolia + upload partial failure** (`src/server/admin.ts`)
- [x] `createMemeWithVideo` : rollback DB + Algolia si upload échoue, avec `captureWithFeature` et re-throw

#### P3 — Low (améliorations mineures)

- [x] `src/routes/__root.tsx` — ajouté `id: user.id` dans `Sentry.setUser()`
- [x] `src/server/admin.ts` — `captureWithFeature(error, SENTRY_FEATURES.BUNNY_CLEANUP)` sur les catch Bunny delete
- [x] `src/lib/react-tweet.ts` — `throw new Error(...)` au lieu de `Promise.reject(new Error(...))`
- [x] `errorComponent: ErrorComponent` ajouté sur la route `/admin`
- [x] `react-error-boundary` évalué : encore utilisé dans 2 fichiers Studio, ne peut pas être retiré

### Phase 9a-pre — Split `src/server/admin.ts` → `src/server/admin/`

Restructuration du fichier monolithique `admin.ts` (~710 lignes) en un dossier avec des fichiers par domaine. **Commit séparé** avant Phase 9a.

**Structure cible :**
- `src/server/admin/index.ts` — re-exports (barrel file, tous les exports publics)
- `src/server/admin/users.ts` — getListUsers, banUserById, unbanUserById, removeUser
- `src/server/admin/memes.ts` — getAdminMemes, getAdminMemeById, editMeme, deleteMemeById, createMemeFromTwitterUrl, createMemeFromFile, createMemeWithVideo
- `src/server/admin/audit.ts` — logAuditAction + types (`AuditAction`, `AuditTargetType`, `AuditActionParams`). Partagé par `memes.ts`, `users.ts` et `src/server/categories.ts`
- `src/server/admin/dashboard.ts` — (vide pour l'instant, prêt pour Phase 9a)

**Imports :** tous les consommateurs importent depuis `~/server/admin` (transparent via `index.ts`). `categories.ts` importe `logAuditAction` depuis `~/server/admin/audit`.

- [x] Créer `src/server/admin/audit.ts` — extraire `logAuditAction` de `categories.ts`, typer `AuditAction` et `AuditTargetType`
- [x] Créer `src/server/admin/users.ts` — déplacer getListUsers, ban/unban/remove + types associés (+ migration vers `logAuditAction` partagé)
- [x] Créer `src/server/admin/memes.ts` — déplacer tout le CRUD memes + types associés
- [x] Créer `src/server/admin/dashboard.ts` — fichier vide exportant rien (placeholder)
- [x] Créer `src/server/admin/index.ts` — re-exports de tous les modules
- [x] Supprimer `src/server/admin.ts`
- [x] Mettre à jour `src/server/categories.ts` — importer `logAuditAction` depuis `~/server/admin/audit`, ajouter `targetType: 'category'` aux 3 appels
- [x] Imports consommateurs transparents via barrel `index.ts` (aucun changement nécessaire)
- [x] `pnpm run lint:fix` — compilé sans erreur

### Phase 9a — Dashboard fondations (KPIs + totaux + liens + feed)

Transformer la page d'accueil admin (actuellement redirect vers `/admin/library`) en un vrai dashboard. Design via `/frontend-design`.

**Décisions deep-dive :**
- Algolia Analytics API : **indisponible sur free tier** (nécessite Premium/Elevate) → compteurs DB
- Partages/téléchargements : `shareCount`/`downloadCount` sur Meme (migration additive, historique = 0, affichés dès le début)
- StudioGeneration : nouveau modèle Prisma pour l'analytics (filtrage par date). `User.generationCount` **conservé** pour le rate limiting (O(1) vs COUNT scan). Écriture atomique via `$transaction` (increment counter + create record). Dual source justifiée par l'audit perf.
- Période : URL search param `?period=7d|30d|90d|all`, default `30d`, validé Zod via TanStack Router. Param optionnel (liens vers `/admin` sans search). `PERIOD_SCHEMA` exporté depuis `dashboard.ts` comme single source of truth.
- Deltas : % variation vs période précédente (flèche verte/rouge). Masqué si previous=0. Badge "Nouveau" si current>0 et previous=0. Sinon afficher le % normalement.
- Data loading : client-side `useSuspenseQuery` + Suspense boundaries + skeleton cards
- Server functions : 2 fonctions (stats + feed séparés car le feed est indépendant de la période)
- **Queries** : Prisma client classique + `Promise.all` (type-safe, ~22 queries en parallèle). Pas de `$queryRaw`. Dashboard admin-only (1 utilisateur), perf suffisante avec des COUNT indexés.
- Tracking share/download : server function fire-and-forget, **ouvert à tous** (anonymes inclus) pour capturer 100% des events. Pas de vérification d'existence du meme (fire-and-forget pur — si memeId invalide, Prisma update échoue silencieusement, Sentry capture). **Pas de protection anti-spam** (reporté)
- Audit log : `logAuditAction` importé depuis `~/server/admin/audit` (partagé). Tous les appels en **fire-and-forget** (`void logAuditAction(...)`) — non bloquant, erreurs déjà catchées. Pattern rétroactif sur les categories existantes.
- Audit log memes : CRUD complet (create, edit, status_change, delete). Logger chaque appel editMeme. status_change : détection via `findUnique({ select: { status: true } })` avant l'update, metadata `{ from, to }`
- Feed : 10 entrées, format compact "verbe passé + target" (ex: "Catégorie créée : Animaux", "Utilisateur banni : john@..."). Icônes déléguées à `/frontend-design`, cohérence dans tout l'admin.
- Composant UI du sélecteur de période : choix délégué à `/frontend-design`

**Ordre d'implémentation : couche par couche**
1. Migrations Prisma
2. Server functions (tracking, audit, dashboard stats, feed)
3. Hooks (share/download tracking)
4. Page + composants UI (via `/frontend-design`)

**Fichiers :** `src/routes/admin/index.tsx`, `src/routes/admin/-components/dashboard/` (kpi-card, kpi-grid, totals-section, quick-links, activity-feed), `src/server/admin/dashboard.ts`, `src/server/admin/memes.ts`, `src/server/admin/audit.ts`, `src/server/user.ts`, `src/server/meme.ts`, `prisma/schema.prisma`, `src/hooks/use-share-meme.ts`, `src/hooks/use-download-meme.ts`, `src/routes/admin/route.tsx`, `src/components/admin/admin-sidebar.tsx`, `src/lib/sentry.ts`

**Migrations additives (Prisma)**
- [x] Créer le modèle `StudioGeneration` (id, userId, createdAt) — relation User, indexes : `@@index([createdAt])` + `@@index([userId, createdAt])` (le composite couvre les queries par userId seul, pas besoin d'un index `userId` standalone)
- [x] Ajouter `shareCount Int @default(0)` et `downloadCount Int @default(0)` sur `Meme`
- [x] Ajouter `@@index([day])` sur `MemeViewDaily` — queries globales date-range KPI (sans filtre memeId)
- [x] Ajouter `@@index([createdAt])` sur `UserBookmark` — bookmarks KPI date-range
- [x] Ajouter `@@index([createdAt])` sur `User` — nouveaux users KPI date-range
- [x] Ajouter `@@index([status, publishedAt])` sur `Meme` — nouveaux memes publiés KPI
- [x] Ajouter `@@index([status])` sur `Subscription` — count global actifs (le composite `(referenceId, status)` existant ne couvre pas un filtre global par status)

**StudioGeneration + generationCount (dual write)**
- [x] Modifier `incrementGenerationCount` dans `src/server/user.ts` : écriture atomique via `$transaction` — `user.update({ generationCount: { increment: 1 } })` + `studioGeneration.create({ userId })`. Le rate limiting continue de lire `generationCount` (O(1), pas de régression perf)
- [x] Modifier `src/server/admin/users.ts` (`getListUsers`) : remplacer `generationCount` dans `USER_LIST_SELECT` par un `studioGeneration.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _count: { id: true } })` dans le `Promise.all` batch existant (cohérent avec le pattern memeCounts/bookmarkCounts)
- [x] Modifier `src/routes/admin/users.tsx` : adapter l'affichage engagement (Xg) pour utiliser le nouveau champ du batch — `EnrichedUser.generationCount` désormais calculé côté serveur, aucun changement côté UI nécessaire

**Tracking share/download**
- [x] Créer `trackMemeAction` server function dans `src/server/meme.ts` **sans auth** (ouvert à tous, anonymes inclus) : `({ memeId, action: 'share' | 'download' })` → `prisma.meme.update({ where: { id: memeId }, data: { [field]: { increment: 1 } } })`. Fire-and-forget pur, pas de check d'existence.
- [x] Appeler `trackMemeAction` fire-and-forget dans `src/hooks/use-share-meme.ts` après share réussi
- [x] Appeler `trackMemeAction` fire-and-forget dans `src/hooks/use-download-meme.ts` après download réussi
- [x] Appeler `trackMemeAction` fire-and-forget (action `'share'`) après "Copier le lien" réussi dans `src/routes/_public__root/_default/memes/$memeId.tsx` et `src/components/Meme/player-dialog.tsx`
- [ ] **Reporté :** rate limiting dédié sur le tracking (dédoublonnage par user/meme)

**Audit log memes (5 actions, fire-and-forget)**
- [x] `createMemeFromTwitterUrl` : `void logAuditAction({ action: 'create', targetType: 'meme', metadata: { title, source: 'twitter' } })`
- [x] `createMemeFromFile` : `void logAuditAction({ action: 'create', targetType: 'meme', metadata: { title, source: 'upload' } })`
- [x] `editMeme` : `findUnique({ select: { status: true } })` avant l'update pour détecter le changement de status. `void logAuditAction({ action: 'edit', targetType: 'meme', metadata: { title } })` — logger chaque appel (pas de diff)
- [x] `editMeme` (status change) : `void logAuditAction({ action: 'status_change', targetType: 'meme', metadata: { title, from, to } })` — quand le status change (comparaison old vs new)
- [x] `deleteMemeById` : `void logAuditAction({ action: 'delete', targetType: 'meme', metadata: { title } })`
- [x] **Rétroactif** : migrer les `await logAuditAction(...)` existants (categories + users) vers `void logAuditAction(...)` pour cohérence (-10-30ms par CRUD)

**Server functions**
- [x] `getAdminDashboardStats({ period: '7d' | '30d' | '90d' | 'all' })` dans `src/server/admin/dashboard.ts` — retourne :
  - 7 KPIs filtrés par période + deltas (vues, nouveaux users, nouveaux memes publiés, générations Studio, bookmarks, partages, téléchargements)
  - 4 totaux hors période (memes publiés, memes en attente, total users, abonnements premium actifs)
  - **Queries** : Prisma client classique + `Promise.all`. ~18 queries parallèles type-safe (2 par KPI : current + previous period). Dates calculées via `computeDateRanges` (extrait dans `helpers/date.ts`).
  - **Architecture** : 3 fonctions — `fetchTotals()` (partagé), `fetchAllTimeStats()` (period=all, previous=0), `fetchPeriodStats(days)` (comparaison N jours)
- [x] `getAdminRecentActivity()` dans `src/server/admin/dashboard.ts` — 10 dernières entrées `AdminAuditLog` (indépendant de la période). L'index `@@index([createdAt])` existant suffit (DESC scan + LIMIT 10). Type `AuditLogEntry` dérivé de Prisma via `Omit<RawAuditLogEntry, 'action' | 'targetType' | 'metadata'> & { action: AuditAction; targetType: AuditTargetType; metadata: AuditMetadata | null }` — single `as` cast au server boundary.

**Page dashboard (`src/routes/admin/index.tsx`)**
- [x] Retirer le redirect vers `/admin/library` dans `src/routes/admin/route.tsx`
- [x] Créer `src/routes/admin/index.tsx` — route `/admin`, titre "Dashboard", search params validés Zod (`period: PERIOD_SCHEMA.optional().default('30d').catch('30d')`) — param optionnel, default 30j
- [x] Ajouter "Dashboard" dans la sidebar (`src/components/admin/admin-sidebar.tsx`) : premier lien, au-dessus de "Librairie", icône `LayoutDashboard` (lucide), lien vers `/admin`
- [x] `useSuspenseQuery` pour `getAdminDashboardStats` et `getAdminRecentActivity` — `refetchInterval: MINUTE` (polling 60s), `refetchOnMount: 'always'` (au call site, pas dans la factory query opts)
- [x] Suspense + error boundary **par section** (KPIs/totaux/liens rapides groupés, feed séparé) — si une section plante, les autres restent visibles
- [x] Fallback erreur : encadré "Impossible de charger les données" + bouton "Réessayer" (reset error boundary)
- [x] Skeleton cards dans chaque Suspense fallback
- [x] `captureWithFeature` : ajouté `admin-dashboard` dans `SentryFeature`

**Composants dashboard (`src/routes/admin/-components/dashboard/`)**
- [x] `kpi-card.tsx` — card avec valeur, label, delta (% + flèche verte/rouge). Delta masqué si previous=0. Badge "Nouveau" si current>0 et previous=0. `KpiDelta` sous-composant extrait.
- [x] `kpi-grid.tsx` — grid responsive des 7 KPIs (config data-driven)
- [x] `totals-section.tsx` — 4 totaux hors période (memes publiés, en attente, total users, abos premium)
- [x] `quick-links.tsx` — 4 liens avec counts dynamiques. Data-driven via `buildQuickLinks(totals)` avec `linkOptions([...])` de TanStack Router (type-safe). "Ajouter un meme" remplacé par "Librairie" (l'ajout est un dialog, pas une route)
- [x] `activity-feed.tsx` — liste des 10 dernières actions. Logique extraite dans `helpers/audit.tsx` (`formatAuditEntry`) et `helpers/action-icon.tsx` (`getActionIcon`). Zéro `as` cast (types flow depuis `AuditLogEntry` typé). Avatar + nom admin. Temps relatif via date-fns.
- [x] `period-selector.tsx` — ToggleGroup shadcn (7j/30j/90j/Tout), met à jour le search param via `useNavigate`

**Design — délégué à `/frontend-design`**
- [x] Layout responsive (mobile-first)
- [x] Composant sélecteur de période
- [x] Style des cards KPI, totaux, liens rapides, feed
- [x] Icônes par action type (feed + cohérence admin-wide)

**Helpers extraits (réutilisables hors admin) :**
- `src/helpers/action-icon.tsx` — `getActionIcon(action)` : mapping action → icône lucide (generic, réutilisable dans library/users/categories)
- `src/helpers/audit.tsx` — `getAuditTargetLabel`, `getAuditActionVerb`, `formatAuditEntry` : logique audit-specific (FR, accords genre)
- `src/helpers/date.ts` — `truncateToUtcDay`, `computeDateRanges(days)` : utilitaires date extraits de `dashboard.ts`
- `src/helpers/number.ts` — `computePercentChange(current, previous)` : calcul delta % (extrait de `kpi-card.tsx`)

**Fichiers additionnels modifiés :**
- `src/lib/algolia.ts` — ajouté `shareCount`/`downloadCount` dans `memeToAlgoliaRecord` (compatibilité type `MemeWithVideo`)
- `src/components/path-breadcrumbs.tsx` — lien `/admin` sans search params (period optionnel)
- `src/components/user-dropdown.tsx` — idem + extrait `UserDropdownParams` type + remplacé initiales inline par `getUserInitials`

**Migration Prisma requise :** `pnpm exec prisma migrate dev --name add_studio_generation_and_meme_counters`

### Phase 9b — Graphiques tendances ✅

LineChart full-width au dashboard admin avec 5 courbes de tendance + 4 summary cards. Remplace les anciens 7 KPI cards.

**Architecture :**
- 5 métriques : vues, générations IA, partages, téléchargements, nouveaux utilisateurs (signups)
- Signups : `$queryRaw` sur `User.createdAt` (indexé), agrégé par granularité. Courbe uniquement (pas de summary card — le total users est déjà dans `TotalsSection`). Couleur `--chart-2`, label "Nouveaux utilisateurs".
- Chart + 4 summary cards alimentés par une seule query (`getAdminChartData`)
- Totaux (memes publiés, en attente, users, premium) = query séparée `getAdminDashboardTotals` (sans période)
- Ancien `DashboardStats` + 7 KPI cards supprimés → simplifié en `DashboardTotals` + `ChartDataPoint`

**Fichiers modifiés/créés :**
- `prisma/schema.prisma` — `MemeActionDaily` + covering index `@@index([day, action, count])`
- `src/server/meme.ts` — dual write `trackMemeAction` (updateMany + upsert, vérifie `status: PUBLISHED`), `getRandomMeme` optimisé (`ORDER BY RANDOM() LIMIT 1`)
- `src/server/admin/dashboard.ts` — `getAdminChartData` (3 queries parallèles, `$queryRaw` pour générations), `getAdminDashboardTotals`
- `src/helpers/date.ts` — `ChartGranularity`, `getChartGranularity`, `truncateToGranularity` (optimisé sans allocation Date), `generateDateSeries`, `formatUtcDateKey`
- `src/lib/queries.ts` — `getAdminChartDataQueryOpts`, `getAdminDashboardTotalsQueryOpts`
- `src/routes/admin/-components/dashboard/trends-chart.tsx` — LineChart Recharts + 4 summary cards, légende cliquable
- `src/routes/admin/index.tsx` — intégration chart + totaux en Suspense boundaries séparées
- `src/styles.css` — `--chart-6`
- `src/components/ui/chart.tsx` — généré par shadcn (Recharts)

**Fichiers supprimés :** `kpi-card.tsx`, `kpi-grid.tsx`

**Audits appliqués :**
- [x] Backend perf : `studioGeneration.findMany` → `$queryRaw` avec `date_trunc`, `getRandomMeme` → single query, covering index, `truncateToGranularity` sans Date alloc
- [x] Tailwind : `ChartSkeleton` → `<Card>`, classe `group` morte, réordonnancement classes
- [x] Security : `trackMemeAction` vérifie `status: PUBLISHED` avant write
- [x] Dead code : aucun dead code détecté
- [x] React perf : rien de critique (React Compiler gère)

**Migrations Prisma appliquées :** `add_meme_action_daily`, `add_covering_index_meme_action_daily`

### Phase 9c — Memes tendances

Top 10 memes les plus tendances des 7 derniers jours. Algo de scoring multi-signaux. Toujours 7 jours (indépendant du sélecteur de période).

**Algo de scoring :**
- `score = (vues × 1) + (bookmarks × 2) + (downloads × 3) + (generations × 4) + (shares × 5)`
- Poids en constante privée `TRENDING_WEIGHTS` (objet `as const satisfies`) dans `src/server/admin/dashboard.ts`

**Décisions deep-dive :**
- Query : une seule `$queryRaw` avec sous-queries pour les 5 signaux + `INNER JOIN "Video"` pour titre/thumbnail — **single round-trip** (pas de `findMany` séparé). Scoring en SQL, `LIMIT 10`.
- Server function : `getAdminTrendingMemes()` dans `src/server/admin/dashboard.ts`, protégée par `adminRequiredMiddleware`. Pas de paramètre période (toujours 7j).
- Données affichées : thumbnail Bunny, titre, détail des 5 signaux, médaille or/argent/bronze (top 3) ou rang (4-10). Score total calculé mais non affiché (utilisé uniquement pour le tri SQL).
- État vide : message "Aucune tendance cette semaine" avec icône `TrendingUp`. Section visible mais vide.
- Refresh : `staleTime: 5 * MINUTE` + `refetchInterval: 5 * MINUTE` + `refetchOnMount: 'always'` au call site.
- Design : itéré via `/frontend-design`.

**Layout dashboard refondu :**
- Chart tendances (full width) — inchangé
- Totaux (full width) — inchangé
- **2 colonnes 60/40** : Trending memes (gauche) | Feed activité (droite). Stack sur mobile.
- **Supprimer** `QuickLinks` (`quick-links.tsx`) — redondant avec la sidebar

**Migration Prisma additive**
- [x] Ajouter `memeId String?` sur `StudioGeneration` + relation `Meme` + `@@index([memeId, createdAt])`

**Server — `incrementGenerationCount` avec memeId**
- [x] Modifier `incrementGenerationCount` dans `src/server/user.ts` : accepter un `memeId` optionnel → `studioGeneration.create({ data: { userId, memeId } })`
- [x] Modifier `src/hooks/use-video-processor.ts` : passer le `memeId` à `incrementGenerationCount` (disponible via le `meme` objet dans `studio-page.tsx`)

**Server function trending**
- [x] Créer `getAdminTrendingMemes()` dans `src/server/admin/dashboard.ts` :
  - `$queryRaw` : 5 sous-queries (MemeViewDaily COUNT, UserBookmark COUNT, MemeActionDaily SUM shares, MemeActionDaily SUM downloads, StudioGeneration COUNT) joinées sur memeId, WHERE day/createdAt >= 7j, scoring pondéré, ORDER BY score DESC LIMIT 10
  - 2ème query : `prisma.meme.findMany({ where: { id: { in: memeIds } }, select: TRENDING_MEME_SELECT })` pour titre + video (thumbnail Bunny)
  - Retourne `TrendingMeme[]` : `{ meme (titre, video.bunnyId, video.duration), score, views, bookmarks, downloads, shares, generations, rank }`

**Refonte layout dashboard**
- [x] Modifier `src/routes/admin/index.tsx` : supprimer `QuickLinks`, layout 2 colonnes 3/5 + 2/5 sous les totaux (trending gauche, feed droite), stack mobile
- [x] Supprimer `src/routes/admin/-components/dashboard/quick-links.tsx`

**Composant UI trending**
- [x] Créer `src/routes/admin/-components/dashboard/trending-memes.tsx` — design `/frontend-design` : divided list, rank badge, thumbnail, title, score, 5 signal icons
- [x] `useSuspenseQuery` + `getAdminTrendingMemesQueryOpts` (pas de polling, `refetchOnMount: 'always'`)
- [x] Suspense boundary séparée + skeleton fallback
- [x] Liens cliquables vers `/admin/library/$memeId`

### Phase 10 — Colocation du code admin dans `src/routes/admin/`

**Objectif :** Séparer clairement le code admin du code général. Tout ce qui est strictement admin vit dans `src/routes/admin/` (sous-dossiers préfixés `-`). Le code partagé (admin + public) reste à sa place dans `src/`. **Zéro breaking change** — que des déplacements de fichiers + mise à jour d'imports. Aucune modification de logique, styles, design ou comportement.

**Décisions deep-dive :**
- Structure **par type** : `-components/`, `-helpers/`, `-server/`, `-lib/` (mêmes noms que `src/`)
- Alias **`@admin/*`** → `./src/routes/admin/*` (tsconfig + vite). Utilisé partout où on importe du code admin
- **Pas de barrel files** — imports directs vers chaque fichier (`@admin/-server/memes`, `@admin/-components/admin-table`)
- **Règle** : si c'est admin-only → dans admin. Si partagé → reste dans `src/`

**Structure cible :**
```
src/routes/admin/
├── -components/                     # Composants admin-only
│   ├── dashboard/                   # Inchangé (déjà colocalisé)
│   │   ├── activity-feed.tsx
│   │   ├── period-selector.tsx
│   │   ├── totals-section.tsx
│   │   ├── trends-chart.tsx
│   │   └── trending-memes.tsx
│   ├── admin-sidebar.tsx            ← ex src/components/admin/
│   ├── admin-nav-button.tsx         ← ex src/components/admin/
│   ├── admin-table.tsx              ← ex src/components/admin/
│   ├── meme-list-item.tsx           ← ex src/components/admin/
│   ├── new-meme-button.tsx          ← ex src/components/admin/
│   ├── delete-meme-button.tsx       ← ex src/components/admin/
│   ├── download-from-twitter-form.tsx ← ex src/components/admin/
│   ├── keywords-field.tsx           ← ex src/components/admin/
│   ├── twitter-form.tsx             ← ex src/components/Meme/MemeForm/
│   └── file-form.tsx                ← ex src/components/Meme/MemeForm/
├── -helpers/                        # Helpers admin-only
│   ├── audit.tsx                    ← ex src/helpers/audit.tsx
│   └── action-icon.tsx              ← ex src/helpers/action-icon.tsx
├── -server/                         # Server functions admin-only
│   ├── dashboard.ts                 ← ex src/server/admin/dashboard.ts
│   ├── memes.ts                     ← ex src/server/admin/memes.ts
│   └── users.ts                     ← ex src/server/admin/users.ts
├── -lib/                            # Query opts admin
│   └── queries.ts                   ← extraites de src/lib/queries.ts (6 query opts)
├── categories/                      # Inchangé
│   ├── index.tsx
│   └── -components/
├── library/                         # Inchangé
│   ├── index.tsx
│   ├── $memeId.tsx
│   └── -components/
├── users/                           # Nouveau (ex users.tsx)
│   ├── index.tsx                    # Route + table + columns + UserStatusBadges
│   └── -components/
│       └── user-actions-cell.tsx    # Dropdown + mutations + dialogs (~180 lignes)
├── route.tsx
├── index.tsx
└── downloader.tsx
```

**Fichiers partagés (restent en place) :**
- `src/server/audit.ts` — `logAuditAction` + types (ex `src/server/admin/audit.ts`, utilisé par `categories.ts` + helpers)
- `src/components/form-footer.tsx` — `FormFooter` (ex `src/components/admin/form-footer.tsx`, utilisé par MemeForm + admin)
- `src/lib/queries.ts` — garde uniquement les 11 query opts publiques

**Dossiers supprimés :**
- `src/components/admin/` — entier (9 fichiers → `-components/` + `src/components/form-footer.tsx`)
- `src/server/admin/` — entier (audit → `src/server/audit.ts`, reste → `-server/`)
- `src/components/Meme/MemeForm/` — entier (2 fichiers → `-components/`)

#### Étape 1 — Config alias `@admin/*`

- [x] Ajouter `"@admin/*": ["./src/routes/admin/*"]` dans `tsconfig.json` paths
- [x] ~~Ajouter `resolve.alias` pour `@admin` dans `vite.config.ts`~~ — `vite-tsconfig-paths` lit automatiquement les paths de tsconfig

#### Étape 2 — Extraire les fichiers partagés

- [x] Déplacer `src/server/admin/audit.ts` → `src/server/audit.ts` (partagé admin + categories)
- [x] Déplacer `src/components/admin/form-footer.tsx` → `src/components/form-footer.tsx` (partagé admin + MemeForm)
- [x] Mettre à jour les imports : `src/server/categories.ts`, `src/helpers/audit.tsx`, `src/helpers/action-icon.tsx`, `src/components/Meme/MemeForm/*.tsx`

#### Étape 3 — Créer les sous-dossiers admin

- [x] Créer `src/routes/admin/-server/` — déplacer `dashboard.ts`, `memes.ts`, `users.ts` depuis `src/server/admin/`
- [x] Créer `src/routes/admin/-helpers/` — déplacer `audit.tsx`, `action-icon.tsx` depuis `src/helpers/`
- [x] Créer `src/routes/admin/-lib/queries.ts` — extraire les 6 query opts admin de `src/lib/queries.ts`
- [x] Déplacer les 8 composants de `src/components/admin/` vers `src/routes/admin/-components/` (sauf `form-footer.tsx` déjà extrait)
- [x] Déplacer `twitter-form.tsx` + `file-form.tsx` de `src/components/Meme/MemeForm/` vers `src/routes/admin/-components/`

#### Étape 4 — Transformer `users.tsx` en dossier

- [x] Créer `src/routes/admin/users/index.tsx` — route + RouteComponent + columns + UserStatusBadges
- [x] Créer `src/routes/admin/users/-components/user-actions-cell.tsx` — extraction de `UserActionsCell` (~180 lignes)
- [x] Supprimer `src/routes/admin/users.tsx`

#### Étape 5 — Mise à jour des imports

- [x] Remplacer tous les imports `@/components/admin/*` → `@admin/-components/*`
- [x] Remplacer tous les imports `@/server/admin/*` → `@admin/-server/*` (sauf audit → `@/server/audit`)
- [x] Remplacer les imports des query opts admin → `@admin/-lib/queries`
- [x] Remplacer les imports `@/helpers/audit` et `@/helpers/action-icon` → `@admin/-helpers/*`

#### Étape 6 — Nettoyage

- [x] Supprimer `src/components/admin/` (dossier entier)
- [x] Supprimer `src/server/admin/` (dossier entier, y compris `index.ts` barrel)
- [x] Supprimer `src/components/Meme/MemeForm/` (dossier entier)
- [x] Nettoyer `src/lib/queries.ts` — retirer les imports/exports admin
- [x] `pnpm run lint:fix`

**Hors scope (reporté) :**
- Extraction de sous-composants de `categories/`, `library/`, `downloader.tsx`
- Refacto de la logique métier (aucune modification de code)

### Phase 10b — Audits post-colocation

7 audits exécutés (2026-02-26). Tailwind appliqué automatiquement (8 fixes). Résultats ci-dessous par priorité.

#### Tailwind ✅

- [x] 8 simplifications appliquées : classes mortes `w-full` (×3), `mx-auto` (×2), `gap-y` → `gap` (×3) dans `users/index.tsx`, `categories/index.tsx`, `library/index.tsx`, `library/$memeId.tsx`, `library/-components/meme-form.tsx`

#### Fixes rapides (code admin)

**Dead code**
- [x] Retirer `export` sur `getAuditTargetLabel` et `getAuditActionVerb` dans `src/routes/admin/-helpers/audit.tsx` (utilisées uniquement en interne par `formatAuditEntry`)

**React performance**
- [x] Retirer `useMemo` + `eslint-disable no-restricted-syntax` dans `src/routes/admin/library/index.tsx:27-33` (filters object — React Compiler gère)
- [x] Retirer `useMemo` + `eslint-disable no-restricted-syntax` dans `src/routes/admin/library/-components/meme-form.tsx:48-57` (categoriesOptions — mapping 10-50 items)

**Refactoring — mutations → immutable**
- [x] `src/routes/admin/-server/users.ts:110-141` — subscription aggregation loop mutate `current` object → utiliser `Map.set()` avec un nouvel objet spread
- [x] `src/routes/admin/-components/dashboard/trends-chart.tsx:62-74` — `computeMetricTotals` mutate `totals` objet → utiliser `reduce` immutable

**Refactoring — style**
- [x] `src/routes/admin/-components/dashboard/trending-memes.tsx:107,119` — template string className → `cn()`
- [x] `src/routes/admin/-components/meme-list-item.tsx:24` — `MemeListItemProps` → `MemeListItemParams` (cohérence admin)
- [x] `src/routes/admin/-server/dashboard.ts:252` — retirer le return type explicite `Promise<TrendingMeme[]>` sur `fetchTrendingMemes` (seule fonction admin avec un type explicite)

**Backend performance**
- [x] `src/routes/admin/-server/dashboard.ts:288-303` — double scan `meme_action_daily` dans trending → conditional aggregation SQL (`SUM(CASE WHEN action = 'download' ...)`) pour une seule passe
- [x] `src/server/meme.ts:449-452` — `insightsClient` re-instancié par requête dans `registerMemeView` → extrait en singleton module-level
- [x] `src/server/meme.ts:472` — `trackAlgoliaView()` dans `Promise.all` bloque la réponse → `void trackAlgoliaView()` fire-and-forget (analytics non-critique, -50-200ms par vue)
- [x] `src/routes/admin/-server/memes.ts:450-468` — `userBookmark.groupBy` exécuté même sur cache hit Algolia → mergé dans le closure `withAlgoliaCache` pour cacher le tout ensemble

#### Backend performance (hors admin — medium)

- [x] `src/server/meme.ts:373-389` — `trackMemeAction` 2 queries séquentielles → wraper dans `$transaction` (un seul round-trip réseau)
- [x] `src/server/meme.ts:298-305` — `ORDER BY RANDOM()` full table scan dans `getRandomMeme` → count + offset aléatoire (`skip: Math.floor(Math.random() * count)`)
- [x] `src/server/reels.ts:34` — `ORDER BY RANDOM()` + `NOT IN (...)` unbounded dans `getInfiniteReels` → plafonner la liste d'exclusion (ex: 100 IDs max)
- [x] `src/routes/admin/-server/users.ts:90-94` — `session.groupBy` inclut les sessions expirées → filtrer `expiresAt: { gte: new Date() }` ou `updatedAt` récent
- [x] `prisma/schema.prisma` — index manquant `@@index([day, action, memeId])` sur `MemeActionDaily` pour la query trending (GROUP BY memeId). L'index existant `@@index([day, action, count])` peut être remplacé
- [x] `src/helpers/date.ts:80-103` — `generateDateSeries` mutate un objet `Date` dans le while loop → utiliser arithmetic `Date.UTC` immutable

#### GDPR

**CRITICAL**
- [x] `AdminAuditLog` retient `targetId` (userId) indéfiniment sans pathway de suppression. Sur suppression user : anonymiser `targetId` → `'[deleted]'` via `updateMany` dans le hook `beforeDelete` (`src/lib/auth.tsx`). Ajouter rétention 2 ans dans `crons/cleanup-retention.ts`

**HIGH**
- [x] `src/lib/cookie-consent.ts:31` — cookie `cookieConsent` sans flag `secure` ni `sameSite`. Ajouter `secure` (prod) + `sameSite: 'lax'`
- [x] `src/server/user.ts` — `exportUserData` n'inclut pas `StudioGeneration` (historique générations = donnée personnelle Art. 15). Ajouter au export

**MEDIUM**
- [x] `StudioGeneration` — pas de rétention enforced (accumulation indéfinie pour les users actifs). Ajouter cleanup 365 jours dans `crons/cleanup-retention.ts`
- [x] `MemeActionDaily` — pas de rétention explicite. Ajouter cleanup 365 jours (pas de userId direct, mais bonne hygiène)
- [x] `crons/cleanup-retention.ts` — l'email anonymisé contient le userId raw (`deleted-{userId}@anonymized.local`). Remplacer par un hash SHA-256 tronqué
- [x] Privacy notice (`md/privacy.md`) — ne mentionne pas `StudioGeneration` comme activité de traitement. Ajouter section 2.5

**Hors GDPR — Guard admin**
- [x] Interdire la suppression et le bannissement d'un admin depuis le dashboard (guard dans `removeUser` + `banUserById`)

#### Schema Cleanup

- [x] Supprimer `Meme.submittedBy` + relation `submitter` — champ inutilisé (seul l'admin ajoute des memes). Migration destructive assumée (peu d'utilisateurs). **Aucun meme ne doit être supprimé** — la migration ne fait que dropper la colonne. Fait :
  - [x] Retiré `submittedBy`, `submitter` et `@@index([submittedBy])` du schema Prisma
  - [x] Retiré `Meme Meme[]` de `User` (inverse relation)
  - [x] **User runs** `pnpm exec prisma migrate dev --name remove_meme_submitted_by` — vérifier que le SQL ne contient que `DROP COLUMN` + `DROP INDEX`
  - [x] Supprimé `submittedBy` de `memeToAlgoliaRecord()` (`src/lib/algolia.ts`)
  - [x] Supprimé le `groupBy submittedBy` + `memeCount` dans `src/routes/admin/-server/users.ts` et l'affichage dans `src/routes/admin/users/index.tsx`
  - [x] Nettoyé `crons/unverified-cleanup.ts` (filtre `Meme: { none: {} }` retiré)
  - [x] Tickets GDPR associés marqués résolus
  - [x] **User runs** re-indexer Algolia pour retirer `submittedBy` des records existants

#### Refactoring (medium — futur)

**Fonctions trop longues**
- [ ] `src/routes/admin/-server/users.ts` — `getListUsers` extraction reverted: module-level functions using `prismaClient` break Vite client bundle (TanStack Start only strips `.handler()` body). All DB calls must stay inside `.handler()`. Same constraint applies to `assertCanActOnUser` (inlined back into ban/remove handlers).
- [x] `src/routes/admin/-server/memes.ts` — `editMeme` → extrait `computeCategoryDiff`
- [x] `src/routes/admin/-server/memes.ts` — `createMemeWithVideo` → extrait `rollbackMemeCreation`
- [x] `src/routes/admin/library/-components/meme-form.tsx` — `MemeForm` → extrait `useMemeForm` hook + `MemeFormDescriptionField` composant (eslint-disable retiré)

**Patterns dupliqués**
- [x] `src/routes/admin/index.tsx` — `DashboardSection` wrapper extrait (ErrorBoundary + Suspense)
- [x] `getRowId` → exporté depuis `admin-table.tsx`, importé dans users + categories
- [x] Types `{ key, label, icon }` → type partagé `IconConfig<TKey>` dans `dashboard/types.ts`
- [~] `admin/index.tsx` — 5 skeleton components avec `Array.from` inline : évalué, chaque skeleton a une structure unique — `SkeletonList` n'apporterait pas de simplification significative
- [~] Table pages `useReactTable` boilerplate → évalué : 2 usages seulement, abstraction prématurée (chaque table a des options différentes : sorting, colonnes)
- [~] `user-actions-cell.tsx` — 3 mutations `toast.promise` → évalué : duplication locale dans un seul composant, factory ajouterait de la complexité pour peu de gain

**Divers**
- [~] `user-actions-cell.tsx:118` — child `return null` → évalué : le `admin` context vient de `Route.useRouteContext()` accessible uniquement dans un composant React, pas dans la définition de colonne (module-level). Pattern actuel est le plus pratique pour TanStack Table
- [~] `admin-table.tsx` — `disabled` sur pagination → évalué : exception justifiée à la règle "never disable buttons" — la pagination désactivée est un pattern UX universel et sans ambiguïté
- [x] `audit.ts` — `metadata` → `AuditMetadata` avec cast `as Prisma.InputJsonObject` au call site DB
- [x] `trending-memes.tsx` — type guard `matchIsPodiumRank` remplace le cast `as keyof typeof`
- [x] `meme-list-item.tsx` — `React.memo` vérifié : pas restreint par la config ESLint actuelle, aucun disable nécessaire

### Phase 11 — Audits post-implémentation

- [x] **React performance** — audité : aucun problème high/critical. 1 medium (SortableHeader) jugé acceptable (React Compiler gère). Set initializer simplifié dans `trends-chart.tsx`.
- [x] **Accessibility (a11y)** — audit complet + fixes appliqués :
  - `aria-sort="none"` sur colonnes triables non triées (via `getAriaSortValue` helper)
  - `aria-label` sur `<Table>` via prop `caption` (`AdminTable`)
  - `aria-live="polite"` sur pagination page info
  - `<nav>` wrapper sur les boutons de pagination
  - Touch targets agrandis : sort buttons (`min-h-11`), keyword delete (`p-1.5`), category dropdown (`size-9`), admin avatar (`size-9`), file delete (`size-9`)
  - `aria-label` spécifique par mot-clé sur boutons delete (`keywords-field.tsx`)
  - `role="img"` + `aria-label` + `sr-only` summary sur le chart (`trends-chart.tsx`)
  - `role="group"` + `aria-label` sur la légende du chart
  - `aria-label` sur les boutons coller (`twitter-form.tsx`, `download-from-twitter-form.tsx`)
  - `aria-label` sur le lien externe meme (`library/$memeId.tsx`)
  - `aria-label` sur les liens services (`service-card.tsx`) avec indication "nouvel onglet"
  - `aria-label` sur le texte engagement abrégé (`users/index.tsx`)
  - `sr-only` texte pour "Aucun abonnement" (`users/index.tsx`)
  - `alt` sur les avatars dans le feed activité (`activity-feed.tsx`)
  - Contraste amélioré : retiré `/50` sur signaux trending zéro (`trending-memes.tsx`)
  - `DialogDescription` : descriptions réelles en `sr-only` (4 dialogs admin)
  - `aria-label` sur `SelectTrigger` ban reason (`user-actions-cell.tsx`)
  - **Skipped (ui/ protégé)** : `FormMessage` `role="alert"`, pagination.tsx aria-labels FR

---

## Backlog — Futures évolutions

### Internationalisation (FR / EN)

Passer le site en bilingue français / anglais. Étudier la meilleure approche avec TanStack Start (routing i18n, détection de langue, etc.). Inclut la stratégie d'index Algolia bilingue (index unique avec champ `lang` vs deux index séparés).

### Standardiser le naming SQL en snake_case

Standardisation des noms SQL via `@@map`/`@map` dans le schema Prisma. Les noms de modèles Prisma ne changent pas → zéro impact sur le code applicatif.

- [x] Tables : `@@map` ajouté sur `Category`, `MemeCategory`, `Video`, `Meme`, `MemeViewDaily` ; corrigé sur `RateLimit` (`"rateLimit"` → `"rate_limit"`)
- [x] Enum : `@@map("meme_status")` ajouté sur `MemeStatus`
- [x] Colonnes : `@map` ajouté sur ~50 champs camelCase (tous modèles)
- [x] Raw SQL mis à jour (`src/server/reels.ts`, `src/routes/admin/-server/dashboard.ts`)
- [x] Générer et appliquer la migration (`pnpm exec prisma migrate dev --name standardize_snake_case_naming`) — 2 migrations : tables/colonnes/enum + contraintes/FK/indexes (idempotent)
- [x] Vérifier le SQL généré (uniquement `RENAME TABLE`, `RENAME COLUMN`, `RENAME TYPE`, `RENAME CONSTRAINT`, `RENAME INDEX` + 2 `CREATE INDEX IF NOT EXISTS`)
- [x] Appliquer en production (`pnpm run prisma:migrate:prod`) — 16 migrations appliquées, aucune pendante

### Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles : tables en pluriel, colonnes en `snake_case`, timestamps `_at`, booleans `is_*`, prix en centimes (integer), UUIDs partout, `ON DELETE CASCADE` pour auth, `is_anonymized` pour GDPR.

### Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern : `PaymentIntent` → `confirmPayment` avec `redirect: 'if_required'` → polling post-paiement.

### Migration vers Cloudflare

Passer le domaine sur Cloudflare pour bénéficier de ses fonctionnalités natives : redirection www → apex (et supprimer le check manuel dans `server.ts`), CDN/cache, SSL, protection DDoS, Page Rules, etc.

