# Coding standards

How the code is organised and named. Formatting, lint rules and file-name case are enforced by tooling; this file holds the conventions no tool checks.

## Domains

- A domain is a word of `knowledge/glossary.md`, in the singular: `meme`, `bookmark`, `proposal`, `subscription`, `cap`. The same domain name splits `src/server`, `src/queries` and `src/components`, so one concept lives under one name in every layer.
- A domain module holds the operations on one item and on many items together.
- Code only the administration uses lives under the `admin/` folder of its layer: `src/server/admin/<domain>`, `src/queries/admin/<domain>`, `src/routes/admin`.
- A file used by a single route lives next to that route, in its `-components/` or `-lib/` folder.

## Layers

- `src/server/<domain>/` holds everything that runs on the server. `src/server/platforms/` holds the adapters of outside services; a domain module builds on them, as `meme/meme-index.server.ts` builds on `platforms/algolia.server.ts`.
- `src/queries/<domain>.ts` holds the TanStack Query options of a domain.
- `src/components/<domain>/` holds the components of a domain and its hooks. `src/components/ui/` starts from shadcn's components; an edit there serves every caller, as a performance or accessibility fix does.
- `src/hooks/` holds generic hooks, tied to no domain.
- `src/helpers/` holds pure functions: input in, value out, with no I/O, no `window` and no environment.
- `src/lib/` holds the app infrastructure and the browser code: clients, cookies, media, export.
- `src/constants/` holds values, and the schemas a client form shares with the server.

## File suffixes

- `<subject>.functions.ts`: `createServerFn` and `createServerOnlyFn` wrappers, safe to import from any environment.
- `<subject>.server.ts`: server-only code, kept out of the client bundle by import protection.
- `<subject>.middleware.ts`: function middlewares.
- Browser-only code that a server-rendered component imports wraps its body in `createClientOnlyFn` and keeps a plain `.ts` name: a production build fails on a `.client.ts` import from that component.

## Names

- A server function opens on the verb of what it does: `get` reads one item, `list` reads several, `count` counts, and `create`, `update`, `delete`, `toggle` write. A domain verb (`ban`, `grant`, `record`, `store`, `export`) takes over where a CRUD verb would mislead.
- An administration read carries `Admin` after its verb (`getAdminMeme`, `listAdminUsers`), so it reads apart from its public twin.
- Inside a `.server.ts` file, `find` reads the database, `fetch` calls an outside service, `build` and `to` compute without I/O, and `match` answers a boolean.
- A query option takes the name of its server function: `listMemes` gives `listMemesQueryOpts`.
- Identifiers use the glossary word: Bookmark, Proposal, Cap, Premium, Generation, Export.

## Shape

- A domain module is deep: a small interface over its mechanics. Callers of the Meme index pass a query and get Memes back, without Algolia hits, parameters or caches; callers of the Free caps read one cap state.
- Logic written twice becomes one function: a pure one in `helpers/`, or a private helper of its module. `throwWithStatus` sets the response status and throws in one call.
- Functions are arrow functions bound to a `const`.
- A test lives in the `__tests__/` folder next to its source and drives the module through its interface.
