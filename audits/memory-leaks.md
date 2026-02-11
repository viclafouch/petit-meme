# Audit — Memory Leaks

Score global : **7.5 / 10**

| Sévérité | Nombre | Corrigé |
|----------|--------|---------|
| CRITICAL | 3 | 3 |
| HIGH | 4 | 4 |
| MEDIUM | 2 | 0 |

---

## CRITICAL

### 1. ~~`getRandomMeme` charge TOUS les memes en mémoire~~

**Corrigé** — remplacé par count + skip random (Prisma natif).

### 2. Better Auth rate limiter in-memory

**Fichier :** `src/lib/auth.tsx:112`

Le rate limiter `storage: 'memory'` accumule les IP en mémoire sans expiration. Avec des milliers de requêtes, la Map grandit indéfiniment.

**Impact :** ~10-50 MB/jour de croissance. Crash OOM après semaines/mois.

**Fix suggéré :** Remplacer par un storage persistant (Redis, DB) ou accepter le risque si le serveur est redémarré régulièrement.

### 3. ~~Prisma connection pool non configuré~~

**Corrigé** — ajouté `Pool` avec `max: 20`, `idleTimeoutMillis: 30s`, `connectionTimeoutMillis: 5s`.

---

## HIGH

### 4. ~~Object URL leak dans `downloadBlob`~~

**Corrigé** — ajouté `URL.revokeObjectURL(url)` après le click.

### 5. ~~FFmpeg virtual filesystem jamais nettoyé~~

**Corrigé** — ajouté `deleteFile` pour input.mp4, arial.ttf, text.txt, output.mp4 après traitement.

### 6. ~~FFmpeg terminate appelé deux fois~~

**Corrigé** — `onSettled` ne fait plus que `ffmpeg.off('progress')`, le terminate est uniquement dans le `useEffect` cleanup.

### 7. ~~Object URL leak dans `useVideoProcessor`~~

**Corrigé** — ajouté `objectUrlRef` pour tracker et révoquer l'URL précédente avant d'en créer une nouvelle, + revoke dans le cleanup `useEffect`.

---

## MEDIUM (non corrigés)

### 8. Double buffer dans l'upload admin

**Fichier :** `src/server/admin.ts:195-197, 255-256`

`arrayBuffer()` puis `Buffer.from()` crée deux copies du vidéo en mémoire (~2x taille). Pour un upload de 50 MB = 100 MB alloués.

**Fix futur :** Streamer directement le blob vers Bunny CDN.

### 9. File upload URL cache

**Fichier :** `src/components/ui/file-upload.tsx`

Les Object URLs du cache WeakMap ne sont révoquées que sur CLEAR, pas sur suppression individuelle de fichier.

**Impact :** Mineur (WeakMap aide, les URLs sont petites).
