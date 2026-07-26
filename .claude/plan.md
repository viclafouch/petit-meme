# Plan : montée de version des libs AI (2026-07-26)

**Statut : bump appliqué.** Aucune modification de code applicatif. `pnpm run lint:fix` passe.

Ce document a été réécrit après contre-vérification aux sources primaires (tarballs npm des
versions concernées, `.d.ts` publiés, `npm view` pour les peers). L'audit initial concluait
« bump direct, zéro modification de code » : la conclusion tient, mais deux de ses
raisonnements étaient faux et sont corrigés plus bas.

## Périmètre

| Package | Avant | Après | Type | Fichier impacté |
|---|---|---|---|---|
| `@google/genai` | 2.10.0 | 2.13.0 | minor | `src/server/ai.ts` |
| `@tanstack/ai` | 0.38.0 | 0.42.0 | minor (0.x) | `src/server/ai-search.ts` |
| `@tanstack/ai-anthropic` | 0.15.11 | 0.16.3 | minor (0.x, breaking) | `src/server/ai-search.ts` |

Couplage vérifié via `npm view` : `@tanstack/ai-anthropic@0.16.3` déclare
`peerDependencies: { zod: '^4.0.0', '@tanstack/ai': '^0.42.0' }`. Le peer se resserre à
chaque patch de la série 0.16 (`0.16.0 → ^0.39.1`, `0.16.1 → ^0.40.0`, `0.16.2 → ^0.41.0`),
donc les deux packages TanStack doivent bouger ensemble. Zod installé : `4.4.3`, compatible.
`@tanstack/ai` garde le peer **optionnel** `@opentelemetry/api >=1.9.0`, déjà satisfait en
transitif par `better-auth` (1.9.1) — pas de nouveau conflit malgré `strict-peer-dependencies=true`.

---

## 1. `@google/genai` 2.10.0 → 2.13.0

### Vérifications (sources primaires)

Diff des `dist/genai.d.ts` 2.10.0 vs 2.13.0 :

- **`GenerateContentConfig` est identique octet pour octet** entre les deux versions. C'est le
  seul type qu'on passe. `responseMimeType`, `responseSchema` et `responseJsonSchema` sont
  inchangés et non dépréciés.
- `FileState`, la classe `Files`, `createPartFromUri` et `createUserContent` : **identiques**.
- Les retraits de 2.11 (`cached_content`, `presence_penalty`, `frequency_penalty`) sont sur
  l'API **Interactions**, que `src/server/ai.ts` n'utilise pas.
- `engines.node` : `>=20.0.0`, inchangé.
- Toutes les nouveautés 2.11 → 2.13 (Triggers, `custom_vocabulary`, model selector, ASR,
  `exa_ai_search`, agents Antigravity/CodeMender) visent Vertex AI, Gemini Enterprise, Live API
  ou Interactions. **Rien d'exploitable pour `translateMemeContent` / `aiAssistMemeContent`.**

### Verdict

🟢 Update purement additif sur notre chemin d'appel. Risque nul, valeur nulle.

---

## 2. `@tanstack/ai` 0.38.0 → 0.42.0

### Vérifications (sources primaires)

- `chat()` : signature de générique et corps du dispatcher **identiques** entre 0.38.0 et 0.42.0.
- `runAgenticStructuredOutput` (notre branche réelle : `outputSchema` présent, `stream` non
  passé) : **127 lignes identiques octet pour octet** entre les deux versions. `diff` vide.
- `src/types.ts` : diff **strictement additif** (`ProviderExecutedToolMetadata`, `input` sur les
  tool-call parts, `toolCallCount` / `lastTurnToolCallCount`, `maxToolCallsPerTurn`,
  `capabilities`, `approvals`, events sandbox/harness/code-mode). `systemPrompts`, `outputSchema`
  et `modelOptions` : **aucune modification de forme ni de sémantique**.
- Les dépendances internes qui portent la conversion de schéma sont **épinglées à l'identique**
  dans les deux versions : `@tanstack/ai-utils@0.3.1`, `@tanstack/ai-event-client@0.6.8`. La
  couche Zod → JSON Schema ne bouge donc pas d'un octet, même en transitif.
- Aucun usage de tools, agent loop, approbations, sandbox ou streaming chez nous : toutes les
  nouveautés 0.39 → 0.42 sont hors périmètre. `maxToolCallsPerTurn` et la stratégie
  `maxToolCalls(n)` ne deviendraient pertinents que si on ajoutait des tools.

### Verdict

🟢 Bump sans effet observable. Le seul gain réel est le fix des barrels dans les `.d.ts`
publiés (0.41.0), qui améliore la résolution TypeScript sous `bundler` / `node16` / `nodenext`.

---

## 3. `@tanstack/ai-anthropic` 0.15.11 → 0.16.3

### Vérifications (sources primaires)

- **`claude-haiku-4-5` survit à la purge.** Confirmé dans `src/model-meta.ts` de 0.16.3 :
  présent dans `ANTHROPIC_MODELS`, `max_output_tokens: 64_000`, pricing $1 / $5 par MTok.
  Diff des IDs 0.15.11 → 0.16.3 — retirés : `claude-3-5-haiku`, `claude-3-7-sonnet`,
  `claude-3-haiku`, `claude-haiku-3`, `claude-haiku-3-5`, `claude-opus-4`, `claude-sonnet-4`,
  `claude-sonnet-3-7`, `claude-opus-4.8` (renommé `claude-opus-4-8`) et toutes les variantes
  `-fast`. Ajoutés : `claude-fable-5`, `claude-sonnet-5`, `claude-opus-4-8`. **Aucun ID retiré
  n'est référencé dans le repo.**
- **Le changement de défaut `max_tokens` de 0.16.1 ne nous touche pas.** Le code est
  `modelOptions?.max_tokens ?? getAnthropicDefaultMaxTokens(this.model, { stream })` : notre
  `modelOptions: { max_tokens: 100 }` court-circuite le défaut. Le nouveau warning de
  troncature est explicitement gardé par `if (options.modelOptions?.max_tokens == null)`, donc
  il ne se déclenchera jamais chez nous.
- `createAnthropicChat<TModel extends (typeof ANTHROPIC_MODELS)[number]>(model, apiKey, config?)` :
  signature inchangée. `max_tokens` reste dans `AnthropicSamplingOptions`, que le meta de
  Haiku 4.5 satisfait — `modelOptions: { max_tokens: 100 }` typecheck toujours.
- Diff complet de `src/adapters/text.ts` : hors le défaut `max_tokens`, tout le delta est de la
  plomberie pour les server-tools Anthropic (`web_search` / `web_fetch`, blocs
  `server_tool_use` rejoués verbatim) et des chemins d'import concrets à la place des barrels.
  Zéro impact sur un appel sans tools.
- Aucun modèle moins cher que Haiku 4.5 dans la nouvelle liste (Sonnet 5 à $3 / $15, Fable 5 à
  $10 / $50). **On garde Haiku 4.5.**

### Verdict

🟡 Breaking en théorie, 🟢 en pratique. Bump appliqué sans modification de code.

---

## Désaccords avec l'audit initial

### A. Le chemin d'exécution décrit était faux

L'audit supposait qu'on passait par `structuredOutput()` de l'adapter (le contournement
« forced tool use », non streamé) et en tirait l'hypothèse que le cap à 100 tokens pouvait
produire un `null` absorbé par `result?.keywords ?? [prompt]`.

C'est faux. `claude-haiku-4-5` figure dans `ANTHROPIC_COMBINED_TOOLS_AND_SCHEMA_MODELS` **dans
les deux versions**, donc `supportsCombinedToolsAndSchema()` renvoie `true` et le moteur prend
le **mode natif combiné** : requête Messages *streamée* avec `output_config.format`, et le JSON
est récolté dans le texte du dernier tour. `structuredOutput()` n'est jamais appelé chez nous.

Conséquence concrète : en cas de troncature, c'est la branche `stop_reason: 'max_tokens'` du
stream qui s'applique, elle émet un `RUN_ERROR`, `chat()` **lève** — elle ne résout pas `null`.
On retombe donc dans notre `catch`, qui logge dans Sentry et renvoie `[prompt]`. Une troncature
est visible dans les logs, pas silencieuse. C'est un comportement pré-existant, inchangé par le
bump.

Effet de bord de ce même constat : la seule modification de 0.16.3 qui touche
`structuredOutput()` (le passage de `{ stream: false }` à `mapCommonOptionsToAnthropic`) est
sans objet pour nous.

### B. Le `oxlint-disable` de `ai-search.ts:112` ne peut pas devenir inutile

L'audit demandait de revérifier après bump si le `?.` devenait superflu.
`runAgenticStructuredOutput` retourne `Promise<InferSchemaType<TSchema>>` et **lève** sur chaque
chemin sans résultat (`finalizationError`, puis
`throw new Error('structured output finalization produced no result')`). Le type n'a jamais été
nullable et ne l'est toujours pas, à l'identique en 0.38.0 et 0.42.0. Le `?.` restera donc
toujours flaggé par `typescript/no-unnecessary-condition`, et le disable reste nécessaire.

Vérifié après bump : `pnpm exec oxlint --report-unused-disable-directives` ne signale aucun
disable inutile sur le projet. Le commentaire ligne 112 est conservé tel quel.

### C. Ce que l'audit a manqué : un `$ref` hors spec Gemini, déjà en production

En exécutant les deux convertisseurs sur la forme réelle du schéma de traduction
(`buildLocalizedResponseSchema` → `{ fr: item, en: item }`), `zod-to-json-schema` produit :

```json
"fr": { "type": "object", ... },
"en": { "$ref": "#/properties/fr" },
"required": ["fr", "en"]
```

Or la doc de `responseJsonSchema` (lue dans le `.d.ts` de `@google/genai`) dit des `$ref` :
*« Cyclic references are unrolled to a limited degree and, as such, may only be used within
**non-required** properties. »* Notre `en` est dans `required`. On envoie donc aujourd'hui, en
production, un `$ref` en dehors du sous-ensemble documenté comme supporté.

Ça n'est pas causé par le bump et ça semble passer en pratique, mais c'est fragile : ça ne se
déclenche que quand plusieurs locales cibles sont demandées d'un coup (traduction FR → EN seule
n'a qu'une clé, donc pas de réutilisation, donc pas de `$ref`). Voir la section hors périmètre.

---

## Réalisé

- [x] Bump : `pnpm add @google/genai@^2.13.0 @tanstack/ai@^0.42.0 @tanstack/ai-anthropic@^0.16.3`
- [x] `pnpm run lint:fix` (tsc + oxlint + oxfmt) — passe, zéro diagnostic
- [x] Aucun code applicatif modifié : `git diff` ne touche que `package.json`, `pnpm-lock.yaml`
      et ce plan
- [x] Vérification qu'aucun disable oxlint n'est devenu inutile
- [ ] `/simplify` — non applicable, aucun code source modifié

## À tester à la main en dev

- [ ] Recherche AI (`aiSearchMemes`), prompt FR puis prompt EN
- [ ] Admin, traduction d'un mème (`translateMemeContent`) : FR → EN
- [ ] Admin, traduction vers **plusieurs locales d'un coup** si l'UI le permet (chemin `$ref`)
- [ ] Admin, AI Assist sur une vidéo (`aiAssistMemeContent`) : upload, polling `FileState.ACTIVE`,
      cleanup du fichier Gemini

---

## Hors périmètre

### 1. `zod-to-json-schema` → `z.toJSONSchema()` (Zod 4) — recommandé, à faire séparément

`src/server/ai.ts` importe `zod/v3` et `zod-to-json-schema` uniquement pour fabriquer le JSON
Schema passé à Gemini. Zod 4 (`4.4.3`, installé) expose `z.toJSONSchema()` nativement.

L'audit initial présentait la migration comme un risque à valider côté Gemini (JSON Schema
2020-12 par défaut). **C'est l'inverse** : sortie comparée en exécutant les deux convertisseurs
sur la forme réelle du schéma, `z.toJSONSchema(schema, { target: 'draft-7' })` produit un
document **identique à l'actuel sauf sur un point** — il **inline** la locale dupliquée au lieu
d'émettre `"en": { "$ref": "#/properties/fr" }`. La valeur de `$schema` reste
`http://json-schema.org/draft-07/schema#`, exactement celle envoyée aujourd'hui.

Autrement dit la migration **rapproche** le payload du sous-ensemble supporté par Gemini au
lieu de l'en éloigner, en plus de supprimer une dépendance et l'import legacy `zod/v3`.

Ne pas laisser le `target` par défaut : `z.toJSONSchema()` sans option émet
`$schema: "https://json-schema.org/draft/2020-12/schema"`, une valeur jamais envoyée jusqu'ici.
Pas de raison de changer ça dans le même passage.

Coût réel : le fichier importe `zod/v3` aussi pour ses `validator()`, donc la migration touche
tout le fichier, pas seulement les deux appels `zodToJsonSchema()`. À faire en une passe
dédiée, avec test manuel de la traduction multi-locales.

### 2. `recharts` 3.8.1 → 3.10.1

Épinglé sans `^`, choix volontaire. Hors sujet.

### 3. Advisory `hono` GHSA-9r54-q6cx-xmh5

Transitive via `shadcn > @modelcontextprotocol/sdk > hono`, devDependency CLI uniquement.
Aucune surface d'exposition runtime.
