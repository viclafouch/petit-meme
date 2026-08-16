# Plan des tests de bout en bout

Ce document est un **plan**. La section « Les surfaces » décrit ce qui reste à écrire, pas ce qui existe. Il couvre le site public. L'Admin est hors périmètre : c'est la surface du Creator, il est le seul à l'utiliser et il voit ses pannes immédiatement.

Les décisions structurantes sont dans `docs/adr/0003`, `0004` et `0005`.

## Ce qui existe

Le niveau 1 est écrit, vingt deux scénarios plus sept tests de préparation : `checkout`, `signup`, `signin`, `password-reset`, `account-deletion`, `http-contracts`, plus `seed.spec.ts` qui charge l'accueil connecté et sert de point de départ aux agents.

Les niveaux 2 et 3 attendent d'être écrits, surface par surface.

## La règle

Passe en **e2e** ce qui traverse un navigateur et dont l'échec est visible par un Visitor.

Passe en **intégration** ce qui est asynchrone, payant à l'appel, ou dont l'assertion porte sur une donnée plutôt que sur un écran.

Cette règle exclut déjà, et volontairement, du périmètre e2e : les webhooks Stripe, la résiliation, le renouvellement, l'échec de paiement, le rate limiting, le contenu des e-mails, la réponse du modèle sur l'AiSearch, et les crons. Ces sujets constituent le cahier des charges des tests d'intégration, qui viennent dans un second temps.

## L'environnement

La suite a son propre environnement, `e2e`, au même rang que `development` et `production` : le fichier `.env.e2e`, le mode Vite `e2e`, l'hôte `127.0.0.1` et le port 3100. Le serveur de développement garde `localhost:3000` et n'est jamais touché, hôte différent donc cookies séparés.

`pnpm run test:e2e` migre, construit et sert la suite lui même, avec le preset Nitro `node-server` au lieu de `vercel`. Rien à démarrer à la main. En intégration continue le workflow fait les deux premières étapes dans ses propres étapes, et Playwright ne fait plus que servir.

Une pull request déclenche le workflow `e2e`, qui écrit `.env.e2e` depuis le secret `E2E_ENV_FILE`, migre, construit, puis lance la suite. Le check sera requis pour fusionner sur `main` dès le premier run vert.

| Ressource | Valeur dans l'environnement `e2e` |
|---|---|
| Base | branche Neon `test`, vidée à chaque run |
| Stripe | mode test, sans endpoint webhook |
| E-mails | tous redirigés par `EMAIL_OVERRIDE_TO` |
| Algolia, Bunny | ressources propres à `e2e`, jamais écrites |
| Sentry, rate limiting | inactifs, `VERCEL_ENV=development` |

**Aucune valeur de `.env.e2e` ne vaut celle de `.env.development`.** Un run doit être incapable d'atteindre une donnée de développement, et une variable oubliée doit pointer vers rien plutôt que vers quelque chose de réel.

Les ressources le sont : index Algolia, zone de stockage, bibliothèque et collection Bunny sont tous propres à `e2e`.

Trois valeurs restent partagées sans que cela pose problème. Les clés Stripe, parce qu'un compte Stripe n'a qu'un seul mode test. `BUNNY_STORAGE_HOSTNAME` et `VITE_ALGOLIA_APP_ID`, qui sont des points d'entrée de service et non des ressources. Et `TZ`, qui doit justement rester le même partout.

Une reste à séparer : `VITE_ALGOLIA_SEARCH_KEY`. C'est une clé, pas un point d'entrée, et celle du développement porte les droits de lecture sur les index du développement. Une clé de recherche restreinte au seul index `e2e` se génère depuis le tableau de bord Algolia et ne coûte rien.

Le workflow applique les migrations sur la branche `test` avant de construire, ce qui fait qu'une migration cassée se voit en pull request et non après le déploiement.

La branche Neon se suspend après quelques minutes d'inactivité, et la première connexion expire pendant son réveil. La migration est donc rejouée une fois, et la chaîne de connexion porte un `connect_timeout` de trente secondes.

Les runs sont sérialisés par un groupe de concurrence GitHub, et la suite tourne sur un seul worker : la base est unique, deux tests qui écrivent en même temps se marcheraient dessus.

## Les données

Chaque run repart de zéro. Le projet `seed` tronque toutes les tables sauf l'historique des migrations, puis crée les Users déclarés dans `e2e/constants.ts`. Il ne touche à rien d'autre, ni Stripe, ni Algolia, ni Bunny. Le nettoyage a lieu **au début** du run, jamais à la fin, pour qu'un échec laisse un état inspectable.

Deux lignes protègent la base. `.env.e2e` est chargé en `override`, donc une variable exportée dans le terminal ne peut pas rediriger le seed, vérifié avec un `DATABASE_URL` hostile. Et la troncature elle même refuse de partir si le `DATABASE_URL` du processus n'est pas celui que le fichier déclare, garde posé contre la destruction et non au point d'appel. 

Le contenu, Memes et Categories, arrivera avec les tests qui en ont besoin, avec la vidéo Bunny et l'indexation Algolia que cela suppose. Rien n'est semé tant que rien ne le lit.

Un rôle par scénario qui laisse une marque sur son compte : partager un rôle entre un checkout et une suppression ferait dépendre le second de l'ordre du premier. Le rôle `unverified` porte `emailVerified: false`, ce qui est la seule chose que l'écran de connexion a à dire sur lui.

Un projet `auth` connecte ensuite chaque rôle vérifié par l'API HTTP et enregistre un `storageState`. Cette étape vaut vérification : si une ligne semée n'était pas celle que better-auth attend, la connexion échouerait. Un test qui aura besoin d'un compte jetable le créera avec sa propre adresse, sur le domaine `@e2e.petitmeme.invalid`.

## Les surfaces

### Niveau 1, l'argent et le compte

Ce niveau bloque une pull request. C'est ce qui coûte de l'argent ou un compte quand il casse.

**Checkout.** Écrit, mensuel et annuel. Depuis `/pricing`, jusqu'à la page Stripe en mode test, carte `4242`, retour. On affirme après la redirection : `/checkout/success` répond, la ligne `Subscription` porte `plan`, `status`, `billingInterval`, les deux identifiants Stripe et les deux dates de période, et la carte Premium apparaît comme le plan actif au rechargement. Reste à ajouter : la levée d'un plafond du plan gratuit, qui attend des Memes semés.

**Inscription.** Écrit. Formulaire du dialogue d'authentification, URL de vérification, compte connecté ensuite. Vérifie au passage que les champs déclarés à better-auth sont bien écrits, `providerAvatar`, les horodatages de consentement, la locale.

Le jeton de vérification n'est pas en base, contrairement à ce que ce plan a d'abord annoncé : better-auth le signe en JWT et n'écrit aucune ligne. Seul le jeton de réinitialisation laisse une ligne `verification`, dans son `identifier`. La suite forge donc le même JWT avec `BETTER_AUTH_SECRET` ; tout ce que l'URL déclenche ensuite est la vraie route.

Une adresse déjà prise reçoit exactement la même réponse qu'une adresse neuve, et rien n'est écrit. C'est `requireEmailVerification` qui l'obtient : better-auth renvoie un utilisateur synthétique et hache quand même le mot de passe pour aplatir le temps de réponse. Sans cela, le formulaire d'inscription deviendrait un moyen de demander si quelqu'un a un compte ici. Un test le garde.

**Connexion.** Écrit. Mot de passe correct, mot de passe faux, compte non vérifié. Les boutons Discord et Twitter sont vérifiés en présence et en cible : le run attend la requête vers l'écran du fournisseur, contrôle que son `redirect_uri` revient bien à notre callback, et l'avorte avant de partir.

**Réinitialisation de mot de passe.** Écrit. Demande, jeton lu en base, `/password/create-new`, sessions précédentes supprimées, connexion avec le nouveau mot de passe. La révocation est affirmée sur les lignes `session` et non sur un écran : le cache de session vit cinq minutes dans un cookie signé, donc pendant cinq minutes le navigateur se croit encore connecté.

**Suppression de compte.** Écrit. Depuis `/settings`, jusqu'à la disparition du compte et au refus de la connexion suivante.

**Contrats HTTP.** Écrit, sans navigateur : `/sitemap.xml` liste ses trois enfants, chacun est du XML et ne place que des pages à nous dans ses `<loc>`, `/robots.txt` répond et renvoie vers le sitemap, `/health` répond, `/manifest.json` est du JSON valide, `/api/og` renvoie une image.

L'affirmation porte sur les `<loc>` et non sur le corps entier : `sitemap-memes.xml` publie volontairement une URL Bunny dans `video:content_loc`, c'est ce que Google lit pour indexer une vidéo. L'invariant est qu'une page n'est jamais une vidéo. Tant qu'aucun Meme n'est semé, cette affirmation est vraie sans rien couvrir.

### Niveau 2, le produit

**Accueil.** Rend, affiche des Memes, les liens principaux mènent où ils disent.

**Liste des Memes.** `/memes` rend, la recherche renvoie des résultats cohérents avec les fixtures, les filtres et la pagination changent le contenu.

**Page Meme.** Le lecteur est monté, la source est signée, aucune URL de vidéo brute n'apparaît dans le DOM. Un test canonique, sur Chromium seulement, vérifie que la lecture démarre réellement. Partout ailleurs, les segments vidéo sont bloqués par `page.route`.

**Export.** Download produit un fichier non vide. Share déclenche l'intention de partage. Le plafond du plan gratuit s'applique, et le message qui l'explique s'affiche au lieu d'un bouton désactivé.

**Bookmark.** Ajout, retrait, persistance après rechargement, plafond du plan gratuit, absence de Bookmark pour un Visitor anonyme.

**Category.** `/memes/category/$slug` rend et ne montre que les Memes de la Category.

**Reels et `/random`.** Répondent, affichent un Meme, la navigation suivante change de Meme. Les assertions s'arrêtent là, faute de pouvoir affirmer mieux sans devenir tautologiques.

**Favorites.** `/favorites` liste ce qui a été mis en Bookmark et pousse vers la connexion pour un Visitor anonyme.

**Bannière de consentement.** Apparaît à la première visite, ne bloque aucun clic, se referme, et le choix survit au rechargement.

**Rappel Premium.** Parle une fois, ne remplace pas un dialogue déjà ouvert, et accepte un refus.

### Niveau 3, le reste

**Studio et Generation.** Sur Chromium, une génération complète à partir d'un Meme fixture court, jusqu'au téléchargement du fichier. Sous WebKit, ouverture du Studio et présence de l'aperçu seulement. Les plafonds et la porte Premium se testent sans transcoder.

**Submission.** Envoi d'un lien, apparition dans l'historique, refus d'un lien invalide.

**Settings.** Choix d'un AvatarSlot, retour à l'Avatar du fournisseur, changement de mot de passe, et pour un Premium le lien du portail de facturation qui renvoie une URL Stripe pour le bon client. Le portail lui-même n'est pas traversé.

**AiSearch.** La porte seulement : Visitor anonyme, User gratuit avec son quota, quota épuisé. Le modèle n'est jamais appelé.

**Pages légales.** `/dmca`, `/mentions-legales`, `/privacy`, `/terms-of-use` répondent dans les deux locales, et la mention d'attribution du style d'avatar est présente.

**Parcours EN.** Le routage `/en/` et les métadonnées de chaque type de page, plus le parcours de checkout en entier, parce que les montants et les e-mails y sont localisés.

## L'exécution

Chromium seulement pour l'instant. WebKit sur format iPhone arrive avec le premier test qui a quelque chose à dire sur Safari, pas avant : un navigateur de plus se télécharge à chaque run.

Les fichiers e2e portent l'extension `.spec.ts`, ce qui les distingue des `.test.ts` de Vitest, pour oxlint comme pour les règles d'écriture des tests.

Les points d'accroche sont des rôles et des noms accessibles, jamais des `data-testid`. Un test nomme ce qu'il clique comme un lecteur d'écran l'annonce, ce qui le fait échouer quand l'accessibilité casse. La seule exception est la page Stripe, dont les identifiants ne nous appartiennent pas.

Le nom vient de l'application, pas d'une copie : `e2e/messages.ts` fixe la locale du résolveur avec `overwriteGetLocale` puis réexporte `m`, et un test écrit `getByRole('button', { name: m.nav_sign_in() })`. Le site est bilingue et une locale ne décide pas si un test passe, elle décide seulement quelle chaîne est demandée. Le parcours EN sera le même code avec une autre locale.

Deux conséquences sur l'application. Le dialogue d'authentification garde ses deux panneaux montés pour animer la hauteur, donc le panneau inactif porte `inert` : sans lui un lecteur d'écran voyait les deux formulaires, le clavier tabulait dans le formulaire invisible, et `getByRole('tabpanel')` désignait deux éléments. Et une accroche a11y n'existe que si l'élément a un nom : un bouton sans libellé visible se règle par un vrai libellé, jamais par un identifiant de test.

Une page est rendue sur le serveur avant que React ne s'y attache, et Playwright ne voit pas la différence : un clic est perdu, et une valeur saisie est effacée quand l'hydratation restaure l'input contrôlé. `e2e/hydration.ts` porte les deux seuls signaux disponibles, `repeatUntilVisible` et `repeatUntilRequested`. Ils ne valent que pour la première action d'une page fraîchement chargée, et seulement quand la répéter est sans conséquence.

`timeout: 30_000` par test : au-delà, un test pend, il ne tourne plus. C'est un plafond serré, le checkout annuel mesure une vingtaine de secondes en local. `retries: 2` en intégration continue et `0` en local, ce qui sert aussi de coussin sur ce plafond, `trace: 'on-first-retry'`, `forbidOnly` quand `CI` est défini. Les artefacts ne partent qu'en cas d'échec, avec une rétention de trois jours, parce que le dépôt est public.

## Les agents

`playwright init-agents --loop=claude` a installé trois agents dans `.claude/agents/`, un planificateur, un générateur et un réparateur, plus le serveur MCP `playwright-test` dans `.mcp.json`. Le générateur exécute chaque étape dans un vrai navigateur avant d'écrire le test, ce qui donne des sélecteurs vérifiés plutôt que devinés.

Ils partent de `e2e/seed.spec.ts`, qui place le navigateur dans l'état commun à tous les scénarios : un User gratuit connecté, bannière de consentement déjà répondue. À ne pas confondre avec `e2e/seed.setup.ts`, qui prépare la base. Leurs plans intermédiaires vont dans `specs/`, ce document reste l'autorité sur le périmètre.

Un clone neuf n'a pas leur serveur MCP, qui vit dans `.mcp.json`, ignoré par git. Le rejouer : `pnpm exec playwright init-agents --loop=claude --project=chromium`.

## Ce qui reste à faire à la main

Ces étapes ne sont pas automatisables et appartiennent au Creator. Faites : l'endpoint webhook du mode test Stripe est désactivé, il ne livre plus sur la production ; `.env.e2e` est écrit et recopié dans le secret GitHub `E2E_ENV_FILE`.

Restent : générer une clé de recherche Algolia restreinte au seul index `e2e`, parce que `VITE_ALGOLIA_SEARCH_KEY` vaut encore celle du développement et donne donc à un run l'accès en lecture aux index du développement ; écrire le workflow de smoke post-déploiement ; activer la protection de branche sur `main` dès le premier run vert.

`e2e/env.ts` exige `BETTER_AUTH_SECRET`, pour forger le jeton de vérification, et `VITE_BUNNY_HOSTNAME`, pour l'affirmation sur les sitemaps, en plus de `VITE_SITE_URL` et `DATABASE_URL`. Une clé qui manque casse le run au chargement, avec son nom dans le message. Le secret `E2E_ENV_FILE` doit donc les porter.
