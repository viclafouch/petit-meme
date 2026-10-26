---
paths: ["src/**/*.{ts,tsx}"]
---

## Frontend design

### React
- **Use `useMutation`** for async operations (forms, API calls) instead of multiple `useState` and manual state management for loading/success/error.
- **The React Compiler memoizes the client build** (`react({ compiler: true })` in `vite.config.ts`). New code writes no `useMemo`, `useCallback` or `React.memo`. The one escape hatch is a value used as an effect dependency, where the effect must not fire again unless the value really changes
- **Existing memoization stays.** Removing a `useMemo` or `useCallback` can change the compiler output, so it goes only with a test of the behaviour it guards
- **Code the compiler skips still runs**, unmemoized. Run the build with `react({ compiler: { reportDiagnostics: true } })` to list the skipped functions. Never add `"use no memo"` to make a component work: fix the Rules of React violation instead
- **Extract logic into custom hooks** - any useEffect, useState combo, or reusable logic should become a custom hook in `src/hooks/`. Keep components focused on rendering.

### Libraries
- ALWAYS use shadcn components instead of raw HTML elements
- **Code in `src/components/ui` and `src/components/animate-ui` changes in two ways only**: through the shadcn CLI (`shadcn add`, or a `shadcn migrate`), or by porting an upstream fix by hand. After a `shadcn add`, rewrite `import { cn } from "cn"` to `import { cn } from '~/lib/utils'`, which carries the project classes. `src/lib/utils.test.ts` fails until every file does. The components carry deliberate variants: `shadcn add <name> --diff` shows the upstream changes, and a fix found there is ported rather than overwritten

### Data loading (TanStack Query + Router)
- **Query owns server data and its freshness.** A loader fills the cache with `context.queryClient.query({ ...opts, staleTime: 'static' })`, and the component reads the same options with `useSuspenseQuery`. A loader never returns server data the component reads: the one exception is what `head()` needs
- **Secondary data streams**: start it with `void Promise.allSettled([context.queryClient.query(opts)])` and read it under a `Suspense` boundary
- **The router leaves preload freshness to Query** (`defaultPreloadStaleTime: 0`). A loader that calls a server function outside Query sets its own `staleTime` and `preloadStaleTime`, or every hovered link calls the server again
- **A mutation returns its invalidation** from `onSuccess` or `onSettled`, so `isPending` lasts until the fresh data is on screen. `router.invalidate()` follows only when router-owned data changed too: the root `user` context, or a loader read by `head()`
- **A query that belongs to one account carries `meta: PRIVATE_QUERY_META`** (`~/constants/query`). `useResetAccountData` removes these queries at sign in, sign out and account deletion

### Server Functions (TanStack Start)
- Use `useMutation` (TanStack Query) for async operations
- Use `mutation.isPending`, `mutation.isError`, `mutation.error` - never `useState` for loading/error
- Always display `mutation.error` with `getErrorMessage()` helper

### Execution Boundaries (TanStack Start)
- **`createServerOnlyFn`** for utility functions accessing DB, env vars, or server-only APIs - crashes if called from client
- **`createClientOnlyFn`** for utility functions using `window`, `localStorage`, or browser-only APIs - crashes if called from server
- **`createServerFn`** for RPC calls (client can call, executes on server via network request)
- Place server-only utilities in `src/utils/` wrapped with `createServerOnlyFn`

### Forms
- **TanStack Form** + **Zod** + **useMutation** for submission
- **A `File` field is typed `File | undefined`** in a named form values type, and starts at `undefined`. TanStack Form infers the form values from `defaultValues` and `validators` together ([TanStack/form#1583](https://github.com/TanStack/form/issues/1583#issuecomment-2980179941)), and an empty file field has no `File` to start from. `onSubmit` hands the mutation `SCHEMA.parse(value)`, which narrows the field to `File` once the validators passed

### Accessibility (WCAG 2.1 AA)
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- ARIA attributes usage
- `aria-invalid`, `aria-describedby` on inputs
- `role="alert"` on error messages
- `aria-busy` on loading buttons
- `aria-hidden` on decorative icons
- **Color contrast**: minimum 4.5:1 for normal text, 3:1 for large text. Never use `text-gray-500` or lighter on `bg-gray-50`/`bg-white` for readable content. Use `text-gray-600` minimum for secondary text, `text-gray-700` or darker recommended
- **Touch targets**: minimum 44x44px on interactive elements (buttons, links). Add `py-1` or `py-2` on text-only links to ensure sufficient height
- **External links**: when text mentions URLs or external resources (sources, LinkedIn, GitHub), render them as clickable `<a>` links, not plain text

### UX Patterns
- **Never disable buttons** - always allow clicks, explain constraints in dialog/feedback
- Show "why not" instead of blocking - users understand context better than silent disabled states

### Separation of Concerns
- Each file has **one clear responsibility**
- Extract logic into dedicated files organized by domain (`components/auth/`, `hooks/`, `lib/`)
- Keep entry points minimal - they orchestrate, not implement

### Component Architecture
- Reusable component patterns
- Props API design
- State management decisions
- Composition vs inheritance
- Error boundary placement

### Responsive Design
- Mobile-first approach
- Breakpoint strategy
- Touch-friendly interactions
- Drawer patterns (mobile filters)
- Adaptive layouts

### Performance
- **The entry chunk loads on every page, before the video.** A library a page needs only after an interaction or after load comes in through a dynamic `import()`, the way `instrument.client.ts` adds Sentry Replay on `load`
- **Measure a bundle change** with `pnpm build:e2e`, then the gzip size of `.output/public/assets/*.js`. The sourcemaps next to each chunk name the packages inside it

### Tailwind CSS
- Keep styling consistent: one source of truth for design tokens (fonts, colors, spacing)
- If a value is used more than once, it should be a utility class or CSS variable
- **Prefer `gap`/`space-y`/`space-x`** over `mt-*`/`mb-*` for spacing between siblings

### Attribute-Driven Styling
- **Never use dynamic classes for state** — use `aria-*` or `data-*` attributes on the element, then style with Tailwind modifiers (`aria-selected:bg-primary`, `data-active:bg-accent`)
- Avoid `cn("bg-muted", isActive && "bg-primary")` — prefer setting an attribute and letting CSS handle the rest
- **Exceptions**: variant props (size, color), layout changes without a semantic attribute, third-party constraints

### Hover & Interaction Consistency
- **No custom hover effects** that don't exist elsewhere on the site
- **Allowed hover effects**: `hover:bg-*`, `hover:text-*`, `hover:border-*` (color transitions only)
- Buttons already have built-in hover states via shadcn - don't override with custom transforms
- Links use `hover:text-primary` or `hover:text-foreground` - keep it simple
- **Consistency over creativity**: match existing patterns, don't invent new interactions

### Animations (Motion)
- **Use Motion** (`motion/react`) for all UI animations - no CSS transitions for interactive elements
- **AnimatePresence** for enter/exit animations (notifications, modals, toasts)
- **layout prop** for smooth layout shifts when elements appear/disappear
- **Prefer `motion` components** over CSS animations for:
  - Notifications and alerts (slide in/out)
  - Modal/dialog transitions
  - List item additions/removals
  - Page transitions
  - Hover/tap interactions
- **Animate `transform` values and `opacity`**: independent transforms (`x`, `y`, `scale`, `rotate`), `opacity`, `filter` and `clipPath` run hardware accelerated. A CSS variable never does, even when it feeds `transform`
- **Reduced motion is site-wide**: `<MotionConfig reducedMotion="user">` sits in `RootDocument`. It turns off independent transforms (`x`, `scale`, `rotateY`…), size, position and layout animations in every `motion` component, vendor code included. A raw `transform` string, `opacity`, color, `filter` and `clipPath` keep animating
- **`useReducedMotion()` covers what `MotionConfig` leaves running**:
  - a raw `transform` string, a fade or a `filter` to cut
  - a motion value passed through `style` (`useScroll`, `useSpring`)
  - a behaviour outside Motion, such as video autoplay
- **Standard durations**: 0.2s (fast), 0.3s (normal), 0.5s (slow)
- **Standard easings**: `[0.4, 0, 0.2, 1]` (ease-out), `[0.4, 0, 1, 1]` (ease-in)
- **CSS transitions exception**: when CSS transitions are used (accordion, collapse), add a named CSS class and include it in the `@media (prefers-reduced-motion: reduce)` block in `styles.css` with `transition: none`

### SEO Checklist (new pages)
- Every new route MUST be added to the sitemap (`sitemap[.]xml.ts`)
- Structured data (JSON-LD) for rich pages (FAQ, product, etc.)
- When content references external URLs, render them as clickable links (benefits SEO link signals and user trust)