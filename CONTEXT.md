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
Un Export dont l'intention est le partage natif, et uniquement lorsque ce partage a abouti. Un partage abandonné n'est pas un Share.
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

**VisitorKey**:
L'identifiant qui distingue deux Visitors sans les nommer. Dérivé de l'IP et renouvelé chaque jour, il permet de compter sans conserver de trace réidentifiable.
_Avoid_: viewerKey, anonId, userToken

**AlgoliaUserToken**:
Le jeton stable transmis à Algolia pour la pertinence des recommandations. Distinct du VisitorKey et posé uniquement avec le consentement du Visitor.
_Avoid_: userToken seul (ambigu : chez Algolia le mot désigne un anonyme)
