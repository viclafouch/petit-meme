# Plan — Avatar personnalisable (DiceBear)

## Objectif

Permettre à tout utilisateur connecté de choisir son Avatar depuis un catalogue, tout en conservant l'Avatar fourni par Discord ou Twitter à l'inscription et en pouvant y revenir à tout moment.

Vocabulaire : voir `CONTEXT.md`, section Identité (`Avatar`, `ProviderAvatar`, `AvatarSlot`).

## Décisions actées

### Pourquoi DiceBear est généré localement et jamais appelé via son API

`api.dicebear.com` est réservé à un usage non commercial. Leur documentation dit textuellement : *"Our API is free to use for non-commercial purposes"* et *"For commercial use or higher limits, please set up your own instance."* Petit Meme vend des abonnements Stripe, donc l'usage est commercial. S'y ajoutent l'absence de garantie de disponibilité annoncée par DiceBear et l'envoi de l'IP des utilisateurs à un tiers.

**Ne pas remplacer la génération locale par un appel à leur API.** `@dicebear/core` est en MIT et reste en `devDependencies` : il ne sert qu'au script de génération, jamais au runtime.

### Style retenu : Adventurer Neutral, et le crédit qu'il impose

Victor a tranché sur la planche de contact : **Adventurer Neutral**. Ce style est en **CC BY 4.0**, pas en CC0 comme les trois autres candidats. Le retenir engage le site à afficher une ligne de crédit, sans quoi la licence n'est pas respectée.

Texte exact fourni par la définition du style (`meta.license.text`) :

> Remix of „Adventurer Neutral” (https://www.figma.com/community/file/1184595184137881796) by „Lisa Wischofsky”, licensed under „CC BY 4.0” (https://creativecommons.org/licenses/by/4.0/)

L'obligation vit tant que les SVG sont servis. Elle est portée par la phase 5 (crédit sur `mentions-legales.tsx`) et doit être retirée le jour où le style change pour un CC0.

### Modèle de stockage

- `user.image` porte **l'Avatar affiché**, sous forme d'URL prête à rendre : soit une URL de provider, soit un chemin `/avatars/avatar-NN.svg`. Les 13 points de lecture existants restent inchangés, et aucun `additionalFields` n'est nécessaire côté better-auth.
- `user.providerImage` archive l'URL fournie par Discord ou Twitter à l'inscription. Écrite une seule fois, jamais réécrite.
- Le client envoie un **id d'AvatarSlot** (`avatar-07`) ou `provider`, jamais une URL. Le serveur valide contre `AVATAR_CATALOG` et écrit l'URL correspondante. Sans cette validation, la colonne devient écrivable par l'utilisateur avec une URL arbitraire (vecteur de tracking et de stored XSS).

### Pourquoi le catalogue est nommé par emplacement et pas par style

Les fichiers s'appellent `avatar-01.svg` … `avatar-24.svg`, sans mention du style DiceBear. Changer de style se réduit donc à relancer le script de génération : les 24 mêmes fichiers sont réécrits, aucune ligne de base ne bouge. Le choix de l'utilisateur porte sur un **emplacement**, pas sur un visage : un changement de style redessine la tête de tout le monde, ce qui est assumé.

Le catalogue est **append-only**. On n'efface jamais un fichier, on ne renomme jamais. Le filet de sécurité est `AvatarFallback` (initiales), qui prend la main si un SVG répond 404.

`/avatars/**` est servi en `max-age=604800` (7 jours) et **pas** en `immutable`, sinon un changement de style resterait invisible jusqu'à un an. Contrepartie assumée : un changement de style met jusqu'à 7 jours à se propager. Échappatoire si un jour il faut que ce soit immédiat : renommer le dossier en `/avatars/v2/` et passer `UPDATE "user" SET "image" = replace("image", '/v1/', '/v2/')`.

### Limite connue et assumée

Un compte créé en email/mot de passe qui se connecte ensuite via Discord voit son compte lié (better-auth active `accountLinking` par défaut), mais n'obtient **aucun ProviderAvatar** : `image` n'est pas réécrit et le hook `user.create.before` ne repasse pas. Cette personne a déjà un AvatarSlot attribué à l'inscription et peut en changer normalement.

Les deux corrections possibles ont été écartées : `updateUserInfoOnLink: true` écraserait l'Avatar choisi à chaque connexion, et un hook `account.create.after` ne dispose pas de l'image du profil distant (la ligne `Account` ne porte que les jetons).

---

## Phase 0 — Choix du style et curation des seeds

- [x] Écrire `scripts/generate-avatars.ts` (`@dicebear/core@10.3.0` + `@dicebear/styles@10.2.0` en `devDependencies`)
- [x] Mode planche de contact : 4 styles candidats (Pixel Art, Lorelei, Notionists, Adventurer Neutral), 60 seeds chacun (`petit-meme-01` … `petit-meme-60`), rendus à 32px et 96px, sur fond clair et sur fond sombre, dans un HTML autonome écrit hors du repo (`$TMPDIR/petit-meme-avatars/contact-sheet.html`)
- [x] Planche transformée en instrument de sélection : habillage gris neutre sans chroma pour ne pas fausser le jugement des palettes, épreuve coupée en deux (blanc du thème clair à gauche, noir du thème sombre à droite), clic pour retenir un seed, l'ordre des clics devenant l'ordre du catalogue, compteur sur 24, sélection persistée en `localStorage`, et sortie prête à coller (`--style=… --palette=… --seeds=…`) consommable par le mode `generate` de la phase 1
- [x] Victor tranche le style : **Adventurer Neutral** (CC BY 4.0, crédit obligatoire, voir « Décisions actées »)
- [x] Victor tranche la palette de fond : **`pastel`** (`#b6e3f4`, `#c0aede`, `#d1d4f9`, `#ffd5dc`, `#ffdfbf`)
- [x] Victor sélectionne 24 seeds sur la planche : les 24 premiers, `petit-meme-01` … `petit-meme-24`, dans l'ordre
- [x] Figer les seeds retenus dans `src/constants/avatar.ts` : `AVATAR_STYLE_ID`, `AVATAR_BACKGROUND_PALETTE`, et les seeds eux-mêmes. Ils vivent dans `AVATAR_CATALOG`, un seed par AvatarSlot, et non dans un `AVATAR_SEEDS` séparé comme annoncé ici à l'origine : les deux tableaux auraient pu se désynchroniser. Source de vérité unique, consommée par `scripts/generate-avatars.ts` (le compteur de la planche vaut `AVATAR_CATALOG.length`)

Répartition des couleurs sur les 24 retenus : 8 roses, 6 pêches, 4 lavandes, 3 violets, 3 bleus. Déséquilibre assumé, conséquence du choix « les 24 premiers » plutôt qu'une sélection équilibrée à la main. Rattrapable sans casse tant que la phase 1 n'est pas commitée, et rattrapable après coup au prix d'une régénération des fichiers (les emplacements ne bougent pas, seuls les dessins changent).

Le script a eu deux modes le temps de la curation (`--mode=contact-sheet`, `--mode=generate`). **La planche a été supprimée après la revue de la phase 4** : elle avait rempli son office, pesait environ 500 des 731 lignes du script, et seul `--mode=generate` était câblé dans `package.json`. `scripts/generate-avatars.ts` ne fait plus qu'une chose et ne prend plus d'arguments. L'historique git garde la planche si un changement de style impose d'en rejouer une.

Adventurer Neutral n'expose qu'une seule couleur, `background` : le visage est un trait noir sans couleur propre, et sa palette d'origine ne contient que quatre bruns (`#f2d3b1`, `#ecad80`, `#9e5622`, `#763900`), d'où l'impression de monochromie. Le moteur accepte n'importe quelle palette de remplacement et en tire une couleur par seed, de façon déterministe. La planche compare dix palettes : `origine`, `neutre`, `papier`, `pastel`, `bonbon`, `agrumes`, `lagon`, `terre`, `vif`, `large`. **La palette retenue devra être passée au mode `generate` en phase 1 et figée à côté des seeds** : deux palettes différentes sur le même seed donnent deux fichiers différents.

Le nombre de couleurs d'une palette compte autant que leur teinte : sur 24 emplacements, une palette de 5 couleurs fait revenir chaque teinte environ cinq fois, d'où `large` (12 couleurs) qui réduit les répétitions au prix de teintes plus proches les unes des autres, difficiles à distinguer à 32px.

Les styles en CC BY 4.0 (Adventurer, Micah, Big Smile, Fun Emoji, Personas, Croodles, Miniavs, Big Ears, Dylan, Toon Head, Glyphs) imposent une ligne d'attribution visible sur le site. **Adventurer Neutral, ajouté à la planche à la demande de Victor, est dans ce lot** : la planche le signale par un badge. Le retenir engage à afficher le crédit « Remix of "Adventurer Neutral" by Lisa Wischofsky, licensed under CC BY 4.0 ».

## Phase 1 — Catalogue statique

- [x] `src/constants/avatar.ts` : `AVATAR_CATALOG` en `as const satisfies`, un id par AvatarSlot (`avatar-01` … `avatar-24`) avec son seed, plus `AVATAR_STYLE_ID`, `AVATAR_DIRECTORY`, `AVATAR_BACKGROUND_PALETTE` et le type `AvatarSlotId`. Source de vérité unique, déjà consommée par le script
- [x] Générer les 24 SVG dans `public/avatars/` et les commiter (`pnpm run avatars:generate`, 168 Ko au total)
- [x] `vite.config.ts` : route rule `/avatars/**` en `max-age=604800`, via `AVATAR_ASSET_HEADERS`, distincte de `IMMUTABLE_ASSET_HEADERS`
- [x] `src/helpers/avatar.ts` : `resolveAvatarPath`, `matchIsAvatarPath` et `getAvatarSlotIdForEmail` (FNV-1a, e-mail normalisé en minuscules et trimé, répartition vérifiée sur 5000 adresses : 189 à 229 par emplacement pour 208 attendus)

**Le chemin n'est pas stocké dans le catalogue**, contrairement à la formulation initiale : il se déduit mécaniquement de l'id (`/avatars/<id>.svg`) et le stocker deux fois ouvrirait une désynchronisation. `resolveAvatarPath` est la seule façon de le construire.

Les SVG sont écrits **sans attributs `width`/`height`**, uniquement avec leur `viewBox` : ils prennent la taille de leur conteneur CSS, donc les mêmes fichiers servent la navbar en 32px et les réglages en 96px. Ils embarquent le bloc RDF de DiceBear qui porte la licence, ce qui ne dispense pas du crédit visible de la phase 5.

## Phase 2 — Base de données

- [x] `prisma/schema.prisma` : `providerImage String? @map("provider_image")` sur `model User`
- [x] Migration additive lancée par Victor : `20260725215859_add_user_provider_avatar`, un seul `ALTER TABLE "user" ADD COLUMN "provider_avatar" TEXT`. Aucune opération destructive, aucune valeur par défaut nécessaire puisque la colonne est nullable. La première version, `20260725210249_add_user_provider_image`, a été supprimée avec le renommage du vocabulaire (voir phase 4) : elle n'avait jamais atteint la prod, seule la base de dev l'avait appliquée
- [x] `src/lib/auth.tsx`, hook `databaseHooks.user.create.before` : extrait dans `buildUserCreateData` au niveau module (la config dépassait la limite de 250 lignes par fonction). Écrit `providerImage` depuis l'image OAuth quand elle existe, et n'attribue un AvatarSlot dérivé du hash de l'e-mail que lorsque `image` est absent. Une image OAuth n'est jamais écrasée
- [x] `scripts/backfill-provider-avatars.ts`, lancé une fois via `pnpm dlx tsx` (tsx n'est pas une dépendance du projet) :
  - `provider_image = image` en un seul `UPDATE`, pour les lignes dont `image` n'est ni null, ni un chemin du catalogue, et qui ne sont pas anonymisées. Le prédicat vit dans une seule `Prisma.sql` partagée par le comptage `--dry-run` et l'`UPDATE`, et son motif `LIKE` est dérivé d'`AVATAR_DIRECTORY` plutôt que réécrit
  - attribution d'un AvatarSlot aux lignes dont `image` est null, via la **même fonction de hash** que le hook, jamais un équivalent réécrit en SQL
  - les lignes `is_anonymized = true` sont exclues des deux étapes : sans cette exclusion le backfill rendrait un avatar à des comptes supprimés
  - les mises à jour sont groupées par AvatarSlot, donc au plus 24 `updateMany` dans une transaction quel que soit le nombre de comptes, pour ne pas réveiller la base plus que nécessaire
  - `--dry-run` compte sans rien écrire

`buildUserCreateData` écrit `providerImage` dès l'inscription, ce que la formulation initiale de cette phase passait sous silence en ne parlant que de l'attribution d'un AvatarSlot. Sans cette écriture, un compte OAuth créé après le deploy ne devrait son ProviderAvatar qu'à la garde auto-réparante de la phase 3, qui ne se déclenche qu'au premier changement d'avatar.

## Phase 3 — Serveur

- [x] Server fn `updateUserAvatar` (`src/server/user.ts`) : `.middleware([authUserRequiredMiddleware, createRateLimitMiddleware(RATE_LIMIT_UPDATE_AVATAR)])`, `.validator()` sur `AVATAR_SELECTION_SCHEMA`, un `z.enum` construit à partir des ids du catalogue plus `AVATAR_PROVIDER_SELECTION`. Retourne `{ image }` pour la mise à jour optimiste de la phase 4
- [x] Garde auto-réparante dans le handler : si `providerImage` est null et que `image` n'est pas un chemin du catalogue (`matchIsAvatarPath`), `image` est recopié dans `providerImage`. Ferme la fenêtre entre le deploy Vercel et le passage du backfill, pendant laquelle un changement d'avatar perdrait définitivement le ProviderAvatar
- [x] `provider` résout vers `providerImage`. Si null, la valeur est refusée par un `throw new Response(..., { status: 400 })`. Un `setResponseStatus(400)` suivi d'un `throw new Error` ne donne **pas** un 400 : l'Error remonte à la couche serveur externe en 500. Leçon déjà apprise sur le rate limiter au commit 390e369, appliquée ici après la revue de la phase 4
- [x] `src/constants/rate-limit.ts` : `RATE_LIMIT_UPDATE_AVATAR`, 20 changements par heure et par IP, en mémoire, aucune écriture en base
- [x] `src/routes/api/cron/cleanup.ts` : `"provider_image" = NULL` ajouté à l'`UPDATE` d'anonymisation. Une URL Discord contient l'identifiant Discord de la personne, elle est donc réidentifiante et doit disparaître avec le reste
- [x] `exportUserData` (`src/server/user.ts`) : `providerImage` ajouté au `select` et au payload `profile`

Aucune valeur ajoutée à `ActivityEventType` : changer d'avatar est un réglage de compte, pas un acte de consommation, et un enum Prisma ne se retire jamais.

La réparation et l'écriture du nouvel Avatar tiennent dans **un seul `UPDATE`** plutôt que dans une transaction interactive : une instruction unique est déjà atomique, et elle épargne à Neon les allers-retours d'un `BEGIN`/`COMMIT`. `providerImage` n'est présent dans le `data` que lorsqu'il y a effectivement quelque chose à réparer, ce qui préserve la règle « écrite une seule fois, jamais réécrite ».

`AVATAR_PROVIDER_SELECTION` et le type `AvatarSelection` vivent dans `src/constants/avatar.ts` : la phase 4 en a besoin pour envoyer la valeur, le littéral `'provider'` n'est donc écrit qu'une fois.

## Phase 4 — UI

- [x] Consolider les 5 rendus d'avatar sur `UserAvatar` (`src/components/user-avatar.tsx`). Le composant gagne deux axes plutôt qu'une seule taille `lg` : cinq tailles (`xs` 16px feed admin, `sm` 24px trigger du dropdown, `md` 32px label du dropdown, `lg` 36px bouton admin, `xl` 96px réglages) et une forme (`circle` par défaut, `rounded` pour les deux rendus du dropdown). Les tailles sont à parité pixel exacte avec l'existant : chacune est dimensionnée sur son bouton conteneur, les rabattre sur une valeur commune aurait déformé la navbar
- [x] `referrerPolicy="no-referrer"` et l'alt `m.common_avatar_alt` généralisés à tous les rendus. Le premier n'existait que sur `admin-nav-button`, le second que sur `user-dropdown`
- [x] Il y avait **7 rendus, pas 5**. `admin/ai-search/index.tsx` et `admin/submissions/index.tsx` construisaient eux aussi un `Avatar` brut, en dehors de la liste du plan, et affichent des URL de provider : la fuite de referrer que le point précédent visait à fermer y restait ouverte. Trouvés à la revue de la phase 4, tous deux passés sur `UserAvatar` en taille `md`, à parité pixel
- [x] Retirer `?? DEFAULT_AVATAR_URL` partout : les initiales de `AvatarFallback` redeviennent le vrai filet, aujourd'hui neutralisé
- [x] Supprimer `DEFAULT_AVATAR_URL`, `public/images/avatar.png` et `public/images/avatar-30x30.png` (ce dernier était déjà mort). Recherche préalable sur tout le dépôt : plus aucune référence hors documentation
- [x] Modale de sélection depuis `profile-header.tsx` (`avatar-picker-dialog.tsx`) : grille de 24 vignettes, précédée de la vignette du ProviderAvatar quand il existe, séparée d'elle par un `Separator` et son propre libellé
- [x] Déclencheur : l'avatar des réglages devient un vrai `<button>`, avec un voile au survol **et au `focus-visible`**, plus un badge crayon toujours visible. Le survol seul n'était atteignable ni au clavier ni au doigt
- [x] Dialog partout, pas de Drawer sur mobile. Une grille tient dans un Dialog centré à toutes les tailles (4 colonnes, 6 à partir de `sm`), et `useIsMobile()` renvoie `false` au premier rendu serveur, ce qui aurait fait apparaître le Drawer après hydratation
- [x] Clic sur une vignette = enregistré. Pas de bouton de confirmation : le choix est réversible en un clic
- [x] `useUpdateAvatar` (`src/hooks/use-update-avatar.ts`) : mise à jour optimiste, invalidation de `getAuthUserQueryOpts.all`, **et `router.invalidate()`**
- [x] Toast `sonner` et retour à l'état précédent en cas d'échec
- [x] Accessibilité : vignettes en `min-w-11` (44px) quelle que soit la largeur, `aria-busy` pendant la mutation, et navigation clavier aux flèches. La grille est un `ToggleGroup` Radix en `type="single"`, qui apporte le `tabindex` glissant et `aria-pressed` sans code maison

### Trois choses que la formulation initiale de cette phase disait de travers

**L'invalidation de la query ne suffisait pas, et le `staleTime` n'était pas le coupable.** `ProfileHeader` et la navbar lisent tous deux `user` dans le contexte de route (`settings/route.tsx`, `navbar.tsx`), lui-même figé par le `beforeLoad` racine (`__root.tsx`). Invalider le cache TanStack ne déclenche aucun re-render : il faut `router.invalidate()` pour rejouer le `beforeLoad`. Sans lui l'ancien avatar restait affiché jusqu'au prochain rechargement complet, pas cinq minutes.

**Il y avait un second cache de cinq minutes, non identifié.** `session.cookieCache` (`auth.tsx`) sert un cookie signé pendant 300 s sans toucher la base, donc `getAuthUser` renvoyait l'ancien `image` même après `router.invalidate()`. `useUpdateAvatar` appelle donc `authClient.getSession({ query: { disableCookieCache: true } })` après la mutation, ce qui relit la base et réécrit le cookie. Une requête par changement d'avatar, opération rare et déjà plafonnée à 20/h.

**Le précédent Drawer invoqué n'existait pas.** `studio-page.tsx` monte son Drawer en dur dans un bloc mobile face à une sidebar `hidden md:flex` : c'est du CSS, pas `useIsMobile()`.

### La grille est un ToggleGroup, et `aria-pressed` revient par la bande

Premier jet : `role="radiogroup"` à la main plus un hook `useRovingFocus` de 74 lignes, au motif que choisir un avatar est un choix unique et que `studio-templates.tsx` fait déjà comme ça. La revue a objecté que `src/components/ui/toggle-group.tsx` existe et donne le `tabindex` glissant gratuitement. Elle a raison : le hook est supprimé, la grille est un `ToggleGroup` en `type="single"`, et la sélection courante devient **une seule valeur** au lieu d'un `isSelected` par vignette doublé d'une arithmétique d'index. Radix rend des boutons `aria-pressed`, donc la sémantique demandée à l'origine par la phase revient d'elle-même.

Contrepartie assumée : `toggleVariants` est dessiné pour un segmented control horizontal (`h-9 px-2 rounded-md`, `flex w-fit`, `first:rounded-l-md last:rounded-r-md`). La modale doit donc l'écraser sur une poignée de classes (`size-auto`, `p-0`, `rounded-full`, `first:rounded-full last:rounded-full`, conteneur en `grid`). C'est le prix du composant partagé, il reste inférieur au coût du hook maison.

### `providerImage` était silencieusement jeté à l'inscription

Pour que la modale sache si un ProviderAvatar existe, `providerImage` est déclaré en `user.additionalFields` (`input: false`, donc non écrivable par le client) et arrive dans la session, dans `SessionUser` et dans le contexte de route, sans une requête de plus.

Cette déclaration ne fait pas qu'alimenter la modale : **elle répare la phase 2.** `transformInput` (`@better-auth/core/dist/db/adapter/factory.mjs`) construit la ligne à insérer en bouclant sur les seuls champs déclarés au schéma better-auth, et jette tout le reste. `providerImage`, renvoyé par `buildUserCreateData`, n'était donc jamais écrit à l'inscription : la colonne restait NULL jusqu'à ce que la garde auto-réparante de la phase 3 la remplisse au premier changement d'avatar. Corrigé.

Effet de bord du passage en `additionalFields` : better-auth réinfère le type utilisateur et `image` devient `string | null | undefined`. `UserAvatar` accepte les trois, et l'optimiste normalise en `undefined`.

### Déduplication

`src/constants/ui.ts` porte `SELECTED_TILE_RING_CLASS_NAME` et `FOCUS_VISIBLE_RING_CLASS_NAME`. La première chaîne existait en trois exemplaires identiques : `studio-templates.tsx`, `studio-controls.tsx` et la nouvelle modale. Toucher au Studio sort du périmètre annoncé de la phase, c'est assumé et signalé.

`resolveAvatarImage` (`src/helpers/avatar.ts`) porte désormais seule la correspondance sélection → URL. `resolveNextAvatar` (`src/server/user.ts`) l'appelle et n'ajoute que le 400 quand il n'y a pas de ProviderAvatar, au lieu de réécrire la même logique côté client.

`profile-header.tsx` ne dupliquait pas `getUserInitials`, il en implémentait une **autre** : deux premiers caractères du nom là où le helper prend l'initiale des deux premiers mots. Les réglages affichent donc désormais `VD` là où ils affichaient `VI`.

### Vocabulaire aligné sur CONTEXT.md

`CONTEXT.md` nomme le concept **ProviderAvatar** et range `image` puis `Photo SSO` sous `_Avoid_`. Le premier jet livrait pourtant `providerImage` partout. Renommé : `providerAvatar`, colonne `provider_avatar`, `resolveAvatar`, `recoveredProviderAvatar`, `archiveProviderAvatars`. Les deux chaînes fautives suivent : `common_avatar_alt` passe de « Photo de profil de {name} » à « Avatar de {name} », et `settings_avatar_provider_label` de « Photo de votre compte lié » à « Avatar de votre compte lié ».

Fait maintenant parce que la fenêtre se refermait : la migration n'avait jamais atteint la prod. Elle a été supprimée et doit être recréée sous le nom `add_user_provider_avatar`.

### Les consentements RGPD n'étaient jamais écrits non plus

Même mécanisme que `providerImage`, découvert en tirant le même fil. `buildUserCreateData` renvoie `termsAcceptedAt`, `privacyAcceptedAt` et `locale`, et `transformInput` les jetait tous les trois faute de déclaration. Conséquences en production aujourd'hui : les deux horodatages de consentement restent NULL à l'inscription, et un compte créé en anglais retombe sur le défaut Prisma `locale = fr`, ce qui décide de la langue de ses e-mails. Les trois rejoignent `USER_ADDITIONAL_FIELDS`, extrait au niveau module parce que la config dépassait de nouveau les 250 lignes. `locale` tire ses valeurs autorisées d'`Object.values(UserLocale)`, l'enum Prisma, plutôt que d'une liste réécrite à la main.

### `tsc` ne voit pas les erreurs de `select` Prisma

Vérifié pendant le renommage : avec un client généré périmé, `select: { thisFieldDoesNotExist: true }` passe `tsc` sans broncher. C'est **oxlint-tsgolint** qui rattrape, via `typescript/no-unnecessary-condition` sur les valeurs devenues `never`. Conséquence pratique : après toute modification du schema, un `tsc` vert ne prouve rien tant que `prisma generate` n'a pas tourné. Toujours lancer `pnpm run lint:fix` en entier.

### Clés i18n écrites ici et non en phase 5

Les six clés de la modale (`settings_avatar_*`) sont dans `messages/fr.json` et `messages/en.json`, pour que le site reste bilingue entre les deux phases. La phase 5 ne porte plus que le crédit CC BY.

## Phase 5 — i18n et finitions

- [x] ~~Clés de la modale dans `messages/fr.json` et `messages/en.json`~~ — livrées en phase 4, voir la note en fin de phase 4
- [x] **Crédit CC BY 4.0** : section « 8. Crédits » ajoutée à `md/fr/mentions-legales.md` et `md/en/mentions-legales.md`, pas de clé Paraglide et pas une ligne de JSX (voir la note ci-dessous). Liens cliquables vers le fichier Figma source et vers la licence. Non facultatif : sans cette ligne, l'usage des SVG est hors licence
- [x] `pnpm run lint:fix`
- [x] ~~`/simplify` (changement multi-fichiers)~~ — sauté sur décision de Victor : la phase 5 ne touche que deux fichiers markdown, il n'y a pas de code à simplifier
- [ ] Suggérer les audits pertinents : `security-auditor` (colonne nouvellement écrivable par l'utilisateur), `gdpr-auditor` (anonymisation et export), `dead-code` (placeholder supprimé)

### Le crédit ne passe pas par une clé Paraglide

La formulation initiale demandait une clé de message dans les deux locales et un bloc de liens dans `mentions-legales.tsx`. Ce fichier ne porte aucun texte : il charge `md/<locale>/mentions-legales.md` et le rend. Les seules clés `legal_mentions_*` servent le `<title>` et la meta description. Écrire le crédit en Paraglide aurait imposé de découper une phrase de deux liens en quatre clés par locale, puis de recoller le tout en JSX sous le `<Markdown>`, visuellement détaché des sept sections numérotées.

Le crédit est donc une section markdown comme les autres. `BASE_MARKDOWN_COMPONENTS.a` (`src/constants/markdown.tsx`) pose déjà `target="_blank" rel="noopener noreferrer"` sur tout lien qui ne commence pas par `/`, l'exigence est satisfaite sans code neuf.

Le texte d'attribution reste **en anglais dans les deux locales**, mot pour mot ce que renvoie `meta.license.text` du style, guillemets `„ ”` compris. Seule la phrase d'introduction est traduite. Traduire l'attribution elle-même la ferait diverger de la formulation exigée par la licence.

`Dernière mise à jour` / `Last updated` passe de février à **juillet 2026** dans les deux fichiers : la page vient d'être modifiée, la date précédente devenait fausse.

---

## Correctif post-livraison — un 429 ne remontait aucune erreur au client

Constaté par Victor en dev : dépasser `RATE_LIMIT_UPDATE_AVATAR` ne produit aucun toast. Ce n'est pas un bug de la feature avatar, c'est le commit `390e369` qui l'a introduit sur **tous** les server fn limités.

Le chemin, vérifié dans les sources du framework :

1. `createServerFn.ts:353` enveloppe toute la chaîne de middlewares dans un `try/catch` qui transforme n'importe quel `throw` en `{ ...ctx, error }`. Une `Response` jetée n'atteint donc jamais le `catch (error) { if (error instanceof Response) return error }` de `server-functions-handler.ts:372` sur lequel s'appuyait le commentaire de `rate-limit.ts`.
2. `server-functions-handler.ts:161` récupère `res.result || res.error`, donc la `Response` 429.
3. Ligne 176, comme ce n'est pas un redirect, elle reçoit l'en-tête `X-TSS-Raw-Response: true`.
4. `serverFnFetcher.ts:247` lit cet en-tête et fait `return response` : **la promesse est résolue, pas rejetée**.

La mutation réussissait donc silencieusement, `onSuccess` relançait `authClient.getSession()` et l'avatar revenait en arrière sans un mot. Les erreurs ordinaires remontent bien parce qu'elles passent par l'enveloppe sérialisée, que la chaîne cliente déballe avec `if (result.error) throw result.error` (`createServerFn.ts:314`) ; une `Response` court-circuite cette enveloppe.

Dégâts collatéraux : `matchIsRateLimitError` ne pouvait jamais matcher, donc trois branches étaient mortes sans que personne le voie — `submission-form.tsx:101`, `ai-search-page.tsx:32` et le retry de `router.tsx:33`.

- [x] `src/server/rate-limit.ts` : retour à `setResponseStatus(429)` + `setResponseHeader('Retry-After', …)` + `throw new Error`. Le statut et l'en-tête sont repris par `serializeResult`, qui lit `getResponse()`, et l'Error passe par l'enveloppe donc le client rejette
- [x] `src/constants/rate-limit.ts` : `RATE_LIMIT_ERROR_MESSAGE`, consommée par le throw et par `matchIsRateLimitError` (`src/helpers/error.ts`), qui réécrivait le littéral `'Too Many Requests'` à la main
- [x] `src/server/user.ts`, `resolveNextAvatar` : même correction sur le `throw new Response(…, { status: 400 })` quand il n'y a pas de ProviderAvatar, qui souffrait du même silence
- [x] `useUpdateAvatar` : message dédié `settings_avatar_error_rate_limit` dans les deux locales, sur le modèle de `submission-form.tsx`. Le message générique disait « Réessayez », mauvais conseil quand le quota est bloqué pour une heure
- [ ] **À retester par Victor en dev** : dépasser 20 changements et vérifier qu'un toast apparaît *et* que la réponse est bien en 429. `390e369` affirme avoir observé un 500 avec `setResponseStatus` + `throw new Error` ; si le 500 revient, se rabattre sur un `throw new Error` sans statut (feedback garanti, réponse en 200)

## Resynchronisation de la base de dev — faite

Le renommage du vocabulaire a supprimé la migration déjà appliquée en dev. Séquence exécutée par Victor, `lint:fix` vert ensuite :

```bash
pnpm run prisma:reset-db:dev
pnpm exec dotenv -e .env.development -- pnpm exec prisma migrate dev --name add_user_provider_avatar
pnpm exec dotenv -e .env.development -- pnpm exec prisma generate
pnpm run prisma:seed:dev
pnpm run lint:fix
```

**`prisma generate` doit passer avant le seed, pas après.** `migrate dev` ne régénère pas le client custom (`output` personnalisé dans le schema). Sans cette étape, le client garde l'ancien nom de colonne et le seed échoue sur un `P2022 ColumnNotFound`, parce que Prisma termine ses `INSERT` par un `RETURNING` qui liste tous les champs scalaires du modèle.

## Séquence de déploiement

**La migration part en prod AVANT le code.** L'ordre inverse, écrit ici jusqu'à la revue de la phase 4, casserait toutes les inscriptions.

1. `vercel env pull --environment=production .env.production`
2. `pnpm run prisma:migrate:prod`
3. Push, deploy Vercel automatique
4. `pnpm exec dotenv -e .env.production -- pnpm dlx tsx scripts/backfill-provider-avatars.ts`

Migrer d'abord est sans danger : la migration est purement additive et le code actuellement en prod ignore la colonne, qui est nullable.

### Pourquoi l'ordre inverse était dangereux

La formulation initiale faisait partir le code d'abord, en s'appuyant sur la garde auto-réparante de la phase 3. Ce raisonnement tenait tant que `providerImage` n'était pas déclaré à better-auth : `transformInput` le jetait silencieusement, donc l'`INSERT` d'inscription ne mentionnait jamais la colonne manquante. La déclaration en `additionalFields` ajoutée en phase 4 change exactement cela. Entre le deploy et la migration, chaque inscription tenterait d'écrire `provider_image` dans une table qui ne l'a pas encore, et échouerait sur un `42703`.

La garde auto-réparante reste utile, mais pour une autre raison : elle rattrape les comptes qui changent d'avatar entre la migration et le passage du backfill.
