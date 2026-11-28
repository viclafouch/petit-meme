# Coding standards

How Victor's code reads, checked in review. The tooling, the TanStack docs and the skills `AGENTS.md` loads cover the rest.

## Placement

- A domain is a singular glossary word, the same in every layer: `src/server/<domain>`, `src/queries/<domain>.ts`, `src/components/<domain>`.
- Administration-only code: `admin/` in its layer.
- Code of one route: beside it, in `-components/` or `-lib/`.
- Pure functions: `helpers/`. Browser and infrastructure: `lib/`. Values and shared schemas: `constants/`. Outside services: `server/platforms/`.
- Tests: `__tests__/` beside their source, through its interface.

## Files

- Middlewares: `.middleware.ts`.
- Browser-only code a server-rendered component imports: a plain `.ts` wrapped in `createClientOnlyFn`.

## Names

- Server functions open on a verb: `get`, `list`, `count`, `create`, `update`, `delete`, `toggle`, or a domain verb (`ban`, `grant`, `export`).
- Administration reads add `Admin`: `listAdminUsers`. Query options add `QueryOpts`.
- In `.server.ts`: `find` reads the database, `fetch` calls a service, `build` and `to` compute, `match` returns a boolean.

## Code

- Functions: arrow functions bound to a `const`.
- A module hides its mechanics: the Meme index returns Memes, never Algolia hits.
- A route's `head` and `scripts` only read its loader.
- Writes that must all land run one after the other.

## Styles

- Every colour, size, radius, shadow, duration, easing, z-index and breakpoint is a token in `src/styles.css`. A missing value joins it first.
- Shared controls are its primitives: `.pill`, `.icon-button`, `focus-ring`.
- A skill's raw value becomes a token, its media query a Tailwind variant.
- Tailwind by default: a style goes in its element's classes.
- A stylesheet only for what a class cannot say: `@keyframes` and what they animate, a style an element takes from another element, a selector many elements share.
- A stylesheet belongs to one surface, opens with `@reference` and the layer order, and keeps its rules in `@layer components` unless they override a page it does not own.
- Custom properties carry only data: caption sizes, frame ratio, export constants.
- Sizes: the spacing scale. `px`: hairlines. `cqw`: a video frame.

## Browsers

- The floor is `BROWSER_FLOOR_TARGETS`, the custom policy for `modern-web-guidance`: a newer feature ships a fallback that renders the same.
