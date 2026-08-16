# Plan des tests de bout en bout

Ce document est un **plan**. La section « Les surfaces » décrit ce qui reste à écrire, pas ce qui existe. Il couvre le site public. L'Admin est hors périmètre : c'est la surface du Creator, il est le seul à l'utiliser et il voit ses pannes immédiatement.

Les décisions structurantes sont dans `docs/adr/0003`, `0004` et `0005`.

## Ce qui existe

Le niveau 1 est écrit, vingt quatre scénarios plus sept tests de préparation : `checkout`, `signup`, `signin`, `password-reset`, `account-deletion`, `http-contracts`, plus `seed.spec.ts` qui charge l'accueil connecté et sert de point de départ aux agents.

Du niveau 2, les trois surfaces de lecture sont écrites, onze scénarios : `home`, `memes-library` et `memes-category`. Les surfaces qui écrivent quelque chose, Export, Bookmark et Favorites, restent à faire, plus les Reels, la bannière de consentement et le rappel Premium, et le niveau 3 derrière.

## La règle

Passe en **e2e** ce qui traverse un navigateur et dont l'échec est visible par un Visitor.

Passe en **intégration** ce qui est asynchrone, payant à l'appel, ou dont l'assertion porte sur une donnée plutôt que sur un écran.

Cette règle exclut déjà, et volontairement, du périmètre e2e : les webhooks Stripe, la résiliation, le renouvellement, l'échec de paiement, le rate limiting, le contenu des e-mails, la réponse du modèle sur l'AiSearch, et les crons. Ces sujets constituent le cahier des charges des tests d'intégration, qui viennent dans un second temps.

## L'environnement

La suite a son propre environnement, `e2e`, au même rang que `development` et `production` : le fichier `.env.e2e`, le mode Vite `e2e`, l'hôte `127.0.0.1` et le port 3100. Le serveur de développement garde `localhost:3000` et n'est jamais touché, hôte différent donc cookies séparés.

`pnpm run test:e2e` migre, construit et sert la suite lui même, avec le preset Nitro `node-server` au lieu de `vercel`. Rien à démarrer à la main. En intégration continue le workflow fait les deux premières étapes dans ses propres étapes, et Playwright ne fait plus que servir.

Une pull request déclenche le workflow `e2e`, qui écrit `.env.e2e` depuis le secret `E2E_ENV_FILE`, migre, construit, puis lance la suite. Fusionner sur `main` exige trois checks verts, `lint`, `unit` et `e2e`, plus un déploiement de preview Vercel réussi, et un historique linéaire. Les administrateurs ne sont pas contraints : le passage en force reste possible, et conscient.

Les jobs portent trois noms distincts pour cette raison. Deux workflows avec un job nommé `test` donnaient un check requis qui ne disait pas lequel des deux il désignait.

| Ressource | Valeur dans l'environnement `e2e` |
|---|---|
| Base | branche Neon `test`, vidée à chaque run |
| Stripe | mode test, sans endpoint webhook |
| E-mails | tous redirigés par `EMAIL_OVERRIDE_TO` |
| Algolia | index propres à `e2e`, réécrits par le seed à chaque run |
| Bunny | library, collection et zone de stockage propres à `e2e`, écrites une fois |
| Sentry, rate limiting | inactifs, `VERCEL_ENV=development` |

**Aucune valeur de `.env.e2e` ne vaut celle de `.env.development`.** Un run doit être incapable d'atteindre une donnée de développement, et une variable oubliée doit pointer vers rien plutôt que vers quelque chose de réel.

Les ressources le sont : index Algolia, zone de stockage, bibliothèque et collection Bunny sont tous propres à `e2e`.

Trois valeurs restent partagées sans que cela pose problème. Les clés Stripe, parce qu'un compte Stripe n'a qu'un seul mode test. `BUNNY_STORAGE_HOSTNAME` et `VITE_ALGOLIA_APP_ID`, qui sont des points d'entrée de service et non des ressources. Et `TZ`, qui doit justement rester le même partout.

`VITE_ALGOLIA_SEARCH_KEY`, elle, est bien séparée, parce que c'est une clé et non un point d'entrée. Vérifiée depuis `.env.e2e` : elle lit `e2e_fr` et se fait refuser `development_fr`.

Le workflow applique les migrations sur la branche `test` avant de construire, ce qui fait qu'une migration cassée se voit en pull request et non après le déploiement.

La branche Neon se suspend après quelques minutes d'inactivité, et la première connexion expire pendant son réveil. La migration est donc rejouée une fois, et la chaîne de connexion porte un `connect_timeout` de trente secondes.

Ce filet n'attrape pas tout, et il y a deux `P1002` différents. Le réveil trop lent, qui se règle en relançant. Et le verrou consultatif, `Timed out trying to acquire a postgres advisory lock`, qui est structurel : `DATABASE_URL` désigne le point d'entrée `-pooler`, et `prisma migrate deploy` prend son verrou sur une session que PgBouncer partage et recycle. Deux tentatives de suite ont déjà échoué là dessus, puis la même commande est passée seule quelques minutes plus tard. La correction connue est une seconde URL, celle du point d'entrée direct, réservée aux migrations. Tant qu'elle n'existe pas, le job `e2e` d'une pull request peut échouer sans que rien ne soit cassé.

Les runs sont sérialisés par un groupe de concurrence GitHub, et la suite tourne sur un seul worker : la base est unique, deux tests qui écrivent en même temps se marcheraient dessus.

## Les données

Chaque run repart de zéro. Le projet `seed` tronque toutes les tables sauf l'historique des migrations, puis crée les Users déclarés dans `e2e/constants.ts`. Il ne touche à rien d'autre, ni Stripe, ni Algolia, ni Bunny. Le nettoyage a lieu **au début** du run, jamais à la fin, pour qu'un échec laisse un état inspectable.

Deux lignes protègent la base. `.env.e2e` est chargé en `override`, donc une variable exportée dans le terminal ne peut pas rediriger le seed, vérifié avec un `DATABASE_URL` hostile. Et la troncature elle même refuse de partir si le `DATABASE_URL` du processus n'est pas celui que le fichier déclare, garde posé contre la destruction et non au point d'appel. 

Le contenu vit dans `e2e/content.ts` : deux Categories et cinquante trois Memes. Cinq sont nommés et les tests les désignent par leur nom, le plus vu, la cible de recherche, un Meme anglais, un Universel et un publié récemment. Les quarante huit autres remplissent la liste, parce que la bibliothèque affiche trente Memes par page et qu'il en faut plus que ça pour avoir une deuxième page à visiter.

Deux Memes de remplissage sur trois sont Universels, et ce rapport est ce qui décide du sort du parcours anglais. La bibliothèque anglaise ne voit que les Memes anglais et universels : à ce compte elle en tient trente quatre, donc elle a sa deuxième page, alors qu'une proportion plus basse la laissait sous la barre des trente et rendait sa pagination intestable.

Les vues sont toutes distinctes, ce qui rend l'ordre déterministe sans avoir à semer de l'Activity : la première page de `trending` se rabat sur le nombre de vues quand aucun Event n'existe. Les dates de publication sont posées en jours avant le run, de sorte que la catégorie `news`, qui coupe à trente jours, contienne exactement trois Memes en français et deux en anglais. La date de création est celle de la publication, faute de quoi elle serait l'instant d'une insertion parallèle et l'index trié dessus n'aurait aucun ordre à offrir.

Ce déterminisme a une date de péremption. Une vue enregistrée sur une page Meme écrit une ligne `meme_view_daily`, et à partir de là la première page de `trending` sort du calcul pondéré et non plus des vues semées, avec un cache de douze heures posé dessus. Aucun test actuel n'ouvre une page Meme, donc rien ne bouge. Le premier qui le fera doit soit affirmer des ensembles et non des places, ce que font déjà les tests de pagination, soit passer avant ceux qui lisent `trending`. Un ordre qui dépend de l'ordre des tests est une régression, pas un réglage.

Le nombre de jours de la fenêtre `news` n'est pas recopié dans les tests : `e2e/content.ts` dérive la liste des Memes récents de `THIRTY_DAYS_MS`, la constante que l'application applique elle même. Décaler la fenêtre déplace les deux ensemble.

Le seed pousse ensuite ces Memes dans les index Algolia avec `replaceAllIndicesWithMemes`, le même chemin que la production. Ce n'est pas une commodité : hors de la première page de `trending`, la bibliothèque lit Algolia et jamais Postgres, donc un Meme resté en base seul est invisible pour presque toute la suite. `seed.spec.ts` affirme les deux chemins séparément pour cette raison.

Ce remplacement passe par un index temporaire et un déplacement, ce qui pose la question des replicas. Vérifié après un run, en interrogeant l'API Algolia : les six existent toujours, portent le même nombre d'enregistrements que leur primaire et ont gardé leur `attributesForFaceting`. Ce n'est pas une propriété qui se lit dans le dépôt, donc c'est une vérification à refaire le jour où une liste triée revient vide. Le seul reste possible est un index temporaire abandonné par un run interrompu.

Cette réécriture est aussi la seule dépense récurrente de la suite chez Algolia : quatre vingt sept enregistrements sur deux index par run, en opérations d'écriture. Le palier gratuit compte les requêtes de recherche, dix mille par mois, et celles ci n'en sont pas. L'application Algolia est partagée avec le développement, seuls les index diffèrent.

Bunny, lui, n'est jamais touché par le seed. La Video et son fichier watermarqué sont posés une fois et durent, ce qui est aussi la raison pour laquelle `E2E_VIDEO_BUNNY_ID` vit dans l'environnement et non dans les fixtures.

Un seul Meme semé, le plus vu, porte une Video qui existe vraiment. Tous les autres ont un `bunnyId` inventé, ce qui suffit pour une liste, un emplacement de miniature et une page, et jamais pour lire ou Exporter.

Un rôle par scénario qui laisse une marque sur son compte : partager un rôle entre un checkout et une suppression ferait dépendre le second de l'ordre du premier. Le rôle `unverified` porte `emailVerified: false`, ce qui est la seule chose que l'écran de connexion a à dire sur lui.

Un projet `auth` connecte ensuite chaque rôle vérifié par l'API HTTP et enregistre un `storageState`. Cette étape vaut vérification : si une ligne semée n'était pas celle que better-auth attend, la connexion échouerait. Un test qui aura besoin d'un compte jetable le créera avec sa propre adresse, sur le domaine `@e2e.petitmeme.invalid`.

## Les surfaces

### Niveau 1, l'argent et le compte

Ce niveau bloque une pull request. C'est ce qui coûte de l'argent ou un compte quand il casse.

**Checkout.** Écrit, mensuel et annuel. Depuis `/pricing`, jusqu'à la page Stripe en mode test, carte `4242`, retour. On affirme après la redirection : `/checkout/success` répond, la ligne `Subscription` porte `plan`, `status`, `billingInterval`, les deux identifiants Stripe et les deux dates de période, et la carte Premium apparaît comme le plan actif au rechargement. Reste à ajouter : la levée d'un plafond du plan gratuit, que les Memes semés rendent maintenant possible.

**Inscription.** Écrit. Formulaire du dialogue d'authentification, URL de vérification, compte connecté ensuite. Vérifie au passage que les champs déclarés à better-auth sont bien écrits, `providerAvatar`, les horodatages de consentement, la locale.

Le jeton de vérification n'est pas en base, contrairement à ce que ce plan a d'abord annoncé : better-auth le signe en JWT et n'écrit aucune ligne. Seul le jeton de réinitialisation laisse une ligne `verification`, dans son `identifier`. La suite forge donc le même JWT avec `BETTER_AUTH_SECRET` ; tout ce que l'URL déclenche ensuite est la vraie route.

Une adresse déjà prise reçoit exactement la même réponse qu'une adresse neuve, et rien n'est écrit. C'est `requireEmailVerification` qui l'obtient : better-auth renvoie un utilisateur synthétique et hache quand même le mot de passe pour aplatir le temps de réponse. Sans cela, le formulaire d'inscription deviendrait un moyen de demander si quelqu'un a un compte ici. Un test le garde.

**Connexion.** Écrit. Mot de passe correct, mot de passe faux, compte non vérifié. Les boutons Discord et Twitter sont vérifiés en présence et en cible : le run attend la requête vers l'écran du fournisseur, contrôle que son `redirect_uri` revient bien à notre callback, et l'avorte avant de partir.

**Réinitialisation de mot de passe.** Écrit. Demande, jeton lu en base, `/password/create-new`, sessions précédentes supprimées, connexion avec le nouveau mot de passe. La révocation est affirmée sur les lignes `session` et non sur un écran : le cache de session vit cinq minutes dans un cookie signé, donc pendant cinq minutes le navigateur se croit encore connecté.

**Suppression de compte.** Écrit. Depuis `/settings`, jusqu'à la disparition du compte et au refus de la connexion suivante.

**Contrats HTTP.** Écrit, sans navigateur : `/sitemap.xml` liste ses trois enfants, chacun est du XML, porte des entrées et ne place que des pages à nous dans ses `<loc>`, `/robots.txt` répond et renvoie vers le sitemap, `/health` répond, `/manifest.json` est du JSON valide, `/api/og` renvoie une image.

L'affirmation porte sur les `<loc>` et non sur le corps entier : `sitemap-memes.xml` publie volontairement une URL Bunny dans `video:content_loc`, c'est ce que Google lit pour indexer une vidéo. L'invariant est qu'une page n'est jamais une vidéo. Un sitemap vide rendrait cette affirmation vraie sans rien couvrir, donc le vide est un échec et non un cas prévu. C'est le contenu semé qui lui donne enfin de la matière.

### Niveau 2, le produit

Ces surfaces sont ouvertes à tout le monde, donc elles sont parcourues en Visitor anonyme. C'est la version la plus exigeante : ce qui passe sans compte passe avec.

**Accueil.** Écrit. Rend, affiche ses douze Memes, et les trois liens qui partent de là mènent où ils disent : le héros vers la bibliothèque et vers les plans, la section Mèmes vers la bibliothèque. L'annonce compte les Memes publiés dans les trente derniers jours et mène à la catégorie `news`.

Ces douze viennent de Recommend quand il a de quoi répondre, et du repli sur les vues les plus hautes sinon. Sur un index `e2e` sans Event, c'est toujours le repli, qui en rend douze exactement. Le jour où Recommend en renverrait moins, ce décompte tomberait sans qu'une régression soit en cause.

**Liste des Memes.** Écrit. `/memes` redirige vers `trending` et remplit une page de trente. Un mot tapé dans le champ de recherche réduit la liste à son seul Meme. La deuxième page est affirmée Meme par Meme, les vingt trois attendus présents et les trente de la première absents : un décompte seul serait vrai de n'importe quels vingt trois, alors que nommer les deux côtés de la coupe prouve qu'elle tombe là où la taille de page le dit. Décocher le français retire un Meme français, garde le Meme anglais, et laisse une page pleine, faute de quoi un filtre qui ne renvoie rien satisferait les deux premières.

Reste à ajouter : la vue en grille, dont le nombre de colonnes ne change ni les Memes ni leur ordre.

**Page Meme.** Le lecteur est monté, la source est signée, aucune URL de vidéo brute n'apparaît dans le DOM. Un test canonique, sur Chromium seulement, vérifie que la lecture démarre réellement. Partout ailleurs, les segments vidéo sont bloqués par `page.route`.

**Export.** Download produit un fichier non vide, ce qui attend la library Bunny `e2e`. Share déclenche l'intention de partage. Le plafond du plan gratuit s'applique, et le message qui l'explique s'affiche au lieu d'un bouton désactivé.

**Bookmark.** Ajout, retrait, persistance après rechargement, plafond du plan gratuit, absence de Bookmark pour un Visitor anonyme.

**Category.** Écrit. `/memes/category/$slug` rend et ne montre que les Memes de la Category, la liste des Categories emmène d'une Category à l'autre et le contenu suit, la catégorie `news` coupe à trente jours, et un slug qui n'existe pas répond 404 et non un écran 404 sous un statut valide.

**Reels et `/random`.** Répondent, affichent un Meme, la navigation suivante change de Meme. Les assertions s'arrêtent là, faute de pouvoir affirmer mieux sans devenir tautologiques.

**Favorites.** `/favorites` liste ce qui a été mis en Bookmark et pousse vers la connexion pour un Visitor anonyme.

**Bannière de consentement.** Apparaît à la première visite, ne bloque aucun clic, se referme, et le choix survit au rechargement. Commence par effacer le cookie que `fixtures.ts` pose.

**Rappel Premium.** Parle une fois, ne remplace pas un dialogue déjà ouvert, et accepte un refus. Commence par effacer la mise en sommeil que `fixtures.ts` écrit dans `localStorage`.

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

Trois conséquences sur l'application. Le dialogue d'authentification garde ses deux panneaux montés pour animer la hauteur, donc le panneau inactif porte `inert` : sans lui un lecteur d'écran voyait les deux formulaires, le clavier tabulait dans le formulaire invisible, et `getByRole('tabpanel')` désignait deux éléments. Une accroche a11y n'existe que si l'élément a un nom : un bouton sans libellé visible se règle par un vrai libellé, jamais par un identifiant de test. Et le bouton de lecture d'une carte de Meme portait un libellé lecteur d'écran écrit en anglais en dur ; il passe par `m` comme le reste. Son voisin, le bouton des options, porte encore le sien : aucun test ne s'en sert, donc il attend le sien plutôt que de voyager dans ce lot.

**Un nom accessible se compare par sous chaîne.** C'est le piège de cette suite, parce qu'il rend un test vert sans rien affirmer : chercher « 3 nouveaux mèmes » trouve « 53 nouveaux mèmes », et le titre du Meme de remplissage numéro 3 se trouve dans celui du numéro 31. Toute affirmation dont la valeur est le sujet du test porte donc `exact: true`, et `e2e/library.ts` le pose une fois pour toutes sur les liens de Meme.

Ce même fichier compte les Memes affichés par les boutons de lecture, un par carte et un seul, parce qu'une carte porte plusieurs liens vers le même Meme.

La bannière de consentement et le rappel Premium parlent d'eux mêmes, le second cinq secondes après l'arrivée sur une page `/memes`. Un dialogue qui s'ouvre au milieu d'un scénario vole le clic que ce scénario allait faire, donc `e2e/fixtures.ts` répond à la bannière par un cookie et met le rappel en sommeil par `localStorage`, pour tous les tests. Chacun garde le sien, qui commencera par défaire ce réglage.

Une page est rendue sur le serveur avant que React ne s'y attache, et Playwright ne voit pas la différence : un clic est perdu, et une valeur saisie est effacée quand l'hydratation restaure l'input contrôlé. `e2e/hydration.ts` porte les deux seuls signaux disponibles, `repeatUntilVisible` et `repeatUntilRequested`. Ils ne valent que pour la première action d'une page fraîchement chargée, et seulement quand la répéter est sans conséquence.

`timeout: 30_000` par test : au-delà, un test pend, il ne tourne plus. C'est un plafond serré, le checkout annuel mesure une vingtaine de secondes en local. `retries: 2` en intégration continue et `0` en local, ce qui sert aussi de coussin sur ce plafond, `trace: 'on-first-retry'`, `forbidOnly` quand `CI` est défini. Les artefacts ne partent qu'en cas d'échec, avec une rétention de trois jours, parce que le dépôt est public.

## Les agents

`playwright init-agents --loop=claude` a installé trois agents dans `.claude/agents/`, un planificateur, un générateur et un réparateur, plus le serveur MCP `playwright-test` dans `.mcp.json`. Le générateur exécute chaque étape dans un vrai navigateur avant d'écrire le test, ce qui donne des sélecteurs vérifiés plutôt que devinés.

Ils partent de `e2e/seed.spec.ts`, qui place le navigateur dans l'état commun à tous les scénarios : un User gratuit connecté, bannière de consentement déjà répondue. À ne pas confondre avec `e2e/seed.setup.ts`, qui prépare la base. Leurs plans intermédiaires vont dans `specs/`, ce document reste l'autorité sur le périmètre.

Un clone neuf n'a pas leur serveur MCP, qui vit dans `.mcp.json`, ignoré par git. Le rejouer : `pnpm exec playwright init-agents --loop=claude --project=chromium`.

## Ce qui reste à faire à la main

Ces étapes ne sont pas automatisables et appartiennent au Creator. Faites : l'endpoint webhook du mode test Stripe est désactivé, il ne livre plus sur la production ; `.env.e2e` est écrit et recopié dans le secret GitHub `E2E_ENV_FILE`.

Les deux clés Algolia sont restreintes à `e2e_*`, la clé de recherche et la clé d'administration. Un run lit `e2e_fr` et `e2e_en`, et se fait refuser `development_*` et `backup_*`.

La protection de `main` est active depuis le premier run vert.

Reste : écrire le workflow de smoke post-déploiement, qui couvre ce que le runner ne voit pas, l'adaptateur Vercel et le scope de variables de production.

Les index `e2e` sont configurés, primaires et replicas de tri, par `pnpm exec vite-node --mode e2e scripts/setup-algolia-indices.ts`. Cette commande est à rejouer chaque fois que les réglages d'index changent, et une replica standard n'hérite pas de `attributesForFaceting`, ce que ce dépôt a déjà payé une fois.

Un index créé par une simple écriture n'a aucun réglage, et Algolia ne le dit pas. Un filtre sur un attribut qui n'est pas dans `attributesForFaceting` ne lève rien, il renvoie zéro résultat. La bibliothèque filtre toujours sur `status`, donc tant que les réglages manquaient, elle était vide alors que les enregistrements étaient là et se trouvaient à la recherche libre. Une liste vide se lit comme un seed raté, jamais comme un index mal réglé.

La library Bunny Stream `e2e` et sa zone de stockage existent, et `public/videos/want-a-cookie.mp4` y est publiée sous `E2E_VIDEO_BUNNY_ID`. Sa version watermarquée est dans la zone, produite en local à partir du même fichier et avec la recette de `scripts/watermark-videos.ts` : ce script commence par télécharger `/original`, ce que le réglage ci dessous interdit, alors que la source était déjà dans le dépôt. Toutes les valeurs Bunny sont dans `.env.e2e`. Reste le réglage « Block Direct URL File Access » à désactiver sur la library.

`.env.e2e` a donc changé, et le secret `E2E_ENV_FILE` porte encore l'ancien. Tant qu'il n'est pas recopié, le job `e2e` d'une pull request s'arrête au chargement sur `E2E_VIDEO_BUNNY_ID`.

Ce réglage mérite d'être écrit, parce qu'il se rejoue à chaque library créée et qu'il ne se lit pas dans un message d'erreur. Il refuse toute requête sans en tête `Referer`, jeton ou pas : le même fichier répond 403 nu et 200 avec un référent quelconque. Un navigateur en envoie un, donc miniatures et lecture HLS marchent quand même, ce qui fait passer la library pour saine. Le serveur, lui, n'en envoie pas, et c'est lui qui va chercher `/original` pour l'Export d'un Premium et pour le Studio. La panne se voit donc uniquement là, et sur un chemin qui n'a rien à voir avec un réglage de CDN.

`e2e/env.ts` exige `BETTER_AUTH_SECRET`, pour forger le jeton de vérification, `VITE_BUNNY_HOSTNAME`, pour l'affirmation sur les sitemaps, et `E2E_VIDEO_BUNNY_ID`, l'unique Video des fixtures qui existe vraiment chez Bunny, en plus de `VITE_SITE_URL` et `DATABASE_URL`. Une clé qui manque casse le run au chargement, avec son nom dans le message. Le secret `E2E_ENV_FILE` doit donc les porter.

`E2E_VIDEO_BUNNY_ID` est dans l'environnement et non dans `e2e/content.ts` parce qu'il nomme une ressource de la library `e2e` : recréer la library lui donne un autre identifiant, alors que les fixtures, elles, ne bougent pas.
