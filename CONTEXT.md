# Petit Meme

Plateforme de consultation et de partage de mèmes vidéo. Victor est le seul créateur de mèmes ; le public les regarde, les télécharge, les partage et peut en générer des versions personnalisées.

## Language

### Acteurs

**Visitor**:
Quiconque agit sur le site, identifié par son adresse IP, qu'il possède un compte ou non.
_Avoid_: Viewer, anonyme, internaute

**User**:
Un Visitor qui possède un compte. Correspond strictement au modèle Prisma `User`.
_Avoid_: Membre, compte, client

**Creator**:
Victor, seul autorisé à publier des Memes. Ce qu'il fait sur le site relève de l'Audit, jamais de l'Activity : il n'est pas son propre public.
_Avoid_: Auteur, admin (l'admin désigne le rôle technique, pas la personne)

### Actions sur un Meme

**Export**:
La récupération par un Visitor du fichier vidéo watermarké d'un Meme. Se décline en deux intentions, Download et Share.
_Avoid_: Partage (le mot désigne une seule des deux intentions)

**Download**:
Un Export dont l'intention est d'enregistrer le fichier sur l'appareil.

**Share**:
Un Export dont l'intention est le partage natif. Se mesure à deux endroits qui ne comptent pas la même chose. Le compteur d'Audience ne retient que les partages **aboutis**, seul le navigateur pouvant connaître l'issue. L'Event d'Activity retient l'**intention**, le serveur voyant passer le fichier sans jamais apprendre la suite. Un partage abandonné compte donc dans l'Activity et pas dans l'Audience.
_Avoid_: Envoi, diffusion

**Generation**:
La création par un User d'une variante d'un Meme portant son propre texte.
_Avoid_: Création, montage

**View**:
La lecture effective d'un Meme par un Visitor, comptée une seule fois par Meme, Visitor et jour. Une lecture trop brève ne compte pas.
_Avoid_: Visionnage, impression, affichage

### Observation

**Event**:
Un fait horodaté attribué à un Visitor : une View, un Export, une Generation, une inscription, un abonnement, une mise en favori. Son attribution est figée au moment où il se produit : un Visitor qui crée ensuite un compte ne récupère pas ses Events antérieurs.
_Avoid_: Action (le mot désigne déjà un Export dans les compteurs), trace, log

**Activity**:
Le flux des Events, dans l'ordre où ils se sont produits.
_Avoid_: Historique, journal (réservé à l'Audit)

**Audit**:
La trace des actions du Creator sur le contenu, distincte de l'Activity qui ne concerne que le public.
_Avoid_: Activité admin

**Audience**:
L'agrégat quotidien des Views, conservé sur le long terme pour les courbes et le compteur public d'un Meme. Compte les Views selon la même règle que l'Activity, les deux chiffres concordent donc.
_Avoid_: Statistiques, analytics

### Identité

**Avatar**:
L'image qui représente un User sur le site. Toujours définie, éventuellement par une valeur par défaut.
_Avoid_: Photo de profil, image

**ProviderAvatar**:
L'Avatar fourni par Discord ou Twitter à l'inscription, figé à cet instant et jamais réécrit. Sert de choix par défaut et de retour arrière possible. Sa durée de vie n'est pas garantie : une URL Discord contient le hash de l'image, donc elle meurt le jour où la personne change sa photo. C'est un état connu, le repli est l'AvatarSlot dérivé de l'e-mail.
_Avoid_: Photo SSO, avatar d'origine

**AvatarSlot**:
Un emplacement du catalogue d'Avatars, identifié par son rang et non par le dessin qu'il porte. Un User choisit un AvatarSlot, jamais un visage : redessiner le catalogue change ce que tout le monde voit sans changer ce que quiconque a choisi.
_Avoid_: Preset, modèle, avatar par défaut

**VisitorKey**:
L'identifiant qui distingue deux Visitors sans les nommer. Dérivé de l'IP et renouvelé chaque jour, il permet de compter sans conserver de trace réidentifiable.
_Avoid_: viewerKey, anonId, userToken

**AlgoliaUserToken**:
Le jeton stable transmis à Algolia pour la pertinence des recommandations. Distinct du VisitorKey et posé uniquement avec le consentement du Visitor.
_Avoid_: userToken seul (ambigu : chez Algolia le mot désigne un anonyme)

## Contraintes

Des décisions qui se défont facilement de bonne foi, parce que le code seul ne dit pas pourquoi il est écrit ainsi.

**Le catalogue d'Avatars est append-only.**
On n'efface ni ne renomme jamais un fichier de `public/avatars/`. Un User a choisi un rang, pas un visage : retirer un fichier casse son Avatar sans qu'il ait rien fait. Redessiner les 24 mêmes fichiers est en revanche sans danger.

**DiceBear est généré localement et jamais appelé par son API.**
`api.dicebear.com` est réservé à l'usage non commercial et le site vend des abonnements Stripe. `@dicebear/core` reste en `devDependencies` : il sert à `pnpm run avatars:generate`, jamais au runtime.

**Le style d'avatar porte une obligation d'attribution.**
`AVATAR_STYLE_ID` vaut `adventurer-neutral`, publié en CC BY 4.0, ce qui impose le crédit visible de la section 8 des mentions légales. Changer de style oblige à reprendre cette section dans les deux locales : un style CC0 la rend inutile, un autre style CC BY en change le texte. Le texte exact est celui de `meta.license.text` du style, il ne se traduit pas.

**`/avatars/**` est servi en `max-age` d'une semaine, jamais en `immutable`.**
Volontaire. Un changement de style réécrit les 24 mêmes fichiers sous les mêmes noms, et `immutable` figerait l'ancien dessin jusqu'à un an chez les visiteurs. Contrepartie acceptée : un changement met jusqu'à sept jours à se propager.

**Tout champ écrit à l'inscription doit être déclaré à better-auth.**
`transformInput` construit la ligne insérée en bouclant sur les seuls champs connus du schema better-auth et jette le reste sans une erreur. Un champ renvoyé par le hook `user.create.before` mais absent de `USER_ADDITIONAL_FIELDS` n'est tout simplement jamais écrit. Ce piège a déjà coûté `provider_avatar`, puis les horodatages de consentement RGPD et la locale des e-mails.
