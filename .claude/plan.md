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
- [ ] `prisma:migrate:prod` après déploiement

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

- [ ] `ACTIVITY_IP_RETENTION_DAYS = 30` → `updateMany` mettant `ipAddress` **et `dedupKey`** à `NULL`. Purger `dedupKey` est indispensable : il contient une empreinte du jour et constituerait sinon un pseudonyme persistant sur 90 jours, ce qui contredirait la décision « lignes réellement anonymes ». La déduplication ne servant que le jour même, sa suppression est sans effet
- [ ] `ACTIVITY_RETENTION_DAYS = 90` → `deleteMany`

### 1.6 RGPD

- [ ] `src/routes/_public__root/_default/privacy.tsx` : finalité (mesure d'audience, sécurité, prévention des abus), base légale (intérêt légitime), catégories (IP, user-agent, actions), durées (30 j pour l'IP, 90 j pour l'Event)
- [ ] Messages Paraglide **FR et EN** (page publique)
- [ ] `exportUserData` (`src/server/user.ts:180`) : ajouter les Events du User, ils relèvent du droit d'accès
- [ ] Suppression de compte : couverte par `onDelete: Cascade`

### 1.7 Action requise de Victor avant déploiement

**Ne pas réutiliser `BETTER_AUTH_SECRET`** : le sel peut avoir à tourner un jour, alors que faire tourner le secret d'authentification déconnecterait tous les utilisateurs.

- [x] `VISITOR_KEY_SALT: z.string().min(32)` ajouté à `src/env/server.ts`
- [x] `VISITOR_KEY_SALT` renseigné dans `.env.development`, documenté dans `.env.example`
- [x] `VISITOR_KEY_SALT` créé dans Vercel, scopes Production et Preview (le scope Development reste vide, sans effet : en local on lit `.env.development`)
- [ ] Créer et tester la migration en dev, puis l'appliquer en prod **avant** de pousser le code. Voir « Ordre des opérations » dans la section Migrations et ruptures de données

---

## Phase 2 — Le flux

**`/frontend-design` obligatoire avant toute écriture d'UI.**

- [ ] Route `/admin/activity`
- [ ] Server fn `getAdminActivity` avec `adminRequiredMiddleware`, validateur Zod `{ page, types[], scope, search }`, retour `{ rows, total }`
- [ ] `AdminTable` réutilisé tel quel avec `manualPagination: true`, `PAGE_SIZE = 20`, `pageCount` fourni par le serveur. Rendu strictement identique aux autres pages admin
- [ ] Filtre par type : `DropdownMenu` + `DropdownMenuCheckboxItem`, trigger repris de `memes-filter-content-locale.tsx`. **Pas** `MultiAsyncSelect`, réservé aux listes longues avec recherche
- [ ] Filtre Connectés / Anonymes, recherche par IP ou email, tous traités en SQL
- [ ] Aucun `refetchInterval`. Refetch au focus de l'onglet, plus un bouton manuel
- [ ] Dashboard : aperçu des 10 derniers Events avec lien « Tout voir »
- [ ] Renommer le bloc existant `activity-feed.tsx` en **« Journal d'administration »**, il affiche l'Audit et non l'Activity

---

## Phase 3 — Les fiches

**`/frontend-design` obligatoire.**

- [ ] Route `/admin/users/$userId`. N'existe pas aujourd'hui, la fiche est à créer intégralement : en-tête (nom, email, provider, statut d'abonnement, date d'inscription, dernière activité), quatre tuiles de totaux (Views, Downloads, Shares, Generations), dernières IP connues, timeline paginée, actions bannir et supprimer rapatriées depuis `user-actions-cell.tsx`
- [ ] Route `/admin/activity/$ip` (fiche Visitor) : totaux, Memes touchés, user-agents observés, comptes associés, timeline. **Fenêtre de 30 jours**, au-delà l'IP est purgée
- [ ] Navigation : nom cliquable dans la liste `/admin/users`, et depuis le flux vers la fiche User comme vers la fiche IP
- [ ] Encoder l'IP dans l'URL (IPv6 contient des `:`)
- [ ] Admin en français en dur, pas d'i18n, cohérent avec l'existant

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
