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
| `add_activity_event_country` | `ALTER TABLE "activity_event" ADD COLUMN "country" TEXT` | **Aucun.** Colonne nullable, aucune valeur par défaut, aucun index |

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

## Phase 4 — Le pays d'origine

**Revient sur la décision « géolocalisation hors périmètre » de la phase 3.** Motif : le pays ne coûte rien à collecter (Vercel le pose déjà sur chaque requête) et il change la lecture du flux, une IP nue ne disant rien de qui est derrière.

### Décisions

| Sujet | Décision | Raison |
|---|---|---|
| Source | En-tête `x-vercel-ip-country` | Posé par le proxy Vercel sur **chaque** requête, sans restriction de plan. Aucune librairie de géolocalisation, aucune API externe, aucun coût |
| Granularité | Pays seul, code ISO 3166-1 alpha-2 | Vercel donne aussi ville, région et coordonnées. On ne les prend pas : minimisation, et la ville n'apporte rien à la détection d'abus |
| Nom du pays | `Intl.DisplayNames` | Aucun mapping en dur, traduit dans la locale courante |
| Drapeaux | `flagcdn.com`, SVG, `https://flagcdn.com/<code minuscule>.svg` | Choix de Victor **pour le moment**. Aucune dépendance ajoutée, aucun octet de bundle. Contrepartie : requête vers un tiers, uniquement depuis les pages admin |
| Rétention du pays | **Purgé avec l'IP à 30 jours** | Le pays est une donnée dérivée de l'IP. Le conserver sur la bande 30-90 jours contredirait la décision « Events entre J+30 et J+90 réellement anonymes ». **Conséquence assumée : pas de drapeau sur cette bande, et aucun agrégat géographique historique possible** |
| Rattrapage | **Aucun, et impossible** | Les Events existants n'ont pas de pays ; ceux de plus de 30 jours ont perdu l'IP dont il aurait fallu le dériver |
| VPN et proxies | Pays faux, assumé | Vercel géolocalise le point de sortie. Ce n'est pas un bug, c'est la limite de la méthode |
| Fiche Visitor | Un seul pays pour la page, pas un par ligne | Le pays est une propriété de l'IP, pas de l'Event. Dérivé du dernier Event qui en porte un |

### Collecte

- [x] `country String?` sur `ActivityEvent` (`prisma/schema.prisma`). Pas d'index : aucune requête ne filtre dessus
- [x] `extractClientCountry` (`src/helpers/request.ts`), à côté d'`extractClientIp` et sur le même motif : prend des `Headers`, rend `undefined` si l'en-tête est absent. `COUNTRY_HEADER_NAME` vient de `@vercel/functions/headers` — le nom de l'en-tête n'est pas écrit en dur. Le sous-chemin `/headers` est un module pur sans import Node, safe au niveau module
- [x] `recordActivityEvent` (`src/utils/activity-event.ts`) le capte à côté de l'IP et du user-agent. Les `SUBSCRIPTION`, écrits depuis le webhook Stripe, n'ont ni IP ni pays : normal, la garde `headers ?` couvre les deux
- [x] **En local, `country` est toujours `null`** : l'en-tête n'existe que derrière le proxy Vercel. Ne pas conclure à un bug en dev

### Affichage

- [x] `CountryFlag` (`src/components/country-flag.tsx`), composant partagé unique. Boîte 4:3 à taille fixe (`sm` pour les tables et le feed, `md` pour le titre de la fiche Visitor), `object-contain` et `ring-1 ring-border` : les drapeaux carrés (Suisse) ou en drapeau vertical (Népal) ne sont ni déformés ni rognés, et les drapeaux clairs (Japon) restent visibles sur fond blanc. Le nom du pays est toujours rendu, en `sr-only` par défaut et visible avec `withLabel`
- [x] **Un code inconnu ne casse pas le rendu** : `getCountryName` (`src/helpers/country.ts`) valide la forme (deux lettres) puis vérifie qu'`Intl.DisplayNames` a bien résolu un nom, `of()` renvoyant le code lui-même quand il ne connaît pas. À défaut, `CountryFlag` rend une icône `Globe` de la même taille que la boîte, libellée `Pays inconnu (T1)`. L'alignement des colonnes ne bouge pas d'une ligne à l'autre, et le code brut reste lisible — utile, `T1` étant le code que Vercel pose sur le trafic Tor
- [x] `Intl.DisplayNames` mis en cache par locale dans une `Map` au niveau module : une table affiche 50 lignes, la construction n'a pas à être refaite à chaque cellule
- [x] Les quatre points d'affichage d'une IP : colonne IP d'`activity-columns.tsx` (flux et fiche User), `user-ip-list.tsx`, titre d'`activity/$ip.tsx`, `activity-events-feed.tsx`
- [x] Fiche Visitor : drapeau `md` dans le titre, à côté de l'IP. Un seul rendu par page
- [x] **L'absence de drapeau est un état normal**, pas une erreur : aucun Event existant n'a de pays, et la bande 30-90 jours n'en aura jamais. Aucun placeholder, aucun tiret, le drapeau est simplement absent
- [x] **Aucun arrondi** sur le drapeau, choix de Victor. Il diverge donc du `rounded-sm` de `FLAG_ICON_CLASS` (`src/components/icon/flags.ts`), tout comme la taille : le sélecteur de langue affiche un carré `size-4`, le pays est une pastille 4:3. L'anneau `ring-1 ring-border` reste, sans quoi un drapeau clair (Japon) disparaît sur fond blanc
- [x] `preconnect` vers `flagcdn.com` dans le `head()` d'`admin/route.tsx`, et **pas** dans `__root.tsx` : le site public n'a aucune raison d'ouvrir une connexion vers ce tiers. Pas de `crossOrigin`, les `<img>` n'en portent pas, sans quoi la connexion préchauffée ne serait pas celle réutilisée

### Requêtes

- [x] `country` ajouté à `ACTIVITY_ROW_SELECT` (`-server/activity.ts`), qui sert le flux, la fiche User et l'aperçu du dashboard
- [x] Fiche User : le `groupBy(['ipAddress'])` existant gagne `_max: { country: true }`. **Zéro requête supplémentaire.** `MAX()` ignore les `NULL` en SQL, ce qui donne exactement « un pays observé pour cette IP, en ignorant les Events qui n'en portent pas ». Grouper par `['ipAddress', 'country']` aurait dédoublé une IP dont le pays a changé, et cassé les clés React de `DetailList`
- [x] Fiche Visitor : un `findFirst` de plus dans le `Promise.all` existant, `country: { not: null }` trié par `createdAt desc`, soit littéralement « le dernier Event qui en porte un ». Sert l'index `[ipAddress, createdAt]`

### Colonne Détail du flux

- [x] **Colonne entièrement retirée** d'`activity-columns.tsx`. Le plan initial la gardait pour le `metadata`, au motif que le prompt des `AI_SEARCH` n'était visible nulle part ailleurs. **Vérification faite, c'était faux** : `/admin/ai-search` a une colonne « Prompt » sur les 500 derniers logs, avec en plus les mots-clés, le nombre de résultats et la locale, servie par la table `ai_search_log`. Le plan des `SUBSCRIPTION` se lit sur la fiche User. La colonne ne portait donc rien d'unique, et affichait un tiret sur la quasi-totalité des lignes
- [x] `getActivityMetadataText` n'est plus exporté : son seul appelant restant est `formatActivityEntry`, dans le même fichier, qui sert le texte de l'aperçu du dashboard. `metadata` reste donc dans `ACTIVITY_ROW_SELECT`
- [x] **Aperçu du dashboard : le préfixe de type retiré du texte.** `formatActivityEntry` rendait `Vue : <titre>`, il rend désormais le titre seul, l'icône portant déjà le type. Le libellé ne reste qu'en dernier repli, pour les Events sans meme ni `metadata` (`SIGNUP`), sans quoi la ligne serait vide
- [x] `ActivityTypeIcon` étant `aria-hidden`, l'icône ne dit rien à un lecteur d'écran : le libellé du type est réinjecté en `sr-only` à côté d'elle dans `activity-events-feed.tsx`. Sans ça, retirer le préfixe supprimait purement et simplement le type pour les technologies d'assistance. Pas de `sr-only` dans la colonne Type du flux, où le libellé est déjà du texte visible
- [x] `userAgent` sorti d'`ACTIVITY_ROW_SELECT`, plus aucun lecteur : quelques centaines d'octets de moins par ligne sur les trois tables et l'aperçu du dashboard. Il reste consultable dans le bloc « User-agents observés » de la fiche Visitor, servi par son propre `groupBy`

### RGPD

- [x] Section 2.9 « Journal d'activité », **FR et EN** : le pays ajouté aux catégories, avec la précision explicite que ni la ville, ni la région, ni les coordonnées ne sont déduites. Ligne « Finalités et bases légales » et ligne « Durées de conservation » mises à jour dans les deux markdown
- [x] La durée est écrite noir sur blanc : le pays n'a **pas** de durée propre, il disparaît avec l'IP à 30 jours
- [x] `runRetentionCleanup` (`cleanup.ts`) : `country: null` ajouté à l'`updateMany` des 30 jours. Le garde `OR` n'est **pas** élargi : `country` n'est écrit que sur la branche qui écrit aussi `ipAddress`, et `extractClientIp` ne rend jamais `null` (repli `'unknown'`), donc `country != null` implique `ipAddress != null`. Une troisième clause n'aurait sélectionné aucune ligne de plus, pour un prédicat de plus à évaluer sur une bande de 60 jours
- [x] `exportUserData` (`src/server/user.ts`) : `country` ajouté au select et à la projection des `activityEvents`
- [x] Suppression de compte : rien à faire, le `ON DELETE CASCADE` d'`activity_event_user_id_fkey` emporte la colonne avec la ligne

### Extractions issues de `/simplify`

- `VisitorIpLink` (`-components/visitor-ip-link.tsx`) : le couple drapeau + IP mono renvoyant vers `/admin/activity/$ip` était écrit deux fois et **avait déjà divergé dans le même commit** (`div` contre `span`, `min-w-0` présent d'un côté seulement, `block py-1` contre `truncate py-1`). Seule la taille du texte reste un paramètre. Le lien enveloppe désormais le drapeau, ce qui agrandit la cible tactile
- `FLAG_CDN_ORIGIN` et `getCountryFlagUrl` remontés dans `src/helpers/country.ts`, à côté de `getCountryName` : les deux dérivations d'un code pays vivent au même endroit, et changer de CDN ne touche qu'un fichier. Le composant ne fabrique plus d'URL
- `CountryFlag` perd ses props `withLabel` et `className`, devenues sans appelant une fois le badge retiré. Le nom du pays est toujours en `sr-only`, jamais visible

### Écarté sciemment

- **Unifier les deux dérivations du pays d'une IP.** La fiche User lit `_max: { country: true }` sur un `groupBy` existant (zéro requête de plus, mais sémantique « plus grand code par ordre alphabétique »), la fiche Visitor fait un `findFirst` trié par date (« le dernier Event qui en porte un », exact, une requête de plus). Ce ne sont pas deux réponses à la même question : la fiche User a besoin d'un pays **par IP** pour huit IP, un `findFirst` y coûterait huit requêtes. Les deux coïncident dès lors qu'une IP porte un seul pays, ce qui est l'hypothèse du modèle
- **Valider le code ISO à l'ingestion** plutôt qu'au rendu : ferait perdre `T1`, le code que Vercel pose sur le trafic Tor, alors que c'est précisément le genre de signal qu'on veut voir dans une enquête d'abus. Le repli `Globe` existe pour l'afficher, pas pour rattraper une donnée sale
- **Réutiliser `ipAddress()` de `@vercel/functions/headers` dans `extractClientIp`** : le repli `x-forwarded-for` reste nécessaire hors Vercel et ne suit pas la même règle (`.at(-1)` contre première entrée). Hors périmètre, la fonction est antérieure
- **Mutualiser le cache `Intl.DisplayNames` avec `getLocaleDisplayName`** (`src/helpers/locale.ts`) : type `'language'` contre `'region'`, et le sélecteur de langue appelle deux fois par rendu là où une table en fait cinquante. Le besoin de cache n'est pas le même
- **Faire passer `activity-events-feed.tsx` et le titre d'`activity/$ip.tsx` par `VisitorIpLink`** : ni l'un ni l'autre n'est un lien (le feed reste cohérent avec son acteur User non cliquable, le titre est la page elle-même), et les y forcer aurait demandé deux props de structure pour trois lignes de JSX chacun

### Reste à faire

- [x] Migration `20260725122957_add_activity_event_country` créée et appliquée en local
- [x] `migration.sql` relu : un seul `ALTER TABLE "activity_event" ADD COLUMN "country" TEXT`, nullable, sans `DEFAULT` ni `NOT NULL` ni index. `ADD COLUMN` nullable sans défaut ne réécrit pas la table sous Postgres, c'est une modification de catalogue instantanée
- [x] `prisma:migrate:prod` appliqué le 2026-07-25 à 12:31:05 UTC, un pas, aucun rollback. Vérifié en base : colonne `country` en `text` nullable sans défaut, et **zéro migration en attente** (les 33 dossiers locaux sont tous appliqués)
- [ ] Vérifier en production qu'un drapeau apparaît sur les nouveaux Events, et qu'aucune erreur d'écriture ne remonte dans Sentry

---

## Phase 5 — Détection de bots (démarré le 2026-07-25)

**Objectif.** Rendre visible le trafic non-navigateur, sans le bloquer davantage. Aucune migration, aucune collecte nouvelle en base.

### Instrumentation du portail CSRF

Le middleware `createCsrfMiddleware` (`src/start.ts`) protège déjà toutes les server functions (`filter: handlerType === 'serverFn'`). Un `POST`/`GET` sans `Sec-Fetch-Site`/`Origin`/`Referer` same-origin reçoit un `403`. Ces blocages étaient jusqu'ici **invisibles** : le middleware s'exécute avant la résolution de la server fn, donc avant `recordActivityEvent`.

- [x] `failureResponse` ajouté à `createCsrfMiddleware` : appelle `observeCsrfBlock(ctx.request)` avant de rendre le `403`
- [x] `src/utils/csrf-observer.ts` : extrait IP, pays, user-agent, `Sec-Fetch-Site`, chemin ; échantillonne à **un capture Sentry par IP / 10 min** (tag `scraping-detection`) pour ne pas noyer Sentry sur un scraper en boucle. Client-safe au niveau module (aucun import Prisma/pino/node), car `start.ts` est isomorphe
- [x] `checkRateLimit` + `RateLimitCheckResult` extraits de `src/server/rate-limit.ts` vers `src/utils/rate-limit-store.ts`. `rate-limit.ts` (chaîne `auth` → Prisma) ne pouvait pas être importé depuis `start.ts` sans embarquer Prisma dans le bundle client. Le store partagé n'importe que des constantes
- [x] `pnpm run build` vérifié : le bundle client passe, aucun Prisma/node embarqué

### Pen test de production (2026-07-25, autorisé par Victor sur son propre site)

Effets de bord assumés sur la prod : `downloadCount` du meme `cme0domjh003lzg8iqfjtv1v9` incrémenté de **+2** (via `trackMemeAction` forgé), et **~10 Events `DOWNLOAD`** enregistrés dans l'Activity depuis l'IP de test. À discounter dans le flux.

| Couche | Résultat |
|---|---|
| Edge Vercel | Un `curl` avec UA `curl/x` reçoit `HTTP 429` + `x-vercel-mitigated: challenge`. Le challenge JS arrête les clients sans navigateur au bord, **avant** l'app |
| UA navigateur | Sitemap public lu intégralement (683 memes, IDs exposés). Contenu public, watermarké, sans enjeu |
| Server fn IDs | Extraits du bundle client (`main-*.js`, factory `pt(e){"/_serverFn/"+e}`) puis mappés aux noms via `.vercel/output/.../meme-*.mjs` qui garde `name`/`filename`. `shareMeme` = `a125486…`, `registerMemeView` = `a34794f…`, `trackMemeAction` = `29a665c…` |
| CSRF sans en-tête | `POST`/`GET` sans `Origin` ni `Sec-Fetch-Site` → **403**. Le cas scraper naïf est arrêté |
| **CSRF avec 1 en-tête forgé** | `-H 'origin: https://www.petit-meme.io'` **ou** `-H 'sec-fetch-site: same-origin'`, **sans aucun cookie** → **200, 767 KB de MP4 watermarké**. Le portail CSRF tombe avec une seule ligne d'en-tête |
| Rate limit `shareMeme` | Bloque après 10 requêtes / 5 min / IP. **Mais renvoie `{"status":500,"unhandled":true,"message":"HTTPError"}`** au lieu d'un `429` : `setResponseStatus(429)` ne survit pas à l'`Error` jetée sur une server fn GET, resérialisée en 500 non géré. Bloque quand même, mais sans `Retry-After` et en polluant Sentry |

### Reste à faire (non traité, décisions ouvertes)

- [ ] Déployer l'instrumentation CSRF et observer une semaine de Sentry `scraping-detection` avant toute décision BotID
- [ ] Baisser `RATE_LIMIT_DOWNLOAD` (10/5min = 2880/j pour 150/j réels). Levier le moins cher, une constante
- [ ] Corriger le 500-au-lieu-de-429 du rate limit sur les server fns GET (renvoyer une `Response` 429 explicite plutôt que `throw`)
- [ ] `Sec-Fetch-Site: cross-site` reste refusé par défaut ; envisager de resserrer `secFetchSite`/`referer` n'apporte rien tant qu'un `Origin` forgé passe. La seule vraie barrière contre un client qui forge les en-têtes est Deep Analysis (Pro) ou un token signé par requête, hors périmètre

---

## Hors périmètre, acté

Bannissement et blocage d'IP, alertes par email au-delà d'un seuil, durcissement de `RATE_LIMIT_DOWNLOAD`, logging de la recherche Algolia, regroupement des lignes du flux, temps réel par SSE ou WebSocket.

Géolocalisation : **sortie du hors-périmètre**, traitée en phase 4, limitée au pays.

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
