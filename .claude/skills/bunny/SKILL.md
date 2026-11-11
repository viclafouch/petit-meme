---
name: bunny
description: Use whenever you work with Bunny (bunny.net) in any way, in development, e2e or production, before the first command or dashboard step. Covers how Petit Meme delivers video through Bunny Stream and how to read or change its live setup with the `bunny` CLI and API: Stream libraries, pull zones, Edge Rules, delivery hostnames, token authentication, signed URLs, Bunny Storage and Bunny webhooks.
---

# Bunny in Petit Meme

The live setup is the source of truth: read it with the commands below on every run, and treat any ID, hostname or rule seen in an earlier session as stale.

## The model

- **One Stream library per environment**: development, e2e, production. The environment's `BUNNY_LIBRARY_ID` names its library.
- **Each library owns a pull zone** that Bunny Stream created for it. The pull zone answers on a custom hostname under `petit-meme.io`, and that hostname is `VITE_BUNNY_HOSTNAME`.
- **The delivery contract** lives in `scripts/lib/bunny-zone-contract.ts`: what each pull zone serves publicly, serves signed, or keeps for the server. Token authentication and the pull zone's Edge Rules enforce it.
- **Signing** lives in `src/server/platforms/bunny-token.server.ts`. The token signs the path, not the host.
- **Exports** (watermarked MP4, MP3) live in a Bunny Storage zone, `BUNNY_STORAGE_ZONE_NAME`.
- **Webhooks** from Stream land in `src/server/platforms/bunny-webhook.server.ts`.
- The role of each `BUNNY_*` variable reads from its `serverEnv.BUNNY_` call sites.

## Tools

- **`bunny` CLI**, with the `bunny-cli` skill for its syntax. `bunny api GET /user` checks the session. `bunny login` is interactive: hand it to Victor. When `bunny` is off `PATH`, run `npx -y @bunny.net/cli`.
- **`bunny api METHOD PATH`** for anything the CLI has no command for. It authenticates with the account API key, which reaches the Core API: libraries, pull zones, Edge Rules, hostnames.
- **Docs**: [llms.txt](https://bunny.net/docs/llms.txt) first, then the `.md` page of each topic. Endpoints and enum values come from the [API reference](https://bunny.net/docs/api-reference.md), such as [Add/Update Edge Rule](https://bunny.net/docs/api-reference/core/pull-zone/addupdate-edge-rule.md) for action and trigger types.
- **The zone check**: `pnpm exec vite-node --mode <development|e2e> scripts/check-bunny-zone.ts` probes a pull zone against the contract. Production values live on Vercel only.
- **The dashboard** comes last, for what the API cannot do. Name the exact page and field.

## Read the live setup

1. Library: `bunny api GET /videolibrary/<BUNNY_LIBRARY_ID>`. Its `PullZoneId` is the pull zone.
2. Pull zone: `bunny api GET /pullzone/<PullZoneId>`. It carries the hostnames and the Edge Rules.
3. Print selected fields through `jq` or a script. The trigger patterns of a header rule hold secret values, such as the original access key, so the raw JSON stays out of the transcript.

## Change it

1. Write to development first, prove it with the zone check, then e2e.
2. Production writes (library settings, pull zone, Edge Rule, hostname, DNS) are Victor's, unless Victor asks you in the conversation: hand over the exact command, then verify the result.
3. After a library settings update, read the Edge Rules again: Stream adds and removes rules of its own.
4. Rerun the zone check on each environment you touched.

## Gotchas

- `GET /pullzone` and the dashboard's CDN list hide the pull zones of Stream libraries. Reach them through the library's `PullZoneId`, or in the dashboard through Stream, the library, API, Pull Zone, Manage.
- A redirect Edge Rule rebuilds the URL from `{{path}}`, which drops the `bcdn_token` path segment: a redirected signed URL answers 403.
- A trigger's `PatternMatchingType` and the rule's `TriggerMatchingType` decide any, all or none. Read both from the API reference: an inverted value breaks the server-only files.
