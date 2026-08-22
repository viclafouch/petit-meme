# Plan des tests de bout en bout

Ce document est un **plan**. La section « Les surfaces » décrit ce qui reste à écrire, pas ce qui existe. Il couvre le site public. L'Admin est hors périmètre : c'est la surface du Creator, il est le seul à l'utiliser et il voit ses pannes immédiatement.

Les décisions structurantes sont dans `docs/adr/0003`, `0004` et `0005`.

## Ce qui existe

Le niveau 1 est écrit, vingt quatre scénarios plus sept tests de préparation : `checkout`, `signup`, `signin`, `password-reset`, `account-deletion`, `http-contracts`, plus `seed.spec.ts` qui charge l'accueil connecté et sert de point de départ aux agents.

Le niveau 2 est écrit en entier, onze surfaces et trente et un scénarios : les quatre de lecture, `home`, `memes-library`, `memes-category` et `memes-page`, les trois qui écrivent, `meme-export`, `bookmark` et `favorites`, les deux qui parlent d'eux mêmes, `consent-banner` et `premium-reminder`, puis les deux qui tirent au sort, `reels` et `random`.

Du niveau 3, quatre surfaces sont ouvertes. `studio`, deux scénarios : sa génération complète est écrite puis retirée, et la section qui la porte dit pourquoi. `settings`, dix scénarios, la page entière. `legal-pages`, dix scénarios, les quatre pages dans les deux locales. `ai-search`, six scénarios, les portes, les deux plans et les deux façons dont une recherche ne rend rien. Restent la Submission et le parcours EN.

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
| Anthropic, Gemini | clés mortes, l'appel échoue et l'AiSearch retombe sur le prompt brut |
| Sentry, rate limiting | inactifs, `VERCEL_ENV=development` |

**Aucune valeur de `.env.e2e` ne vaut celle de `.env.development`.** Un run doit être incapable d'atteindre une donnée de développement, et une variable oubliée doit pointer vers rien plutôt que vers quelque chose de réel.

Les ressources le sont : index Algolia, zone de stockage, bibliothèque et collection Bunny sont tous propres à `e2e`.

Trois valeurs restent partagées sans que cela pose problème. Les clés Stripe, parce qu'un compte Stripe n'a qu'un seul mode test. `BUNNY_STORAGE_HOSTNAME` et `VITE_ALGOLIA_APP_ID`, qui sont des points d'entrée de service et non des ressources. Et `TZ`, qui doit justement rester le même partout.

`VITE_ALGOLIA_SEARCH_KEY`, elle, est bien séparée, parce que c'est une clé et non un point d'entrée. Vérifiée depuis `.env.e2e` : elle lit `e2e_fr` et se fait refuser `development_fr`.

Le workflow applique les migrations sur la branche `test` avant de construire, ce qui fait qu'une migration cassée se voit en pull request et non après le déploiement.

La branche Neon se suspend après quelques minutes d'inactivité, et la première connexion expire pendant son réveil. La migration est donc rejouée une fois, et la chaîne de connexion porte un `connect_timeout` de trente secondes.

Cette migration ne passe pas par le pooler, et c'est `DIRECT_URL` qui l'y emmène, l'hôte Neon sans le suffixe `-pooler`. L'application, elle, garde `DATABASE_URL`. Prisma pose un verrou d'avis de **session** le temps de migrer ; le PgBouncer que Neon met devant son Postgres tourne en `pool_mode=transaction`, mode dans lequel le `DISCARD ALL` de remise à zéro n'est jamais joué. Le backend retourne au pool en gardant le verrou, et toutes les migrations suivantes expirent dessus, dix secondes chacune, avec un `P1002` qui accuse la base d'être injoignable alors qu'elle répond. `docs/research/prisma-advisory-lock-neon.md` porte les sources.

Un verrou déjà échoué ne se libère pas en changeant d'URL : seul `pg_terminate_backend` sur le détenteur, un redémarrage du calcul ou cinq minutes de veille y arrivent. La requête de diagnostic est dans le document de recherche. Et en dépannage, `CI=1` fait servir la suite sans migrer, ce qui est exactement ce que fait l'intégration continue.

Les runs sont sérialisés par un groupe de concurrence GitHub, et la suite tourne sur un seul worker : la base est unique, deux tests qui écrivent en même temps se marcheraient dessus.

Ce groupe est global et non par branche, pour cette raison même, et il annule ce qu'il remplace. Deux pushs à une minute d'intervalle donnent donc un seul run, le dernier, reparti de zéro : la suite resème la base à chaque fois, il n'y a rien à reprendre. Un run tué en cours peut laisser un index Algolia temporaire derrière lui, que le seed suivant remplace. La contrepartie est le prix du groupe global : un push sur une autre branche annule le run en cours, et le remettre en marche est un `gh run rerun`.

## Les données

Chaque run repart de zéro. Le projet `seed` tronque toutes les tables sauf l'historique des migrations, puis crée les Users déclarés dans `e2e/constants.ts`. Cette troncature ne touche à rien d'autre, ni Stripe, ni Algolia, ni Bunny. Le nettoyage a lieu **au début** du run, jamais à la fin, pour qu'un échec laisse un état inspectable.

Le seed écrit par paquets de la taille du pool, et pas d'un seul `Promise.all`. Chaque création imbrique ses relations, donc Prisma la passe en transaction, donc elle tient une connexion pour toute sa durée. Cinquante trois demandes d'un coup en laissent quarante huit en file sur un pool de cinq, et cette attente dépasse les cinq secondes d'acquisition dès que le processus est plus loin de la base qu'un poste de travail. En local ça passait, en intégration continue non, et c'est le premier run CI à semer des Memes qui l'a dit. La taille du pool est exportée par `src/db`, pour que le seed ne puisse pas diverger de la valeur réelle.

Deux lignes protègent la base. `.env.e2e` est chargé en `override`, donc une variable exportée dans le terminal ne peut pas rediriger le seed, vérifié avec un `DATABASE_URL` hostile. Et la troncature elle même refuse de partir si le `DATABASE_URL` du processus n'est pas celui que le fichier déclare, garde posé contre la destruction et non au point d'appel. 

Le contenu vit dans `e2e/content.ts` : deux Categories et cinquante trois Memes. Cinq sont nommés et les tests les désignent par leur nom, le plus vu, la cible de recherche, un Meme anglais, un Universel et un publié récemment. Les quarante huit autres remplissent la liste, parce que la bibliothèque affiche trente Memes par page et qu'il en faut plus que ça pour avoir une deuxième page à visiter.

Deux Memes de remplissage sur trois sont Universels, et ce rapport est ce qui décide du sort du parcours anglais. La bibliothèque anglaise ne voit que les Memes anglais et universels : à ce compte elle en tient trente quatre, donc elle a sa deuxième page, alors qu'une proportion plus basse la laissait sous la barre des trente et rendait sa pagination intestable.

Les vues sont toutes distinctes, ce qui rend l'ordre déterministe sans avoir à semer de l'Activity : la première page de `trending` se rabat sur le nombre de vues quand aucun Event n'existe. Les dates de publication sont posées en jours avant le run, de sorte que la catégorie `news`, qui coupe à trente jours, contienne exactement trois Memes en français et deux en anglais. La date de création est celle de la publication, faute de quoi elle serait l'instant d'une insertion parallèle et l'index trié dessus n'aurait aucun ordre à offrir.

Ce déterminisme a une date de péremption. Une vue enregistrée sur une page Meme écrit une ligne `meme_view_daily`, incrémente le `viewCount` du Meme une fois par visiteur et par jour, et fait sortir la première page de `trending` du repli sur les vues semées : elle vient alors du calcul pondéré, avec un cache de douze heures posé dessus.

La vue n'est pas seule dans ce calcul : un Bookmark, un téléchargement et un partage y pèsent aussi, chacun sur une fenêtre de sept jours. **Tout test qui laisse un de ces signaux le laisse donc sur le Meme le plus vu**, celui qui occupe déjà la première place au compteur. Le calcul pondéré le remet en tête et complète par les vues, donc la première page de `trending` garde le même ensemble et le même ordre. C'est cette propriété qui protège les autres tests, pas l'ordre des fichiers, et un ordre qui dépend de l'ordre des tests est une régression, pas un réglage.

Un Bookmark semé, lui, n'a pas cette échappatoire : vingt deux Bookmarks posés sur des Memes de remplissage décideraient de la première page de `trending` avant qu'un seul test ait tourné. Le seed les date donc hors de la fenêtre, un jour au-delà de `TRENDING_CATEGORY_DAYS`, constante lue chez l'application.

Le corollaire tient en une ligne : aucun test n'affirme le nombre de vues affiché sur une page Meme, puisqu'il vaut la valeur semée ou celle-ci plus un selon ce qui a déjà tourné.

Le nombre de jours de la fenêtre `news` n'est pas recopié dans les tests : `e2e/content.ts` dérive la liste des Memes récents de `THIRTY_DAYS_MS`, la constante que l'application applique elle même. Décaler la fenêtre déplace les deux ensemble.

Le seed pousse ensuite ces Memes dans les index Algolia avec `replaceAllIndicesWithMemes`, le même chemin que la production. Ce n'est pas une commodité : hors de la première page de `trending`, la bibliothèque lit Algolia et jamais Postgres, donc un Meme resté en base seul est invisible pour presque toute la suite. `seed.spec.ts` affirme les deux chemins séparément pour cette raison.

Ce remplacement passe par un index temporaire et un déplacement, ce qui pose la question des replicas. Vérifié après un run, en interrogeant l'API Algolia : les six existent toujours, portent le même nombre d'enregistrements que leur primaire et ont gardé leur `attributesForFaceting`. Ce n'est pas une propriété qui se lit dans le dépôt, donc c'est une vérification à refaire le jour où une liste triée revient vide. Le seul reste possible est un index temporaire abandonné par un run interrompu.

Cette réécriture est aussi la seule dépense récurrente de la suite chez Algolia : quatre vingt sept enregistrements sur deux index par run, en opérations d'écriture. Le palier gratuit compte les requêtes de recherche, dix mille par mois, et celles ci n'en sont pas. L'application Algolia est partagée avec le développement, seuls les index diffèrent.

Bunny, lui, n'est jamais touché par le seed. La Video et son fichier watermarqué sont posés une fois et durent, ce qui est aussi la raison pour laquelle `E2E_VIDEO_BUNNY_ID` vit dans l'environnement et non dans les fixtures.

Un seul Meme semé, le plus vu, porte une Video qui existe vraiment. Tous les autres ont un `bunnyId` inventé, ce qui suffit pour une liste, un emplacement de miniature et une page, et jamais pour lire ou Exporter.

Un rôle par scénario qui laisse une marque sur son compte : partager un rôle entre un checkout et une suppression ferait dépendre le second de l'ordre du premier. Le rôle `unverified` porte `emailVerified: false`, ce qui est la seule chose que l'écran de connexion a à dire sur lui.

Un rôle peut naître avec un état, déclaré à côté de lui dans `e2e/constants.ts` et posé par le seed. `premium` porte une ligne `subscription` active, écrite en base et non passée par Stripe : `listActiveSubscriptions` de better-auth ne lit que cette table, donc un abonnement semé suffit à ouvrir l'Export sans filigrane. Il n'a ni client ni abonnement Stripe, faute de quoi la suite promènerait des identifiants qui ne désignent rien.

Ce jour est venu avec le portail de facturation, et c'est `billingPortal` qui le porte, seul rôle à naître avec un vrai client Stripe. Le seed le crée en mode test, puis pose son identifiant sur le User et sur la ligne `subscription`, les deux endroits où better-auth le cherche, dans cet ordre. C'est le seul appel Stripe du seed.

`bookmarkCapped` et `checkout` portent les vingt Bookmarks du plafond gratuit, l'un pour se voir refuser le suivant et l'autre pour l'obtenir en payant, et `favorites` en porte deux, nommés. `aiSearchCapped` et `aiSearchPremium` portent de la même façon les trois recherches IA du mois. `avatarProvider` porte un ProviderAvatar, seule façon de voir la tuile qui y ramène : c'est un fichier de `public/`, pour que la tuile s'affiche sans partir chez un fournisseur, et jamais un chemin du catalogue, que le sélecteur confondrait avec un AvatarSlot.

Un projet `auth` connecte ensuite chaque rôle vérifié par l'API HTTP et enregistre un `storageState`. Cette étape vaut vérification : si une ligne semée n'était pas celle que better-auth attend, la connexion échouerait. Un test qui aura besoin d'un compte jetable le créera avec sa propre adresse, sur le domaine `@e2e.petitmeme.invalid`.

## Les surfaces

### Niveau 1, l'argent et le compte

Ce niveau bloque une pull request. C'est ce qui coûte de l'argent ou un compte quand il casse.

**Checkout.** Écrit, mensuel et annuel. Depuis `/pricing`, jusqu'à la page Stripe en mode test, carte `4242`, retour. On affirme après la redirection : `/checkout/success` répond, la ligne `Subscription` porte `plan`, `status`, `billingInterval`, les deux identifiants Stripe et les deux dates de période, et la carte Premium apparaît comme le plan actif au rechargement.

Le scénario mensuel va une étape plus loin et prend un Bookmark. Le rôle est semé au plafond du plan gratuit, vingt Bookmarks, et le vingt et unième dit que le paiement a changé le produit et pas seulement une ligne. Il est pris sur le Meme le plus vu, seul endroit où un signal frais ne déplace pas la première page de `trending`. C'est le scénario le plus long de la suite, un paiement, sa redirection et une écriture derrière, donc le seul à porter `test.slow()`.

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

Passer la grille de cinq à six colonnes ne change ni les Memes ni leur ordre. La liste attendue est lue à l'écran avant le clic et non dans les fixtures : le sujet est ce que la grille fait de la liste qu'on lui a donnée, pas l'ordre dans lequel on la lui a donnée. Et c'est l'interrupteur coché qui prouve que le clic a porté, faute de quoi un clic perdu rendrait les deux listes identiques sans rien affirmer.

**Page Meme.** Écrit. La page répond, porte son titre en `h1`, sa description et son badge de langue, et le retour mène à la bibliothèque. Le lecteur porte la miniature de la Video du Meme, et la lecture démarre vraiment : le nom accessible de la surface de lecture passe de « Lire la vidéo » à « Mettre en pause », et le `currentTime` de la vidéo avance.

Cette lecture part toute seule, et le test ne clique rien. Playwright ne pose aucun `--autoplay-policy`, donc c'est la règle de Chrome qui décide, et elle laisse passer une vidéo sans piste audio comme si elle était `muted` : `want-a-cookie.mp4` n'en a pas. Cliquer la surface de lecture serait une course perdue d'avance, entre l'autoplay et le clic, et le nom du bouton bascule au milieu. Un Meme sonore, lui, serait bloqué, et ce test là ne serait plus le même.

Un seul Meme est jouable, le plus vu, le seul dont la Video existe chez Bunny, et le clip dure six secondes. Rien n'est bloqué par `page.route`, il n'y a pas de quoi.

Deux affirmations que ce plan annonçait ici ont été retirées, le code dit autre chose. La source n'est pas signée : la page charge un `playlist.m3u8` nu, et la signature de cinq minutes ne sert qu'au serveur, pour l'Export, le Studio, l'AiSearch et le watermark. Et l'URL `/original` est bien dans le DOM, dans le `VideoObject` du JSON-LD, du même geste délibéré que `video:content_loc` dans `sitemap-memes.xml`. L'invariant « une page n'est jamais une vidéo » reste porté par `http-contracts`, et par lui seul.

Un `<video>` n'a pas de rôle ARIA, et « Lire la vidéo » nomme aussi les boutons des cartes. Ce test est donc le seul à délimiter sa cible par un nom d'élément, `media-controller`. C'est le nom du composant du lecteur, pas un identifiant de test.

**Export.** Écrit. Un Premium clique Télécharger et repart avec un fichier non vide, sans qu'on lui demande rien. Un User gratuit clique le même bouton et reçoit le dialogue du filigrane, qui vend Premium et lui laisse quand même le fichier watermarqué : la porte explique, elle ne ferme pas.

Share n'est pas testé, et ce n'est pas un oubli. Le bouton est `md:hidden`, donc absent du format desktop, et `navigator.share` n'existe pas dans un Chromium de runner. Le tester demanderait un faux `navigator.share`, c'est à dire un mock, ce que cette suite ne fait pas. Il attend le format téléphone.

**Bookmark.** Écrit. Un User ajoute un Bookmark, le retrouve après un rechargement, et le retire. Un User au plafond du plan gratuit se voit refuser le suivant et le sait par un message. Un Visitor anonyme, lui, reçoit le dialogue de connexion.

Deux détails de ce scénario méritent d'être écrits. Le clic passe par `repeatUntilVisible` et le rechargement attend la réponse du serveur : l'écran bascule sur la mise à jour optimiste avant que le serveur ait répondu, et recharger à cet instant coupe la requête en vol. Cette réponse se reconnaît à sa méthode et à `/_serverFn/`, jamais à son nom, parce que l'URL d'une fonction serveur porte une empreinte de son corps et rien de lisible. `e2e/server-functions.ts` la reconnaît une fois pour toute la suite, ici et sur le Bookmark du checkout.

Et le message du plafond n'est pas celui que le produit croit afficher. Le serveur refuse par un `StudioError` de code `PREMIUM_REQUIRED` sous un 403, mais le client ne le relit pas et retombe sur son message générique, « Erreur lors de la mise à jour du favori » au lieu de « Limite de favoris atteinte ». Le test affirme ce que le Visitor voit vraiment. Il deviendra rouge le jour où le code sera corrigé, ce qui est exactement le moment de le mettre à jour.

**Category.** Écrit. `/memes/category/$slug` rend et ne montre que les Memes de la Category, la liste des Categories emmène d'une Category à l'autre et le contenu suit, la catégorie `news` coupe à trente jours, et un slug qui n'existe pas répond 404 et non un écran 404 sous un statut valide.

**Reels et `/random`.** Écrits, deux scénarios chacun. Les deux surfaces tirent leur Meme au sort, donc aucun test ne peut le nommer d'avance. Ce qu'il affirme est que le Meme à l'écran est un Meme semé : le titre est cherché dans les fixtures au lieu d'être comparé à l'une d'elles.

Les Reels répondent, le premier reel occupe l'écran, et la flèche du bas donne sa place au suivant. Le passage est affirmé des deux côtés, celui qui arrive et celui qui part, chacun à la moitié de l'écran : un reel fait exactement une hauteur de fenêtre, donc la moitié est loin de l'arrondi d'un défilement et loin du reel voisin.

Rien n'attend l'hydratation ici, et c'est la route qui le permet : `/reels` est en `ssr: 'data-only'`, donc le composant ne rend que sur le client et un fil à l'écran est déjà une page hydratée. Les vingt Memes du premier lot portent des `bunnyId` inventés, sauf un : hls.js échoue sur chacun sans lever d'erreur non capturée, ce que la garde `weberror` de `fixtures.ts` confirme run après run.

`/random` redirige vers une page Meme, et le bouton Aléatoire de cette page en amène une autre. Le second est déterministe sans tirage chanceux : la requête passe l'identifiant courant en `exceptId`, donc la page d'arrivée n'est jamais celle de départ.

**Favorites.** Écrit. `/favorites` liste exactement les Memes que le rôle porte en Bookmark, et un troisième n'y est pas. Un Visitor anonyme n'est pas poussé vers la connexion, contrairement à ce que ce plan annonçait : la route le renvoie sur `/memes`, donc sur `trending`. C'est ce que fait le code, c'est ce qu'affirme le test.

**Bannière de consentement.** Écrit, deux scénarios. Le premier efface le cookie que `fixtures.ts` pose, attend le délai d'apparition, accepte, et retrouve son choix après un rechargement.

Ce plan annonçait ici « ne bloque aucun clic ». Le code dit le contraire, et le fait exprès : la bannière pose un voile en `fixed inset-0` et se déclare `aria-modal`, donc elle tient l'écran tant qu'elle n'a pas de réponse, sauf si un dialogue est déjà ouvert. C'est l'interruption qui gagne sa place, et la contrainte est dans `CONTEXT.md`.

Le second scénario la garde, dans les deux sens. Un `click({ trial: true })` sur le lien du héros est refusé tant que le voile est là, et le même clic passe une fois la bannière acceptée. Le clic d'essai joue toutes les vérifications d'un vrai clic et n'en exécute aucune, donc il dit exactement ce qu'un Visitor peut atteindre. Il porte un délai court, deux secondes : celui-là est attendu en échec, et lui laisser le budget du test serait attendre pour rien.

La survie du choix n'est pas affirmée par une absence. Une bannière qui n'apparaît pas parce que la page n'est pas hydratée rendrait cette absence vraie sans rien couvrir. Le test rouvre donc les préférences par « Gérer les cookies » et lit l'interrupteur Analytique, qui porte la réponse donnée : le clic prouve l'hydratation et l'interrupteur prouve la persistance.

**Rappel Premium.** Écrit, deux scénarios. Chacun commence par effacer la mise en sommeil que `fixtures.ts` écrit dans `localStorage`, par un script d'initialisation et non par un `evaluate` : le minuteur part à l'hydratation, et il ne se repose pas s'il trouve la mise en sommeil à son premier passage.

Le rappel parle cinq secondes après l'arrivée sur une page `/memes`, un refus le referme, et il ne revient pas. Il ne parle qu'une fois parce qu'il pose lui même sa mise en sommeil au moment de s'afficher : le test le prouve en repassant par `/pricing` puis par la bibliothèque, en navigation client, seule façon de ne pas rejouer le script d'initialisation qui vient d'effacer cette mise en sommeil.

Le second scénario dit la règle en entier : le rappel attend son tour. Le dialogue de connexion, ouvert par un Bookmark anonyme, est encore là après deux passages du minuteur, et le rappel parle dès qu'`Échap` libère l'écran.

### Niveau 3, le reste

**Studio et Generation.** Écrit, deux scénarios sur Chromium, et **aucun ne transcode**. Un User gratuit ouvre `/memes/$memeId/studio` et n'y trouve rien qui lui barre la route : le champ de texte est éditable, le bouton Générer est actif, et le dialogue qui vend Premium à l'Export n'apparaît pas ici. Un Visitor anonyme y entre sans compte, et le bouton Générer sans texte lui répond « Veuillez saisir du texte ». C'est le seul garde-fou que cette surface porte vraiment.

**Ce plan annonçait ici « les plafonds et la porte Premium ». Le code n'a ni l'un ni l'autre**, et c'est ce que le scénario du gratuit affirme. Le Studio n'a aucune porte : sa route ne pose pas de garde, `shareMeme` en mode `studio` sert la vidéo watermarquée à tout le monde sauf au Premium, à qui elle sert l'originale, et cette différence est côté serveur, invisible à un navigateur. Le plafond de trois générations du plan gratuit, lui, est compté et jamais lu : `incrementGenerationCount` incrémente après chaque succès, et `checkGeneration`, la fonction serveur qui refuserait la quatrième sous un 403, n'est appelée de nulle part. Le plan gratuit annonce pourtant « 3 max » sur la page des plans. C'est un correctif produit, pas un test.

### La génération, et pourquoi elle n'est pas ici

Elle a été écrite, elle est verte en local, et elle est retirée. Le récit vaut d'être gardé, parce que la prochaine tentative le rejouerait sinon.

Le scénario ouvrait le Studio, saisissait un texte, attendait la fin du traitement et téléchargeait. En local il passait en quatre secondes. Sur le runner il échouait deux fois puis passait au troisième essai, ce qui rendait le run vert et n'enlevait rien au problème : un test qui a besoin de ses reprises n'affirme plus rien.

Trois corrections successives sont passées à côté. Remonter le plafond du test, le redescendre, le remonter : le budget n'était pas le sujet. La sonde qui devait le prouver ne prouvait rien non plus, parce que `Emulation.setCPUThrottlingRate` ne freine que le fil principal et que ffmpeg tourne dans un Web Worker.

Le log du runner a fini par le dire, et l'échec n'était nulle part où on le cherchait :

```
Error: page.waitForEvent: Test timeout of 30000ms exceeded.
    at downloadGeneratedVideo (e2e/studio.spec.ts:46:32)
```

Le transcodage se terminait. C'est le téléchargement qui ne partait jamais. Deux causes tiennent debout, et le scénario ne savait pas les distinguer, ce qui était son vrai défaut. Soit `downloadBlob` perd la course, `src/utils/download.ts` révoque l'URL de l'objet dans la foulée du clic et six mégaoctets mettent plus longtemps à démarrer que les huit cents kilo-octets de l'Export, qui passe sur le même runner avec le même helper. Soit la génération échoue vraiment : `mutation.onError` cache le bouton Annuler exactement comme un succès, `processedData` reste nul, et le bouton Télécharger se contente d'un toast.

Trois choses à faire avant de la réécrire, dans cet ordre.

D'abord trancher entre les deux causes, et corriger `downloadBlob` si c'est la première. Ce n'est pas une concession au test : Safari sur iPhone est le pire client connu de ce motif, et une vidéo générée qui ne se télécharge pas sur un téléphone lent est une panne produit.

Ensuite donner au scénario une affirmation sur le succès de la génération, et pas seulement sur la fin du traitement. Un `onError` qui range l'écran comme un `onSuccess` doit faire échouer le test à cet endroit là, pas trente secondes plus loin sur un téléchargement absent.

Enfin passer l'upload d'artefacts de `if: failure()` à `if: !cancelled()` dans `e2e.yml`. Ce run là a fini vert grâce à ses reprises, donc il n'a laissé ni trace ni capture, et c'est ce qui a coûté le tour le plus long.

Sous WebKit, ouverture du Studio et présence de l'aperçu seulement. Pas encore écrit : un navigateur de plus se télécharge à chaque run, et cette suite n'en ajoute un que le jour où elle a quelque chose à dire sur Safari.

**Submission.** Envoi d'un lien, apparition dans l'historique, refus d'un lien invalide.

**Settings.** Écrit, dix scénarios. Un gratuit voit son nom, son adresse, son badge et son plan, et le bouton qui l'emmène aux plans y mène. Il repart avec l'export JSON de ses données, nommé et non vide. Un AvatarSlot choisi survit à un rechargement, et le rôle qui porte un ProviderAvatar en choisit un puis revient au sien. Un mot de passe changé sert à se reconnecter, et deux refus l'encadrent, la confirmation qui ne correspond pas et le mot de passe actuel faux. Un Premium voit son badge et se fait ouvrir le portail de facturation. Un Premium dont l'abonnement tourne encore se voit refuser la suppression de son compte tant qu'il ne l'a pas annulé. Un Visitor anonyme est renvoyé sur l'accueil.

Le portail de facturation n'est pas traversé : la route vers `billing.stripe.com` est avortée, et l'affirmation porte sur l'URL que `/subscription/billing-portal` renvoie. Cette session se crée contre un vrai client Stripe, donc le rôle `billingPortal` naît avec un client du mode test, écrit par le seed. C'est le seul appel Stripe du seed, et un client de mode test ne coûte rien.

Le rôle `premium`, lui, garde son abonnement semé sans client Stripe, et c'est celui qui garde le refus de suppression : la porte est côté client, elle ne demande rien à Stripe.

Le choix d'un AvatarSlot n'attend ni l'écran ni la fonction serveur, mais la session qui suit. L'écran bascule sur la mise à jour optimiste, donc l'attendre laisserait l'écriture en vol, et better-auth garde une session en cache dans un cookie signé pendant cinq minutes : un rechargement avant ce rafraîchissement relit l'Avatar d'avant le clic. C'est `getSession`, appelé par le `onSuccess` de la mutation, qui dit que tout est posé.

Le mot de passe faux a coûté un correctif d'application avant de passer. Le dialogue soumettait par `mutateAsync` dans un `onSubmit`, seul formulaire du dépôt à le faire, donc le refus du serveur remontait jusqu'au `void form.handleSubmit()` et finissait en rejet non traité. La garde `weberror` de `fixtures.ts` l'a vu ; le dialogue est repassé sur `mutate` et sur `isPending`, comme les autres.

Deux affirmations manquent ici et ce n'est pas un oubli. La date de renouvellement affichée n'est pas lue, parce qu'elle vaut l'instant du seed plus trente jours et que la recopier ne dirait rien de plus que le badge. Et la branche « Fin le » de cette même ligne demande un `cancelAtPeriodEnd` vrai, qui ne s'obtient qu'en traversant le portail.

**AiSearch.** Écrit, six scénarios. Un Visitor anonyme soumet et reçoit le dialogue de connexion, retrouve son prompt en revenant, et se voit refuser un prompt vide sans un mot. Un User gratuit voit ses trois recherches, en dépense une, et retrouve son Meme. Une recherche que l'index ne sait pas répondre affiche l'invitation à reformuler, et une recherche qui n'atteint pas le serveur affiche le message d'échec et rend le formulaire. Un User gratuit au plafond reçoit le dialogue qui vend Premium, et son bouton mène aux plans. Un Premium qui porte autant de recherches que le plan gratuit en autorise n'a ni compteur ni refus.

Le modèle ne tourne jamais, et ce n'est pas un mock. `.env.e2e` porte une clé Anthropic morte : l'API répond 401 en deux cent trente millisecondes sans rien facturer, et `extractSearchKeywords` attrape l'erreur et retombe sur le prompt brut. La requête part donc chez Algolia telle quelle, et tout le reste du chemin est le vrai, le quota, l'index et les résultats à l'écran. Le log, lui, n'est vu qu'à travers le compteur qu'il alimente. Le serveur crie un `anthropic.chatStream fatal` à chaque recherche, et c'est le repli qui parle.

Deux conséquences. Le prompt est un mot et non une phrase, puisqu'une phrase enverrait ses mots de remplissage à Algolia. Les deux mots employés sont vérifiés contre l'index : le mot des fixtures rend exactement un Meme, et le mot de charabia rend zéro, sans que `removeWordsIfNoResults` rabatte sur la bibliothèque entière. C'est ce zéro qui rend l'écran vide atteignable. Et un test vert ne dit rien de l'extraction de mots-clés, ce qui est le périmètre voulu. **La clé doit rester morte**, sinon la suite se met à payer à chaque run.

Le message d'échec, lui, s'obtient en coupant le fil et non en écrivant une réponse à la place du serveur : `route.abort` sur la fonction serveur, le même geste que le portail Stripe et que les boutons de fournisseur. Il est posé une fois le quota chargé, parce que le quota voyage sur une URL de la même forme.

Il y a trois portes et non deux. Les deux premières sont côté client : la page ouvre le dialogue de connexion quand personne n'est connecté, et le dialogue d'upsell quand le quota mensuel est épuisé, sans rien demander au serveur. Le serveur refuse aussi ce quota là, par un 429, mais aucun navigateur ne l'atteint, et ce refus doublé appartient aux tests d'intégration.

La troisième, elle, n'a pas de miroir client : `DAILY_GLOBAL_AI_SEARCH_CAP` coupe à cinq cents recherches par jour, tous Users confondus, et un navigateur l'atteint pour de bon. Elle ne se distingue alors de n'importe quelle panne par rien du tout, puisque le client ne relit pas le code du refus et affiche son message générique. C'est ce message que le scénario du fil coupé affirme, et cette porte n'a pas de test à elle : la mettre en scène demanderait cinq cents lignes semées pour une assertion déjà prise.

Le quota est mensuel et compté sur les lignes `AiSearchLog`, donc trois rôles naissent avec l'état qu'il leur faut plutôt que de le dépenser à l'écran. `aiSearchPremium` porte les trois recherches du plan gratuit en étant Premium : le plafond est ce qu'il prouve ne pas rencontrer.

Le retour du Visitor anonyme a coûté un correctif d'application avant de passer, et c'est la panne que ce scénario a rapportée. Le prompt mis de côté était relu dans l'initialisateur d'un `useState`, donc pendant le rendu, que le serveur joue aussi : les deux rendus divergeaient, React jetait l'arbre et rejouait cet initialisateur sur une clé que le premier passage venait d'effacer. Le Visitor retrouvait un champ vide, derrière une erreur d'hydratation que la garde `weberror` de `fixtures.ts` a vue. La lecture vit maintenant dans un effet, `src/hooks/use-ai-search-prompt.ts`, qui porte les deux bouts du relais.

La recherche dépensée est affirmée après un rechargement, et c'est un décalage du produit, pas une commodité du test. Le serveur rend sa réponse avant d'écrire son `AiSearchLog`, que `waitUntil` emporte de son côté, donc le compteur que la page rafraîchit au succès relit le compte d'avant. Il annonce trois recherches restantes après en avoir dépensé une, jusqu'à ce que la requête périme, une minute plus tard.

L'attente des résultats est arithmétique et non devinée. Les trois étapes affichées marchent sur leurs propres minuteurs et retiennent les résultats jusqu'à la dernière, donc leurs clés et leurs délais sortent du hook vers `src/constants/ai-search.ts`, du même geste que les deux délais de la bannière et du rappel.

Deux `status` cohabitent sur cette page, et c'est une conséquence a11y de plus. Le compteur de quota en porte un, parce qu'un décompte qui change après une recherche mérite d'être annoncé, et c'est ce qui donne au test l'élément plutôt qu'une de ses valeurs : affirmer l'absence de « 0 recherche restante » laisserait passer un compteur qui en annoncerait trois. Les étapes portent l'autre, dans la région des résultats, ce qui les distingue sans qu'aucun test ait à nommer un conteneur.

**Pages légales.** Écrit, dix scénarios. `/dmca`, `/mentions-legales`, `/privacy`, `/terms-of-use` répondent dans les deux locales, chacune avec son titre, et les mentions légales portent l'attribution du style d'avatar.

Le titre attendu n'est pas recopié dans le test : il est lu dans le fichier markdown que la page sert elle même. La panne à attraper ici est une locale qui rend le markdown de l'autre, et une copie gardée dans le test resterait verte ce jour là, puisque les deux copies nomment la même page.

C'est le premier fichier de la suite à visiter `/en/`, et il le fait sans changer la locale du navigateur, qui reste `fr-FR`. L'URL gagne sur `Accept-Language`, et c'est cette page anglaise rendue sous un navigateur français qui le prouve. Les chemins localisés viennent de `localizeUrl`, la fonction de l'application, plutôt que d'un préfixe recollé à la main : le parcours EN héritera du même geste.

L'attribution, elle, est écrite en dur, et c'est le seul endroit de la suite où une valeur est recopiée volontairement. Le style d'avatar est un remix servi sous CC BY 4.0, licence qui ne tient que tant que le crédit et ses deux liens restent sur la page. Dériver ces chaînes du markdown rendrait le test vert le jour où le crédit disparaîtrait des deux côtés.

**Parcours EN.** Le routage `/en/` et les métadonnées de chaque type de page, plus le parcours de checkout en entier, parce que les montants et les e-mails y sont localisés.

## L'exécution

Chromium seulement pour l'instant. WebKit sur format iPhone arrive avec le premier test qui a quelque chose à dire sur Safari, pas avant : un navigateur de plus se télécharge à chaque run.

Les fichiers e2e portent l'extension `.spec.ts`, ce qui les distingue des `.test.ts` de Vitest, pour oxlint comme pour les règles d'écriture des tests.

Les points d'accroche sont des rôles et des noms accessibles, jamais des `data-testid`. Un test nomme ce qu'il clique comme un lecteur d'écran l'annonce, ce qui le fait échouer quand l'accessibilité casse. Deux exceptions : la page Stripe, dont les identifiants ne nous appartiennent pas, et le lecteur vidéo, qu'aucun rôle ne désigne.

Le nom vient de l'application, pas d'une copie : `e2e/messages.ts` fixe la locale du résolveur avec `overwriteGetLocale` puis réexporte `m`, et un test écrit `getByRole('button', { name: m.nav_sign_in() })`. Le site est bilingue et une locale ne décide pas si un test passe, elle décide seulement quelle chaîne est demandée. Le parcours EN sera le même code avec une autre locale.

Cinq conséquences sur l'application, et chacune est une accroche a11y qui manquait. La grille de Memes se déclare `role="list"`, ses cartes `role="listitem"`, et la liste porte un nom : trente cartes annoncées une par une valent mieux que trente `div`, et c'est ce qui donne au test des colonnes la liste des Memes dans l'ordre où la grille les pose. Le groupe de colonnes, lui, est un `radiogroup` dont les options s'appellent « 4 », « 5 » et « 6 » : sans nom sur le groupe, ces trois chiffres ne veulent rien dire, ni pour un lecteur d'écran ni pour un test.

Le dialogue d'authentification garde ses deux panneaux montés pour animer la hauteur, donc le panneau inactif porte `inert` : sans lui un lecteur d'écran voyait les deux formulaires, le clavier tabulait dans le formulaire invisible, et `getByRole('tabpanel')` désignait deux éléments. Une accroche a11y n'existe que si l'élément a un nom : un bouton sans libellé visible se règle par un vrai libellé, jamais par un identifiant de test. Et le bouton de lecture d'une carte de Meme portait un libellé lecteur d'écran écrit en anglais en dur ; il passe par `m` comme le reste. Son voisin, le bouton des options, porte encore le sien : aucun test ne s'en sert, donc il attend le sien plutôt que de voyager dans ce lot.

**Un nom accessible se compare par sous chaîne.** C'est le piège de cette suite, parce qu'il rend un test vert sans rien affirmer : chercher « 3 nouveaux mèmes » trouve « 53 nouveaux mèmes », et le titre du Meme de remplissage numéro 3 se trouve dans celui du numéro 31. Toute affirmation dont la valeur est le sujet du test porte donc `exact: true`, et `e2e/library.ts` le pose une fois pour toutes sur les liens de Meme.

Un libellé de champ se compare de la même façon, et le Studio en porte le cas : son panneau de bureau étiquette son champ « Texte », et la barre du téléphone met « Texte à ajouter sur la vidéo » sur le sien. Le premier est un préfixe du second, donc le `getByLabel` du test porte `exact: true`, faute de quoi il en désignerait deux.

Ce même fichier compte les Memes affichés par les boutons de lecture, un par carte et un seul, parce qu'une carte porte plusieurs liens vers le même Meme.

La bannière de consentement et le rappel Premium parlent d'eux mêmes, le second cinq secondes après l'arrivée sur une page `/memes`. Un dialogue qui s'ouvre au milieu d'un scénario vole le clic que ce scénario allait faire, donc `e2e/fixtures.ts` répond à la bannière par un cookie et met le rappel en sommeil par `localStorage`, pour tous les tests. Chacun garde le sien, qui commencera par défaire ce réglage.

Une page est rendue sur le serveur avant que React ne s'y attache, et Playwright ne voit pas la différence : un clic est perdu, et une valeur saisie est effacée quand l'hydratation restaure l'input contrôlé. `e2e/hydration.ts` porte les trois seuls signaux disponibles, `repeatUntilVisible`, `repeatUntilNavigated` et `repeatUntilRequested`. Ils ne valent que pour la première action d'une page fraîchement chargée, et seulement quand la répéter est sans conséquence.

Le deuxième est celui du bouton Aléatoire, dont la destination n'a pas de nom : il lit la page qu'il quitte et non celle qu'il atteint, et ne reclique que tant qu'elle est encore là. Un clic qui a porté n'est donc jamais rejoué.

Affirmer qu'un écran reste muet demande de faire passer le temps, et `page.waitForTimeout` est refusé par la règle oxlint `playwright/no-wait-for-timeout`. C'est `page.clock` qui le fait, l'outil que Playwright désigne pour une fenêtre à retardement : installée avant la navigation, l'horloge fausse gèle le temps de la page, et `runFor` déclenche les minuteurs à la demande.

Trois pièges, chacun payé d'un échec.

Une horloge gelée ouvre un dialogue mais ne le referme jamais : il garde son `data-state="closed"` en restant visible. Ni `resume()`, ni une avance plus large n'y changent quoi que ce soit, et c'est le piège coûteux, parce qu'il se déguise en réglage : cinq secondes d'horloge échouaient, dix passaient en local, et les dix ont rechuté sur le runner. Un scénario qui affirme une fermeture garde donc le temps réel de bout en bout, et n'installe l'horloge qu'après, une fois le dialogue parti. `install()` accepte d'arriver là, en cours de route : ce qui compte est que le minuteur à observer soit posé après elle, ici par la navigation suivante.

Avancer l'horloge avant l'hydratation ne déclenche rien, puisque le minuteur n'est pas encore posé, d'où le `runFor` passé à `repeatUntilVisible`.

Enfin, un silence prouvé par une horloge qui ne tourne pas est un test vert qui n'affirme rien. Le scénario du dialogue déjà ouvert porte donc la preuve du contraire, dans le même fichier : `Échap` libère l'écran, le `runFor` suivant fait parler le rappel. Si l'horloge ne déclenchait rien, celui-ci tomberait.

La bannière de consentement, elle, garde le temps réel : elle n'a aucun silence à prouver, et une horloge gelée l'empêcherait d'ouvrir son panneau de préférences.

Les deux délais viennent de l'application, `CONSENT_BANNER_DELAY_MS` et `PREMIUM_REMINDER_DELAY_MS`, sortis de leurs composants pour que les tests ne les recopient pas.

Un seul test est connu instable, la recherche de la bibliothèque, qui a échoué une fois au premier essai et passé au retry. C'est le seul qui tape dans le champ et attend Algolia, donc le seul dont l'attente dépend d'un service tiers plutôt que de notre serveur. `repeatUntilVisible` couvre l'hydratation, pas cette latence. Les retries d'intégration continue l'absorbent, et rien n'est fait de plus tant qu'il ne devient pas régulier : élargir une fenêtre pour un échec unique cache le jour où la lenteur devient une panne.

`timeout: 30_000` par test : au-delà, un test pend, il ne tourne plus. C'est un plafond serré, le checkout annuel mesure une dizaine de secondes en local. Le checkout mensuel, qui prend un Bookmark après avoir payé, porte `test.slow()` : le plafond y devient quatre vingt dix secondes, et c'est le seul endroit où il bouge. `retries: 2` en intégration continue et `0` en local, ce qui sert aussi de coussin sur ce plafond, `trace: 'on-first-retry'`, `forbidOnly` quand `CI` est défini. Les artefacts ne partent qu'en cas d'échec, avec une rétention de trois jours, parce que le dépôt est public.

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

La library Bunny Stream `e2e` et sa zone de stockage existent, et `public/videos/want-a-cookie.mp4` y est publiée sous `E2E_VIDEO_BUNNY_ID`. Sa version watermarquée est dans la zone, produite en local à partir du même fichier et avec la recette de `scripts/watermark-videos.ts` : ce script commence par télécharger `/original`, ce que le réglage ci dessous interdit, alors que la source était déjà dans le dépôt. Toutes les valeurs Bunny sont dans `.env.e2e`.

Une library Bunny naît avec « Block Direct URL File Access » actif, et il est à désactiver. Le réglage mérite d'être écrit, parce qu'il se rejoue à chaque library créée et qu'il ne se lit pas dans un message d'erreur. Il refuse toute requête sans en tête `Referer`, jeton ou pas : le même fichier répond 403 nu et 200 avec un référent quelconque. Un navigateur en envoie un, donc miniatures et lecture HLS marchent quand même, ce qui fait passer la library pour saine. Le serveur, lui, n'en envoie pas, et c'est lui qui va chercher `/original` pour l'Export d'un Premium et pour le Studio. La panne se voit donc uniquement là, et sur un chemin qui n'a rien à voir avec un réglage de CDN.

`e2e/env.ts` exige `BETTER_AUTH_SECRET`, pour forger le jeton de vérification, `VITE_BUNNY_HOSTNAME`, pour l'affirmation sur les sitemaps, et `E2E_VIDEO_BUNNY_ID`, l'unique Video des fixtures qui existe vraiment chez Bunny, en plus de `VITE_SITE_URL` et `DATABASE_URL`. Une clé qui manque casse le run au chargement, avec son nom dans le message. Le secret `E2E_ENV_FILE` doit donc les porter.

`E2E_VIDEO_BUNNY_ID` est dans l'environnement et non dans `e2e/content.ts` parce qu'il nomme une ressource de la library `e2e` : recréer la library lui donne un autre identifiant, alors que les fixtures, elles, ne bougent pas.
