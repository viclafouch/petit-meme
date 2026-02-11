# Audit — RGPD / GDPR

| Sévérité | Nombre |
|----------|--------|
| CRITICAL | 3 |
| HIGH | 5 |
| MEDIUM | 5 |
| LOW | 3 |

**Points positifs :** Suppression de compte existante avec cascade Prisma, vérification d'email requise, cookies session httpOnly + sameSite, Mixpanel sur endpoint EU (`api-eu.mixpanel.com`), hashing des mots de passe via better-auth, secrets gérés via variables d'environnement, expiration des sessions configurée (7 jours).

---

## Inventaire des données personnelles

| Modèle | Données personnelles | Finalité | Base légale |
|--------|---------------------|----------|-------------|
| **User** | id, name, email, emailVerified, image, role, banned, stripeCustomerId, generationCount | Gestion de compte, facturation | Contrat (Art. 6(1)(b)) |
| **Account** | userId, accountId, providerId, accessToken, refreshToken, password | Authentification OAuth | Contrat (Art. 6(1)(b)) |
| **Session** | userId, token, ipAddress, userAgent, impersonatedBy | Gestion de session | Contrat (Art. 6(1)(b)) |
| **Subscription** | referenceId, stripeCustomerId, stripeSubscriptionId | Facturation | Contrat (Art. 6(1)(b)) |
| **UserBookmark** | userId, memeId | Préférences utilisateur | Contrat (Art. 6(1)(b)) |
| **MemeViewDaily** | viewerKey (UUID cookie), memeId, day, watchMs | Tracking de vues | Intérêt légitime (Art. 6(1)(f)) — à revoir |
| **Verification** | identifier, value | Tokens de vérification email | Contrat (Art. 6(1)(b)) |

### Sous-traitants tiers

| Service | Données partagées | Finalité |
|---------|-------------------|----------|
| **Mixpanel** | user ID, nom, email, comportement, recherches, pages vues, sessions, heatmaps | Analytics |
| **Stripe** | email, stripeCustomerId, données de paiement | Facturation |
| **Twitter/X** | username, email, image profil | Authentification sociale |
| **Resend** | adresse email, username | Emails transactionnels |
| **Bunny CDN** | Contenu vidéo (pas de PII) | Diffusion de contenu |
| **Algolia** | Contenu memes (pas de PII) | Recherche |
| **Google Fonts** | Adresse IP (via requête navigateur) | Polices |

---

## CRITICAL

### 1. Aucun bandeau de consentement cookies

**Articles :** Art. 6(1)(a), Directive ePrivacy Art. 5(3), Recommandations CNIL cookies (2020)

Aucun mécanisme de consentement cookies dans toute la codebase. L'application pose les cookies suivants sans consentement :

1. **Cookie session auth** (`better_auth.session_token`) — 7 jours → strictement nécessaire, exempt
2. **`anonId`** — UUID persistant pour tracking de vues, **1 an** d'expiration → nécessite consentement
3. **`ui-theme`** — préférence de thème → strictement nécessaire, exempt
4. **Mixpanel localStorage** — `persistence: 'localStorage'` → nécessite consentement

**Fix :** Implémenter un bandeau CNIL-compliant (Tarteaucitron.js ou custom). Catégoriser : (a) strictement nécessaire (exempt), (b) analytics/tracking (consentement requis). Bloquer Mixpanel et cookie `anonId` tant que l'utilisateur n'a pas consenti.

---

### 2. Mixpanel initialisé inconditionnellement avec `ignore_dnt: true`

**Articles :** Art. 6(1)(a), Art. 7, Directive ePrivacy Art. 5(3)

**Fichier :** `src/client.tsx:11-19`

```javascript
mixpanel.init('5800e2b9e077ccdaf4cadb637f919c14', {
  track_pageview: true,
  autocapture: true,
  ignore_dnt: true,
  record_sessions_percent: 30,
  record_heatmap_data: true,
  persistence: 'localStorage',
  api_host: 'https://api-eu.mixpanel.com'
})
```

Problèmes identifiés :
- **`ignore_dnt: true`** : ignore le signal Do Not Track, contraire à l'esprit RGPD et explicitement déconseillé par la CNIL
- **`autocapture: true`** : capture toutes les interactions sans consentement
- **`record_sessions_percent: 30`** : enregistre 30% des sessions (replays d'écran) sans consentement — peut capturer des données saisies dans les formulaires
- **`record_heatmap_data: true`** : enregistre les heatmaps sans consentement

De plus, des PII sont envoyées à Mixpanel lors du login (`src/components/User/auth-dialog.tsx:93-97`) :
```javascript
mixpanel.identify(user.id)
mixpanel.people.set({ $name: user.name, $email: user.email })
```

**Fix :** (1) Ne pas initialiser Mixpanel avant consentement. (2) Retirer `ignore_dnt: true`. (3) Gater l'enregistrement de sessions derrière un consentement séparé explicite. (4) Arrêter d'envoyer $email et $name à Mixpanel sans consentement.

---

### 3. Aucune politique de confidentialité

**Articles :** Art. 13, Art. 14

Le footer (`src/components/footer.tsx`) a un lien "Confidentialité" qui pointe vers `"/"` (la page d'accueil), pas vers une vraie page de politique de confidentialité. Aucune route `/privacy` n'existe. Les CGU (`md/terms-of-use.md`) mentionnent `https://petit-meme.io/privacy` mais cette page n'existe pas.

**Fix :** Créer une politique de confidentialité complète (`/privacy`) en français couvrant toutes les exigences de l'Art. 13 : identité du responsable, finalités, bases légales, durées de conservation, droits des personnes, droit de réclamation auprès de la CNIL, destinataires.

---

## HIGH

### 4. Aucune mentions légales

**Loi :** LCEN Art. 6-III

Aucune page "mentions légales" dans la codebase. La LCEN impose : nom complet, siège social, téléphone, email, RCS/SIRET, directeur de publication, hébergeur.

**Fix :** Créer une page `/mentions-legales`.

---

### 5. Aucun mécanisme de portabilité des données (export)

**Article :** Art. 20

Aucune fonctionnalité d'export de données. Les utilisateurs ne peuvent pas télécharger leurs données personnelles dans un format structuré et lisible par machine (JSON, CSV).

**Fix :** Implémenter un bouton "Télécharger mes données" dans les paramètres (profil + bookmarks + activité en JSON).

---

### 6. Aucun mécanisme de droit d'accès

**Article :** Art. 15

La page settings ne montre que le statut d'abonnement. Les utilisateurs ne peuvent pas consulter toutes leurs données stockées (email, nom, date de création, IP des sessions, bookmarks avec dates, historique de vues, Stripe customer ID).

**Fix :** Ajouter une section "Mes données" dans le profil ou implémenter l'export (finding #5) qui couvre aussi ce besoin.

---

### 12. Aucune collecte de consentement à l'inscription

**Articles :** Art. 6(1)(a), Art. 7, Art. 13

Le formulaire d'inscription (`src/components/User/auth-dialog.tsx`) collecte nom, email, mot de passe sans :
- Checkbox d'acceptation des CGU
- Checkbox d'acceptation de la politique de confidentialité
- Mention du traitement des données
- Information sur ce qui se passe avec les données

**Fix :** Ajouter au formulaire : (1) checkbox obligatoire CGU, (2) lien vers la politique de confidentialité, (3) optionnellement checkbox séparée pour analytics.

---

### 14. Aucune politique de rétention des données ni nettoyage automatique

**Article :** Art. 5(1)(e) (limitation de conservation)

Aucune durée de rétention définie ou appliquée :
- **Sessions** : ont un `expiresAt` mais aucun nettoyage automatique des sessions expirées
- **Tokens de vérification** : idem
- **MemeViewDaily** : croît indéfiniment sans stratégie de purge
- **Données utilisateur** : stockées indéfiniment jusqu'à suppression de compte

**Fix :** (1) Définir des durées de rétention par catégorie. (2) Implémenter un cron pour purger sessions expirées, tokens de vérification, et vieux MemeViewDaily. (3) Documenter dans la politique de confidentialité.

---

## MEDIUM

### 7. Pas de droit de rectification (modification du profil)

**Article :** Art. 16

Les utilisateurs peuvent changer leur mot de passe et supprimer leur compte, mais ne peuvent pas modifier leur nom ou adresse email.

**Fix :** Ajouter l'édition du nom et de l'email (avec re-vérification pour l'email) dans les paramètres.

---

### 8. Suppression de compte incomplète (Mixpanel, Stripe)

**Articles :** Art. 17, Art. 28

La suppression via `authClient.deleteUser()` cascade bien en base (Sessions, Accounts, UserBookmarks). Mais :
1. **Mixpanel** : le profil utilisateur ($name, $email) persiste — pas d'appel à `mixpanel.people.delete_user()`
2. **Stripe** : le customer record persiste dans Stripe
3. **MemeViewDaily** : lié au cookie UUID anonyme, pas cascade-deleted

**Fix :** À la suppression : (1) appeler l'API de suppression Mixpanel, (2) supprimer/anonymiser le customer Stripe, (3) purger les MemeViewDaily si associables à l'utilisateur.

---

### 9. Cookie de tracking de vues anonyme sans consentement

**Articles :** Art. 6(1)(a), Directive ePrivacy Art. 5(3)

**Fichier :** `src/server/meme.ts:193-247`

`registerMemeView` pose un cookie `anonId` (UUID) avec **1 an** d'expiration pour tous les visiteurs, y compris non authentifiés. Enregistre quels memes chaque utilisateur anonyme regarde, quel jour, et combien de temps (`watchMs`). Crée un profil de navigation pseudonymisé corrélable sur 1 an.

**Fix :** Soit (1) conditionner ce cookie au consentement, soit (2) utiliser une approche session-scoped sans identification persistante, soit (3) agréger sans tracking individuel (incrémenter les compteurs de vues sans stocker les enregistrements par viewer).

---

### 10. Longueur minimale de mot de passe de 4 caractères (côté serveur)

> → Voir aussi `security.md` HIGH #4 pour le volet technique.

**Articles :** Art. 32, Recommandation CNIL mots de passe (2022)

**Fichier :** `src/lib/auth.tsx:38` → `minPasswordLength: 4`

La CNIL exige minimum 8 caractères avec 3 types sur 4, ou 12 caractères sans complexité.

**Fix :** `minPasswordLength: 12` (ou 8 avec règles de complexité).

---

### 11. PII loggées en console en production

> → Voir aussi `security.md` LOW #12 pour le volet technique.

**Articles :** Art. 5(1)(f), Art. 32

**Fichier :** `src/lib/auth.tsx:76-77, 89-91`

Emails et profils Twitter loggés inconditionnellement en production.

**Fix :** Conditionner derrière `process.env.NODE_ENV !== 'production'`.

---

### 15. Aucune documentation de DPA (Data Processing Agreements)

**Article :** Art. 28

Au moins 6 sous-traitants utilisés (Mixpanel, Stripe, Twitter, Resend, Bunny, Algolia, Google Fonts). Aucune référence à des DPA dans la codebase ni la documentation.

**Fix :** S'assurer que des DPA sont signés avec tous les sous-traitants. Lister tous les sous-traitants dans la politique de confidentialité.

---

## LOW

### 13. Sessions stockent IP et User-Agent sans documentation

**Articles :** Art. 5(1)(c), Art. 13

Le modèle `Session` stocke `ipAddress` et `userAgent`. Les adresses IP sont des données personnelles (CJUE). Non documenté dans aucune mention de confidentialité.

**Fix :** Documenter la finalité dans la politique de confidentialité. Si stocké pour la sécurité, définir une durée de rétention.

---

### 16. Google Fonts chargées depuis le CDN externe

**Articles :** Art. 6(1)(a), Art. 44-49

**Fichier :** `src/routes/__root.tsx:51-59`

Charger Google Fonts depuis le CDN envoie l'IP de l'utilisateur à Google (US). Le tribunal de Munich (LG Munich, 2022) a jugé que c'est une violation du RGPD sans consentement.

**Fix :** Auto-héberger la police Bricolage Grotesque.

---

### 17. OAuth Twitter sans spécification explicite de la finalité

**Article :** Art. 13(1)(c)

Les utilisateurs ne sont pas informés des données collectées via Twitter (username, email, image profil) avant de cliquer sur le bouton de connexion Twitter.

**Fix :** Afficher une brève notice avant la redirection OAuth.

---

## Roadmap de remédiation

### Immédiat (Semaine 1) — CRITICAL :
1. Implémenter un bandeau de consentement cookies CNIL-compliant
2. Gater Mixpanel derrière le consentement, retirer `ignore_dnt: true`, arrêter l'envoi de PII
3. Créer et publier une politique de confidentialité (`/privacy`)

### Court terme (Semaine 2-3) — HIGH :
4. Créer la page mentions légales
5. Ajouter la collecte de consentement à l'inscription (checkbox CGU + lien privacy)
6. Implémenter l'export de données (JSON)
7. Définir et documenter les durées de rétention
8. Corriger `minPasswordLength` serveur à 8+ (ou 12 CNIL)

### Moyen terme (Semaine 4-6) — MEDIUM :
9. Ajouter l'édition de profil (nom, email)
10. Compléter le flux de suppression (Mixpanel, Stripe)
11. Corriger le logging de PII en production
12. Gater le cookie `anonId` derrière le consentement
13. S'assurer que les DPA sont signés
14. Auto-héberger Google Fonts
