# Plan — Features & Futur

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

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

## Studio — Items restants

Phases 1 à 5 terminées (page dédiée, live preview, templates, fonts, accessibilité WCAG 2.1 AA, refonte video player).

- [ ] Tester le flow complet sur iOS Safari et Chrome Android (Studio + PlayerDialog `playsInline`)
- [ ] Gérer le cas où `navigator.share()` n'est pas supporté (fallback download)

---

## Migration Railway → Vercel — Items restants

Migration terminée (preset Vercel, DNS, env vars, docs). Reste :

- [ ] Configurer les crons (Vercel Cron Jobs ou scheduler externe)
- [ ] Réactiver Sentry server-side tracing (`instrument-server.ts` + `wrapFetchWithSentry`) — bloqué par `require-in-the-middle` incompatible ESM dans Vercel serverless. Surveiller les updates Sentry/Nitro.

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

*Data fetching :* query Prisma directe (bypass `auth.api.listUsers` — perf: élimine 2 queries séquentielles BA dont un COUNT inutile + récupère `generationCount` gratuitement). Enrichissement côté serveur avec queries Prisma batch `WHERE id IN (...)`. 4 index ajoutés (`account.userId`, `session.userId`, `meme.submittedBy`, `subscription(referenceId, status)`).

- [x] Enrichir `getListUsers` dans `src/server/admin.ts` : query Prisma directe + queries batch pour :
  - `Account.providerId` (provider auth : Twitter ou Email)
  - `Subscription` via `referenceId` (statut : active / past / none + dates pour tooltip)
  - Count `Meme` WHERE `submittedBy = userId` (memes soumis)
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
- [x] Colonne **Engagement** : format compact `Xm Xb Xg` (X memes, X bookmarks, X générations studio)
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
- [x] 4 index DB ajoutés : `account(userId)`, `session(userId)`, `meme(submittedBy)`, `subscription(referenceId, status)`
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

### Phase 7b — Library cards (enrichissement léger)

**Fichiers :** `src/routes/admin/library/index.tsx`, `src/components/admin/meme-list-item.tsx` (ou composant card équivalent)

- [ ] Ajouter le **bookmark count** sur chaque card meme dans la grille Library (count `UserBookmark` par meme)
- [ ] Adapter la query `getAdminMemes` ou ajouter un enrichissement Prisma batch pour les bookmark counts

### Phase 8 — Gestion d'erreurs (client + serveur + Sentry)

Audit complet : zéro erreur silencieuse, remontée Sentry systématique, feedback utilisateur cohérent, logging serveur exploitable.

#### P0 — Critique (paiements, webhooks, emails)

**Stripe checkout sans Sentry** (`src/hooks/use-stripe-checkout.ts`)
- [ ] Ajouter `Sentry.captureException(error)` dans les deux blocs `catch` (billing portal + checkout premium) avec tags `{ feature: 'stripe-checkout' }`

**Webhook Bunny cassé** (`src/routes/api/bunny.ts`)
- [ ] Wrapper `request.json()` + `WEBHOOK_RESPONSE_SCHEMA.parse()` dans un try/catch — retourner `400` si JSON invalide ou validation Zod échoue
- [ ] Déplacer `getVideoPlayData()` dans le try/catch existant (actuellement hors bloc)
- [ ] Retourner `500` (pas `200`) dans le catch principal — Bunny doit pouvoir retry
- [ ] Logger les erreurs en `.error()` au lieu de `.debug()`

**Appel Gemini AI non protégé** (`src/server/ai.ts`)
- [ ] Wrapper l'appel `ai.models.generateContent()` + le parse dans un try/catch avec `Sentry.captureException` + log admin
- [ ] Remplacer `result.text!` par un check explicite (`if (!result.text) throw`)

**Emails Resend fire-and-forget sans Sentry** (`src/lib/resend.ts`)
- [ ] Ajouter `Sentry.captureException(error)` dans le `.catch()` réseau et dans le `.then({ error })`

**Stripe payment_failed event** (`src/lib/auth.tsx`)
- [ ] Ajouter `Sentry.captureException` quand user not found pour un payment_failed
- [ ] Wrapper `billingPortal.sessions.create()` dans un try/catch avec Sentry

#### P1 — High (erreurs silencieuses côté utilisateur)

**Mutations sans `onError`**
- [ ] `src/hooks/use-toggle-bookmark.ts` — ajouter `onError` avec toast + Sentry
- [ ] `src/components/admin/download-from-twitter-form.tsx` — ajouter `onError` sur clipboard mutation avec toast
- [ ] `src/components/Meme/MemeForm/twitter-form.tsx` — idem clipboard mutation

**`shareBlob` / `downloadBlob` fire-and-forget**
- [ ] `src/utils/download.ts` — remplacer `.catch(() => {})` dans `shareBlob` par un catch qui log + Sentry (filtrer `AbortError`/`NotAllowedError` = user cancel)
- [ ] `src/hooks/use-share-meme.ts` — await `shareBlob` ou ajouter `.catch()` avec Sentry
- [ ] `src/hooks/use-download-meme.ts` — idem pour `downloadBlob`

**Timeout manquant sur fetch**
- [ ] `src/lib/utils.ts` (`fetchWithZod`) — ajouter `AbortController` avec timeout configurable (default 15s)
- [ ] `src/routes/api/sentry-tunnel.ts` — ajouter timeout sur le `fetch()` upstream (10s)
- [ ] `src/server/meme.ts` (`shareMeme`) — ajouter error handling + timeout sur le fetch Bunny CDN

**`findActiveSubscription` retourne `null` en erreur** (`src/server/customer.ts`)
- [ ] Distinguer "pas d'abonnement" (return `null`) de "erreur API" (throw ou type discriminé) pour éviter de bloquer les features premium silencieusement

#### P2 — Medium (robustesse, Sentry manquant, UX)

**Dialogs fermés avant fin de mutation**
- [ ] `src/components/Meme/MemeForm/file-form.tsx` — déplacer `closeDialog()` dans `onSuccess`
- [ ] `src/components/Meme/MemeForm/twitter-form.tsx` — idem

**Catch blocks sans Sentry**
- [ ] `src/hooks/use-video-processor.ts` — ajouter toast générique pour les erreurs non-StudioError
- [ ] `src/routes/admin/library/-components/meme-form.tsx` (`generateContentMutation`) — ajouter `Sentry.captureException`
- [ ] `src/components/User/delete-account-dialog.tsx` — ajouter `onError` avec Sentry
- [ ] `src/components/User/update-password-dialog.tsx` — idem
- [ ] `src/routes/_public__root/_default/settings/-components/profile-content.tsx` — ajouter Sentry dans `onError` export
- [ ] `src/components/ui/file-upload.tsx` — ajouter `Sentry.captureException` dans le catch upload

**HTTP status non vérifié**
- [ ] `src/lib/react-tweet.ts` (`getTweetMedia`) — ajouter check `response.ok` avant `.blob()`, throw si erreur HTTP

**Algolia + upload partial failure** (`src/server/admin.ts:293`)
- [ ] Revoir `createMemeWithVideo` : si `uploadVideo` échoue après Algolia save, cleanup l'entrée Algolia (appel `deleteObject`)

#### P3 — Low (améliorations mineures)

- [ ] `src/routes/__root.tsx` — ajouter `id` dans `Sentry.setUser({ id: user.id })` pour tracer sans PII
- [ ] `src/server/admin.ts:237` — ajouter `Sentry.captureException` sur le catch Bunny delete (orphan videos)
- [ ] `src/lib/react-tweet.ts:40` — remplacer `Promise.reject(new Error(...))` par `throw new Error(...)`
- [ ] Ajouter `errorComponent` sur les routes principales (admin, settings, meme detail) pour un meilleur contexte Sentry — absorbe la migration `react-error-boundary` → `Sentry.ErrorBoundary`
- [ ] Évaluer si `react-error-boundary` peut être retiré des dépendances après migration

### Phase 9 — Dashboard admin (`/admin`)

Transformer la page d'accueil admin en un vrai dashboard avec KPIs, liens rapides et activité récente. Design via `/frontend-design`.

**Prérequis**
- [ ] Vérifier la disponibilité de l'Algolia Analytics API sur le free tier (partages, téléchargements, clics). Si indisponible → fallback compteurs DB (`shareCount`/`downloadCount` sur Meme, migration additive)

**Migrations additives (Prisma)**
- [ ] Créer le modèle `StudioGeneration` (userId, memeId, createdAt) — remplace le compteur `User.generationCount` pour un tracking par date filtrable par période
- [ ] Si Algolia Analytics API indisponible : ajouter `shareCount`/`downloadCount` sur `Meme`
- [ ] Logger les actions admin restantes dans `AdminAuditLog` : publish meme, edit meme

**Sélecteur de période**
- [ ] Composant `PeriodSelector` réutilisable : 7j / 30j / 90j (ToggleGroup ou Select)
- [ ] Toutes les cards KPI, graphiques et tops utilisent la période sélectionnée
- [ ] Chaque card affiche la valeur + le delta vs période précédente (ex: "+12% vs semaine dernière") avec flèche verte/rouge

**KPIs (cards) — filtrés par période sélectionnée**
- [ ] Vues (count `MemeViewDaily` sur la période)
- [ ] Nouveaux users (count `User.createdAt` sur la période)
- [ ] Nouveaux memes publiés (count `Meme.publishedAt` sur la période)
- [ ] Générations Studio (count `StudioGeneration.createdAt` sur la période)
- [ ] Bookmarks (count `UserBookmark.createdAt` sur la période)
- [ ] Partages (Algolia Analytics API ou `Meme.shareCount` sur la période)
- [ ] Téléchargements (Algolia Analytics API ou `Meme.downloadCount` sur la période)
- [ ] Abonnements premium actifs (depuis `Subscription`)

**Totaux (toujours visibles, hors filtre période)**
- [ ] Total memes par statut (publiés / en attente / brouillons)
- [ ] Total users par statut (actifs / bannis / non vérifiés)

**Liens rapides (cards cliquables)**
- [ ] "X memes en attente" → `/admin/library?status=PENDING`
- [ ] "X users non vérifiés" → `/admin/users` (filtré)
- [ ] "Ajouter un meme" → `/admin/library/add`
- [ ] "Gérer les catégories" → `/admin/categories`

**Graphiques tendances — s'adaptent à la période**
- [ ] Courbe vues (7j → par jour, 30j → par jour, 90j → par semaine) depuis `MemeViewDaily`
- [ ] Courbe inscriptions (7j → par jour, 30j → par semaine, 90j → par semaine) depuis `User.createdAt`
- [ ] Courbe memes publiés (même granularité) depuis `Meme.publishedAt`
- [ ] Courbe partages + téléchargements (Algolia ou DB, même granularité)
- [ ] Librairie légère : évaluer `recharts` vs sparklines CSS-only (coût bundle)

**Top memes (classement) — filtrés par période**
- [ ] Top 10 memes les plus vus (sum `MemeViewDaily` sur la période)
- [ ] Top 10 memes les plus bookmarkés (count `UserBookmark.createdAt` sur la période)
- [ ] Top 10 memes les plus partagés/téléchargés (Algolia ou DB)

**Activité récente (feed)**
- [ ] Afficher les 10 dernières entrées `AdminAuditLog` avec timestamps relatifs

**Server functions**
- [ ] `getAdminDashboardStats({ period: '7d' | '30d' | '90d' })` — tous les counts filtrés par période + delta vs période précédente
- [ ] `getAdminRecentActivity` — dernières entrées `AdminAuditLog`
- [ ] `getAdminChartData({ period })` — données agrégées pour les graphiques (granularité auto selon période)
- [ ] `getAdminTopMemes({ period })` — top memes par vues/bookmarks sur la période
- [ ] `getAdminAlgoliaStats({ period })` — partages/téléchargements (si Algolia Analytics API dispo)

**État des données**

| Donnée | En DB | Filtrable par période | Fallback |
|--------|-------|----------------------|----------|
| Vues | `MemeViewDaily` (day) | ✓ | — |
| Inscriptions | `User.createdAt` | ✓ | — |
| Memes publiés | `Meme.publishedAt` | ✓ | — |
| Bookmarks | `UserBookmark.createdAt` | ✓ | — |
| Générations | `StudioGeneration.createdAt` (nouveau) | ✓ | — |
| Partages | Algolia `Meme Shared` | ✓ (API) | `Meme.shareCount` (migration) |
| Téléchargements | Algolia `Meme Downloaded` | ✓ (API) | `Meme.downloadCount` (migration) |
| Clics | Algolia `Meme Clicked` | ✓ (API) | non prioritaire |

### Phase 10 — Améliorations UX admin

**Search users**
- [ ] Ajouter une barre de recherche client-side sur la table users (filtre par nom/email)
- [ ] Intégrer dans `AdminTable` comme prop optionnelle `searchPlaceholder`

**Memes en attente — badge nav**
- [ ] Afficher un badge count "pending" sur le lien "Library" dans la nav admin
- [ ] Server function `getPendingMemesCount` (ou inclure dans les stats dashboard)
- [ ] Filtre par défaut "PENDING" quand on clique sur le badge

**Bulk actions**
- [ ] Ajouter la sélection multiple (checkboxes) dans `AdminTable` via `getFilteredSelectedRowModel()` de TanStack Table
- [ ] Actions bulk sur memes : publier / supprimer la sélection
- [ ] Actions bulk sur users : bannir / supprimer la sélection
- [ ] Confirmation `ConfirmAlert` avec le count d'éléments sélectionnés

**Total éléments dans les tables**
- [ ] Ajouter une prop optionnelle `totalLabel` à `AdminTable` (ex: `"memes"`, `"utilisateurs"`, `"catégories"`)
- [ ] Afficher `{count} {label} · Page X sur Y` dans le footer pagination (via `table.getRowCount()`, style `text-muted-foreground text-sm tabular-nums`)
- [ ] Passer `totalLabel="utilisateurs"` dans Users, `totalLabel="catégories"` dans Categories, `totalLabel="memes"` dans Library

**Export CSV**
- [ ] Bouton export sur les tables users (avec emails — cohérent avec le rôle admin) et memes (sans emails)
- [ ] Génération côté client (pas de server function) — `Blob` + `URL.createObjectURL`

**Santé système (section dashboard ou page dédiée)**
- [ ] Algolia : quota indexation (via Algolia API `getStatus`)
- [ ] Bunny CDN : stockage utilisé (via Bunny API)
- [ ] Stripe : nombre d'abonnements actifs
- [ ] Sentry : count erreurs dernières 24h (via Sentry API, si gratuit)
- [ ] Afficher sous forme de badges vert/orange/rouge selon les seuils

### Phase 11 — Audits post-implémentation

À lancer **après** toutes les phases précédentes :

- [ ] **React performance** — re-renders TanStack Table, stabilité références colonnes/handlers, bulk selection
- [ ] **Accessibility (a11y)** — `aria-sort` sur headers triables, `aria-label` pagination, focus trap confirm dialogs, touch targets mobile, graphiques (alt text ou `aria-describedby`)

---

## Backlog — Futures évolutions

### Internationalisation (FR / EN)

Passer le site en bilingue français / anglais. Étudier la meilleure approche avec TanStack Start (routing i18n, détection de langue, etc.). Inclut la stratégie d'index Algolia bilingue (index unique avec champ `lang` vs deux index séparés).

### Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles : tables en pluriel, colonnes en `snake_case`, timestamps `_at`, booleans `is_*`, prix en centimes (integer), UUIDs partout, `ON DELETE CASCADE` pour auth, `is_anonymized` pour GDPR.

### Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern : `PaymentIntent` → `confirmPayment` avec `redirect: 'if_required'` → polling post-paiement.

### Migration vers Cloudflare

Passer le domaine sur Cloudflare pour bénéficier de ses fonctionnalités natives : redirection www → apex (et supprimer le check manuel dans `server.ts`), CDN/cache, SSL, protection DDoS, Page Rules, etc.

### Dependabot — Vulnérabilités

Traiter les vulnérabilités signalées par GitHub : https://github.com/viclafouch/petit-meme/security/dependabot
