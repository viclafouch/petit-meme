# Politique de confidentialité - Petit Meme

Dernière mise à jour : **Février 2026**

La présente Politique de confidentialité décrit la manière dont **Petit Meme**
(accessible à l'adresse [https://petit-meme.io](https://petit-meme.io))
collecte, utilise et protège vos données personnelles, conformément au
**Règlement Général sur la Protection des Données (RGPD)**.

---

## 1. Responsable du traitement

Le responsable du traitement des données est :

- **Petit Meme**
- Site web : [https://petit-meme.io](https://petit-meme.io)
- Contact : [legal@petit-meme.io](mailto:legal@petit-meme.io)

Lorsque vous créez un compte via Twitter/X, nous collectons votre nom, adresse
e-mail et photo de profil. En procédant à la connexion, vous acceptez la
présente Politique de confidentialité.

---

## 2. Données collectées

### 2.1. Données de compte

Lors de la création d'un compte, nous collectons :

- Pseudo (nom d'utilisateur)
- Adresse e-mail
- Mot de passe (stocké sous forme hachée)
- Identifiant Twitter/X (en cas de connexion sociale)

### 2.2. Données de navigation et sessions

- Adresse IP (traitée temporairement pour la sécurité)
- Données de session d'authentification (cookies de session)

### 2.3. Données de vues et interactions

- Identifiant anonyme (`anonId`) pour le comptage des vues uniques
  (cookie, uniquement avec votre consentement)
- Nombre de vues et temps de visionnage des mèmes

### 2.4. Données de recherche et analytics Algolia (avec consentement)

Si vous acceptez les cookies, nous transmettons à Algolia :

- Événements de vue (mèmes consultés)
- Événements de clic (mèmes cliqués depuis les résultats de recherche)
- Un identifiant anonyme (`algoliaUserToken`) permettant de relier ces
  événements, sans lien avec votre identité personnelle

Ces données sont utilisées pour améliorer la pertinence des résultats de
recherche et générer des recommandations.

### 2.5. Données de génération Studio

Lorsque vous utilisez la fonctionnalité Studio (génération d'images à partir de
mèmes), nous enregistrons :

- La date et l'heure de chaque génération
- L'identifiant du mème utilisé

Ces données sont utilisées pour le contrôle d'utilisation (limitation du nombre
de générations gratuites) et l'amélioration du service (statistiques d'usage
agrégées). Elles sont conservées pendant **365 jours**, puis supprimées
automatiquement.

### 2.7. Données de recherche IA

Lorsque vous utilisez la fonctionnalité de recherche IA (description en langage
naturel d'un mème recherché), nous enregistrons :

- Le texte de votre demande (prompt)
- Les mots-clés extraits par l'IA
- Les identifiants des mèmes retournés
- La date de la recherche

Ces données sont utilisées pour le contrôle d'utilisation (limitation du nombre
de recherches gratuites) et l'amélioration du service. Votre prompt est transmis
à **Anthropic** pour l'extraction de mots-clés, sans lien avec votre identité
personnelle (seul le texte de la requête est envoyé). Les données sont
conservées pendant **365 jours**, puis supprimées automatiquement.

### 2.8. Données de paiement

Les paiements sont gérés par **Stripe**. Nous ne stockons jamais vos
informations de carte bancaire. Stripe collecte les données nécessaires au
traitement des paiements conformément à sa propre politique de confidentialité.

---

## 3. Finalités et bases légales

| Finalité | Base légale | Données concernées |
|----------|------------|-------------------|
| Création et gestion de compte | Exécution du contrat | Pseudo, e-mail, mot de passe |
| Authentification et sécurité | Intérêt légitime | Données de session, IP |
| Comptage des vues (avec cookie `anonId`) | Consentement | Identifiant anonyme |
| Amélioration de la recherche (Algolia Insights) | Consentement | Identifiant anonyme, événements de vue et de clic |
| Traitement des paiements | Exécution du contrat | Données transmises à Stripe |
| Envoi d'e-mails transactionnels | Exécution du contrat | Adresse e-mail |
| Recherche de mèmes | Exécution du contrat | Requêtes de recherche |
| Contrôle d'utilisation et analytics Studio | Intérêt légitime | Date de génération, identifiant du mème |
| Recherche IA par langage naturel | Exécution du contrat | Prompt, mots-clés extraits, résultats, date |
| Suivi des erreurs et stabilité du service | Intérêt légitime | Données techniques (URL, navigateur, traces d'erreur) |

---

## 4. Cookies

### Tableau des cookies utilisés

| Nom | Finalité | Durée | Consentement requis |
|-----|----------|-------|-------------------|
| `cookieConsent` | Mémoriser votre choix de consentement | 1 an | Non (strictement nécessaire) |
| `better-auth.session_token` | Session d'authentification | Durée de la session | Non (strictement nécessaire) |
| `theme` | Préférence de thème (clair/sombre) | 1 an | Non (strictement nécessaire) |
| `PARAGLIDE_LOCALE` | Mémoriser la langue choisie (fr/en) | 1 an | Non (strictement nécessaire) |
| `localeBannerDismissed` | Mémoriser la fermeture de la bannière de suggestion de langue | 1 an | Non (strictement nécessaire) |
| `anonId` | Comptage des vues uniques | 1 an | Oui |
| `algoliaUserToken` | Liaison des événements de recherche (vues, clics) pour Algolia | 1 an | Oui |

Vous pouvez gérer vos préférences cookies à tout moment. Si vous refusez les
cookies analytiques, les cookies `anonId` et `algoliaUserToken` ne seront pas
posés. Aucun événement ne sera transmis à Algolia.

---

## 5. Sous-traitants et destinataires

Nous faisons appel aux sous-traitants suivants pour le fonctionnement du
service :

| Sous-traitant | Finalité | Localisation |
|---------------|----------|-------------|
| **Stripe** | Traitement des paiements | États-Unis (clauses contractuelles types) |
| **Resend** | Envoi d'e-mails transactionnels | États-Unis (clauses contractuelles types) |
| **Bunny CDN** | Hébergement et diffusion des vidéos | Union européenne |
| **Algolia** | Moteur de recherche | Union européenne / États-Unis (clauses contractuelles types) |
| **Twitter/X** | Authentification sociale (OAuth) | États-Unis (clauses contractuelles types) |
| **Sentry** | Suivi des erreurs et monitoring de la stabilité | Allemagne (Union européenne) |
| **Google Fonts** | Chargement des polices d'affichage (adresse IP transmise) | États-Unis (clauses contractuelles types) |
| **Neon** | Hébergement de la base de données | États-Unis (clauses contractuelles types) |
| **Vercel** | Hébergement et exécution de l'application | États-Unis (clauses contractuelles types) |
| **Anthropic** | Recherche IA par langage naturel | États-Unis (clauses contractuelles types) |

Pour les transferts de données hors de l'Union européenne, des garanties
appropriées sont mises en place (clauses contractuelles types de la Commission
européenne).

---

## 6. Durées de conservation

| Données | Durée de conservation |
|---------|----------------------|
| Données de compte | Jusqu'à suppression du compte par l'utilisateur |
| Données de session | Durée de la session active (supprimées automatiquement à expiration) |
| Tokens de vérification | Supprimés automatiquement 24h après leur expiration |
| Données de vues détaillées (`MemeViewDaily`) | 90 jours, puis agrégées (compteur global) et supprimées |
| Cookie `anonId` | 1 an (avec consentement) |
| Cookie `algoliaUserToken` | 1 an (avec consentement) |
| Données d'événements Algolia (vues, clics) | Selon la politique de rétention d'Algolia (30 jours par défaut) |
| Données de génération Studio | 365 jours, puis supprimées automatiquement |
| Données du journal d'audit administratif | 2 ans, puis supprimées automatiquement |
| Données de recherche IA | 365 jours, puis supprimées automatiquement |
| Données de paiement (Stripe) | Selon les obligations légales de Stripe |
| E-mails transactionnels | Selon la politique de rétention de Resend |

Un processus automatisé de nettoyage s'exécute une fois par semaine pour
supprimer les sessions expirées, les tokens de vérification obsolètes et
agréger les données de vues au-delà de 90 jours.

À la suppression de votre compte, vos données personnelles sont supprimées
dans un délai de 30 jours, à l'exception des données que nous sommes tenus de
conserver en vertu d'obligations légales.

---

## 7. Vos droits

Conformément au RGPD, vous disposez des droits suivants :

- **Droit d'accès** : obtenir une copie de vos données personnelles
- **Droit de rectification** : corriger vos données inexactes ou incomplètes
- **Droit à l'effacement** : demander la suppression de vos données
- **Droit à la portabilité** : recevoir vos données dans un format structuré
  et lisible par machine
- **Droit d'opposition** : vous opposer au traitement de vos données basé sur
  l'intérêt légitime
- **Droit de retrait du consentement** : retirer votre consentement aux
  cookies analytiques à tout moment

Pour exercer vos droits, contactez-nous à :
[legal@petit-meme.io](mailto:legal@petit-meme.io)

Nous nous engageons à répondre à votre demande dans un délai d'un mois.

---

## 8. Sécurité

Nous mettons en œuvre des mesures techniques et organisationnelles appropriées
pour protéger vos données personnelles :

- Chiffrement des communications (HTTPS/TLS)
- Hachage des mots de passe
- Accès restreint aux données personnelles
- Hébergement sécurisé

---

## 9. Réclamation auprès de la CNIL

Si vous estimez que le traitement de vos données personnelles constitue une
violation du RGPD, vous avez le droit d'introduire une réclamation auprès de
la **Commission Nationale de l'Informatique et des Libertés (CNIL)** :

- Site web : [https://www.cnil.fr](https://www.cnil.fr)
- Adresse : 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07

---

## 10. Modification de cette politique

Petit Meme se réserve le droit de modifier la présente Politique de
confidentialité. En cas de modification substantielle, les utilisateurs seront
informés via le site.

---

## 11. Contact

Pour toute question relative à cette politique de confidentialité :
[legal@petit-meme.io](mailto:legal@petit-meme.io)
