# Plan — Activity

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

---

## Activity — Flux d'activité et fiches (décidé le 2026-07-25)

**Objectif.** Savoir qui fait quoi sur le site, en direct et a posteriori. Aujourd'hui le dashboard n'affiche que des courbes agrégées : impossible de savoir que tel visiteur vient de télécharger tel meme. Les analytics existantes (`MemeViewDaily`, `MemeActionDaily`) sont agrégées par jour et ne conservent aucune trace individuelle horodatée.

**Vocabulaire.** Voir [`CONTEXT.md`](../CONTEXT.md) : Visitor, User, Creator, Event, Activity, Audit, Audience, Export, View, VisitorKey. **Ne pas réintroduire** les termes `viewerKey`, `anonId`, `userToken` dans les conversations ou les nouveaux noms de code.

**Décisions structurantes consignées.** [ADR 0001](../docs/adr/0001-visitor-key-derive-de-l-ip.md) (le VisitorKey vient de l'IP, plus du cookie) et [ADR 0002](../docs/adr/0002-un-event-est-attribue-a-l-instant.md) (un Event n'est jamais réattribué).

### Volume mesuré en production (2026-07-25)

| Métrique | Valeur |
|---|---|
| Lignes `meme_view_daily` / jour | 150 à 350 (pic 347 le 24/07) |
| Visitors uniques / jour | 20 à 70 |
| Downloads / jour | 20 à 150 |
| Shares / jour | 1 à 6 |
| Generations sur 14 jours | **0** |
| Recherches IA sur 14 jours | **3** |
| Comptes | 61 au total, **8 actifs sur 7 jours** |
| `meme_view_daily` total | 8 622 lignes |

**Conclusion : ~90 % du trafic est anonyme.** Le flux affichera majoritairement des Visitors sans compte. Volume d'Events attendu : 350 à 500/jour, soit ~35 000 lignes à 90 jours. Impact Neon négligeable, quelques Mo.

Sur 7 jours : 189 `viewer_key` distincts dont **131 avec une seule ligne** (69 %), impossible de distinguer le visiteur de passage du non-consentant dont l'identifiant change à chaque lecture. Un `viewer_key` a vu **150 memes en 7 jours**.

### Journal des décisions

| Sujet | Décision | Raison |
|---|---|---|
| Identité des anonymes | IP brute affichée telle quelle | Choix explicite de Victor, une ligne par action |
| Rendu du flux | Une ligne par Event, pas de regroupement | Lisibilité jugée suffisante au volume actuel |
| Fiches | Fiche User **et** fiche IP | Sans fiche IP, impossible d'instruire un abus, qui vient par définition d'un non-connecté |
| Granularité des Views | Une par (Meme, Visitor, jour) sur lecture réelle | Évite de gonfler la table, conserve le signal |
| Rétention | IP purgée à 30 j, Event supprimé à 90 j | Plafond CNIL 6 mois pour les journaux, finalité atteinte en quelques jours |
| Consentement | On enregistre tout le monde, base « intérêt légitime » | Un log serveur ne pose pas de cookie ; un scraper n'accepte jamais la bannière |
| IP des connectés | Stockée aussi | Sinon un scraper devient invisible en créant un compte |
| Rafraîchissement | Refetch au focus, **aucun polling** | Neon facturé au compute ; épisode à 39,59 $ en février 2026 |
| Emplacement | Page `/admin/activity` + aperçu dashboard | Filtres et pagination impossibles dans un bloc de 10 lignes |
| Pagination | **Serveur** (`manualPagination`), composant `AdminTable` inchangé | 35 000 lignes ne peuvent pas transiter côté client |
| Recherche classique | Non loggée | Algolia expose déjà ses top recherches, éviterait un aller-retour par recherche |
| Events de compte | Inscription, abonnement, favori ajouté. Pas les connexions | La table `session` porte déjà `ip_address` |
| Partage vs téléchargement | `mode` passé à `shareMeme` | `shareMeme` sert le fichier sans savoir laquelle des deux intentions |
| Share tenté vs Share abouti | L'Activity compte l'intention, l'Audience l'aboutissement | Seul le navigateur connaît l'issue de `navigator.share()`. Déporter l'Event côté client le rendrait contournable, ce qui ôterait à l'Activity sa seule qualité : être observée par le serveur |
| Rate limit sur `registerMemeView` | **Ajouté** (`RATE_LIMIT_VIEW`, 60 / 5 min) | Revient sur la décision initiale. `dedupKey` plafonne les *lignes*, pas les *requêtes* : un `createMany` qui n'insère rien coûte quand même un aller-retour, sur une base facturée au compute |
| Nom `shareMeme` | **Conservé** malgré l'écart de vocabulaire | Choix de Victor, documenté dans `CONTEXT.md` |
| Écriture | `waitUntil` (`@vercel/functions`) | Pattern déjà en place ; h3 v2 expose un équivalent portable si départ de Vercel |
| Audience vs Activity | **Alignées** sur la même clé | Refus d'avoir deux chiffres divergents sous le mot « vues » |
| Contenu de `viewer_key` | `sha256(ip + jour + sel)` | L'IP brute partirait dans un cookie JS-lisible et chez Algolia |
| Events entre J+30 et J+90 | Réellement anonymes | Choix de minimisation ; impose de purger aussi `dedupKey` |
| Réconciliation avant inscription | Aucune | Fausserait l'attribution derrière une IP partagée |
| Creator | Exclu de l'Activity **et** de l'Audience | Même fonction d'écriture, une seule garde ; évite de réintroduire une divergence |
| Actions de modération | **Hors périmètre** | Observation pure pour l'instant |

---

## Migrations et ruptures de données — À LIRE AVANT TOUT DÉPLOIEMENT

Règles générales dans [`.claude/rules/database.md`](rules/database.md). Cette section couvre ce qui est spécifique à cette feature.

### Une seule migration, et elle est sans risque

| Migration | Contenu | Risque |
|---|---|---|
| `add_activity_event` | `CREATE TYPE ActivityEventType`, `CREATE TABLE activity_event`, ses index, les deux relations inverses | **Aucun.** Strictement additif |

Aucun `DROP`, aucun `ALTER COLUMN`, aucune colonne rendue obligatoire sur une table existante. Les tables `meme_view_daily`, `meme_action_daily`, `user` et `meme` ne sont pas modifiées.

**Relire le `migration.sql` généré avant de l'appliquer.** S'il contient autre chose que `CREATE TYPE`, `CREATE TABLE`, `CREATE INDEX` et `ALTER TABLE ... ADD CONSTRAINT`, s'arrêter et comprendre pourquoi.

### Les vraies ruptures n'ont PAS de migration

C'est le piège de cette feature. Trois changements altèrent des données de production **sans qu'aucun SQL ne soit exécuté**, donc sans qu'aucun garde-fou ne se déclenche.

**Rupture 1 — le contenu de `viewer_key` (point 1.3).** À la seconde où le code est déployé, la colonne cesse de recevoir des identifiants cookie et reçoit des empreintes. Aucune ligne existante n'est modifiée, mais la colonne contient désormais deux natures de valeurs selon la date. Revenir en arrière ne répare rien : les lignes écrites pendant la fenêtre gardent leur empreinte. Effet visible sous 24 h : marche à la baisse dans la courbe des vues du dashboard, et chute du nombre de visiteurs uniques. **C'est attendu, ce n'est pas une régression.**

**Rupture 2 — l'exclusion du Creator (point 1.4).** Les `view_count` publics de tes memes cessent d'intégrer tes propres passages. Les compteurs déjà accumulés ne bougent pas, ils progressent simplement moins vite. Irréversible pour la période concernée.

**Rupture 3 — la purge (point 1.5).** `deleteMany` est définitif. Un `ACTIVITY_RETENTION_DAYS` mal saisi (9 au lieu de 90) supprimerait des Events dès le premier passage du cron, sans avertissement. **Vérifier les deux constantes ligne à ligne avant de pousser.** Le premier passage réel est inoffensif puisque aucune donnée n'aura l'âge requis, ce qui rend l'erreur d'autant plus facile à ne pas voir.

### Découpage de déploiement recommandé

Ne pas tout déployer d'un coup. Deux déploiements distincts, pour que la seule rupture irréversible arrive quand tu peux déjà l'observer.

**Déploiement A, zéro rupture** : points 1.1, 1.2, 1.4, 1.5, 1.6. On crée la table, on écrit les Events, on purge, on documente. Rien d'existant n'est touché. Si quelque chose cloche, il suffit de revenir en arrière.

**Déploiement B, la rupture** : point 1.3 seul, l'alignement de `viewer_key`. À faire une fois que tu as vérifié dans `/admin/activity`, ou directement en base, que les VisitorKey se calculent correctement et dédupliquent bien. Tu bascules alors l'agrégat en connaissance de cause.

### Ordre des opérations — la migration AVANT le push

Ton habitude documentée est de pousser puis de migrer. **Ici c'est l'inverse.** La migration étant purement additive, l'appliquer avant que le code n'arrive est sans danger : la table reste vide. L'ordre inverse ouvre une fenêtre pendant laquelle le code écrit dans une table inexistante. Comme les écritures passent par `waitUntil` avec un `catch`, elles échoueraient **silencieusement**, et tu ne verrais que du bruit dans Sentry.

1. [x] `VISITOR_KEY_SALT` ajouté dans Vercel (Production et Preview, 64 caractères, vérifié le 2026-07-25). **Sans elle, le déploiement crashe au démarrage** sur la validation Zod de `src/env/server.ts`
2. [x] `vercel env pull --environment=production .env.production` (le drapeau est obligatoire, sinon le CLI tire le scope development)
3. [x] `pnpm run prisma:migrate:prod` — `migrate status` confirme les 32 migrations appliquées
4. [x] `git push`, qui déclenche le déploiement Vercel
5. [ ] Vérifier dans Sentry qu'aucune erreur d'écriture ne remonte

### Recette en dev avant toute bascule en prod

- [x] `pnpm exec dotenv -e .env.development -- pnpm exec prisma migrate dev --name add_activity_event`
- [x] Relire le `migration.sql` généré, vérifier qu'il ne contient aucune opération destructive
- [ ] Lancer l'app, regarder un meme jusqu'au bout : une ligne `VIEW` apparaît
- [ ] Regarder **le même meme une seconde fois** : aucune ligne supplémentaire, la déduplication fonctionne
- [ ] Regarder un **autre** meme : une nouvelle ligne apparaît
- [ ] Télécharger un meme : une ligne `DOWNLOAD` avec l'IP et le user-agent renseignés
- [ ] Télécharger **le même meme deux fois** : deux lignes, les Downloads ne sont pas dédupliqués
- [ ] Connecté en admin : **aucune ligne créée**, la garde Creator fonctionne
- [ ] Vérifier que `meme_view_daily.viewer_key` contient bien une empreinte hexadécimale et **jamais une IP en clair**
- [ ] Vérifier que le cookie Algolia contient toujours un UUID et **pas** l'empreinte
- [ ] Enchaîner une trentaine de mèmes d'affilée : aucun 429, le seuil `RATE_LIMIT_VIEW` ne doit pas gêner un visiteur réel. Un dépassement se voit dans Sentry, taggé `scraping-detection`, et le hook `use-register-meme-view` l'avale sans casser la lecture
- [ ] Déclencher le cron de nettoyage à la main et vérifier qu'il ne supprime rien sur des données récentes

---

## Phase 1 — Collecte (invisible, à déployer en premier)

Le flux n'a aucun intérêt tant qu'il est vide. Mettre la collecte en production d'abord garantit plusieurs jours de données au moment où l'interface arrive.

### 1.1 Schéma Prisma (migration additive)

```prisma
enum ActivityEventType {
  VIEW
  DOWNLOAD
  SHARE
  GENERATION
  AI_SEARCH
  BOOKMARK_ADDED
  SIGNUP
  SUBSCRIPTION
}

model ActivityEvent {
  id        String            @id @default(cuid())
  type      ActivityEventType
  createdAt DateTime          @default(now()) @map("created_at")
  ipAddress String?           @map("ip_address")
  userAgent String?           @map("user_agent")
  userId    String?           @map("user_id")
  memeId    String?           @map("meme_id")
  dedupKey  String?           @unique @map("dedup_key")
  metadata  Json?

  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)
  meme Meme? @relation(fields: [memeId], references: [id], onDelete: Cascade)

  @@index([createdAt])
  @@index([userId, createdAt])
  @@index([ipAddress, createdAt])
  @@index([type, createdAt])
  @@map("activity_event")
}
```

Relations inverses à ajouter : `activityEvents ActivityEvent[]` sur `User` et sur `Meme`.

**Le mécanisme de déduplication.** `dedupKey` vaut `${memeId}:${visitorKey}` **uniquement pour les Events de type `VIEW`**, et `NULL` partout ailleurs. Postgres traite chaque `NULL` comme distinct, donc l'index unique ne déduplique que les Views et laisse passer chaque Download individuellement. Aucune condition en TypeScript, c'est la base qui garantit la règle. Écriture via `createMany({ skipDuplicates: true })`.

Nom de migration : `add_activity_event`.

- [x] Enum `ActivityEventType`, model `ActivityEvent` et relations inverses (`User`, `Meme`) écrits dans `prisma/schema.prisma`
- [x] Migration `20260725094442_add_activity_event` créée et appliquée en local. Elle embarque aussi deux colonnes `subscription` (`ended_at`, `stripe_schedule_id`) présentes dans le schema mais jamais migrées, additives et nullables
- [x] `prisma:migrate:prod` après déploiement — `migrate status` confirme les 32 migrations appliquées, aucune en attente

### 1.2 Le VisitorKey

Nouveau fichier `src/utils/visitor-key.ts`, wrappé dans `createServerOnlyFn` :

- `sha256(ip + 'YYYY-MM-DD' + VISITOR_KEY_SALT)`, `node:crypto` en synchrone
- Le jour est celui de `truncateToUtcDay`, cohérent avec l'existant
- Stable dans la journée, renouvelé le lendemain : déduplication quotidienne correcte, aucune trace réidentifiable qui s'accumule

**Piège TanStack Start** : ce helper ne doit jamais être référencé au niveau module en dehors d'un `.handler()`, sinon Node est embarqué dans le bundle client et le build Vercel casse.

- [x] `src/utils/visitor-key.ts` créé : `getVisitorKey(ipAddress, date = new Date())` wrappé dans `createServerOnlyFn`, `createHash` synchrone, jour issu de `truncateToUtcDay`

### 1.3 Alignement de l'Audience sur le VisitorKey

Dans `registerMemeView` (`src/server/meme.ts:913`) :

- [x] `viewerKey` reçoit désormais le VisitorKey, plus le cookie ni un `crypto.randomUUID()`
- [x] **Ne plus passer cette valeur à `ensureAlgoliaUserToken()`**. La fonction ne prend plus de `fallbackToken` et **retourne** son jeton, que `registerMemeView` transmet à Algolia. Le cookie `httpOnly: false` garde donc son UUID, jamais l'empreinte ni l'IP
- [x] Ne plus écrire `COOKIE_ANON_ID_KEY` avec cette valeur ; le cookie n'est plus écrit nulle part, il reste lu comme repli par `ensureAlgoliaUserToken` pour les visiteurs déjà venus
- [x] Rate limit sur `registerMemeView` : **ajouté**, `RATE_LIMIT_VIEW` (60 requêtes / 5 min). Le raisonnement initial (« `dedupKey` plafonne à une ligne par Meme, Visitor et jour ») vaut pour le nombre de lignes, pas pour le nombre de requêtes. Le point 1.4 ajoute une seconde écriture par appel sur le seul endpoint public sans limite. Le seuil est volontairement large : `RATE_LIMIT_TRACK` (30 / 5 min) casserait un visiteur qui enchaîne des mèmes courts. Le store étant en mémoire donc propre à chaque instance serverless, la limite est un plafond mou, pas une garantie

**⚠️ Ce point est le seul de la phase 1 qui altère des données de production, et il ne comporte aucune migration.** Rupture nette dans l'historique de `meme_view_daily` (cookies avant, empreintes après) et marche visible à la baisse dans la courbe des vues, l'audience ayant été surévaluée jusqu'ici. À déployer **seul**, après le reste de la phase 1. Voir « Découpage de déploiement recommandé ».

### 1.4 Points d'écriture

Tous en `waitUntil`, hors chemin critique, avec `captureException` en cas d'échec. Tous précédés de la garde Creator.

**Une seule fonction d'écriture** : `recordActivityEvent` (`src/utils/activity-event.ts`), wrappée dans `createServerOnlyFn`. Elle porte la garde Creator, le `waitUntil`, le `createMany({ skipDuplicates: true })`, le `captureException` et la dérivation IP / user-agent depuis les `Headers`. Les sept points d'écriture ne font que l'appeler.

- [x] `VIEW` — `registerMemeView` (`src/server/meme.ts`), `dedupKey` = `${memeId}:${visitorKey}`
- [x] `DOWNLOAD` / `SHARE` — `shareMeme` (`src/server/meme.ts`)
- [x] `BOOKMARK_ADDED` — `toggleBookmarkByMemeId` (`src/server/user.ts`), à l'ajout seulement
- [x] `GENERATION` — `incrementGenerationCount` (`src/server/user.ts`)
- [x] `AI_SEARCH` — `aiSearchMemes` (`src/server/ai-search.ts`), `metadata` porte le prompt
- [x] `SIGNUP` — hook `databaseHooks.user.create.after` (`src/lib/auth.tsx`), IP tirée de `context.headers`
- [x] `SUBSCRIPTION` — `onSubscriptionComplete` (`src/lib/auth.tsx`), `metadata` porte le plan. **Aucune IP** : le webhook Stripe donnerait celle de Stripe, pas celle du Visitor

**Signature de `shareMeme`** : le validateur passe de `z.string()` à `{ memeId, mode }`.

- [x] `src/hooks/use-meme-export.ts`
- [x] `src/components/Meme/watermark-upsell-dialog.tsx`
- [x] `src/lib/queries.ts` `getVideoBlobQueryOpts` — **troisième appelant non prévu au plan**. Le Studio réutilise `shareMeme` pour récupérer la vidéo à éditer, ce qui n'est ni un Download ni un Share. `mode` accepte donc une troisième valeur `'studio'`, seule à ne produire aucun Event. `MEME_EXPORT_MODES` (les deux intentions d'Export) et `MEME_VIDEO_INTENTS` (les trois) vivent dans `src/constants/meme.ts` ; `trackMemeAction` réutilise le premier

**Garde Creator** : `matchIsUserAdmin` (`src/lib/role.ts`, paramètre élargi à `UserRoleHolder` pour accepter aussi le `role` nullable venu de Prisma). Le `cookieCache` Better Auth est actif 5 minutes, la lecture de session ne coûte donc pas de requête. Portée volontairement partielle : Victor déconnecté ou sur mobile compte comme un Visitor ordinaire.

Dans `registerMemeView` la garde est un **retour anticipé en tête de handler**, seule façon de couvrir d'un même test l'Activity, l'Audience (`meme_view_daily` + `view_count`) et l'événement Algolia Insights.

**Écart de comptage à connaître** : le flux comptera **plus** de téléchargements que le dashboard. `shareMeme` voit passer les octets, `trackMemeAction` est un appel client que n'importe quel script peut ignorer.

**Un Share est enregistré à l'intention, pas à l'aboutissement.** `shareMeme` sert le fichier avant que le navigateur ne sache si le partage natif a abouti, contrairement à `trackMemeAction`. Écart assumé avec la définition de `CONTEXT.md`.

**`COOKIE_ANON_ID_KEY` devient un cookie en lecture seule.** Plus aucun code ne l'écrit. `ensureAlgoliaUserToken` le lit encore comme repli, pour ne pas casser la continuité Algolia des visiteurs déjà venus. Le cookie ayant une durée d'un an, cette lecture pourra être supprimée avec la constante à partir de **juillet 2027**.

**Effet de bord assumé sur `extractClientIp`** : la fonction quitte `src/server/rate-limit.ts` pour `src/helpers/request.ts` et prend désormais des `Headers`. Sans ce déplacement, `src/lib/auth.tsx` → `activity-event` → `rate-limit` → `user-auth` → `auth.tsx` formait un cycle d'imports sur un module dont l'initialisation est un appel de fonction.

### 1.5 Purge

Dans `runRetentionCleanup` (`src/routes/api/cron/cleanup.ts`), deux constantes :

- [x] `ACTIVITY_IP_RETENTION_DAYS = 30` → `updateMany` mettant `ipAddress` **et `dedupKey`** à `NULL`. Purger `dedupKey` est indispensable : il contient une empreinte du jour et constituerait sinon un pseudonyme persistant sur 90 jours, ce qui contredirait la décision « lignes réellement anonymes ». La déduplication ne servant que le jour même, sa suppression est sans effet
- [x] `ACTIVITY_RETENTION_DAYS = 90` → `deleteMany`

Le `deleteMany` (90 j) passe **avant** l'`updateMany` (30 j) : les lignes à supprimer sortent de la table avant que l'anonymisation ne les parcoure. L'`updateMany` porte un garde `OR: [{ ipAddress: { not: null } }, { dedupKey: { not: null } }]`, sans lequel chaque passage réécrirait toute la bande 30-90 jours, soit ~24 000 lignes par jour de WAL pour rien. Compteurs `deletedActivityEvents` et `anonymizedActivityEvents` ajoutés au retour de `runRetentionCleanup`.

Le scan de l'`updateMany` reste large (bande 30-90 j parcourue pour ~400 lignes réellement concernées). Un index partiel `WHERE ip_address IS NOT NULL OR dedup_key IS NOT NULL` le réduirait, mais exigerait une migration en SQL brut et coûterait de la maintenance d'index sur chaque insertion. Écarté à ce volume, à reconsidérer si la table grossit d'un ordre de grandeur.

### 1.6 RGPD

- [x] Section « Journal d'activité » (2.9) ajoutée à la politique de confidentialité : finalité (mesure d'audience, sécurité, prévention des abus), base légale (intérêt légitime), catégories (IP, user-agent, type d'action, date, Meme, compte), durées (30 j pour l'IP, 90 j pour l'Event). Nouvelles lignes dans les tableaux « Finalités et bases légales » et « Durées de conservation »
- [x] **FR et EN**. La page ne passe pas par des messages Paraglide : `privacy.tsx` charge `md/fr/privacy.md` ou `md/en/privacy.md` selon la locale, seuls le titre et la description SEO sont des messages. Aucun message à ajouter, les deux markdown ont été modifiés à l'identique
- [x] Corrections induites par le point 1.3, déjà déployé : le comptage des vues ne repose plus sur le cookie `anonId` (consentement) mais sur l'empreinte quotidienne dérivée de l'IP (intérêt légitime). Le tableau des cookies décrit désormais `anonId` comme un cookie en lecture seule. Sans ces corrections la politique décrivait un mécanisme qui n'existe plus
- [x] Le nettoyage automatique était annoncé « une fois par semaine » alors que le cron tourne tous les jours à 2 h (`vercel.json`). Corrigé
- [x] `exportUserData` (`src/server/user.ts`) : quatrième requête dans le `Promise.all` existant, `activityEvents` porte type, date, Meme, IP, user-agent et `metadata`. `dedupKey` est exclu : empreinte technique interne, sans information que la date et le Meme ne donnent déjà
- [x] Suppression de compte : **vérifié**, pas supposé. `activity_event_user_id_fkey ... ON DELETE CASCADE` dans `prisma/migrations/20260725094442_add_activity_event/migration.sql`, et `deleteUser` de Better Auth (`src/lib/auth.tsx:136`) supprime bien la ligne `user`

### 1.7 Action requise de Victor avant déploiement

**Ne pas réutiliser `BETTER_AUTH_SECRET`** : le sel peut avoir à tourner un jour, alors que faire tourner le secret d'authentification déconnecterait tous les utilisateurs.

- [x] `VISITOR_KEY_SALT: z.string().min(32)` ajouté à `src/env/server.ts`
- [x] `VISITOR_KEY_SALT` renseigné dans `.env.development`, documenté dans `.env.example`
- [x] `VISITOR_KEY_SALT` créé dans Vercel, scopes Production et Preview (le scope Development reste vide, sans effet : en local on lit `.env.development`)
- [x] Créer et tester la migration en dev, puis l'appliquer en prod **avant** de pousser le code. Fait le 2026-07-25, `20260725094442_add_activity_event`

---

## Phase 2 — Le flux

**`/frontend-design` obligatoire avant toute écriture d'UI.**

- [x] Route `/admin/activity` (`src/routes/admin/activity/index.tsx`), entrée « Activité » dans `admin-sidebar.tsx`
- [x] Server fn `getAdminActivity` (`src/routes/admin/-server/activity.ts`) avec `adminRequiredMiddleware`, validateur `ACTIVITY_FILTERS_SCHEMA` `{ page, types[], scope, search }`, retour `{ rows, total }` via un `Promise.all` `findMany` + `count`
- [x] `AdminTable` réutilisé tel quel avec `manualPagination: true`, `PAGE_SIZE` importé du composant, `pageCount = Math.ceil(total / PAGE_SIZE)`. Aucune modification d'`AdminTable`. Tri désactivé sur toutes les colonnes : l'ordre est celui du serveur (`createdAt desc`), un tri client ne porterait que sur la page courante
- [x] Filtre par type : `DropdownMenu` + `DropdownMenuCheckboxItem`, trigger `Button active` repris de `memes-filter-content-locale.tsx`, `onSelect` neutralisé pour garder le menu ouvert en sélection multiple
- [x] Filtre Connectés / Anonymes (`scope`), recherche par IP ou email, tous traités en SQL. `USER_ID_FILTER_BY_SCOPE` mappe le scope sur `userId`, la recherche est un `OR` `ipAddress contains` / `user.email contains insensitive`
- [x] Aucun `refetchInterval`. `refetchOnWindowFocus` est déjà le défaut global (`router.tsx`, actif en production seulement), `staleTime` d'une minute, plus un bouton « Rafraîchir » manuel
- [x] Dashboard : aperçu des 10 derniers Events (`activity-events-feed.tsx`) avec lien « Tout voir »
- [x] Renommé : `activity-feed.tsx` → `audit-feed.tsx`, composant `AuditFeed`, bloc titré **« Journal d'administration »** passé pleine largeur sous la grille. La server fn `getAdminRecentActivity` devient `getAdminRecentAudit` et `RECENT_ACTIVITY_SELECT` devient `RECENT_AUDIT_SELECT`, sans quoi deux notions distinctes portaient le même nom

**Détails d'implémentation.**

- `src/constants/activity.ts` : `ACTIVITY_IP_RETENTION_DAYS` et `ACTIVITY_RETENTION_DAYS` y sont remontées depuis `cleanup.ts` (le cron et l'affichage doivent lire la même valeur), plus `ACTIVITY_SCOPES` et `ACTIVITY_FILTERS_SCHEMA`, partagé par le `validateSearch` de la route et le validateur de la server fn
- `src/routes/admin/-helpers/activity.tsx` : `ACTIVITY_TYPE_DISPLAY` (libellé singulier pour une ligne, pluriel pour le filtre, icône), `getActivityMetadataText` qui lit `metadata` sans jamais le caster (garde `typeof`, `null`, `Array.isArray`, puis `typeof value === 'string'`), `formatActivityEntry`
- **`ip_address` à `NULL` n'est pas une anomalie** : la cellule IP affiche un tiret avec un tooltip qui distingue les deux cas, `IP purgée automatiquement après 30 jours` si l'Event a plus de 30 jours, `Aucune IP collectée pour cet événement` sinon (le cas des `SUBSCRIPTION`, écrits depuis le webhook Stripe)
- `SearchInput` (`src/components/search-input.tsx`) extrait de `MemesQuery`, supprimé. Le composant enveloppait déjà `useSyncedInputValue` (debounce 300 ms, input non contrôlé pour les touches mortes) ; seul le placeholder variait. Trois appelants mis à jour : la recherche publique (deux fois) et `/admin/library`
- Aucune migration, aucune garde Creator côté lecture (elle est en amont dans `recordActivityEvent`)

**Extractions issues de `/simplify`.**

- `DashboardFeed` + `FeedActor` (`-components/dashboard/dashboard-feed.tsx`) : le rendu des deux blocs du dashboard (Activity et Audit) était identique au détail près de l'icône, du texte et de l'acteur. `AuditFeed` et `ActivityEventsFeed` se réduisent à une projection vers `{ id, icon, text, actor, createdAt }`
- `UserAvatar` (`src/components/user-avatar.tsx`), variantes `sm` (feeds) et `md` (tables). Les autres pages admin gardent leur `Avatar` inline, hors périmètre
- `EmptyCell` (`-components/empty-cell.tsx`), le tiret des cellules vides, partagé avec `/admin/users`
- `DASHBOARD_FEED_SIZE` (`-lib/constants.ts`) : les deux feeds côte à côte doivent avoir la même longueur, le `take: 10` était écrit deux fois
- La page ne garde qu'un `updateSearch` ; `ActivityFilterBar` reçoit un unique `onFiltersChange` au lieu de trois callbacks, et perd son `React.memo` qui ne pouvait jamais toucher (les handlers sont recréés à chaque rendu, `useCallback` étant proscrit)
- Aperçu du dashboard aligné sur les autres blocs (`staleTime` de 10 minutes) : un focus d'onglet ne doit pas coûter une requête de plus. La page `/admin/activity`, elle, garde une minute, c'est l'outil d'observation et il a son bouton de rafraîchissement

**Écarté sciemment.**

- Déplacer `PAGE_SIZE` hors d'`admin-table.tsx` : `AdminTable` ne doit pas être touché, et les quatre autres pages admin l'importent déjà de là
- Généraliser `ActivityScopeToggle` et le `StatusToggle` de `/admin/library` en un `SegmentedFilter` : le second porte un badge et des couleurs `info` propres, le composant commun devrait exposer des slots pour ça
- Recherche en `startsWith` plutôt que `contains`, ou pagination par curseur : les deux économiseraient un scan séquentiel, sans objet à 35 000 lignes. À reconsidérer si la table grossit d'un ordre de grandeur

---

## Phase 3 — Les fiches

**`/frontend-design` obligatoire.**

- [x] Route `/admin/users/$userId` (`src/routes/admin/users/$userId.tsx`) : en-tête (avatar, nom, email, provider, statuts, abonnement, date d'inscription, dernière activité), quatre tuiles de totaux, dernières IP connues, timeline paginée, actions bannir / débannir / supprimer
- [x] Route `/admin/activity/$ip` (fiche Visitor, `src/routes/admin/activity/$ip.tsx`) : totaux, Memes touchés, user-agents observés, comptes associés, timeline. **Fenêtre de 30 jours** matérialisée par un badge, borne `createdAt >= now - ACTIVITY_IP_RETENTION_DAYS` qui sert aussi l'index `[ipAddress, createdAt]`
- [x] Navigation : nom cliquable dans `/admin/users`, colonnes Visiteur et IP du flux liées aux deux fiches, IP de la fiche User vers la fiche Visitor, comptes de la fiche Visitor vers la fiche User, bouton « Voir dans le flux » qui pré-remplit la recherche
- [x] Encoder l'IP dans l'URL. **Rien à écrire** : `interpolatePath` de `@tanstack/router-core` applique `encodeURIComponent` sur les params et `decodeURIComponent` au match (`path.js` `encodePathParam`, `new-process-route-tree.js`). Une IPv6 sort en `2001%3Adb8%3A%3A1` et revient intacte de `useParams`. Encoder à la main produirait un double encodage
- [x] Admin en français en dur, pas d'i18n

**Server fns (toutes sous `adminRequiredMiddleware`).**

- `-server/user-detail.ts` : `getAdminUserDetail` (user + provider + abonnement + résumé d'activité + IP groupées) et `getAdminUserActivity`
- `-server/visitor.ts` : `getAdminVisitorDetail` (résumé + memes + user-agents + comptes) et `getAdminVisitorActivity`
- `-server/activity.ts` : trois primitives `createServerOnlyFn` partagées, `fetchActivityRows` (la page de lignes seule), `fetchActivityPage` (les lignes **plus** le `count`, pour le flux global dont le total varie avec les filtres) et `fetchActivitySummary` (**un seul `groupBy` par `type`** rendant les totaux, le total, `firstSeenAt` et `lastSeenAt`). Aucun comptage en mémoire
- **Un `COUNT` économisé par chargement et par clic de pagination sur chaque fiche.** Le `where` d'une fiche ne varie pas d'une page à l'autre, seul `skip` change : le total est donc déjà dans `summary.total`, et les deux fiches appellent `fetchActivityRows` puis lisent ce total. Seul `getAdminActivity` garde le `count`, ses filtres le rendant réellement variable
- Vérifié dans `@tanstack/start-client-core` (`createServerFn.js:43`) : `resolvedMiddleware = [...middleware, serverFnBaseToMiddleware(options)]`. Le validateur **et** le handler vivent dans le dernier maillon, donc le middleware admin s'exécute toujours avant les deux, quel que soit l'ordre d'écriture dans le builder

**Extractions et réutilisations.**

- `ActivityTimeline` (`-components/activity-timeline.tsx`) : le motif `manualPagination` + `ACTIVITY_COLUMNS` + états de chargement, désormais partagé par les **trois** tables d'activité. `columnVisibility` masque la colonne Visiteur sur la fiche User et la colonne IP sur la fiche Visitor, qui y seraient constantes. `AdminTable` n'est pas touché
- `activity-columns.tsx` remonté de `activity/-components/` vers `-components/`, les trois pages le partageant
- `SectionHeading` sorti de `admin/index.tsx`, `StatTiles` sorti de `totals-section.tsx`, `EmptyMessage` sorti de `dashboard-feed.tsx` : les trois étaient inlinés dans le dashboard et sont maintenant partagés
- `DetailList` (`-components/detail-list.tsx`) : une seule primitive de liste `divide-y` pour les quatre blocs (IP, memes, user-agents, comptes)
- `buildActivityTiles` (`-helpers/activity.tsx`) dérive les quatre tuiles d'`ACTIVITY_TYPE_DISPLAY` : aucun libellé ni icône redéfini
- `useUserModeration` + `UserModerationDialogs` : les trois mutations et les trois `ConfirmAlertDialog` étaient sur le point d'être dupliqués entre la liste et la fiche. La liste **garde son menu ⋮**, la fiche affiche des boutons, les deux partagent la même logique. La suppression depuis la fiche renvoie vers `/admin/users`
- `user-badges.tsx` : `UserStatusBadges`, `AuthProviderBadge` et `SubscriptionBadge` sortis de `users/index.tsx`, partagés avec la fiche
- `-server/users.tsx` : `buildSubscriptionInfo` et `resolveAuthProvider` extraits, `getListUsers` remplace sa boucle de fusion par `Object.groupBy` + le helper partagé
- `ACTIVITY_PAGE_SCHEMA` extrait dans `src/constants/activity.ts`, `ACTIVITY_FILTERS_SCHEMA` l'étend : une seule définition du paramètre `page`
- Invalidation : bannir ou supprimer invalide `getAdminUserDetailQueryOpts` **et** appelle `router.invalidate()`, la liste `/admin/users` étant servie par un loader de route et non par une query

**Piège corrigé — mismatch d'hydratation.** Les en-têtes formataient une date avec l'heure via `Intl.DateTimeFormat` sans `timeZone` : le serveur Node rend en UTC, le navigateur en `Europe/Paris`, soit deux heures d'écart et un `Hydration failed` à l'arrivée sur la fiche. Le premier correctif épinglait le fuseau dans deux constantes optionnelles, ce qui ne réparait que les appels concernés. **Correctif retenu : `formatDate` (`src/helpers/date.ts`) applique lui-même `timeZone: 'Europe/Paris'`**, surchargeable par les options du chargeur d'appel. Aucun appelant ne peut plus se tromper, et deux mismatches latents pré-existants tombent au passage, `admin/library/$memeId.tsx` et `admin/categories/index.tsx`.

Conséquence assumée : un visiteur EN voit les dates en heure de Paris. C'est le fuseau éditorial du site et c'est déterministe ; l'alternative serait un composant de date strictement client.

**Reste ouvert, non traité ici** : `formatRelativeTime` dépend de `Date.now()` et non du fuseau, donc `formatDate` ne le couvre pas. Le trigger de `RelativeDateTooltip` l'affiche en SSR sur les tables admin servies par un loader. Le risque ne se matérialise que sur des dates de moins d'une minute. Pré-existant, à corriger dans ce composant s'il se manifeste.

**Corrections issues de `/simplify`.**

- `getUserModerationPermissions` (`use-user-moderation.ts`) : le menu de la liste et les boutons de la fiche calculaient chacun la même matrice de droits, et **avaient déjà divergé** (`user.banned` truthy d'un côté, `=== true` de l'autre). Une seule source, les deux composants ne diffèrent plus que par leur habillage
- Les trois `useMutation` copiées-collées du hook deviennent une mutation unique pilotée par `MODERATION_ACTIONS`, sur le modèle d'`ACTIVITY_TYPE_DISPLAY`. Le hook expose `isPending`, les boutons de la fiche portent `aria-busy`
- `SectionCard` (`section-heading.tsx`) : le triplet `section` + `SectionHeading` + carte était répété sept fois, avec un `aria-label` recopié à la main du titre situé juste en dessous, donc voué à diverger
- `ActivityTimeline` reçoit un `scope` (`global` / `user` / `visitor`) et non plus une `VisibilityState`. Les identifiants de colonnes ne fuient plus dans les fichiers de route, où `Record<string, boolean>` les rendait non vérifiables : un renommage de colonne échouait en silence. `ACTIVITY_TIMELINE_SCOPES` vit à côté d'`ACTIVITY_COLUMNS`
- **La fenêtre de 90 jours est désormais réelle.** `fetchActivitySummary` n'était borné par rien côté fiche User alors que l'en-tête annonçait « 90 derniers jours » : la borne n'existait que par effet de bord du cron de purge. `buildUserActivityWhere` l'applique en SQL, le libellé et la requête dérivent de `ACTIVITY_RETENTION_DAYS`
- `subtitle` ajouté à `DetailList` : la ligne « vu il y a X » était construite à l'identique dans deux listes
- `pickEarliest` / `pickLatest` fusionnés en `pickDateBound`, le handler Visitor garde ses `memeId` / `userId` une fois au lieu de trois

**Écarté sciemment.**

- Retirer la colonne d'actions de `/admin/users` : arbitrage de Victor, la liste garde son menu
- Passer un unique `UseQueryResult` à `ActivityTimeline` au lieu de cinq props : les trois appelants n'ont plus la même forme depuis que les fiches lisent leur total dans `summary` et reçoivent un tableau nu
- `SubscriptionBadge` prenant un `SubscriptionInfo` entier plutôt que trois props : `SubscriptionInfo` n'est pas une union discriminée, un `status: 'none'` s'afficherait silencieusement « Ancien ». Les trois props rendent le contrat total
- Tuiles couvrant les huit types d'Event : le plan en spécifie quatre. L'en-tête de la fiche Visitor annonce donc un total plus large que la somme des tuiles, les quatre types restants n'apparaissant que dans la timeline
- Sortir `PAGE_SIZE` d'`admin-table.tsx` : décision déjà consignée en phase 2
- Extraire un composant d'« état vide encadré » pour `VisitorEmptyState` : le motif n'a jamais été extrait ailleurs, l'abstraction naîtrait pour un seul appelant

---

## Hors périmètre, acté

Bannissement et blocage d'IP, alertes par email au-delà d'un seuil, durcissement de `RATE_LIMIT_DOWNLOAD`, logging de la recherche Algolia, géolocalisation, regroupement des lignes du flux, temps réel par SSE ou WebSocket.

À reconsidérer plus tard, une fois qu'il y aura des données à regarder.

## Points de vigilance

- **La non-falsifiabilité de l'IP vient de Vercel, pas du code.** `extractClientIp` fait confiance à `x-real-ip` puis `x-forwarded-for` sans les valider. C'est sûr aujourd'hui parce que Vercel écrase ces en-têtes (« we currently overwrite the `X-Forwarded-For` header and do not forward external IPs. This restriction is in place to prevent IP spoofing », [Request headers](https://vercel.com/docs/headers/request-headers)) et que `x-real-ip` y est déclaré identique. L'option Trusted Proxy, qui permettrait de passer sa propre valeur, est réservée aux comptes Enterprise. **En cas de migration hors Vercel, l'IP redevient falsifiable** et avec elle le rate limiting, le VisitorKey, la déduplication des vues et le contenu d'`activity_event.ip_address`
- Un audit de sécurité a d'abord conclu à une faille de spoofing sur ce point, faute d'avoir pu vérifier le comportement de Vercel. Vérification faite, c'était un faux positif. Ne pas le reconclure sans relire la documentation citée ci-dessus
- `incrementGenerationCount` ne revalide pas `FREE_PLAN_MAX_GENERATIONS` : le quota est vérifié par `checkGeneration`, un appel séparé. Un compte gratuit qui appelle l'endpoint directement dépasse la limite. Pré-existant, hors périmètre de la phase 1
- `RATE_LIMIT_DOWNLOAD` autorise 10 téléchargements par 5 minutes, soit 2 880/jour, alors que le site entier en fait 150. Le store est en mémoire (`rate-limit.ts:18`), donc propre à chaque instance serverless : un scraper obtient mécaniquement plusieurs fois le quota. Constat posé, aucune action décidée
- `trackMemeAction` reste contournable, ses compteurs sont donc structurellement sous-évalués
- Tree-shaking TanStack Start : tout appel Prisma ou import Node hors d'un `.handler()` casse le build Vercel
- `oxlint --fix` supprime à tort certains `as` d'élargissement, vérifier `tsc` après
- `registerMemeView` lit désormais la session à chaque vue, pour la garde Creator. Coût vérifié : Better Auth rend `null` sans toucher la base quand aucun cookie de session n'est présent, et sert le `cookieCache` pendant 5 minutes. Le seul aller-retour DB concerne un User connecté dont le cache a expiré, soit 8 comptes actifs par semaine
- Pistes écartées faute de rapport au périmètre, à reconsidérer : sortir le Studio de `shareMeme` (le `mode: 'studio'` n'existe que pour n'écrire aucun Event) et interpoler `MEME_EXPORT_MODES` dans les requêtes SQL brutes de `meme.ts` et `dashboard.ts`, qui écrivent encore `'download'` / `'share'` en dur
