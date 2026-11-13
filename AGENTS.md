<!-- intent-skills:start -->
## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before editing files for a substantial task:
- Run `pnpm exec intent list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm exec intent load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

# Petit Meme

A video meme library, live with real accounts, subscriptions and invoices, and no staging: `main` deploys to production once its checks pass. Victor, the Creator, is its only developer. The site is small, so a breaking change is cheap and the clean fix beats the compatible one.

## Product

`knowledge/` tells the product story, one file per topic. Read the topic a task touches before changing what a person sees or pays. Every change protects:

1. **The shortest path to the video.** An ad, a popup or an account asked before watching is Victor's call, argued out loud.
2. **Premium never blocks.** Free keeps the whole library.
3. **The video files.** Raw video URLs stay out of the DOM, the sitemap, the structured data and every API response.
4. **The phone's bytes.** Petit Meme is a phone app first, often on a thin connection. Video is the heaviest thing it sends, so a video loads only when someone watches it, and every other byte earns its place.

## Cost

Before anything that runs on a schedule, holds a connection or calls a paid API on a hot path, answer out loud: does the database still sleep, and how many calls a month does it cost. Cache before paying per call.

## Environments

- **The dev server is Victor's.** Start or stop it only on request. Hand Victor anything interactive.
- **Victor's phone is his.** Never connect to it on your own. When only a real phone can settle a check (software keyboard, viewport, touch, PWA), recommend that Victor runs `/phone`.
- **Use the CLIs and MCPs yourself** before handing Victor a command or a dashboard step.
- **Read production freely, write it only when Victor asks.** Production migrations stay Victor's. Before a write, say which environment the command hits: database tooling aims at production by default.
- **The repository is public.** Issues, PRs and commits carry no account ID, key or threshold.
- `pnpm build` validates the production env, which lives on Vercel only. Build locally with `pnpm build:e2e`.

## Hit every surface

The most common defect here is a change that works on the tested path and is missing everywhere else. Before calling a change done, say which of these applied:

- **Both locales**: strings, plurals, emails, metadata, legal pages, the URL with and without `/en/`.
- **Every audience**: Visitor, User, Premium, and Victor in the administration. A gate for one needs a state for the others.
- **Both directions**: a way in comes with the way out. A dialog that opens meets one already open.
- **Server and client**: the same route renders on the server and hydrates on the client.
- **Phone and desktop**: layout, touch targets, native share, the video player.
- **Discoverability**: a new public route needs its sitemap entry, metadata and structured data.
- **Emails**: a flow that changes an account state usually sends one.

## Scope and Git

- Asked for the avatar feature, deliver the avatar feature. List what you saw along the way once, ranked, and let Victor pick. A "fais tout" covers everything listed, and nothing past it.
- Plans live in the conversation and in GitHub issues. Research reports stay out of the repository.
- Commit and push on Victor's word only. "push" sends one commit straight to `main`. "go pr" opens a pull request, assigned to Victor, with the labels of the issue it closes, and auto-merge armed in rebase mode.

## Docs

- `knowledge/` changes only with a product decision: who Petit Meme serves, what an audience can do, the offer, a platform, the vision. A new admin badge, a bug fix or a renamed file leaves it alone. It names no code, no price, no quota and no count.
- Agent docs (`AGENTS.md` files, project skills) change only when Victor asks. A skill reads the live setup instead of holding IDs or values, and its description triggers it on its own.

## Taste

Victor likes simple systems and code that looks obvious. Find the real constraint, then write the smallest thing that makes the correct behaviour unsurprising.

- Writes that must all land run one after the other, so a failure stops the next one.
- The UI stays minimal.
- A CI or config file may keep a comment that states a constraint the file cannot show.

## Reporting back

- After a dependency bump or a refactor, name the risk and what to test.
- A task is finished when nothing is left that only Victor can run. List what is left, in order.
