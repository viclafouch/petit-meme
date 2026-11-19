# Coding standards

The conventions no tool checks. Formatting, lint and file names belong to the tooling.

## One name per concept

A domain is a glossary word in the singular (`meme`, `bookmark`, `cap`), and it names the same slice in every layer: `src/server/<domain>`, `src/queries/<domain>.ts`, `src/components/<domain>`. Code only the administration uses sits under `admin/` in its layer, and code one route uses sits beside that route in `-components/` or `-lib/`. Shared code takes the most specific home that fits: pure functions in `helpers/`, browser and infrastructure code in `lib/`, values and shared schemas in `constants/`, outside services in `server/platforms/`.

## Names say what happens

- A server function opens on its verb: `get`, `list`, `count`, `create`, `update`, `delete`, `toggle`, or a domain verb (`ban`, `grant`, `export`) where CRUD would mislead. An administration read adds `Admin` (`listAdminUsers`), and a query option is its function name plus `QueryOpts`.
- Inside a `.server.ts` file, `find` reads the database, `fetch` calls a service, `build` and `to` compute, `match` answers a boolean.
- `.functions.ts` holds server functions importable anywhere, `.server.ts` stays on the server, `.middleware.ts` holds middlewares. Browser-only code a server-rendered component imports wraps its body in `createClientOnlyFn` under a plain `.ts` name, since a `.client.ts` import breaks the production build.

## Deep modules

A module is a small interface over its mechanics: callers of the Meme index pass a query and get Memes, never Algolia hits. Logic written twice becomes one function. Functions are arrow functions bound to a `const`. A test sits in `__tests__/` beside its source and drives the interface.

## The theme decides

`src/styles.css` is the design system. Every colour, size, radius, shadow, duration, easing, z-index and breakpoint is a named token there, and shared controls are its primitives: `.pill`, `.icon-button`, `focus-ring`. A component composes tokens and primitives, and a missing value joins the theme first. Code passes CSS only what comes from data, such as caption sizes, the frame ratio and export constants, as custom properties.

A stylesheet one surface needs ships with that surface. It starts with `@reference` and the layer order, keeps its rules in `@layer components` except those overriding a page it does not own, and writes breakpoints and input capabilities as Tailwind variants. Sizes run on the spacing scale, `px` draws hairlines, `cqw` follows a video frame.

## Motion and browsers

CSS carries every motion it can express, and the motion library takes gestures, springs and values interrupted mid-flight. An animation moves `transform` and `opacity` to hold 60 FPS on a phone. The browser floor is the build target: a newer feature ships with a fallback that renders the same, and a visual effect is checked in both WebKit and Chromium.
