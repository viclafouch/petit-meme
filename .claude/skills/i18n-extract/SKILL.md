---
name: i18n-extract
description: Extract hardcoded French strings from components into Paraglide message keys. Handles message generation, plurals, constants conversion, and ensures zero breaking changes.
user-invokable: true
---

# i18n String Extraction — Paraglide JS

You are an i18n extraction specialist for this codebase. Your job is to extract hardcoded French strings from source files into Paraglide JS message keys, producing both FR and EN translations.

## Input

The user invokes `/i18n-extract <batch or file list>` (e.g., `/i18n-extract Batch D`, `/i18n-extract src/components/User/login-form.tsx`).

## Step 1 — Load Context

1. Read the i18n plan at `.claude/plan-i18n.md`
2. Identify the target batch or files
3. Read `messages/fr.json` and `messages/en.json` to know existing keys and prefixes
4. Read every target source file to catalog all hardcoded French strings

## Step 2 — Catalog Strings

For each file, list every hardcoded French string found:
- JSX text content
- Attribute values (`placeholder`, `aria-label`, `title`, `alt`)
- Toast messages (`toast.success("...")`, `toast.error("...")`)
- Constants with display labels (`label: "..."`, `description: "..."`)
- SEO strings (in `seo()` calls, JSON-LD, meta tags)
- Error messages

Classify each string:
- **Simple**: static text → `m.prefix_key()`
- **Parameterized**: contains dynamic values → `m.prefix_key({ variable })`
- **Plural**: count-dependent → single key with declarative inlang plural syntax (`declarations`/`selectors`/`match`)
- **Reusable**: appears in 2+ places → use `common_` prefix

## Step 3 — Generate Message Keys

### Naming Convention

Keys use `snake_case` with a domain prefix:

| Prefix | Domain |
|--------|--------|
| `common_` | Shared across 2+ features (close, loading, back, etc.) |
| `nav_` | Navbar, mobile nav, user dropdown |
| `home_` | Home page (hero, FAQ, stats) |
| `pricing_` | Pricing page, plans, checkout |
| `meme_` | Meme pages, player, reels, filters |
| `studio_` | Studio controls, templates, actions |
| `auth_` | Login, signup, password forms |
| `settings_` | Settings page, profile |
| `error_` | Error pages, error-component |
| `footer_` | Footer |
| `cookie_` | Cookie consent |
| `checkout_` | Checkout success |
| `sentry_` | Sentry feedback widget |

### Rules

1. **Always check existing keys first** — search `messages/fr.json` for a key that already says the same thing. Reuse `common_` keys whenever possible.
2. **`common_` prefix** — use when a string appears in 2+ different features. Examples: "Fermer" → `common_close`, "Chargement…" → `common_loading`, "Retour à l'accueil" → `common_back_to_home`.
3. **No duplicate values** — if two features need "Télécharger", create ONE `common_download` key, not `meme_download` + `studio_download`.
4. **Short, descriptive key names** — `meme_share` not `meme_share_button_label`. Context comes from the prefix.
5. **Parameterized keys** — use `{variableName}` (camelCase) for interpolation: `"Ajouté le {date}"` → `meme_added_on`.
6. **Write UTF-8 directly** — `"Début"` not `"D\\u00e9but"`. No unicode escapes for printable characters.

### Plural Handling (CRITICAL)

**The inlang message format uses a declarative JSON syntax for plurals.** It does NOT support ICU MessageFormat (`{count, plural, one {…} other {…}}`) — that syntax is treated as a literal variable name.

**Pattern: single key with declarative syntax**

In `messages/fr.json`:
```json
{
  "meme_views": [{ "declarations": ["input count", "local countPlural = count: plural"], "selectors": ["countPlural"], "match": { "countPlural=one": "{count} vue", "countPlural=other": "{count} vues" } }]
}
```

In `messages/en.json`:
```json
{
  "meme_views": [{ "declarations": ["input count", "local countPlural = count: plural"], "selectors": ["countPlural"], "match": { "countPlural=one": "{count} view", "countPlural=other": "{count} views" } }]
}
```

In component:
```tsx
import { m } from '@/paraglide/messages.js'

const viewLabel = m.meme_views({ count })
```

Paraglide compiles this into `Intl.PluralRules` calls with the correct locale automatically — no manual plural logic needed in components.

**Anatomy of a plural message:**
- `"declarations"` — declare `input count` (the parameter) and `local countPlural = count: plural` (applies `Intl.PluralRules`)
- `"selectors"` — which local variable to match on (`["countPlural"]`)
- `"match"` — `countPlural=one` for singular, `countPlural=other` for plural. Use `{count}` to interpolate the number.

**When to use plurals:** view counts, bookmark counts, item counts, time units (minute/second), any `{n} {noun}` pattern.

**For unit-only plurals** (no number in output, e.g., "minute" vs "minutes"):
```json
{
  "meme_minutes": [{ "declarations": ["input count", "local countPlural = count: plural"], "selectors": ["countPlural"], "match": { "countPlural=one": "minute", "countPlural=other": "minutes" } }]
}
```

### Built-in Formatters (number, datetime)

The inlang message format also supports `number` and `datetime` formatters using the same declarative syntax. These use `Intl.NumberFormat` and `Intl.DateTimeFormat` under the hood.

**Number formatting:**
```json
{
  "balance": [{ "declarations": ["input amount", "local formattedAmount = amount: number style=currency currency=EUR"], "match": { "amount=*": "Solde : {formattedAmount}" } }]
}
```

**Date formatting:**
```json
{
  "purchase_date": [{ "declarations": ["input date", "local formattedDate = date: datetime dateStyle=long"], "match": { "date=*": "Achat : {formattedDate}" } }]
}
```

These are optional — using `Intl` APIs directly in code (e.g., `toLocaleDateString(getLocale())`) is also valid and sometimes simpler.

## Step 4 — Constants with Labels

When a file has `as const satisfies Type[]` arrays/objects that contain display labels (label, description, name), convert them to getter functions.

### Pattern: structural const + getter function

**Before:**
```ts
export const ITEMS = [
  { id: 'a', label: 'Petit', value: 24 },
  { id: 'b', label: 'Moyen', value: 36 }
] as const satisfies readonly Item[]
```

**After:**
```ts
// Structural data — module-level, used by stores/types
export const ITEM_STYLES = [
  { id: 'a', value: 24 },
  { id: 'b', value: 36 }
] as const satisfies readonly ItemStyle[]

// Display data — called at render time
export const getItems = (): Item[] => {
  return [
    { id: 'a', label: m.prefix_small(), value: 24 },
    { id: 'b', label: m.prefix_medium(), value: 36 }
  ]
}
```

### Rules

1. **Split structural vs display** — stores and types must NOT import `m.xxx()` at module level (breaks SSR/tree-shaking). Keep a structural `as const satisfies` for type derivation and store usage.
2. **Getter function for labels** — anything with `label`, `description`, `name` (display text) goes into a getter function that calls `m.xxx()`.
3. **Update all consumers** — every file importing the old constant must switch to the getter function. Search with `Grep` before finishing.
4. **Derive types from structural const** — `type ItemId = (typeof ITEM_STYLES)[number]['id']` instead of manual union.

## Step 5 — Apply Changes

### Order of operations

1. **Add keys to `messages/fr.json` and `messages/en.json`** — alphabetically within their prefix group
2. **Run `pnpm exec paraglide-js compile --project ./project.inlang`** — regenerate Paraglide output (only needed if dev server is not running)
3. **Update source files** — replace hardcoded strings with `m.xxx()` calls
4. **Add imports** — `import { m } from '@/paraglide/messages.js'` and optionally `import { getLocale } from '@/paraglide/runtime.js'` (only for plurals)

### Import rules

- `m` from `@/paraglide/messages.js` — message functions (includes plurals — no extra import needed)
- `getLocale` from `@/paraglide/runtime.js` — current locale (only for `toLocaleDateString(getLocale())`, `Intl.NumberFormat`, etc. — NOT needed for plurals, Paraglide handles that internally). Only in components/handlers, NEVER in helpers/utils.
- `localizeUrl` / `deLocalizeUrl` from `@/paraglide/runtime.js` — URL localization

### Zero breaking changes

- **FR text must remain identical** — the French user sees exactly the same strings as before
- **No behavior changes** — only string sources change (hardcoded → message function)
- **No removed exports** — if a constant was exported, the getter function must also be exported
- **Callback URLs** — auth redirects (`callbackURL`, `redirectTo`) must use `localizeUrl()` so users on `/en/` return to `/en/` after auth

## Step 6 — Translation Quality

### French (source)
- Copy the exact existing French string — do not rephrase or "improve" it
- Preserve punctuation, capitalization, spaces insécables (` ` before `:`, `!`, `?`)

### English (translation)
- Natural, idiomatic English — not literal translation
- Match the tone (casual for UI, formal for legal)
- Use sentence case for UI labels (not Title Case, except proper nouns)
- Keep technical terms consistent (meme, not "mème"; bookmark, not "favorite" when referring to the feature)

## Step 7 — Post-Extraction Checklist

After all strings are extracted:

1. **`pnpm run lint:fix`** — must pass with zero errors
2. **Update `.claude/plan-i18n.md`** — mark the batch as `[x]` with notes
3. **Run `code-refactoring` agent** on all modified files
4. **Verify no orphan imports** — `Grep` for removed constants/functions that might still be imported elsewhere

## Common Pitfalls (learned from Batches A–F)

1. **`getLocale()` in helpers** — NEVER. Pass `locale` as parameter. `getLocale()` only in components and server handlers.
2. **Module-level `m.xxx()` calls** — NEVER in constants files. Use getter functions called at render time.
3. **ICU plural syntax `{count, plural, ...}`** — NOT parsed by inlang message format plugin. It becomes a literal variable name. Always use the declarative JSON syntax with `declarations`/`selectors`/`match` (see Plural Handling section).
4. **`pluralize()` from format.ts** — do NOT use in public components. Use Paraglide declarative plurals (single key, no manual `Intl.PluralRules`). `pluralize()` is kept only for admin (FR-only).
5. **Paraglide compile** — after adding new message keys, run `pnpm exec paraglide-js compile --project ./project.inlang` if the dev server is not running. The Vite plugin does this automatically during dev.
6. **Unicode escapes** — write `"Début"` not `"D\u00e9but"`. Paraglide and JSON handle UTF-8 natively.
7. **`as const satisfies` on structural consts** — always keep `satisfies Type` for type validation, not just `as const`.
8. **Store imports** — stores (`*.store.ts`) must import structural consts, never getter functions with `m.xxx()`.
9. **urlPatterns** — use a single wildcard `/:path(.*)?` catchall. No need to list every route explicitly (Paraglide defaults: base locale unprefixed, other locales prefixed with `/{locale}/`).
10. **Strategy order** — `["url", "cookie", "preferredLanguage", "baseLocale"]`. `preferredLanguage` detects `Accept-Language` / `navigator.languages` for new visitors without a cookie.
11. **Middleware (TanStack Start)** — pass the ORIGINAL request to the framework handler: `paraglideMiddleware(req, () => handler.fetch(req))`. Passing the callback's modified request causes redirect loops.
12. **Plural key naming** — use the plural noun form as key name (`meme_views`, `meme_minutes`, `meme_seconds`), not `_one`/`_other` suffixes. One key per concept.
