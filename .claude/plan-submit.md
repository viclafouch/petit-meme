# Plan — Propositions de mèmes par les utilisateurs

Les utilisateurs connectés peuvent proposer des mèmes à ajouter via un lien. L'admin review et convertit en mème. Chaque phase est déployable indépendamment.

---

## Phase 1 — Fondations (DB + server functions + validation)

Objectif : tout le backend prêt, rien de visible côté user.

### 1.1 — Schema DB (migration additive)

- [x] Enum `MemeSubmissionUrlType` (TWEET, YOUTUBE)
- [x] Enum `MemeSubmissionStatus` (PENDING, APPROVED, REJECTED)
- [x] Table `MemeSubmission` : `id`, `user_id` (FK User, CASCADE), `title`, `url` (unique constraint globale), `url_type` (enum), `content_locale` (enum MemeContentLocale), `status` (enum, default PENDING), `admin_note` (optionnel, texte libre admin — jamais exposé côté user), `meme_id` (FK Meme, nullable — rempli quand converti), `created_at`, `updated_at`
- [x] Index : `status`, `user_id`, `(status, created_at DESC)`
- [x] Appliquer la migration en dev, vérifier le SQL généré (aucun DROP)

### 1.2 — Constants & validation Zod

- [x] `src/constants/meme-submission.ts` :
  - Schema Zod strict pour la soumission
  - Twitter/X : réutiliser `TWEET_LINK_SCHEMA` existant (whitelist `twitter.com` / `x.com`)
  - YouTube : whitelist `youtube.com` / `youtu.be` + regex video ID
  - Titre : `.trim()`, min 3 chars, max 100 chars
  - `acceptTerms` : `z.literal(true)` — validation que la checkbox DMCA/CGU est cochée (même pattern que le signup). **Pas de stockage en DB** — l'existence de la soumission vaut preuve d'acceptation
  - Helper `detectUrlType(url)` : parse hostname → `TWEET` | `YOUTUBE` — jamais fourni par le client
  - Constants : `MAX_PENDING_SUBMISSIONS = 3`, `MAX_SUBMISSIONS_PER_DAY = 5`

### 1.3 — Server functions

- [x] `createMemeSubmission` dans `src/server/meme-submission.ts` :
  - Re-valider intégralement avec le schema Zod (ne jamais faire confiance au client)
  - Vérifier `user` via session → 401 si pas de session
  - Bloquer les utilisateurs bannis (`user.banned`) → 403
  - Vérifier cap 3 pending max (`count(where: { userId, status: PENDING })`) → erreur explicite
  - Sanitization du titre (trim, strip control chars) avant insert
  - `url_type` dérivé via `detectUrlType(url)` côté serveur
  - Gérer le `unique constraint` sur `url` → erreur explicite "Ce lien a déjà été soumis"
  - URL jamais fetched/resolved côté serveur (anti-SSRF) — stockée telle quelle
- [x] `getUserSubmissions` dans `src/server/meme-submission.ts` :
  - Filtrer strictement par `session.user.id` — un user ne peut JAMAIS voir les soumissions d'un autre
  - Pas d'ID utilisateur dans les query params — toujours dérivé du session token
  - Select Prisma SANS `admin_note` (jamais exposé côté user)
  - Ordered `created_at DESC`
  - Inclure `meme` (relation) pour les soumissions approuvées (lien vers la page mème)

### 1.4 — Rate limit per-user

- [x] `createUserRateLimitMiddleware` dans `src/server/rate-limit.ts` (in-memory, pas DB — pattern existant per-IP adapté per-user via `session.user.id`)
- [x] Appliquer sur `createMemeSubmission` (5 soumissions / 24h)

**Déployable à ce stade** : oui (aucun changement UI, le schema DB est en place).

---

## Phase 2 — Page utilisateur `/submit`

Objectif : le user peut soumettre et voir ses soumissions. Utiliser `/frontend-design` avant de coder.

### 2.0 — Design UI

- [x] Utiliser `/frontend-design` pour la page `/submit`

### 2.1 — Route & navigation

- [x] Route publique `src/routes/_public__root/_default/submit/index.tsx` — pas de `beforeLoad` redirect
- [x] Si `!user` : message invitant à se connecter + bouton qui ouvre `AuthDialog` via `showDialog('auth', {})` (pattern existant `ToggleLikeButton`). **Pas de redirect automatique vers login.**
- [x] Si `user` : formulaire + historique sur la même page, layout unique (pas de tabs)
- [x] Lien dans la navbar (dropdown menu user connecté + mobile nav, à côté de Favoris/Settings)
- [x] **SEO** : `noindex` — page réservée aux utilisateurs connectés

### 2.2 — Layout page (single scroll, pas de tabs)

- [x] **Section haute — Règles de soumission** (`submission-rules.tsx`)
  - 7 règles avec icônes Lucide, grid 2 colonnes desktop, 1 colonne mobile
  - Mention warning en bas
- [x] **Encart Droits d'auteur / Copyright** (`submission-rules.tsx` — `CopyrightNotice`)
  - Alert variant `info` avec icône Copyright
  - Lien vers `/dmca`
- [x] **Section milieu — Formulaire de soumission** (`submission-form.tsx`)
  - Champs : titre, lien, langue audio (Select), checkbox DMCA/CGU
  - `url_type` auto-détecté, pas de champ
  - Toast sonner, reset formulaire, invalidation query
  - Erreurs serveur affichées inline (StudioError codes mappés)
  - Compteur soumissions restantes
- [x] **Section basse — Historique des soumissions** (`submission-history.tsx`)
  - Liste avec séparateurs, badges statut colorés, date relative
  - Lien vers le mème si approuvé
  - Empty state avec icône Inbox

### 2.3 — Page DMCA

- [x] Fichiers markdown `md/fr/dmca.md` + `md/en/dmca.md` — procédure DMCA complète 17 U.S.C. § 512
- [x] Route `src/routes/_public__root/_default/dmca.tsx` — markdown loader par locale, `staleTime: Infinity`
- [x] Lien `/dmca` ajouté dans le footer (`src/constants/navigation.ts`)

### 2.4 — Messages Paraglide

- [x] Tous les messages FR/EN ajoutés : titre page, règles (7), labels formulaire, erreurs, statuts, empty state, message non connecté
- [x] Messages encart copyright : titre, texte explicatif, lien "En savoir plus"
- [x] Messages checkbox DMCA/CGU : préfixe + lien CGU + conjonction + lien privacy
- [x] Messages page DMCA : titre, description SEO
- [x] Messages navigation : `nav_submit`, `footer_dmca`

**Déployable à ce stade** : oui. Les users peuvent soumettre, l'admin voit les submissions en DB mais n'a pas encore d'interface dédiée.

---

## Phase 3 — Interface admin `/admin/submissions`

Objectif : l'admin peut review, approuver et rejeter les soumissions.

### 3.0 — Design UI

- [ ] Utiliser `/frontend-design` pour la page admin `/admin/submissions`

### 3.1 — Server functions admin

- [ ] `getAdminSubmissions` : liste paginée avec filtres (status, date, utilisateur) — vérification rôle admin dans le handler (ne pas se reposer uniquement sur le `beforeLoad` de la route)
- [ ] `updateSubmissionStatus` : approuver (lier `meme_id`) ou rejeter (avec `admin_note` optionnel) — vérification rôle admin
- [ ] `deleteSubmission` : suppression — vérification rôle admin

### 3.2 — Page admin

- [ ] Page `/admin/submissions` — liste des propositions avec filtres (status, date, utilisateur)
- [ ] Actions : approuver (ouvre le flow de création de mème pré-rempli avec titre + URL + langue via `createMemeWithVideo`), rejeter (avec note optionnelle), supprimer
- [ ] Quand approuvé et mème créé : lier `MemeSubmission.meme_id` au mème créé
- [ ] Compteur de submissions en attente visible dans la sidebar admin

**Déployable à ce stade** : oui. Feature complète côté user + admin.

---

## Phase 4 — Notifications (optionnel)

Objectif : informer l'utilisateur quand sa soumission est traitée.

- [ ] Email à l'utilisateur quand sa proposition est acceptée/refusée
- [ ] Template email dans `src/emails/` (FR/EN), layout partagé existant

---

## Phase 5 — Audits & polish

Objectif : qualité production. Lancer les agents/skills Claude sur tout le code des phases 1–4, corriger chaque finding.

### 5.1 — Sécurité

- [ ] `security-auditor` sur `src/server/meme-submission.ts`, `src/constants/meme-submission.ts`, `src/routes/_public__root/_default/submit.tsx`, `src/routes/_public__root/_default/dmca.tsx`, `src/routes/admin/-components/` (submissions)
- [ ] Vérifier : injection, CSRF, auth bypass, IDOR, rate limit contournement, SSRF, XSS via titre/URL

### 5.2 — Performance backend

- [ ] `backend-performance` sur les server functions (`createMemeSubmission`, `getUserSubmissions`, `getAdminSubmissions`, `updateSubmissionStatus`)
- [ ] Vérifier : N+1 queries, index utilisés, count queries optimisées, pas de leak connexion Prisma

### 5.3 — Performance frontend

- [ ] `react-performance` sur la page `/submit` et la page admin `/admin/submissions`
- [ ] Vérifier : re-renders inutiles, référence stability des callbacks, list rendering keys, suspense boundaries

### 5.4 — Accessibilité

- [ ] `web-design-guidelines` sur la page `/submit` (formulaire, règles, historique, état non connecté)
- [ ] Vérifier : labels form, aria-attributes, focus management, keyboard navigation, contrast ratios, screen reader (statuts, erreurs, empty state), `role="alert"` sur les erreurs inline

### 5.5 — i18n & wording

- [ ] Relire tous les messages Paraglide FR/EN : clarté, ton cohérent avec le reste du site, pas de jargon technique
- [ ] Vérifier que les règles de soumission sont compréhensibles par un non-tech (pas de "SSRF", "hostname", etc.)
- [ ] Vérifier les erreurs user-facing : messages clairs et actionnables ("Ce lien a déjà été proposé" plutôt qu'un code erreur)
- [ ] Vérifier que toutes les chaînes visibles passent par Paraglide (aucun texte hardcodé)

### 5.6 — Tailwind & dead code

- [ ] `tailwind-audit` sur tous les composants créés/modifiés (page submit, composants admin, badges statut)
- [ ] `dead-code` sur `src/server/meme-submission.ts`, `src/constants/meme-submission.ts`, composants submissions

### 5.7 — Audit logs & error handling

- [ ] Audit backend : vérifier que chaque server function a un logging cohérent (info pour les actions réussies, warn/error pour les échecs, pas de log excessif qui pollue)
- [ ] Audit frontend : vérifier la gestion d'erreur côté client (mutation errors affichés, pas de `console.error` oublié, messages d'erreur user-facing traduits)
- [ ] Vérifier que les erreurs Prisma/server sont interceptées et loggées via Sentry (`captureWithFeature`) — pas de throw silencieux
- [ ] Vérifier les niveaux de log : `info` pour les opérations normales, `warn` pour les cas limites (rate limit, cap atteint), `error` pour les erreurs inattendues
- [ ] Vérifier qu'aucune donnée sensible (email, token, mot de passe) n'est loggée — respecter la config `redact` de pino

### 5.8 — `/simplify` final

- [ ] Lancer `/simplify` sur l'ensemble du code des phases 1–4 — reuse, quality, efficiency
