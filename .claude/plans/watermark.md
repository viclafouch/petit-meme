# Plan — Watermark téléchargement/partage (non-premium)

## Contexte

Les utilisateurs non-premium (free + anonymes) téléchargent et partagent les vidéos sans aucune marque. On veut ajouter un watermark (logo + "petit-meme.io") visible en bas-droite de la vidéo. Les premium et admins téléchargent sans watermark.

**Approche** : pré-générer les vidéos watermarkées via l'admin (ffmpeg WASM client-side) et les stocker sur **Bunny Storage**. Le serveur sert la bonne version selon le statut premium. Zéro traitement client-side pour les utilisateurs finaux.

**Scope** : téléchargement + partage (Web Share API), depuis la liste et la page slug.
**Hors scope** : studio (vidéos générées), auth gate sur le download.

**Workflow** : tout en local d'abord (dev), production à la toute fin. Branche `feat/watermark`, commit par phase terminée.

## Décisions techniques

| Décision | Choix |
|----------|-------|
| Asset watermark | PNG pré-fabriqué (logo + "petit-meme.io", fond transparent) |
| Position | Bas-droite |
| Opacité | ~60% (semi-transparent) |
| Taille | ~15% de la largeur vidéo (proportionnel) |
| Stockage watermarké | **Bunny Storage** (Standard, ~$0.035/mois pour ~7 GB) |
| Génération watermark | **Admin** : ffmpeg WASM client-side dans le form d'update du mème |
| Quand générer | Obligatoire pour publier/modifier un mème publié. Pas obligatoire à la création (PENDING) |
| Premium check | **Server-side** dans `shareMeme()` — impossible à contourner |
| Admins | Traités comme premium (pas de watermark) |
| Anonymes | Watermark (comme free users) |
| Suppression | Supprimer la vidéo watermarkée du Storage quand le mème est supprimé |
| Association watermark ↔ mème | Convention de nommage `{bunnyId}.mp4` dans Storage — pas de colonne DB |
| Batch initial | Script CLI ffmpeg pour les ~502 vidéos existantes |

## Infrastructure existante

- **`shareMeme()`** (`src/server/meme.ts:473-528`) : fetch blob depuis Bunny Video Library via signed URL, proxy vers le client
- **`auth.api.getSession({ headers })`** : pattern optional auth déjà utilisé dans `getAuthUser()` et le tracking Algolia
- **`findActiveSubscription()`** / **`matchIsUserAdmin()`** : check premium/admin
- **`dialog.store.tsx`** : pattern centralisé pour dialogs lazy-loaded
- **ffmpeg WASM** : `@ffmpeg/ffmpeg@0.12.15` installé, `useVideoInitializer()` + `useVideoProcessor()` dans le studio
- **Admin form** : `src/routes/admin/library/-components/meme-form.tsx` + `use-meme-form.ts`
- **Admin CRUD** : `src/routes/admin/-server/memes.ts` — `editMeme()`, `deleteMemeById()`
- **`getVideoBlobQueryOpts()`** : cache blob vidéo côté client, `staleTime: Infinity`

---

## Phase 1 — Asset watermark + constantes

Prérequis pour toutes les phases suivantes. Pas besoin de Bunny Storage à ce stade.

### 1.1 — Asset watermark

- [x] Créer `/public/images/watermark.png` :
  - Logo petit-meme + texte "petit-meme.io" blanc bold (Arial Bold), fond transparent
  - Bordure noire (`borderw=12, bordercolor=black@0.8`) + ombre portée (`shadowcolor=black@0.5`)
  - PNG 24-bit avec alpha, 1200x290 px (haute résolution pour downscale propre)
  - Design : logo à gauche, texte à droite, alignés verticalement
  - Généré via ffmpeg CLI (pas de dépendance npm image)

### 1.2 — Constantes

- [x] Créer `src/constants/watermark.ts` :
  - `WATERMARK_OPACITY` = 0.6
  - `WATERMARK_WIDTH_RATIO` = 0.21 (21% du côté le plus court)
  - `WATERMARK_MARGIN_RATIO` = 0.03 (3% du côté le plus court)
  - `WATERMARK_MAX_MARGIN` = 20 (cap en pixels pour les grandes vidéos)
  - `WATERMARK_FFMPEG_FILTER` — filter_complex string (split + scale rw/rh + opacity + overlay bottom-right)

**Livrable** : asset PNG prêt, constantes exportées.

---

## Phase 2 — Utilitaire watermark ffmpeg (partagé admin + batch)

Logique ffmpeg pour appliquer le watermark, réutilisable par l'admin (WASM) et le batch script (CLI).

### 2.1 — Extraction utilitaires ffmpeg partagés

- [x] Créer `src/utils/ffmpeg.ts` — extraire de `use-video-processor.ts` :
  - `readFFmpegOutput(ffmpeg)` — lit `output.mp4`, cleanup, retourne Blob
  - `FFMPEG_ENCODING_ARGS` — constante tableau (codec, preset, CRF, pixel format, threads)
- [x] Refactorer `use-video-processor.ts` pour importer depuis `src/utils/ffmpeg.ts`
  - `buildFFmpegArgs` utilise `...FFMPEG_ENCODING_ARGS`
  - `readFFmpegOutput` importé, cleanup `text.txt` déplacé dans `addTextToVideo`

### 2.2 — Utilitaire watermark

- [x] Créer `src/utils/watermark.ts` :
  - `applyWatermark(ffmpeg, videoBlob, watermarkBlob): Promise<Blob>`
    - Écrit `input.mp4` et `watermark.png` dans le filesystem ffmpeg
    - Utilise `-filter_complex` avec `WATERMARK_FFMPEG_FILTER` + `-map 0:a:0?` pour l'audio
    - Utilise `FFMPEG_ENCODING_ARGS` et `readFFmpegOutput()` depuis `src/utils/ffmpeg.ts`
    - Cleanup des fichiers temp après lecture du résultat

**Livrable** : utilitaire watermark partageable, studio refactoré.

---

## Phase 3 — Script batch local → vérification visuelle

Générer les vidéos watermarkées **localement dans un dossier temporaire** pour vérifier le résultat visuel avant d'investir dans l'infra Storage.

### 3.1 — Script batch local (50 premiers mèmes)

- [x] Créer `scripts/watermark-videos.ts` :
  - **Prérequis** : `ffmpeg` CLI installé localement (ffmpeg 8.0 dispo)
  - **Modes** : `--limit <n>` (défaut 50), `--meme-id <id>`, `--dry-run`, `--all`
  - **Output** : `./watermarked/` (gitignored)
  - **Flow par vidéo** :
    1. Skip si le fichier existe déjà dans le dossier output
    2. Fetch original depuis Bunny Video Library (signed URL)
    3. ffmpeg CLI avec `WATERMARK_FFMPEG_FILTER` (importé depuis `src/constants/watermark.ts`)
    4. Sauvegarde `{bunnyId}.mp4` dans le dossier output
    5. Cleanup temp files
  - **Concurrence** : 3 vidéos en parallèle
  - **Log** : résumé (traitées, skippées, erreurs) + taille totale générée
  - **DB** : lecture seule depuis la DB dev (SELECT bunnyId des mèmes PUBLISHED)
  - **Exécution** : `pnpm exec vite-node --mode development scripts/watermark-videos.ts --limit 50`

### 3.2 — Vérification visuelle par l'utilisateur

- [x] Victor vérifie le rendu sur 1 vidéo — OK
- [x] Ajuster les constantes : taille 21% du côté le plus court, marge `min(3%, 20px)`
- [x] Filtre ffmpeg migré de `scale2ref` (déprécié ffmpeg 8) vers `scale` avec `rw` + `split`
- [x] Watermark PNG régénéré haute résolution (1200x290px) avec bordure/ombre pour lisibilité
- [x] Test 10 vidéos production — rendu validé par Victor
- ~~Lancer `--all` localement~~ — pas nécessaire, Phase 4 uploade directement vers Bunny Storage

**Livrable** : vidéos watermarkées vérifiables localement, confiance dans le rendu.

---

## Phase 4 — Bunny Storage setup + upload batch

Créer l'infra Storage et uploader les vidéos watermarkées générées en Phase 3.

### 4.1 — Bunny Storage zone

- [ ] Créer une Storage zone sur bunny.net (dashboard) :
  - Nom : `petit-meme-watermarked`
  - Région : EU (même que la Video Library)
  - Tier : Standard ($0.005/GB/mois)
  - Pas de Pull Zone (le serveur proxie)
- [ ] Récupérer : Storage API Key, hostname, zone name

### 4.2 — Env vars

- [ ] Ajouter dans `src/env/server.ts` (validation Zod) :
  - `BUNNY_STORAGE_API_KEY: z.string()`
  - `BUNNY_STORAGE_HOSTNAME: z.string()`
  - `BUNNY_STORAGE_ZONE_NAME: z.string()`
- [ ] Ajouter dans `.env.development` et Vercel env prod

### 4.3 — Bunny Storage helpers

- [ ] Créer `src/lib/bunny-storage.ts` (fonctions server-only) :
  - `buildStorageUrl(bunnyId)` — `https://{hostname}/{zone}/{bunnyId}.mp4`
  - `getStorageHeaders()` — headers avec `AccessKey`
  - `fetchWatermarkedVideo(bunnyId)` — GET le MP4 depuis Storage (timeout 15s), retourne Response
  - `uploadWatermarkedVideo(bunnyId, videoBuffer)` — PUT le MP4 vers Storage
  - `deleteWatermarkedVideo(bunnyId)` — DELETE le fichier de Storage
  - `checkWatermarkExists(bunnyId)` — HEAD request → boolean

### 4.4 — Upload batch vers Storage

- [ ] Ajouter mode `--upload` au script `scripts/watermark-videos.ts` :
  - Lit les fichiers depuis le dossier local `/tmp/petit-meme-watermarked/`
  - Upload chaque fichier vers Bunny Storage via API PUT
  - Skip si déjà présent en Storage (HEAD check)
  - Concurrence 5 uploads en parallèle
  - Log résumé (uploadés, skippés, erreurs)

**Livrable** : Storage zone prête, helpers, ~502 vidéos watermarkées uploadées.

---

## Phase 5 — Server-side premium check dans `shareMeme()`

Modifier `shareMeme()` pour servir la version watermarkée aux non-premium.

- [ ] Modifier `src/server/meme.ts` — `shareMeme()` :
  - Ajouter optional auth :
    ```
    const { headers } = getRequest()
    const session = await auth.api.getSession({ headers })
    ```
  - Déterminer si premium :
    - Si `session?.user` → `findActiveSubscription(session.user.id)` + `matchIsUserAdmin(session.user)`
    - Si pas de session → non-premium
  - **Premium/admin** → fetch depuis Video Library (signed URL, comme aujourd'hui)
  - **Non-premium** → `fetchWatermarkedVideo(bunnyId)` depuis Bunny Storage
  - **Fallback** : si Storage retourne 404 → servir l'original + log warning + Sentry capture (`'watermark-fallback'`). Ne jamais bloquer le téléchargement.
- [ ] Le reste inchangé : proxy Response, rate-limit, logging, timeout

**Livrable** : non-premium reçoivent le watermark, premium l'original. Transparent côté client.

---

## Phase 6 — Admin : génération watermark dans le form d'update

Ajouter une section watermark dans le form d'édition du mème (pour les futurs mèmes).

### 6.1 — Server functions watermark

- [ ] Dans `src/routes/admin/-server/memes.ts` (ou nouveau fichier `-server/watermark.ts`) :
  - `checkMemeWatermark(memeId)` — server function GET, admin-only
    - Récupère le `bunnyId` du mème
    - Appelle `checkWatermarkExists(bunnyId)` sur Bunny Storage
    - Retourne `{ exists: boolean, bunnyId: string }`
  - `uploadMemeWatermark(memeId, videoBlob)` — server function POST, admin-only
    - Récupère le `bunnyId` du mème
    - Upload le blob watermarké vers Bunny Storage via `uploadWatermarkedVideo(bunnyId, buffer)`
    - Log audit action `'watermark_upload'`
    - Retourne `{ success: true }`

### 6.2 — Hook admin watermark

- [ ] Créer `src/routes/admin/library/-components/use-meme-watermark.ts` :
  - **Query** : `checkMemeWatermark(memeId)` — vérifie si le watermark existe en Storage
  - **Mutation** : génère + upload le watermark
    1. Charge ffmpeg WASM (pattern `useVideoInitializer` — ici c'est l'admin, on peut cacher l'instance)
    2. Fetch le blob vidéo original via `getVideoBlobQueryOpts(memeId)` (caché)
    3. Fetch le watermark PNG
    4. `applyWatermark(ffmpeg, videoBlob, watermarkBlob)`
    5. Upload le blob résultat via `uploadMemeWatermark(memeId, blob)`
    6. Invalidate la query `checkMemeWatermark`
  - **Progress** : `ffmpeg.on('progress')` pour la barre de progression
  - **State exposé** : `{ watermarkExists, generate, progress, isGenerating, error }`

### 6.3 — Composant watermark dans le form

- [ ] Créer `src/routes/admin/library/-components/meme-watermark-section.tsx` :
  - **Badge statut** : "Watermark prêt" (vert) / "Watermark manquant" (orange)
  - **Bouton "Générer le watermark"** : déclenche la mutation
  - **Progress bar** pendant le traitement (composant `animate-ui/radix/progress`)
  - **Bouton "Régénérer"** si le watermark existe déjà (pour mettre à jour après changement de vidéo)
  - **Message d'erreur** si la génération échoue
- [ ] Intégrer dans `meme-form.tsx` : nouvelle section entre le preview vidéo et les champs du form
- [ ] **Validation form** : quand le statut est ou devient PUBLISHED et que `watermarkExists` est false → afficher un warning (pas bloquant, car le fallback serveur sert l'original si manquant)

### 6.4 — Suppression watermark à la suppression du mème

- [ ] Modifier `deleteMemeById()` dans `src/routes/admin/-server/memes.ts` :
  - Ajouter `deleteWatermarkedVideo(meme.video.bunnyId)` dans le `Promise.all` existant
  - Même pattern async/catch que `deleteVideo()` — failure loggée mais non bloquante
  - Sentry feature tag : `'bunny-storage-cleanup'`

**Livrable** : admin peut générer/régénérer le watermark depuis le form, suppression automatique au delete.

---

## Phase 7 — Client UX : hook unique + dialog upsell

### 7.1 — Hook unique `useMemeExport`

Remplacer `useDownloadMeme` + `useShareMeme` (quasi-identiques) par un seul hook.

- [ ] Créer `src/hooks/use-meme-export.ts` :
  - **Paramètre** : `mode: 'download' | 'share'`
  - **`useMutation` interne** :
    1. Si non-premium → ouvre le dialog upsell via `useShowDialog('watermark-upsell', {})`
    2. Fetch blob via `shareMeme()` (le serveur gère le watermark)
    3. `downloadBlob()` ou `shareBlob()` selon le mode
    4. Ferme le dialog
    5. `trackMemeAction()` avec l'action appropriée
  - **Check premium côté client** (pour le dialog, pas la sécurité) :
    - `queryClient.getQueryData(getAuthUserQueryOpts().queryKey)` → user ou null
    - `queryClient.getQueryData(getActiveSubscriptionQueryOpts().queryKey)` → subscription ou null
    - `matchIsUserAdmin(user)` pour les admins
    - Si premium/admin → pas de dialog, download direct avec toast loading (comme actuellement)
  - **State exposé** : `{ trigger, isPending }`
- [ ] Supprimer `src/hooks/use-download-meme.ts`
- [ ] Supprimer `src/hooks/use-share-meme.ts`
- [ ] Migrer les consumers :
  - `src/components/Meme/player-dialog.tsx`
  - `src/components/Meme/meme-list-item.tsx`
  - `src/components/Meme/share-meme-button.tsx` (supprimer OverlaySpinner dupliqué)
  - Vérifier `src/routes/_public__root/_default/memes/$memeId.tsx`

### 7.2 — Dialog upsell premium

- [ ] `/frontend-design` avant de coder le dialog
- [ ] Enregistrer dans `dialog.store.tsx` : clé `'watermark-upsell'`, composant lazy-loaded
- [ ] Créer `src/components/Meme/watermark-upsell-dialog.tsx` :
  - **Dialog (shadcn)** : modal
  - **Haut** : spinner + texte "Préparation de votre vidéo..."
  - **Bas** : card premium :
    - Icône sparkle, titre "Téléchargez sans watermark"
    - Avantages premium (réutiliser `getPremiumPlan().features`)
    - Prix (réutiliser `PREMIUM_PLAN_PRICING`)
    - CTA → `/pricing`
  - **Fermeture auto** quand le download/share démarre
  - **Accessibilité** : `aria-busy`, `aria-live="polite"`, focus management
- [ ] Messages Paraglide FR/EN :
  - `watermark_preparing` / `watermark_upsell_title` / `watermark_upsell_description`
  - `plan_feature_no_watermark` / `plan_feature_watermark`

**Livrable** : un seul hook, 2 anciens supprimés, dialog upsell pendant le fetch.

---

## Phase 8 — Plan features + vérification + audits

### 8.1 — Plan features

- [ ] Ajouter "Sans watermark" dans `getPremiumPlan().features` (`src/constants/plan.ts`)
- [ ] Ajouter "Avec watermark" dans `getFreePlan().features`

### 8.2 — Vérification flow complet

- [ ] Anonyme download/share → vidéo watermarkée
- [ ] Free user download/share → vidéo watermarkée
- [ ] Premium download/share → vidéo originale (pas de dialog)
- [ ] Admin → comme premium
- [ ] Fallback : watermark manquant en Storage → original + Sentry
- [ ] Admin : générer watermark → upload Storage → badge "prêt"
- [ ] Admin : supprimer mème → vidéo Storage supprimée
- [ ] Admin : warning si publication sans watermark

### 8.3 — Audits complets (post-implémentation)

Lancer tous les audits habituels en parallèle après la feature complète :

- [ ] **Security audit** : URL Storage jamais exposées côté client, API key server-only, pas d'injection dans les filenames, auth check `shareMeme()` robuste
- [ ] **Backend performance** : impact latence `shareMeme()` (+getSession +findActiveSubscription), N+1 queries, Bunny Storage timeout
- [ ] **React performance** : re-renders dialog upsell, hook `useMemeExport`, section watermark admin
- [ ] **Dead code** : anciens hooks `use-download-meme.ts` / `use-share-meme.ts` et leurs imports orphelins
- [ ] **Tailwind audit** : nouveaux composants (dialog upsell, section watermark admin)
- [ ] **GDPR** : pas de données personnelles dans le flow watermark, vérifier que le tracking `shareMeme()` ne log pas plus qu'avant

### 8.4 — Déploiement production

- [ ] Créer la Storage zone sur bunny.net (si pas déjà fait en Phase 4)
- [ ] Ajouter les env vars sur Vercel
- [ ] Merge `feat/watermark` → `main`
- [ ] Vérifier le deploy Vercel
- [ ] Exécuter le script d'upload batch (`--upload`) contre la Storage zone prod

**Livrable** : feature complète, auditée, déployée.

---

## Fichiers impactés

| Fichier | Action | Phase |
|---------|--------|-------|
| `public/images/watermark.png` | **Nouveau** — asset PNG watermark | 1 |
| `src/constants/watermark.ts` | **Nouveau** — constantes watermark + filter ffmpeg | 1 |
| `src/utils/ffmpeg.ts` | **Nouveau** — utilitaires ffmpeg partagés (extraits du studio) | 2 |
| `src/utils/watermark.ts` | **Nouveau** — `applyWatermark`, `buildWatermarkFilter` | 2 |
| `src/hooks/use-video-processor.ts` | Refactorer — importer depuis `src/utils/ffmpeg.ts` | 2 |
| `scripts/watermark-videos.ts` | **Nouveau** — batch local + upload | 3, 4 |
| `src/env/server.ts` | Ajouter 3 env vars Bunny Storage | 4 |
| `src/lib/bunny-storage.ts` | **Nouveau** — helpers Bunny Storage (CRUD) | 4 |
| `src/server/meme.ts` | Modifier `shareMeme()` — premium check + fetch conditionnel | 5 |
| `src/routes/admin/-server/watermark.ts` | **Nouveau** — server functions check/upload watermark | 6 |
| `src/routes/admin/library/-components/use-meme-watermark.ts` | **Nouveau** — hook admin watermark | 6 |
| `src/routes/admin/library/-components/meme-watermark-section.tsx` | **Nouveau** — section watermark dans le form | 6 |
| `src/routes/admin/library/-components/meme-form.tsx` | Intégrer la section watermark | 6 |
| `src/routes/admin/-server/memes.ts` | Modifier `deleteMemeById()` — supprimer watermark Storage | 6 |
| `src/hooks/use-meme-export.ts` | **Nouveau** — hook unique download/share | 7 |
| `src/hooks/use-download-meme.ts` | **Supprimer** | 7 |
| `src/hooks/use-share-meme.ts` | **Supprimer** | 7 |
| `src/stores/dialog.store.tsx` | Ajouter `'watermark-upsell'` | 7 |
| `src/components/Meme/watermark-upsell-dialog.tsx` | **Nouveau** — dialog upsell premium | 7 |
| `src/components/Meme/player-dialog.tsx` | Migrer vers `useMemeExport` | 7 |
| `src/components/Meme/meme-list-item.tsx` | Migrer vers `useMemeExport` | 7 |
| `src/components/Meme/share-meme-button.tsx` | Migrer vers `useMemeExport` | 7 |
| `src/constants/plan.ts` | Ajouter feature watermark | 8 |
| Messages Paraglide FR/EN | ~5 nouveaux messages | 7 |

## Dépendances

- **Aucune nouvelle dépendance npm**
- **Bunny Storage zone** : à créer sur bunny.net (Phase 4)
- **ffmpeg CLI** : requis localement pour le batch (ffmpeg 8.0 installé via Homebrew)

## Coûts

| Service | Coût estimé |
|---------|-------------|
| Bunny Storage (~7 GB) | ~$0.035/mois |
| Bandwidth (serveur proxy) | Inclus plan Bunny |
| **Total** | **< $0.05/mois** |

## Risques

1. **Fallback** : watermark manquant en Storage → servir l'original + Sentry. Ne jamais bloquer.
2. **Sync** : si Victor oublie de générer le watermark → warning dans le form + fallback serveur.
3. **ffmpeg WASM admin** : tourne en single-thread (pas de COOP/COEP). Acceptable pour un usage admin ponctuel.
4. **Stockage** : ~7 GB, croissance lente (~10-20 mèmes/mois). Restera dans les centimes.
5. **Latence `shareMeme()`** : +`getSession()` + `findActiveSubscription()` (~50-100ms). Négligeable vs le fetch vidéo.
