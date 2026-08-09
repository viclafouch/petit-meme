# Plan : prise en charge des liens X `/status/<id>/video/1` (2026-08-09)

**Statut : corrigé.** `pnpm run lint:fix` passe. Les deux formats extraient la vidéo.

## Symptôme

Le nouveau format de lien copié depuis le menu contextuel d'une vidéo sur X,
`https://x.com/Monty_Brogan69/status/2081431421944471694/video/1`, ne fonctionne pas dans
les formulaires admin (« Télécharger une vidéo depuis un tweet » et création de mème
depuis un tweet).

## Cause

La validation n'était pas en cause. `TWITTER_REGEX_THAT_INCLUDES_ID` dans
`src/constants/url.ts` n'était pas ancrée à la fin (`...\/status\/\d+` sans `$`), donc le
suffixe `/video/1` passait le `TWEET_LINK_SCHEMA` sans erreur.

La panne était à l'extraction de l'identifiant, dans `src/lib/react-tweet.ts` :

```ts
url.searchParams.get('post_id') ?? url.pathname.split('/').at(-1)
```

Le dernier segment du chemin vaut `1` pour ce format. `getTweet('1')` était donc appelé
avec un identifiant faux, et l'appel échouait côté serveur (502 « Impossible de récupérer
le tweet »). Même conséquence pour le format `/photo/1`.

Le schéma de validation et l'extraction étaient deux sources de vérité distinctes qui
pouvaient diverger : la première acceptait des URL que la seconde ne savait pas lire.

## Correctif

- [x] Nouveau `src/helpers/tweet-url.ts` — `extractTweetIdFromUrl(tweetUrl)` retourne
      l'identifiant ou `null`. Deux expressions régulières ancrées, à groupe nommé
      `tweetId` : une pour `/<handle>/status/<id>` avec suffixe média optionnel
      (`/video/<n>` ou `/photo/<n>`), barre oblique finale et chaîne de requête ou
      fragment optionnels ; une pour `/i/bookmarks?post_id=<id>`.

      Pas de `new URL()` ni de `URL.parse()` : le helper est appelé côté client par le
      schéma de validation des formulaires, et `URL.parse` demande Safari 18, au-dessus de
      la cible de compilation Vite par défaut.

- [x] `src/constants/url.ts` — `TWEET_LINK_SCHEMA` passe de `.regex(...)` à
      `.refine((url) => extractTweetIdFromUrl(url) !== null, 'Invalid tweet URL')`.
      Une seule source de vérité : le formulaire n'accepte plus que ce que le serveur sait
      lire. Effet de bord voulu, les URL auparavant acceptées à tort et vouées à un 502
      (`/status/<id>/analytics` par exemple) sont maintenant refusées à la saisie.

- [x] `src/lib/react-tweet.ts` — suppression de l'`extractTweetIdFromUrl` local,
      `getTweetByUrl` consomme le helper partagé et lève si l'identifiant est absent.

Aucune modification de schéma Prisma, aucune migration.

## Portée

Le correctif couvre les points d'entrée qui partagent `TWEET_LINK_SCHEMA` :

- `src/routes/admin/-components/download-from-twitter-form.tsx` (téléchargement seul)
- `src/routes/admin/-components/twitter-form.tsx` et `createMemeFromTwitterUrl`
  (`src/routes/admin/-server/memes.ts`)
- `detectUrlType` des propositions utilisateur (`src/constants/meme-submission.ts`)

Le champ `tweetUrl` du formulaire de mème (`src/routes/admin/-server/memes.ts`) enregistre
l'URL telle qu'elle est saisie, suffixe `/video/1` compris. Le lien reste valide sur X.
La normalisation vers la forme canonique n'est pas faite ici ; `createMemeFromTwitterUrl`
enregistre déjà la forme canonique reconstruite par `getTweetById`.

## Mise en place de Vitest (même commit)

Le dépôt n'avait aucune infrastructure de test. Ce correctif en est un bon candidat
d'amorçage : une fonction pure, un contrat clair, une régression réelle à verrouiller.

- [x] `vitest@4.1.10` en dépendance de développement. La plage de pairs `vite` du paquet
      est `^6 || ^7 || ^8`, satisfaite par le `vite@8.1.5` déjà installé, donc aucune
      seconde copie de Vite et aucune dérogation à ajouter dans `pnpm.peerDependencyRules`.

- [x] `vitest.config.ts` autonome, sans reprise de `vite.config.ts` : les tests unitaires
      n'ont pas besoin de la chaîne TanStack Start, Nitro, Sentry, Paraglide et Tailwind,
      dont le chargement coûterait plusieurs secondes par exécution. `resolve.tsconfigPaths`
      (natif depuis Vite 8) résout l'alias `~/`. `include` est limité à `src/**/*.test.ts`
      pour que `.output/` et `.vercel/` ne soient jamais parcourus.

- [x] Scripts `test` (`vitest run`) et `test:watch` (`vitest`) dans `package.json`,
      reportés dans la section Commands de `CLAUDE.md`.

- [x] Préréglage `vitest` de `@viclafouch/oxc-config` activé. Il ne peut pas aller dans le
      `extends` de premier niveau : il met toutes les catégories à `off`, ce qui
      désarmerait `correctness`, `suspicious` et les autres pour tout le dépôt. Ses
      `plugins` et ses `rules` sont donc étalés dans un `overrides` limité à
      `**/*.test.ts`. `overrides` n'accepte pas `extends` dans le schéma oxlint, cet
      étalement est la seule voie.

- [x] Hook `pre-commit` (`.husky/pre-commit`) étendu :
      `pnpm run lint && pnpm run format:check && pnpm run test`. Les tests passent en
      dernier parce que Vitest transpile par esbuild sans contrôler les types : une erreur
      de typage ne ferait pas tomber un test. Laisser `lint` en tête garantit que le code
      est correctement typé avant qu'on tire une conclusion du résultat des tests.
      Coût total du hook : 5,1 s, dont 88 ms pour les tests, `tsc` domine.

- [x] Premier test : `src/helpers/tweet-url.test.ts`, 24 cas sur
      `extractTweetIdFromUrl`. Structure BDD de `.claude/rules/testing.md` : un `describe`
      par situation, une seule assertion par test, marqueurs `#when` et `#then`. Les
      tableaux passent par `it.each`, ce qu'impose de toute façon la règle
      `vitest/prefer-each` du préréglage.

## Vérification

`pnpm run test` : 24 tests, 1 fichier, au vert. `pnpm run lint:fix` passe.

Test de mutation, la suite remise face à l'ancienne implémentation
(`pathname.split('/').at(-1)`) : 18 des 24 cas tombent, dont exactement
`/status/2081431421944471694/video/1`. La suite verrouille bien la régression.

Le préréglage oxlint vérifié de la même manière : un `it.only` introduit volontairement
déclenche `vitest(no-focused-tests)`, donc les règles s'appliquent réellement aux fichiers
de test.

Hook `pre-commit` vérifié dans les deux sens : sortie 0 sur la base saine, sortie 1 avec une
assertion volontairement fausse. Il bloque donc réellement le commit.

Chaîne complète contre l'API X réelle, pour `/status/2081431421944471694/video/1` et pour
`/status/2081431421944471694` : `TWEET_LINK_SCHEMA` passe, `getTweetByUrl` retourne le même
identifiant et la même URL vidéo, `getTweetMedia` télécharge 290 Ko de `video/mp4` et 36 Ko
d'affiche.
