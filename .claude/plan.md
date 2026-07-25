# Plan — Protection du contenu vidéo (démarré le 2026-07-25)

**L'app est en production avec des utilisateurs et des données réelles.** Toute migration Prisma doit être additive (nouveaux champs optionnels, nouveaux index). Ne jamais supprimer/renommer de colonnes, reset la base, ou faire de migration destructive.

Le plan précédent (« Plan — Activity », phases 1 à 4 livrées, phase 5 détection de bots) est dans l'historique git. Ce qui reste vivant de la phase 5 est repris ci-dessous.

---

## Objectif

Plus aucune URL de fichier vidéo en clair dans le DOM, watermarkée ou non. Le visiteur n'obtient qu'un `blob:` sur l'élément `<video>` et aucun lien téléchargeable. La copie individuelle reste possible et c'est assumé ; ce qu'on tue, c'est l'aspiration par script, aujourd'hui gratuite et invisible.

Contrainte qui encadre tout le reste, formulée par Victor le 2026-07-25 : **le problème est le volume et l'énumérabilité, pas le fichier**. Un téléchargement à la fois derrière un rate limit est acceptable ; un catalogue de 683 vidéos en libre-service, non. C'est cette contrainte qui rend possible l'exposition contrôlée du watermarké, longtemps écartée par principe.

## Diagnostic (vérifié en production le 2026-07-25)

Le `bunnyId` est un identifiant **permanent et suffisant** : qui le possède télécharge, pour toujours, sans rien demander.

Le scraper ne passe donc jamais par l'app. Il la visite une fois pour récolter les identifiants, puis tape `vz-eb732fb9-3bc.b-cdn.net` en direct. Le challenge Vercel, le middleware CSRF, le rate limiting et l'instrumentation Sentry sont sur une porte qu'il n'emprunte pas.

| Surface | Constat |
|---|---|
| `/{bunnyId}/original` | `HTTP 200`, MP4 **sans watermark**, `access-control-allow-origin: *`, aucun token. Un `curl` suffit |
| `/{bunnyId}/playlist.m3u8` | `HTTP 200`, HLS ouvert, rendus jusqu'au **720p**, non watermarké. Un `ffmpeg -i playlist.m3u8` reconstitue la source |
| `sitemap-memes.xml` | **683 `<video:content_loc>` pointant vers `/original`**, déclaré dans `robots.txt` et dans l'index. Catalogue lisible par machine |
| HTML de la page mème | `originalUrl` sérialisé dans le payload SSR du loader, plus `contentUrl` dans le JSON-LD, sur la page détail **et** sur les pages catégorie |
| Edge Vercel | Un `curl` avec UA `curl/x` reçoit `HTTP 429` + `x-vercel-mitigated: challenge`. Protège l'app, **pas** le CDN Bunny |

**Le contournement du gating premium est réel.** `shareMeme` (`src/server/meme.ts:819`) sert le watermark aux comptes gratuits et l'original aux comptes premium. L'original étant public et non signé, la distinction payante ne tient pas.

**Le `bunnyId` restera public quoi qu'on fasse.** Il est écrit en clair dans le `poster` du `<video>`, dans `og:image`, dans `thumbnailUrl` du JSON-LD, dans le `link rel=preload` (`$memeId.tsx:366`) et dans les enregistrements Algolia, interrogeables publiquement. 14 points d'appel de `buildVideoImageUrl`. Ces vignettes doivent rester publiques, sinon les aperçus Twitter et Google cassent. De cet identifiant on réécrit `playlist.m3u8` et `/original` à la main. La seule question est donc de rendre l'identifiant sans valeur, ce que fait le token auth de la phase 4. Blob et token auth sont complémentaires, aucun ne suffit seul.

## Mesure Search Console (relevée le 2026-07-25, sur 3 mois)

L'indexation vidéo est **active et en croissance**, l'arbitrage SEO n'est pas théorique.

| Indicateur | Valeur |
|---|---|
| Vidéos indexées | **166** sur 476 connues de Google (683 publiées, toutes ne sont pas découvertes) |
| Non indexées | 310, dont **154 pour « La vidéo n'est pas sur une page de lecture »** et 156 en attente de traitement |
| Clics, recherche Vidéo | **222** sur 3 mois, CTR 8 %, position moyenne 11 |
| Impressions, recherche Vidéo | **2 781**, passées de ~7/jour fin avril à ~80/jour en juillet |
| Répartition | 85 % mobile, 151 clics en France. 4 pages font 134 des 222 clics |

Deux lectures en découlent. Les 166 vidéos indexées le sont grâce au `content_loc` du sitemap, que la doc Google décrit comme *« the most effective way for Google to fetch your video content files »*. Et le motif dominant d'échec montre que Google peine déjà à qualifier nos pages de pages de lecture, ce qui rend le signal on-page d'autant plus précieux.

## Stratégie retenue

**1. Séparer les assets en deux zones.** Une zone publique et durable qui ne contient que le fichier **watermarké**, servie à Google et à quiconque, protégée par une règle de débit au bord. Une zone Stream **signée** qui contient la source et n'est atteignable qu'en passant par le site. Ce qui reste librement récupérable devient exactement ce qui est déjà offert gratuitement par `shareMeme`, mais au goutte-à-goutte au lieu du robinet ouvert.

**2. Signer le streaming, pas le supprimer.** La [CDN token authentication](https://docs.bunny.net/stream/security) de Bunny agit au niveau de la pull zone et couvre « MP4 fallbacks, HLS playlists and segments, thumbnails, and previews ». Elle est explicitement prévue pour « secure and sign direct video URLs on a lower level and use those in **your own video player or custom solution** », donc le player hls.js maison est conservé.

**Piège documenté** : il faut les tokens **path-style** (`token_path`, [Token Authentication V2](https://bunny.net/blog/were-bringing-token-authentication-to-the-next-level/)) pour que les segments `.ts` soient couverts. Signer seulement le `playlist.m3u8` laisse les segments ouverts.

**3. Rate limiter au bord, gratuitement.** [Bunny Shield Basic](https://bunny.net/shield/) est gratuit et inclut 2 règles de rate limit, 25M requêtes/mois et une détection de bots simple. C'est le levier qui répond à la contrainte de volume, et il manquait : le rate limiting de l'app est en mémoire et le scraper ne passe pas par l'app.

Fait qui rend le calibrage confortable : **la pull zone publique ne servirait que Googlebot et les scrapers.** Toutes les lectures du watermarké par l'app passent par `fetchWatermarkedVideo`, qui tape le Storage API avec l'AccessKey côté serveur (`buildStorageUrl`, `bunny.ts:158`). Aucun utilisateur légitime n'atteint la zone publique, le seuil peut donc être bas sans gêner personne.

### Écarté, avec la raison

- **`<video:player_loc>` vers l'iframe Bunny.** Techniquement accepté par Google en alternative à `content_loc` (*« It's required to provide either a `<video:content_loc>` or `<video:player_loc>` tag »*), mais cadré pour les plateformes d'embed : *« For Vimeo, YouTube, and other video hosting platforms that allow embedding videos through iframe videos, this value is used rather than `video:content_loc` »*. L'iframe n'étant pas présente sur nos pages, le motif « pas sur une page de lecture » qui frappe déjà 154 vidéos risquait de s'étendre à tout le catalogue
- **Retirer le bloc `<video:video>`.** Coûterait 222 clics sur 3 mois et une croissance d'un facteur dix depuis avril, alors que le rate limit répond à la contrainte de volume sans ce sacrifice
- **Proxy vidéo par notre serveur.** L'URL de proxy devient le nouvel identifiant permanent, aussi récoltable, sauf à y ajouter une signature par session, ce que Bunny fait déjà au bord et gratuitement. On paierait la bande passante vidéo sur Vercel Hobby, sans plafond ni Spend Management, pour une protection identique
- **Remplacer le player par l'iframe Bunny.** Coûterait `videoRef`, dont dépendent `useRegisterMemeView` (`ratio: 0.3`, `minMs: 2500`, `maxMs: 12000`), `pauseVideo()`, `VideoOverlay`, le poster et le thème dark
- **Watermarker le flux HLS.** Imposerait le watermark aux abonnés premium pendant la lecture, ce qu'ils paient précisément pour ne pas avoir
- **MediaCage Basic DRM.** Chiffrement « dynamic clear key » : la clé transite jusqu'au navigateur, donc contournable. À reconsidérer seulement si le token auth se révèle insuffisant
- **MediaCage Enterprise DRM.** 99 $/mois plus les licences, sans rapport avec l'économie du site
- **Désactiver « Enable Direct Play ».** Ferait répondre 403 aux URLs directes, donc casserait le player hls.js maison
- **Allowlist Googlebot par plages IP.** Google recommande la vérification par reverse DNS et fait évoluer ses plages : liste figée = dette qui se périme sans prévenir, pour l'unique custom access list du plan gratuit. À n'ajouter que si la mesure montre que Googlebot frôle le seuil

---

## Phase 0 — Le player fuyait sur Chrome et Edge (fait)

`use-meme-hls.ts` et `meme-reels.tsx` testaient `canPlayType('application/vnd.apple.mpegurl')` **avant** `Hls.isSupported()`. Depuis Chrome 142 ce test renvoie `"maybe"` sur Chrome et Edge desktop, pas seulement sur Safari. Vérifié en prod sur Chrome 150 : `<video src="https://vz-….b-cdn.net/{bunnyId}/playlist.m3u8">` en clair dans le DOM, lecture normale. Seuls Firefox et les Chromium anciens atteignaient la branche hls.js.

- [x] Correctif recommandé par les mainteneurs de hls.js : natif **uniquement** si `ManagedMediaSource` existe, sinon hls.js. Donne un `blob:` partout, iOS 17.1+ compris. Seul iOS antérieur retombe sur le natif
- [x] Logique dupliquée entre le hook et les reels extraite dans `attachHlsSource` / `matchIsNativeHlsPreferred` (`src/utils/video.ts`), qui renvoie sa fonction de nettoyage
- [x] `HLS_MIME_TYPE` dans `src/constants/bunny.ts`, `hlsRef` retiré du retour de `useMemeHls` (inutilisé)
- [x] `pnpm run lint:fix` passe

**Conséquence à compenser en phase 3.** Googlebot est Chrome : il recevait jusqu'ici un `src` exploitable sur la page. Il ne voit plus qu'un `poster`. Le signal on-page doit être rendu par le JSON-LD.

Une tentative antérieure de retrait de `contentUrl` et `originalUrl` du HTML a été annulée dans l'arbre. L'arbitrage ci-dessous la rend caduque : `contentUrl` revient, pointant vers le watermarké.

## Phase 1 — Mesurer avant d'investir (fait)

- [x] Search Console, rapport « Indexation des vidéos » et Performances onglet Vidéo. Résultats dans la section Mesure ci-dessus. Conclusion : l'indexation vidéo vaut d'être sauvée
- [x] Couverture watermark. Question close en phase 2, sans instrumentation

## Phase 2 — Couverture watermark (close, rien à construire)

**Décision de Victor le 2026-07-25 : tout mème publié en production a un watermark, c'est un acquis, on ne le vérifie pas.** Ne pas rouvrir.

La phase visait à ajouter `watermarkedAt DateTime?` au modèle `Video`, avec migration et backfill. **Abandonné.** Schema et `logWatermarkUpload` remis en l'état, aucune migration créée, aucune touchée en production.

Deux raisons, dans l'ordre. La règle métier est **déjà appliquée par le code** : `editMeme` (`src/routes/admin/-server/memes.ts:260`) refuse le passage à `PUBLISHED` quand `checkWatermarkExists` répond non, avec un 422, depuis `e64e17b` du 2026-03-11. Et `editMeme` est le seul chemin vers `PUBLISHED`, la création forçant `PENDING` (`memes.ts:465`), sans qu'aucun cron ni script ne touche au statut. Ensuite, la colonne n'était qu'un proxy de cette règle, et un proxy moins fiable : la vérité est dans le Storage, et un watermark supprimé après publication laisserait la colonne affirmer « watermarké » pendant que Google prend un 404.

- [x] Garde-fou de publication : en place et vérifié, aucun autre chemin vers `PUBLISHED`
- [x] Couverture des publiés : acquise par hypothèse, pas d'audit, pas de colonne, pas de migration

**Conséquence pour la phase 3** : `content_loc` peut pointer vers le watermarké sans filtre en base, `status = PUBLISHED` suffisant à garantir la présence du fichier.

**Détecteur de rupture déjà en place.** Si l'invariant cassait, le fallback de `shareMeme` (`meme.ts:876`) sert l'original à la place du watermark et remonte l'erreur dans Sentry sous `watermark-fallback`. C'est la sonde temps réel, elle signale au moment où ça se produit, ce qu'une colonne n'aurait pas fait. À surveiller après la bascule de la phase 3.

**Seul reliquat conservé dans l'arbre**, indépendant de tout ce qui précède : `MemeWithVideo` valait `MemeGetPayload<{ include: { video: true } }>`, donc le modèle `Video` entier, alors que les enregistrements Algolia ne portent que 4 champs vidéo. Le type dérive maintenant de `MEME_VIDEO_INCLUDE` (`src/constants/meme.ts`), construit sur `MEME_VIDEO_SELECT` (`id`, `bunnyId`, `duration`, `bunnyStatus`), réutilisé par `MEME_FULL_INCLUDE`, `MEME_ALGOLIA_INCLUDE`, `MEME_WITH_VIDEO_AND_TRANSLATIONS_INCLUDE` (`meme.ts:288`) et les bookmarks (`user.ts:42`). Le type dit désormais la vérité sur ce qui est réellement partagé, et tout futur champ ajouté à `Video` restera hors d'Algolia et hors des payloads client. Aucun effet à l'exécution, la projection est identique aux 4 champs existants.

Les `include: { video: true }` restants (`ai.ts:136`, `sync-bunny-titles.ts:82`) sont purement serveur et n'ont pas été touchés.

**Duplication repérée, pas traitée.** `processWithConcurrency` existe en double, version positionnelle dans `scripts/watermark-videos.ts:177` et version objet dans `sync-bunny-titles.ts:35`. L'extraction dans `src/helpers/concurrency.ts` a été faite puis annulée : elle n'avait plus de motif une fois l'audit abandonné, et refactorer un cron de production n'a rien à faire dans un lot « protection vidéo ». À reprendre dans un lot dédié.

## Phase 3 — Zone publique pour le watermarké, rate limit, et bascule du SEO

Le watermark vit dans Bunny **Storage**, zone privée avec AccessKey. Google ne peut pas le lire.

- [ ] Créer une pull zone publique devant la zone Storage. La bande passante reste chez Bunny, pas sur le quota Vercel
- [ ] Vérifier le coût de cette bande passante avant bascule
- [ ] Activer Bunny Shield Basic sur cette zone. Deux règles : un plafond haut permanent, de l'ordre de 300 requêtes/minute par IP, contre l'aspiration brutale ; une règle de travail calibrée **large d'abord**, de l'ordre de 60/minute par IP
- [ ] `content_loc` du sitemap pointe vers le fichier watermarké, durable et public
- [ ] `contentUrl` du `VideoObject` de la page pointe vers **la même URL**, pour rendre à Google le signal on-page que le passage au `blob:` retire
- [ ] Après recrawl, lire dans les logs Bunny le débit maximum atteint par Googlebot sur une minute, poser le seuil définitif à trois ou quatre fois ce maximum

Pourquoi large d'abord : la situation actuelle est déjà pire que tout calibrage trop généreux, puisque `/original` répond 200 sans limite à qui veut. Il n'y a aucune prime à serrer tout de suite, et une pénalité réelle à serrer trop, la Search Console mettant plusieurs semaines à signaler que Googlebot a été coupé.

## Phase 4 — CDN token authentication sur le streaming

- [ ] Activer la CDN token authentication sur la pull zone Stream
- [ ] Tokens **path-style** avec `token_path`, sinon les segments `.ts` restent ouverts
- [ ] Expiration courte, quelques minutes
- [ ] Signature **côté serveur** à chaque rendu. `signBunnyUrl` (`src/lib/bunny-token.ts`) et `BUNNY_TOKEN_AUTH_KEY` existent déjà, utilisés par `signOriginalUrl` (`bunny.ts:49`) mais pas pour le streaming, et la zone n'a pas l'option activée
- [ ] `useMemeHls` reçoit une URL signée en paramètre au lieu de la construire côté client
- [ ] Les 4 surfaces de lecture suivent : `$memeId.tsx:123`, `player-dialog.tsx:36`, `studio-preview.tsx:32` (via le hook) et `meme-reels.tsx` (appel direct à `buildVideoStreamUrl`)
- [ ] Décider du verrouillage par IP. Protège d'un scrape distribué, mais casse potentiellement les bascules de réseau mobile
- [ ] Vérifier que `/original` et `/playlist.m3u8` répondent 403 sans token

**Question ouverte à trancher avant de coder** : durée de vie du token contre mise en cache du HTML. Une URL signée à TTL court insérée dans une page mise en cache produit une lecture cassée. Déterminer ce qui est réellement caché dans le rendu SSR et le loader.

## Phase 5 — Resserrer ce qui reste

- [ ] Baisser `RATE_LIMIT_DOWNLOAD` : 10 par 5 min font 2 880 par jour pour 150 téléchargements réels. Une constante, le levier le moins cher
- [x] Le rate limit renvoie un vrai 429 au lieu d'un 500 sur les server fns GET
- [ ] Déployer l'instrumentation CSRF et observer une semaine de Sentry `scraping-detection` avant toute décision BotID
- [ ] Note : si l'embed token authentication est un jour activée, l'iframe admin (`src/routes/admin/library/$memeId.tsx:87`) doit être signée aussi

---

## Où on en est (session close le 2026-07-25)

Phases 0, 1 et 2 terminées et commitées. Les phases 2 et 3 ont un statut à ne pas confondre : la 2 est close parce qu'il n'y a **rien à construire**, pas parce qu'elle a été livrée.

**Reprise à la phase 3, dans cet ordre.** Rien n'a encore été fait côté Bunny.

1. Victor crée la pull zone publique devant la zone Storage et active Bunny Shield Basic. Partie console, pas de code
2. Valider le coût de bande passante **avant** la bascule. C'est la condition posée par Victor, elle n'est pas levée. Un chiffrage à partir du poids moyen des watermarkés, du nombre de vidéos et de la fréquence de recrawl Googlebot avait été proposé, il n'a pas été fait
3. Seulement ensuite, le code : `content_loc` du sitemap et `contentUrl` du `VideoObject` basculent vers l'URL publique du watermarké. Pas de filtre sur la présence du watermark, la phase 2 a tranché que `status = PUBLISHED` suffit
4. Attendre le recrawl et vérifier en Search Console que les vidéos restent indexées, **avant** de toucher à la phase 4

Repères de mesure pour l'après : 166 vidéos indexées, 222 clics et 2 781 impressions sur 3 mois, détail dans la section « Mesure Search Console ». Exports du 2026-07-25 conservés sur le Desktop de Victor, `petit-meme.io-Video-indexing-2026-07-25/` et `petit-meme.io-Performance-on-Search-2026-07-25/`, à re-tirer pour comparer après la bascule.

## Ordre de déploiement (risque principal du plan)

**La phase 3 doit être déployée et recrawlée AVANT la phase 4.** Activer le token auth pendant que le sitemap pointe encore vers `/original` ferait répondre 403 à Googlebot sur 683 URLs, le scénario le plus coûteux de tous. Séquence : zone publique et règle Shield en ligne, sitemap et JSON-LD basculés sur le watermarké, attente du recrawl, vérification que les vidéos restent indexées, puis seulement token auth sur la Stream.

## Ce que la stratégie ne fera pas

Le sitemap continuera de lister 683 URLs de fichiers watermarkés : l'énumérabilité reste entière, c'est la **vitesse** qui est bridée. Un scraper patient, un fichier par minute, met onze heures et passe sous le radar. Le rate limit rend l'aspiration lente, bruyante et journalisée, il ne la rend pas impossible. Un adversaire déterminé pilotera par ailleurs un navigateur headless pour récupérer les URLs signées du streaming avant expiration ; en 2026 c'est une trentaine de lignes. Le gain réel est de supprimer l'aspiration triviale et de forcer le passage par les défenses existantes. Au-delà, seul le DRM matériel change quelque chose, et la capture d'écran reste imbattable. Calibrer l'investissement en conséquence.

---

## Pen test de production (2026-07-25, autorisé par Victor sur son propre site)

Effets de bord assumés sur la prod : `downloadCount` du meme `cme0domjh003lzg8iqfjtv1v9` incrémenté de **+2** (via `trackMemeAction` forgé), et **~10 Events `DOWNLOAD`** enregistrés dans l'Activity depuis l'IP de test. À discounter dans le flux.

| Couche | Résultat |
|---|---|
| Edge Vercel | Un `curl` avec UA `curl/x` reçoit `HTTP 429` + `x-vercel-mitigated: challenge`. Le challenge JS arrête les clients sans navigateur au bord, **avant** l'app |
| UA navigateur | Sitemap public lu intégralement (683 memes, IDs exposés), donc la source **sans** watermark via `/original` |
| Server fn IDs | Extraits du bundle client (`main-*.js`, factory `pt(e){"/_serverFn/"+e}`) puis mappés aux noms via `.vercel/output/.../meme-*.mjs` qui garde `name`/`filename`. `shareMeme` = `a125486…`, `registerMemeView` = `a34794f…`, `trackMemeAction` = `29a665c…` |
| CSRF sans en-tête | `POST`/`GET` sans `Origin` ni `Sec-Fetch-Site` → **403**. Le cas scraper naïf est arrêté |
| **CSRF avec 1 en-tête forgé** | `-H 'origin: https://www.petit-meme.io'` **ou** `-H 'sec-fetch-site: same-origin'`, **sans aucun cookie** → **200, 767 KB de MP4 watermarké**. Le portail CSRF tombe avec une seule ligne d'en-tête |

## Points de vigilance

- **La non-falsifiabilité de l'IP vient de Vercel, pas du code.** `extractClientIp` fait confiance à `x-real-ip` puis `x-forwarded-for` sans les valider. C'est sûr aujourd'hui parce que Vercel écrase ces en-têtes (« we currently overwrite the `X-Forwarded-For` header and do not forward external IPs. This restriction is in place to prevent IP spoofing », [Request headers](https://vercel.com/docs/headers/request-headers)) et que `x-real-ip` y est déclaré identique. L'option Trusted Proxy est réservée aux comptes Enterprise. **En cas de migration hors Vercel, l'IP redevient falsifiable** et avec elle le rate limiting, le VisitorKey, la déduplication des vues et le contenu d'`activity_event.ip_address`
- Un audit de sécurité a d'abord conclu à une faille de spoofing sur ce point, faute d'avoir pu vérifier le comportement de Vercel. Vérification faite, c'était un faux positif. **Ne pas le reconclure sans relire la documentation citée ci-dessus**
- Le rate limiting de Bunny Shield agrège ses compteurs sur le réseau global, avec une propagation de quelques secondes. Ce n'est pas un plafond exact, quelques requêtes passent avant l'application de la règle
- `getWatermarkUploadConfig` (`src/routes/admin/-server/watermark.ts:44`) renvoie `BUNNY_STORAGE_API_KEY` au navigateur pour l'upload direct. Protégé par `adminRequiredMiddleware`, donc limité au compte de Victor, mais une clé d'écriture Storage transite jusqu'au client
- `incrementGenerationCount` ne revalide pas `FREE_PLAN_MAX_GENERATIONS` : le quota est vérifié par `checkGeneration`, un appel séparé. Un compte gratuit qui appelle l'endpoint directement dépasse la limite
- Le store de rate limiting est en mémoire (`rate-limit.ts:18`), donc propre à chaque instance serverless : un scraper obtient mécaniquement plusieurs fois le quota
- `trackMemeAction` reste contournable, ses compteurs sont structurellement sous-évalués
- Tree-shaking TanStack Start : tout appel Prisma ou import Node hors d'un `.handler()` casse le build Vercel
- `oxlint --fix` supprime à tort certains `as` d'élargissement, vérifier `tsc` après
- **Toujours se demander « est-ce que ça empêche la base de dormir ? »** avant d'ajouter du polling, un cron ou des connexions persistantes. Neon est facturé à l'heure de compute
