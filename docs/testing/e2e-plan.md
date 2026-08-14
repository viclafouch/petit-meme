# Plan des tests de bout en bout

Ce document est un **plan**. La section « Les surfaces » décrit ce qui reste à écrire, pas ce qui existe. Il couvre le site public. L'Admin est hors périmètre : c'est la surface du Creator, il est le seul à l'utiliser et il voit ses pannes immédiatement.

Les décisions structurantes sont dans `docs/adr/0003`, `0004` et `0005`.

## Ce qui existe

Deux tests. `e2e/checkout.spec.ts` traverse le checkout Stripe en mode test et vérifie la ligne `Subscription` écrite au retour. `e2e/seed.spec.ts` charge l'accueil connecté et sert de point de départ aux agents.

Le reste du plan attend d'être écrit, surface par surface, dans l'ordre des niveaux.

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
| Algolia, Bunny | recopiés de `development`, jamais écrits |
| Sentry, rate limiting | inactifs, `VERCEL_ENV=development` |

Le workflow applique les migrations sur la branche `test` avant de construire, ce qui fait qu'une migration cassée se voit en pull request et non après le déploiement.

Les runs sont sérialisés par un groupe de concurrence GitHub, et la suite tourne sur un seul worker : la base est unique, deux tests qui écrivent en même temps se marcheraient dessus.

## Les données

Chaque run repart de zéro. Le projet `seed` tronque toutes les tables sauf l'historique des migrations, supprime les clients Stripe des adresses de fixture, puis crée les Users déclarés dans `e2e/constants.ts`. Le nettoyage a lieu **au début** du run, jamais à la fin, pour qu'un échec laisse un état inspectable.

Deux lignes protègent la base. `.env.e2e` est chargé en `override`, donc une variable exportée dans le terminal ne peut pas rediriger le seed, vérifié avec un `DATABASE_URL` hostile. Et la troncature elle même refuse de partir si le `DATABASE_URL` du processus n'est pas celui que le fichier déclare, garde posé contre la destruction et non au point d'appel. La suppression des clients Stripe vise les adresses de fixture une par une, jamais le compte entier.

Le contenu, Memes et Categories, arrivera avec les tests qui en ont besoin, avec la vidéo Bunny et l'indexation Algolia que cela suppose. Rien n'est semé tant que rien ne le lit.

Un projet `auth` connecte ensuite chaque rôle par l'API HTTP et enregistre un `storageState`. Cette étape vaut vérification : si une ligne semée n'était pas celle que better-auth attend, la connexion échouerait. Un test qui aura besoin d'un compte jetable le créera avec sa propre adresse, sur le domaine `@e2e.petitmeme.invalid`.

## Les surfaces

### Niveau 1, l'argent et le compte

Ce niveau bloque une pull request. C'est ce qui coûte de l'argent ou un compte quand il casse.

**Checkout.** Écrit. Depuis `/pricing`, jusqu'à la page Stripe en mode test, carte `4242`, retour. On affirme après la redirection : `/checkout/success` répond, la ligne `Subscription` porte `plan`, `status`, `billingInterval`, les deux identifiants Stripe et les deux dates de période, et la carte Premium apparaît comme le plan actif au rechargement. Restent à ajouter : l'abonnement annuel et la levée d'un plafond du plan gratuit.

**Inscription.** Formulaire du dialogue d'authentification, jeton lu dans la table `verification` pour construire l'URL de vérification, compte utilisable ensuite. Vérifie au passage que les champs déclarés à better-auth sont bien écrits, `providerAvatar`, les horodatages de consentement, la locale.

**Connexion.** Mot de passe correct, mot de passe faux, compte non vérifié. Les boutons Discord et Twitter sont vérifiés en présence et en cible, jamais traversés.

**Réinitialisation de mot de passe.** Demande, jeton lu en base, `/password/create-new`, connexion avec le nouveau mot de passe, sessions précédentes révoquées.

**Suppression de compte.** Depuis `/settings`, jusqu'à la disparition du compte et l'impossibilité de se reconnecter.

**Contrats HTTP.** Sans navigateur : `/sitemap.xml` et ses trois enfants sont du XML valide et ne contiennent aucune URL de vidéo, `/robots.txt` répond, `/health` répond, `/manifest.json` est du JSON valide, `/api/og` renvoie une image.

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

Les points d'accroche sont des `data-testid`, et non des rôles nommés par leur texte : le site est bilingue, une locale ne doit pas décider si un test passe.

`retries: 2` en intégration continue et `0` en local, `trace: 'on-first-retry'`, `forbidOnly` quand `CI` est défini. Les artefacts ne partent qu'en cas d'échec, avec une rétention de trois jours, parce que le dépôt est public.

## Les agents

`playwright init-agents --loop=claude` a installé trois agents dans `.claude/agents/`, un planificateur, un générateur et un réparateur, plus le serveur MCP `playwright-test` dans `.mcp.json`. Le générateur exécute chaque étape dans un vrai navigateur avant d'écrire le test, ce qui donne des sélecteurs vérifiés plutôt que devinés.

Ils partent de `e2e/seed.spec.ts`, qui place le navigateur dans l'état commun à tous les scénarios : un User gratuit connecté, bannière de consentement déjà répondue. À ne pas confondre avec `e2e/seed.setup.ts`, qui prépare la base. Leurs plans intermédiaires vont dans `specs/`, ce document reste l'autorité sur le périmètre.

Un clone neuf n'a pas leur serveur MCP, qui vit dans `.mcp.json`, ignoré par git. Le rejouer : `pnpm exec playwright init-agents --loop=claude --project=chromium`.

## Ce qui reste à faire à la main

Ces étapes ne sont pas automatisables et appartiennent au Creator : désactiver l'endpoint webhook du mode test Stripe, qui livre aujourd'hui sur la production, écrire `.env.e2e` et le recopier dans le secret GitHub `E2E_ENV_FILE`, écrire le workflow de smoke post-déploiement, puis activer la protection de branche sur `main`.
