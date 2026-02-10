# Audit — Sécurité

| Sévérité | Nombre |
|----------|--------|
| CRITICAL | 1 |
| HIGH | 4 |
| MEDIUM | 4 |
| LOW | 4 |

**Points positifs :** Prisma ORM paramétré (sauf 1 cas), séparation env server/client avec `@t3-oss/env-core`, validation Zod sur tous les server functions, pas de `dangerouslySetInnerHTML`, `adminRequiredMiddleware` cohérent (sauf 1 oubli), vérification d'email requise, validation des uploads (type, taille), signature Stripe via `@better-auth/stripe`, fonctions sensibles en `createServerOnlyFn`.

---

## CRITICAL

### 1. Injection SQL via `$queryRawUnsafe` avec input utilisateur

**Fichier :** `src/server/reels.ts:19-48`

`getInfiniteReels` utilise `$queryRawUnsafe` et interpole directement les valeurs du tableau `excludedIds` dans la string SQL via `'${id}'`. Bien que validé comme `z.array(z.string())`, `z.string()` accepte n'importe quel contenu — y compris `'); DROP TABLE "Meme"; --`.

```typescript
const memes = await prismaClient
  .$queryRawUnsafe<{ meme: MemeWithVideo }[]>(
    `... WHERE m."status" = 'PUBLISHED'
    ${excludedIds.length
      ? `AND m."id" NOT IN (${excludedIds.map((id) => `'${id}'`).join(',')})`
      : ''
    }
    ORDER BY RANDOM() LIMIT 20`
  )
```

**Scénario d'attaque :** Un attaquant envoie `excludedIds: ["' OR 1=1 --"]` pour casser les quotes et exécuter du SQL arbitraire.

**Impact :** Compromission complète de la base de données — lecture, modification, suppression de toutes les données.

**Fix :**
```typescript
import { Prisma } from '@prisma/client'

const excludeClause = excludedIds.length
  ? Prisma.sql`AND m."id" NOT IN (${Prisma.join(excludedIds)})`
  : Prisma.empty

const memes = await prismaClient.$queryRaw<{ meme: MemeWithVideo }[]>`
  SELECT ... FROM "Meme" m
  JOIN "Video" v ON m."videoId" = v."id"
  WHERE m."status" = 'PUBLISHED'
  ${excludeClause}
  ORDER BY RANDOM() LIMIT 20
`
```

---

## HIGH

### 2. Webhook Bunny sans authentification

**Fichier :** `src/routes/api/bunny.ts:18-83`

Le endpoint `/api/bunny` accepte des POST et met à jour la DB sans aucune vérification : pas de signature, pas de secret partagé, pas de whitelist IP. N'importe qui peut envoyer des payloads forgés.

**Scénario :** Un attaquant envoie `{ "VideoGuid": "<id-connu>", "Status": 5 }` pour marquer des vidéos comme échouées ou prématurément prêtes.

**Impact :** Manipulation du statut de traitement des vidéos, corruption des métadonnées, altération de l'index Algolia.

**Fix :** Vérifier un header secret ou valider le statut directement via l'API Bunny après réception :
```typescript
const webhookSecret = request.headers.get('X-Bunny-Webhook-Secret')
if (webhookSecret !== ENV.BUNNY_WEBHOOK_SECRET) {
  return new Response('Unauthorized', { status: 401 })
}
```

---

### 3. `getListUsers` sans middleware admin — seul endpoint admin non protégé

**Fichier :** `src/server/admin.ts:27-42`

Toutes les autres fonctions admin utilisent `adminRequiredMiddleware`, sauf `getListUsers`. La protection repose uniquement sur l'autorisation interne de Better Auth.

**Impact :** Si Better Auth a une faille ou misconfiguration, tous les emails et données utilisateurs sont exposés.

**Fix :**
```typescript
export const getListUsers = createServerFn({ method: 'GET' })
  .middleware([adminRequiredMiddleware])
  .handler(async () => { ... })
```

---

### 4. Longueur minimale de mot de passe de 4 caractères

**Fichier :** `src/lib/auth.tsx:38`

`minPasswordLength: 4` est largement en dessous des standards (NIST SP 800-63B recommande minimum 8). Un mot de passe de 4 caractères est brute-forcé quasi instantanément.

**Fix :** Augmenter à `minPasswordLength: 8` minimum.

---

### 5. Aucun rate limiting sur aucun endpoint

**Fichier :** Application entière

Zéro rate limiting nulle part. Endpoints affectés :
- **Auth** (`/api/auth/$`) — login, inscription, reset password
- **Génération IA** (`generateMemeContent`) — appels API Gemini coûteux
- **Enregistrement de vues** (`registerMemeView`) — manipulation des compteurs
- **Webhook Bunny** — flood possible
- **Recherche Algolia** — épuisement de ressources

**Impact :** Brute-force de comptes (surtout avec mdp de 4 chars), abus de coûts API, manipulation de données, DoS.

**Fix :** Implémenter du rate limiting au niveau infrastructure (reverse proxy/CDN) et au niveau applicatif pour les endpoints sensibles.

---

## MEDIUM

### 6. Cookie `anonId` sans flag `secure`

**Fichier :** `src/server/meme.ts:214-219`

Le cookie `anonId` (dédoublonnage de vues, durée 1 an) est défini avec `httpOnly: true` et `sameSite: 'lax'`, mais sans `secure: true`. Transmis en clair sur HTTP.

**Fix :** Ajouter `secure: true`.

---

### 7. Pas de protection CSRF sur les server functions qui modifient l'état

**Fichier :** Application entière (`src/server/meme.ts`, `user.ts`, `admin.ts`, `categories.ts`)

Toutes les server functions POST reposent uniquement sur les cookies de session. Pas de token CSRF, pas de validation d'en-tête Origin/Referer. SameSite=Lax ne protège pas contre tous les scénarios CSRF.

**Impact :** Modifications non autorisées pour le compte d'utilisateurs authentifiés, y compris des opérations admin.

**Fix :** Valider le header `Origin` sur les requêtes state-changing, ou utiliser un pattern double-submit cookie.

---

### 8. Injection de filtre Algolia via input `category` non sanitisé

**Fichier :** `src/server/meme.ts:78` et `src/server/admin.ts:305`

`data.category` est validé uniquement comme `z.string().optional()` et interpolé directement dans le filtre Algolia : `filters.push(`categorySlugs:${data.category}`)`.

**Scénario :** `category: "news OR status:PENDING OR status:REJECTED"` → expose les memes non publiés.

**Fix :** Valider contre les catégories connues ou quoter la valeur :
```typescript
filters.push(`categorySlugs:"${data.category.replace(/"/g, '')}"`)
```

---

### 9. `getVideoPlayData` exposé sans authentification avec credentials serveur

**Fichier :** `src/lib/bunny.ts:60-73`

Défini comme `createServerFn` (publiquement appelable, pas `createServerOnlyFn`) sans middleware d'auth. Accepte un videoId arbitraire et fait une requête authentifiée vers l'API Bunny avec l'access key serveur.

**Impact :** Enumération de métadonnées pour toutes les vidéos (y compris non publiées), abus du quota API Bunny.

**Fix :** Vérifier que la vidéo appartient à un meme publié avant de répondre.

---

## LOW

### 10. Algolia Application ID hardcodé

**Fichier :** `src/lib/algolia.ts:6`

`const appID = 'W4S6H0K8DZ'` en dur dans le code au lieu d'une variable d'environnement. Rend la rotation et la configuration par environnement impossibles sans changement de code.

**Fix :** Déplacer dans `ENV.ALGOLIA_APP_ID`.

---

### 11. Messages d'erreur en développement exposés au client

**Fichier :** `src/lib/auth-client.ts:64-65`

`getErrorMessage` retourne `error.message` brut en mode développement. Si `NODE_ENV` est mal configuré en production, les messages internes (stack traces, détails DB) seraient exposés.

**Fix :** Toujours utiliser des messages sanitisés côté utilisateur, logger les messages bruts uniquement côté serveur.

---

### 12. PII loggées en console en production

**Fichier :** `src/lib/auth.tsx:76-77, 89-91`

Plusieurs `console.log` qui affichent des données utilisateur (emails, profils Twitter) ne sont pas gated derrière un check `NODE_ENV !== 'production'`.

```typescript
console.log(`${user.email} has been successfully verified!`)
console.log("Connecting to Twitter's API with profile", user)
```

**Fix :** Conditionner derrière `process.env.NODE_ENV !== 'production'` ou utiliser du structured logging avec redaction PII.

---

### 13. `VITE_BUNNY_LIBRARY_ID` exposé au client

**Fichier :** `src/constants/env.ts:22`

Préfixé `VITE_` donc inclus dans le bundle client. Utilisé aussi côté serveur pour les opérations API (delete, upload, create). L'access key reste correctement côté serveur.

**Impact :** Faible. Révèle un détail d'infrastructure. Pourrait être server-only si utilisé uniquement côté serveur.

---

## Roadmap de remédiation

1. **Immédiat (CRITICAL) :** Fix injection SQL dans `reels.ts` → `$queryRaw` paramétré
2. **Urgent (HIGH) :** Auth sur webhook Bunny, middleware admin sur `getListUsers`, mot de passe minimum 8 chars
3. **Court terme (HIGH/MEDIUM) :** Rate limiting sur auth et génération IA, protection CSRF, sanitiser filtres Algolia
4. **Moyen terme (MEDIUM) :** Auth sur `getVideoPlayData`, flag `secure` sur cookies
5. **Faible priorité (LOW) :** Algolia App ID en env var, gating des console.log, review messages d'erreur
