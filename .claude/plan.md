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
- [ ] `src/components/ui/file-upload.tsx` — **SKIPPED** (fichier protégé dans `src/components/ui/`, règle "Never modify code in ui/")

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
