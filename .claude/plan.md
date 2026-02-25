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

## Studio — Refonte performance & UX

Refonte complète du Studio (overlay texte sur vidéo). Priorité : performance FFmpeg, responsive mobile, et UX améliorée.

**Stack actuelle** : `@ffmpeg/ffmpeg@0.12.15` + `@ffmpeg/core@0.12.9` (single-thread, WASM self-hosted dans `/public/ffmpeg/`).

### Phase 1 — Performance & stabilité

- [x] Self-host le WASM core dans `/public/ffmpeg/` (script `postinstall` + cache immutable)
- [x] Loading state WASM avec `useSuspenseQuery` + `React.Suspense` + `ErrorBoundary`
- [x] Cache blob vidéo source (`staleTime: Infinity`)
- [x] Cache font FS FFmpeg (persiste tant que l'instance vit)
- [x] Bouton Annuler (`ffmpeg.terminate()` + invalidation query)
- [x] Limite texte `maxLength={150}`
- [x] Timeout 30s sur `ffmpeg.load()` pour éviter spinner infini
- [x] Monitoring Sentry sur les `ErrorBoundary` Studio + `captureException` dans les hooks

### ~~Phase 2 — Multi-thread FFmpeg~~ ANNULÉ

Retiré : `crossOriginIsolated` / `SharedArrayBuffer` ne fonctionne pas de manière fiable sur iOS Safari (même avec COEP `credentialless`). Le single-thread reste la cible pour la compatibilité maximale. À réévaluer quand le support navigateur sera plus stable.

### Phase 3 — Page dédiée Studio + Responsive + Live Preview + Templates

Migration du Studio depuis un Dialog vers une page dédiée `/memes/:memeId/studio`. Layout éditeur deux colonnes (preview + contrôles), responsive mobile-first. Inclut la Phase 4 (preview live, templates, couleurs, taille).

- [x] Créer la route `/memes/$memeId/studio` sous layout `_studio` dédié (sans navbar/footer, full viewport)
- [x] SEO : `noindex, follow` + canonical vers `/memes/:memeId` (pas de duplicata)
- [x] Ajouter `noindex` et `canonicalPathname` à la fonction `seo()` dans `src/lib/seo.ts`
- [x] Créer les composants Studio : `studio-page.tsx`, `studio-preview.tsx`, `studio-controls.tsx`, `studio-actions.tsx`, `studio-live-overlay.tsx`, `studio-templates.tsx`
- [x] Layout desktop : preview (flex-1) + panneau contrôles (w-80/w-96) avec `md:flex-row`
- [x] Layout mobile : stacking vertical (vidéo pleine largeur + contrôles en dessous)
- [x] Bouton "Partager" prioritaire sur mobile (au-dessus de "Télécharger")
- [x] Preview live CSS : overlay DOM texte sur la vidéo (sans FFmpeg) — `studio-live-overlay.tsx`
- [x] Templates prédéfinis : "Légende" (Arial, bande blanche, texte noir), "Sous-titre" (fond semi-transparent noir, texte blanc)
- [x] Choix de la couleur du texte (pastilles : noir, blanc, rouge, bleu)
- [x] Choix de la taille du texte (presets : P/M/G → 24/36/48 px via ToggleGroup)
- [x] Choix de la police (Select — Arial par défaut, extensible Phase 5)
- [x] Constantes typées : `STUDIO_TEMPLATES`, `STUDIO_FONT_SIZES`, `STUDIO_COLORS`, `STUDIO_FONTS`, `StudioSettings`
- [x] Remplacer dialog par Link dans `$memeId.tsx`, `memes-list.tsx`, `player-dialog.tsx`, `meme-list-item.tsx`
- [x] Supprimer `studio-dialog.tsx`
- [x] Adapter `studio-fallbacks.tsx` au contexte page (plus de `fixed inset-0`)
- [x] Afficher 4 mèmes similaires dans le sidebar (comme la page slug) — navigation entre mèmes sans perdre les settings (texte, couleur, police, template)
- [ ] Tester le flow complet sur iOS Safari et Chrome Android
- [ ] Gérer le cas où `navigator.share()` n'est pas supporté (fallback download)

### Phase 3.5 — Refonte video player (Studio + PlayerDialog)

Simplification du player vidéo : suppression de la barre de contrôles, interactions directes sur la vidéo.

- [x] Créer `src/components/Meme/video-overlay.tsx` — composant réutilisable :
  - Clic = play/pause (via media-chrome dispatch)
  - Bouton fullscreen en bas-droite (au-dessus du mute)
  - Grande icône ▶ centrée quand en pause
  - Bouton mute/unmute en bas-droite (toujours visible, style Reels)
  - Badge temps restant en bas-gauche (PlayerDialog uniquement, isolé dans `RemainingTimeBadge` pour éviter les re-renders à chaque frame)
- [x] `studio-preview.tsx` : supprimer `VideoPlayerControlBar` de `OriginalVideo` et `ProcessedVideo`, ajouter `VideoOverlay`, ajouter `playsInline` sur `OriginalVideo`
- [x] `player-dialog.tsx` : supprimer `VideoPlayerControlBar`, ajouter `VideoOverlay` avec `showDuration`
- [ ] Tester sur iOS Safari (playsInline, pas d'autoplay inline)

### Phase 4 — Features avancées

- [x] Plusieurs fonts (Impact, Arial) dans `/public/fonts/`
- [x] Fond de bande configurable (choix de couleurs : blanc, noir, rouge, bleu — blanc par défaut)
- [x] Optimisation des paramètres FFmpeg d'encodage (codec explicite, pix_fmt yuv420p, stream mapping, single-thread explicite, strip metadata)
- [x] Cache `input.mp4` en WASM FS entre les générations (WeakMap par instance FFmpeg, skip writeFile si même mème)
- [x] Preload au focus input : `useVideoPreloader` expose `triggerPreload()`, déclenché au focus des inputs texte (mobile + desktop). Prefetch blob vidéo + font Arial + write WASM FS. Pas de preload au mount, pas de re-trigger auto au changement de mème.
- [x] FFmpeg : mode overlay (`drawbox` semi-transparent) quand `bandOpacity < 1`, mode caption (`pad`) quand `bandOpacity === 1`

### Phase 5 — Accessibilité WCAG 2.1 AA (Vidéo & Studio)

- [x] `PlayerDialog` : `role="dialog"`, `aria-modal`, `aria-labelledby`, `FocusScope` (focus trap), body scroll lock, focus restoration via `triggerRef`
- [x] `VideoOverlay` : `role="button"`, `tabIndex={0}`, `aria-label` dynamique (Lire/Pause), `onKeyDown` Enter/Space
- [x] `MemeReels` : `role="feed"` + `aria-label` sur scroll container, `role="article"` + `aria-posinset`/`aria-setsize` sur items
- [x] `StudioControls` : `id` sur Labels, `aria-labelledby` sur ToggleGroup/Select/ColorSwatches, `role="radiogroup"` + `role="radio"` + `aria-checked` sur ColorSwatches
- [x] Mini-previews visuelles pour les templates (thumbnail mème + bande colorée + texte "Abc" au lieu de cartes texte)
- [x] Color swatches : touch targets augmentés `size-7` → `size-10` (40px)
- [x] Font sizes : `accessibleLabel` dans `STUDIO_FONT_SIZES` + `aria-label` sur ToggleGroupItem
- [x] Studio mobile input : `aria-label="Texte à ajouter sur la vidéo"`
- [x] `LoadingButton` : `aria-busy={isLoading}`

---

## Internationalisation (FR / EN)

Passer le site en bilingue français / anglais. Étudier la meilleure approche avec TanStack Start (routing i18n, détection de langue, etc.).

Inclut la stratégie d'index Algolia bilingue (index unique avec champ `lang` vs deux index séparés).

---

## Migration Prisma → Drizzle

Remplacer Prisma par Drizzle ORM. Conventions cibles : tables en pluriel, colonnes en `snake_case`, timestamps `_at`, booleans `is_*`, prix en centimes (integer), UUIDs partout, `ON DELETE CASCADE` pour auth, `is_anonymized` pour GDPR.

---

## Stripe — Payment Elements

Évaluer la migration vers Payment Elements (au lieu de Checkout redirect). Pattern : `PaymentIntent` → `confirmPayment` avec `redirect: 'if_required'` → polling post-paiement.

---

## ~~Migration npm → pnpm~~ FAIT

- [x] `packageManager: pnpm@10.30.1` + corepack
- [x] `pnpm-lock.yaml` généré, `package-lock.json` et `.npmrc` supprimés
- [x] Scripts, hooks, docs et rules mis à jour
- [x] Note : mettre à jour la commande d'install sur Railway (`pnpm install` au lieu de `npm install`)

---

## Migration Railway → Vercel

Migrer l'hébergement web de Railway vers Vercel. La base de données reste chez Prisma (inchangée).

- [x] Changer le Nitro preset `node-server` → `vercel` dans `vite.config.ts`
- [x] Remplacer `RAILWAY_GIT_COMMIT_SHA` → `VERCEL_GIT_COMMIT_SHA` (Sentry release)
- [x] ~~Intégrer Sentry server init dans le bundle~~ — désactivé temporairement (ESM/CJS crash `require-in-the-middle` sur Vercel serverless)
- [x] Supprimer `--import` du dev script et `cp instrument.server.mjs` du build script
- [x] Mettre à jour les source maps path (`.vercel/output/**/*.map`)
- [x] Créer `vercel.json` (buildCommand, installCommand)
- [x] Ajouter `.vercel` aux `.gitignore` et ESLint ignores
- [x] Copier les variables d'environnement dans Vercel Console
- [x] Tester le build/deploy sur Vercel
- [x] ~~Mettre à jour les webhook URLs (Stripe, Bunny)~~ — pas nécessaire, le domaine `petit-meme.io` reste identique
- [ ] Configurer les crons (Vercel Cron Jobs ou scheduler externe)
- [x] Supprimer `instrument.server.mjs` (devenu obsolète)
- [x] Basculer le DNS vers Vercel
- [x] Mettre à jour la documentation (README, mentions légales, database rules, GDPR auditor) : remplacer Railway par Vercel/Neon
- [ ] Réactiver Sentry server-side tracing (`instrument-server.ts` + `wrapFetchWithSentry`) — bloqué par `require-in-the-middle` incompatible ESM dans Vercel serverless. Surveiller les updates Sentry/Nitro.

---

## Migration vers Cloudflare

Passer le domaine sur Cloudflare pour bénéficier de ses fonctionnalités natives : redirection www → apex (et supprimer le check manuel dans `server.ts`), CDN/cache, SSL, protection DDoS, Page Rules, etc.

---

## Sentry — Migration ErrorBoundary

Remplacer `react-error-boundary` par `Sentry.ErrorBoundary` dans toute l'app. Capture automatique des erreurs sans `onError` manuel.

- [ ] Remplacer tous les `<ErrorBoundary>` de `react-error-boundary` par `Sentry.ErrorBoundary`
- [ ] Supprimer les `onError={captureException}` devenus inutiles
- [ ] Évaluer si `react-error-boundary` peut être retiré des dépendances

---

## Dependabot — Vulnérabilités

Traiter les vulnérabilités signalées par GitHub : https://github.com/viclafouch/petit-meme/security/dependabot

---

## Admin — Audit & Refonte Tables, UX, Confirmations

L'admin utilise TanStack Table pour users et categories, mais avec uniquement `getCoreRowModel()` — aucun tri, aucune pagination, aucun filtrage. Les actions destructives (ban, unban, delete user, delete category) n'ont aucune confirmation. La library memes garde sa grille visuelle Algolia (adaptée au contenu vidéo).

**Ordre d'exécution :** Sécu & GDPR (1-2) → Perf & hardening (3-4) → UI tables (5-7) → Dashboard & UX (8-9) → Audits (10)

### Phase 1 — Sécurité admin

**[HIGH] SSRF dans `fetchTweetMedia`** (`src/server/twitter.ts`)
- [x] Ajouter un allowlist de hostnames Twitter (`video.twimg.com`, `pbs.twimg.com`) sur les URLs acceptées par `fetchTweetMedia` — regex `/^(video|pbs)\.twimg\.com$/` dans `z.url({ hostname })` + middleware `getTweetFromUrl` migré vers `adminRequiredMiddleware`

**[MEDIUM] Pas de `max()` sur les schemas Zod** (`src/server/admin.ts`, `src/server/categories.ts`)
- [x] Ajouter `.max()` sur tous les champs string et array : `title.max(100)`, `keywords.max(20)` + `.max(50)` par string, `categoryIds.max(10)`, `slug.max(60)` dans `MEME_FORM_SCHEMA` et `CATEGORY_FORM_SCHEMA`

**[MEDIUM] Injection filtre Algolia** (`src/server/admin.ts` — `getAdminMemes`)
- [x] ~~Valider `data.status` contre l'enum `MemeStatus`~~ — déjà validé par `z.enum(MemeStatus)` dans `MEMES_FILTERS_SCHEMA`

**[LOW] `getTweetFromUrl` accessible par tous les users authentifiés**
- [x] Changer le middleware de `authUserRequiredMiddleware` à `adminRequiredMiddleware` dans `src/server/twitter.ts`

**[LOW] Rate limiting désactivé hors production**
- [ ] Activer le rate limiting sur les preview deployments Vercel (variable d'env ou protection par mot de passe Vercel) — reporté (infra)

### Phase 2 — GDPR

**[HIGH] stripeCustomerId dans l'export**
- [x] Remplacer `stripeCustomerId` par `hasStripeAccount: boolean` dans le retour de `exportUserData` (`src/server/user.ts`) — `stripeCustomerId` reste dans le select Prisma pour le calcul mais n'est plus exposé

**[MEDIUM] Consentement OAuth Twitter**
- [x] Ajout dans `md/privacy.md` section 1 : mention que la connexion via Twitter/X implique l'acceptation de la Politique de confidentialité (nom, e-mail, photo de profil collectés)

### Phase 3 — Performance backend admin

**[MEDIUM] `deleteMemeById` — non transactionnel**
- [x] `findUnique` pour récupérer infos (bunnyId, videoId), puis `$transaction([meme.delete, video.delete])`, puis `Promise.all([algolia.delete, bunny.delete])` hors transaction (best-effort) (`src/server/admin.ts`)

**[MEDIUM] `createMemeWithVideo` — orphelins Bunny**
- [x] try/catch autour de `meme.create` : dans le catch, `deleteVideo(videoId).catch(log)` puis rethrow erreur originale (`src/server/admin.ts`)

**[MEDIUM] `editMeme` — diff catégories O(n²)**
- [x] `new Set(currentCategoryIds)` + `new Set(values.categoryIds)`, utiliser `.has()` pour le diff (`src/server/admin.ts`)

**[LOW] Index manquants**
- [x] `@@index([categoryId])` sur `MemeCategory` + `@@index([createdAt])` sur `Category` (`prisma/schema.prisma`) — user lance `prisma migrate dev` après

**[LOW] `getCategories` sans cache**
- [x] Cache server-side in-memory (Map + TTL 5 min), exporter `invalidateCategoriesCache()`, appeler dans add/edit/delete (`src/server/categories.ts`)

**[LOW] Cache key `getAdminMemes` incomplète**
- [x] Remplacer `MEMES_FILTERS_SCHEMA` par `MEMES_SEARCH_SCHEMA` dans `getAdminMemes` (`src/server/admin.ts`)

### Phase 4 — Hardening Better Auth (best practices)

**Fichiers :** `src/lib/auth.tsx`, `src/lib/auth-client.ts`, `src/lib/role.ts`, `src/server/user-auth.ts`, `src/routes/admin/users.tsx`, `src/components/user-dropdown.tsx`, `src/components/admin/admin-nav-button.tsx`

- [ ] Ajouter `session.freshAge: 3600` (1h) — forcer une ré-auth récente pour les actions admin sensibles
- [ ] Configurer `advanced.backgroundTasks.handler` avec `waitUntil` de Vercel
- [ ] Expliciter la config du plugin admin : `admin({ defaultRole: 'user' })`
- [ ] Corriger l'import plugin `admin` : `from 'better-auth/plugins'` → `from 'better-auth/plugins/admin'` (tree-shaking)
- [ ] Corriger l'import type `UserWithRole` : `from 'better-auth/plugins'` → `from 'better-auth/plugins/admin'` (6 fichiers)
- [ ] Ajouter `session.cookieCache.version: 1`

### Phase 5 — Upgrade `AdminTable` (composant générique)

**Fichiers :** `src/components/admin/admin-table.tsx`

- [ ] Typer proprement : remplacer `Table<any>` par `Table<TData>` (composant générique)
- [ ] Ajouter le tri : headers cliquables avec icônes (asc/desc/none), utiliser `getSortedRowModel()` de TanStack Table
- [ ] Ajouter la pagination : footer avec navigation (précédent/suivant + numéro de page), utiliser `getPaginationRowModel()` de TanStack Table
- [ ] Rendre pagination/tri optionnels : props `enableSorting` et `enablePagination` avec defaults raisonnables

### Phase 6 — Users table (pagination + tri + confirmations + server functions)

Inclut la migration ban/unban/delete vers des server functions sécurisées, la création du modèle `AdminAuditLog`, et les confirmations UI.

**Fichiers :** `src/routes/admin/users.tsx`, `src/server/admin.ts`, `prisma/schema.prisma`

**Migration Prisma — `AdminAuditLog`**
- [ ] Créer le modèle `AdminAuditLog` (action, actingAdminId, targetId, targetType, metadata Json, createdAt) — audit trail officiel en DB

**Server functions ban/unban**
- [ ] Créer `banUserById` dans `src/server/admin.ts` avec `adminRequiredMiddleware` + guard anti-self-ban (`userId === context.user.id`) + log dans `AdminAuditLog`
- [ ] Créer `unbanUserById` dans `src/server/admin.ts` avec `adminRequiredMiddleware` + log dans `AdminAuditLog`
- [ ] Migrer `DropdownMenuUser` pour appeler les server functions au lieu de `authClient.admin.banUser/unbanUser`
- [ ] Permettre un choix de raison de ban (raisons prédéfinies) au lieu du hardcoded "Spamming"

**Server function removeUser**
- [ ] Ajouter guard server-side `userId === context.user.id` (auto-suppression)
- [ ] Log dans `AdminAuditLog` avec `actingAdminId`
- [ ] Supprimer le `findUnique` pré-vol redondant — laisser `auth.api.removeUser` gérer le not-found

**TanStack Table**
- [ ] Activer `getSortedRowModel()`, `getPaginationRowModel()` dans `useReactTable`
- [ ] Colonnes triables : Name, Email, Role, Date de création
- [ ] Pagination : 20 users par page (client-side)
- [ ] Afficher le statut ban : colonne "Statut" avec badge (Banni/Actif)

**Confirmations + feedback**
- [ ] Confirmation ban : wraper avec `ConfirmAlert` (`src/components/confirm-alert.tsx`)
- [ ] Confirmation unban : idem
- [ ] Confirmation delete : idem
- [ ] Toast feedback : `toast.promise()` pour ban, unban et delete

### Phase 7 — Categories table (tri + confirmation delete)

**Fichiers :** `src/routes/admin/categories/index.tsx`, `src/routes/admin/categories/-components/category-dropdown.tsx`

- [ ] Activer le tri : ajouter `getSortedRowModel()` à `useReactTable`
- [ ] Colonnes triables : Titre, Slug, Date de création
- [ ] Confirmation delete : wraper "Supprimer" dans `CategoryDropdown` avec `ConfirmAlert`
- [ ] Toast feedback : ajouter `toast.promise()` pour la suppression de catégorie
- [ ] Log suppression catégorie dans `AdminAuditLog`

### Phase 8 — Dashboard admin (`/admin`)

Transformer la page d'accueil admin en un vrai dashboard avec KPIs, liens rapides et activité récente. Design via `/frontend-design`.

**Prérequis**
- [ ] Vérifier la disponibilité de l'Algolia Analytics API sur le free tier (partages, téléchargements, clics). Si indisponible → fallback compteurs DB (`shareCount`/`downloadCount` sur Meme, migration additive)

**Migrations additives (Prisma)**
- [ ] Créer le modèle `StudioGeneration` (userId, memeId, createdAt) — remplace le compteur `User.generationCount` pour un tracking par date filtrable par période. Modifier `incrementGenerationCount` pour créer un record au lieu d'incrémenter
- [ ] Si Algolia Analytics API indisponible : ajouter `shareCount`/`downloadCount` sur `Meme` + incrémenter dans les hooks existants
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

### Phase 9 — Améliorations UX admin

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

**Export CSV**
- [ ] Bouton export sur les tables users (avec emails — cohérent avec le rôle admin) et memes (sans emails)
- [ ] Génération côté client (pas de server function) — `Blob` + `URL.createObjectURL`

**Santé système (section dashboard ou page dédiée)**
- [ ] Algolia : quota indexation (via Algolia API `getStatus`)
- [ ] Bunny CDN : stockage utilisé (via Bunny API)
- [ ] Stripe : nombre d'abonnements actifs
- [ ] Sentry : count erreurs dernières 24h (via Sentry API, si gratuit)
- [ ] Afficher sous forme de badges vert/orange/rouge selon les seuils

### Phase 10 — Audits post-implémentation

À lancer **après** toutes les phases précédentes :

- [ ] **React performance** — re-renders TanStack Table, stabilité références colonnes/handlers, bulk selection
- [ ] **Accessibility (a11y)** — `aria-sort` sur headers triables, `aria-label` pagination, focus trap confirm dialogs, touch targets mobile, graphiques (alt text ou `aria-describedby`)
