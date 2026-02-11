# Audit — Error Handling (Better Auth)

Score global : **9 / 10**

Référence : `pasiopadelclub/src/helpers/auth-errors.ts` + `pasiopadelclub/src/routes/_auth/connexion.tsx`

| Sévérité | Nombre | Corrigé |
|----------|--------|---------|
| CRITICAL | 2 | 2 |
| HIGH | 3 | 3 |
| MEDIUM | 2 | 2 |

---

## Pattern cible (pasiopadelclub)

1. `src/helpers/auth-errors.ts` : map exhaustive `authClient.$ERROR_CODES` → messages FR, typée `as const satisfies Record<AuthErrorCode, string>`
2. `mutationFn` : `throw new Error(error.code)` (code dans `.message`)
3. Pas de `onError` dans `useMutation` — afficher `signInMutation.error` dans le JSX
4. `getAuthErrorMessage(error.message)` pour traduire le code
5. Helpers séparés pour contextes spécifiques (`getChangePasswordErrorMessage`)

---

## CRITICAL

### 1. ~~`getErrorMessage` incomplet — 8 codes sur 50+~~ Corrigé

**Fix :** Créé `src/helpers/auth-errors.ts` avec tous les codes de `authClient.$ERROR_CODES`, typé `as const satisfies Record<AuthErrorCode, string>`. Supprimé `getErrorMessage` de `auth-client.ts`.

### 2. ~~`reset-password-form.tsx` — aucune gestion d'erreur~~ Acceptable

`requestPasswordReset` est un fire-and-forget par design (ne pas révéler si l'email existe). Le formulaire affiche déjà un message de succès générique. Pas de changement nécessaire.

---

## HIGH

### 3. ~~LoginForm — pattern incohérent avec ErrorContext~~ Corrigé

**Fix :** Aligné sur le pattern cible — `throw new Error(error.code)` dans `mutationFn`, affichage via `signInMutation.error` dans le JSX avec `getAuthErrorMessage()`.

### 4. ~~`update-password-dialog.tsx` — union type défensive~~ Corrigé

**Fix :** Migré vers `{ error } = await authClient.changePassword()` + `throw new Error(error.code)`. Affichage via `mutation.error` dans le JSX avec `getChangePasswordErrorMessage()`.

### 5. ~~`delete-account-dialog.tsx` — même pattern défensif~~ Corrigé

**Fix :** Migré vers `{ error } = await authClient.deleteUser()` + `throw new Error(error.code)`. Affichage via `mutation.error` dans le JSX avec `getAuthErrorMessage()`.

---

## MEDIUM

### 6. ~~Mélange auth errors / app errors~~ Corrigé

**Fix :** `getAuthErrorMessage` dans `helpers/auth-errors.ts` pour les erreurs Better Auth. `StudioError.message` utilisé directement pour les erreurs app dans `use-video-processor.ts`. Supprimé `getErrorMessage` de `auth-client.ts`.

### 7. ~~`create-new-password-form.tsx` — error pas remontée au form~~ Corrigé

**Fix :** Wrappé dans `useMutation` avec `throw new Error(error.code)`. Affichage via `mutation.error` dans le JSX avec `getAuthErrorMessage()`.
