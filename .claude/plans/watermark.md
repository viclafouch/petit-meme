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

- [x] Créer **2 Storage zones** sur bunny.net (dashboard) — dev et prod séparées :
  - Dev : `petit-meme-watermarked-dev` / Prod : `petit-meme-watermarked`
  - Région : EU (même que la Video Library)
  - Tier : Standard ($0.005/GB/mois)
  - Pas de Pull Zone (le serveur proxie)
- [x] Récupérer : Storage API Key, hostname, zone name pour chaque zone

### 4.2 — Env vars

- [x] Ajouter dans `src/env/server.ts` (validation Zod, required) :
  - `BUNNY_STORAGE_API_KEY: z.string()`
  - `BUNNY_STORAGE_HOSTNAME: z.string()`
  - `BUNNY_STORAGE_ZONE_NAME: z.string()`
- [x] Ajouter dans `.env.development` (zone dev) et Vercel env prod (zone prod)
- [x] Ajouter dans `.env.example`

### 4.3 — Bunny Storage helpers

- [x] Ajouté dans `src/lib/bunny.ts` (fusionné, pas de fichier séparé) :
  - `buildStorageUrl(bunnyId)` — `https://{hostname}/{zone}/{bunnyId}.mp4`
  - `getStorageHeaders()` — headers avec `AccessKey`
  - `fetchWatermarkedVideo(bunnyId)` — GET le MP4 depuis Storage (timeout 15s), retourne Response
  - `uploadWatermarkedVideo(bunnyId, videoBuffer)` — PUT le MP4 vers Storage
  - `deleteWatermarkedVideo(bunnyId)` — DELETE le fichier de Storage
  - `checkWatermarkExists(bunnyId)` — HEAD request → boolean

### 4.4 — Upload batch vers Storage

- [x] Mode `--upload` ajouté au script `scripts/watermark-videos.ts` :
  - Lit les fichiers depuis le dossier local `./watermarked/`
  - Upload chaque fichier vers Bunny Storage via API PUT
  - Skip si déjà présent en Storage (HEAD check)
  - Concurrence 5 uploads en parallèle
  - Log résumé (uploadés, skippés, erreurs, manquants)

**Livrable** : Storage zone prête, helpers, ~502 vidéos watermarkées uploadées.

---

## Phase 5 — Server-side premium check dans `shareMeme()`

Modifier `shareMeme()` pour servir la version watermarkée aux non-premium.

- [x] Modifier `src/server/meme.ts` — `shareMeme()` :
  - Optional auth via `auth.api.getSession({ headers }).catch(() => null)`
  - Premium check via `matchIsUserPremium(session.user)` (helper extrait dans `src/server/customer.ts`)
  - Non-premium → `fetchWatermarkedVideo(bunnyId)` depuis Bunny Storage
  - Premium/admin → fetch depuis Video Library (signed URL, comme avant)
  - Fallback : si Storage échoue → log warning + servir l'original. Ne jamais bloquer.
- [x] Rate-limit, proxy Response, logging, timeout inchangés. `isPremium` ajouté aux logs.
- [x] `matchIsUserPremium` helper dans `src/server/customer.ts` — short-circuit admin (sync) puis subscription (async). Remplace le pattern dupliqué dans `shareMeme()`, `getFavoritesMemes()`, `checkGeneration()`.
- [x] `buildVideoProxyResponse` helper dans `src/server/meme.ts` — factorise la construction Response dupliquée (watermarked + original).
- [x] `Promise.all` meme query + getSession — parallélisation des deux opérations indépendantes.
- [x] Fix `node:crypto` externalized for browser : `bunny-token.ts` utilise maintenant `await import('node:crypto')` (lazy) au lieu d'un import top-level. `signBunnyUrl` rendu async, callers mis à jour (`meme.ts`, `ai.ts`, `watermark-videos.ts`).

**Livrable** : non-premium reçoivent le watermark, premium l'original. Transparent côté client.

---

## Phase 6 — Admin : génération watermark dans le form d'update

Ajouter une section watermark dans le form d'édition du mème (pour les futurs mèmes).

### 6.1 — Server functions watermark

- [x] Créé `src/routes/admin/-server/watermark.ts` :
  - `checkMemeWatermark(memeId)` — server function GET, admin-only, retourne `{ exists, bunnyId }`
  - `uploadMemeWatermark(memeId, videoBlob)` — server function POST (FormData), admin-only, audit `'watermark_upload'`
- [x] Query opts `getAdminMemeWatermarkQueryOpts` dans `src/routes/admin/-lib/queries.ts`
- [x] Sentry features `'admin-watermark'` et `'bunny-storage-cleanup'` ajoutés

### 6.2 — Hook admin watermark

- [x] Créé `src/routes/admin/library/-components/use-meme-watermark.ts` :
  - Query `checkMemeWatermark`, mutation ffmpeg WASM + upload, progress tracking
  - ffmpeg instance en ref (lazy load, terminate on unmount)
  - State exposé : `{ watermarkExists, isChecking, generate, progress, isGenerating, error }`

### 6.3 — Composant watermark dans le form

- [x] Créé `src/routes/admin/library/-components/meme-watermark-section.tsx` :
  - Badge statut (Prêt/Manquant/Vérification), bouton Générer/Régénérer, progress bar animée
  - Warning si publié sans watermark (non bloquant)
  - `WatermarkPreviewDialog` sub-component : prévisualisation dans un **Dialog** (vidéo `max-h-[60vh]`, boutons Régénérer + Upload conditionnel)
  - Dialog sert deux cas : preview après génération locale (avec Upload) ET visualisation du watermark existant (fetch depuis CDN, sans Upload)
  - Bouton Eye (ghost icon) pour prévisualiser le watermark existant dans le dialog (via `previewMemeWatermark` server proxy)
- [x] Fix WASM watermark aspect ratio : abandonné `scale2ref` (expressions cassées dans ffmpeg 6.x WASM). Nouveau approach : dimensions calculées en JS via `<video>`/`<Image>`, puis `scale=W:H` + `overlay=X:Y` avec valeurs pixel exactes. `WATERMARK_FFMPEG_FILTER_WASM` supprimé, filtre construit dynamiquement dans `buildWasmWatermarkFilter()`.
- [x] Intégré dans `$memeId.tsx` entre le preview vidéo et le form (pas dans `meme-form.tsx` — séparation des concerns)
- [x] Créé `src/components/Meme/meme-video-player.tsx` — composant réutilisable extrait de `player-dialog.tsx` :
  - Encapsule `VideoPlayer` + `VideoPlayerContent` + `VideoOverlay` avec les props communes (crossOrigin, playsInline, disablePictureInPicture, etc.)
  - Props configurables : `showOverlay`, `showRemainingTime`, `className`, + tous les props vidéo standard
  - Refactoré `player-dialog.tsx` et `Studio/studio-preview.tsx` (OriginalVideo + ProcessedVideo) pour l'utiliser

### 6.4 — Suppression watermark à la suppression du mème

- [x] `deleteMemeById()` : ajouté `deleteWatermarkedVideo(bunnyId)` dans le `Promise.all`, Sentry `'bunny-storage-cleanup'`

**Livrable** : admin peut générer/régénérer le watermark depuis le form, suppression automatique au delete.

---

## Phase 7 — Client UX : hook unique + dialog upsell

### 7.1 — Hook unique `useMemeExport`

Remplacer `useDownloadMeme` + `useShareMeme` (quasi-identiques) par un seul hook.

- [x] Créer `src/hooks/use-meme-export.ts` :
  - **Paramètre** : `mode: 'download' | 'share'`
  - **`useMutation` interne** :
    1. Si non-premium → ouvre le dialog upsell via `showDialog('watermark-upsell', { meme, mode })` et **return** (pas de fetch automatique)
    2. Si premium/admin → fetch blob + toast loading + download/share direct
  - **Check premium côté client** (pour le dialog, pas la sécurité) :
    - `queryClient.getQueryData(getAuthUserQueryOpts().queryKey)` → user ou null
    - `queryClient.getQueryData(getActiveSubscriptionQueryOpts().queryKey)` → subscription ou null
    - `matchIsUserAdmin(user)` pour les admins
  - **State exposé** : `{ trigger, isPending }`
  - **Type `MemeExportMode`** exporté (réutilisé par le dialog)
- [x] Supprimer `src/hooks/use-download-meme.ts`
- [x] Supprimer `src/hooks/use-share-meme.ts`
- [x] Migrer les consumers :
  - `src/components/Meme/player-dialog.tsx`
  - `src/components/Meme/meme-list-item.tsx`
  - `src/components/Meme/share-meme-button.tsx` (supprimer OverlaySpinner dupliqué)
  - `src/routes/_public__root/_default/memes/$memeId.tsx`

### 7.2 — Dialog upsell premium

- [x] `/frontend-design` avant de coder le dialog
- [x] Enregistrer dans `dialog.store.tsx` : clé `'watermark-upsell'`, composant lazy-loaded
- [x] Créer `src/components/Meme/watermark-upsell-dialog.tsx` :
  - **Dialog (animate-ui)** : modal, max-w-sm, **dialog de choix** (pas de loading automatique), image mème en header (`/images/premium-upsell.webp`)
  - Reçoit `meme` + `mode` en props via le dialog store
  - **Contenu** : upsell premium avec features list (CheckCircle2), prix, CTA
  - **2 actions** :
    - Primaire : "Passer à Premium" → Link `/pricing`
    - Secondaire : "Télécharger/Partager avec watermark" → `useMutation` interne (fetch + export + close)
  - Bouton secondaire affiche `LoadingSpinner` pendant le fetch, icône Download/Share sinon
  - **Auto-fermeture** via `onOpenChange(false)` dans `onSuccess` du mutation
  - Bouton secondaire `disabled` pendant la mutation
  - **Accessibilité** : `aria-busy` + `disabled` sur le bouton, `aria-hidden="true"` sur icônes/spinner, `role="status"` sr-only pour annonce loading, `aria-label` dédié sur la feature list
- [x] Messages Paraglide FR/EN :
  - `watermark_download_with_watermark` / `watermark_share_with_watermark`
  - `watermark_upsell_title` / `watermark_upsell_description` / `watermark_upsell_price_from`
  - `plan_feature_no_watermark` / `plan_feature_watermark`

**Livrable** : un seul hook, 2 anciens supprimés, dialog upsell avec choix explicite de l'utilisateur.

---

## Phase 8 — Plan features + vérification + audits

### 8.1 — Plan features

- [x] Ajouter "Sans watermark" dans `getPremiumPlan().features` (`src/constants/plan.ts`)
- [x] Ajouter "Avec watermark" dans `getFreePlan().features`

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

- [x] **Security audit** : `bunnyId` retiré de la réponse `checkMemeWatermark` (information disclosure), `Content-Length` passthrough ajouté, `deleteMemeById` optimisé avec `select`
- [x] **Backend performance** : `buildVideoProxyResponse` passe `Content-Length`, `deleteMemeById` passe de `include` à `select`, `captureWithFeature` ajouté au fallback watermark
- [x] **React performance** : RAS — issues mineures (inline handlers, state redundancy admin hook), rien de critique
- [x] **Dead code** : `buildBunnyUrl` dé-exporté (usage interne uniquement), aucun import orphelin des anciens hooks
- [x] **Tailwind audit** : 4 classes redondantes supprimées (`tracking-tight`, `text-sm`, `text-foreground`, `sm:max-w-lg`)
- [x] **GDPR** : zéro nouvelle exposition PII, `isPremium` est un boolean non-identifiant, filenames = `bunnyId` opaque

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
| `src/lib/bunny.ts` | Ajouter helpers Bunny Storage (fetch/upload/delete/check watermark) | 4 |
| `src/server/meme.ts` | Modifier `shareMeme()` — premium check + fetch conditionnel | 5 |
| `src/routes/admin/-server/watermark.ts` | **Nouveau** — server functions check/upload watermark | 6 |
| `src/routes/admin/library/-components/use-meme-watermark.ts` | **Nouveau** — hook admin watermark | 6 |
| `src/routes/admin/library/-components/meme-watermark-section.tsx` | **Nouveau** — section watermark dans le form | 6 |
| `src/components/Meme/meme-video-player.tsx` | **Nouveau** — composant vidéo réutilisable (extrait de player-dialog) | 6 |
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
