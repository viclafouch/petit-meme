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

A video meme library, live with real accounts, subscriptions and invoices. Victor, the Creator, is its only developer. There is no staging: a push on `main` reaches production once the `ci` and `e2e` workflows pass. The checks catch what the tests cover, and the review before the push catches the rest.

The site is small, so a breaking change is cheap and the clean fix beats the compatible one.

## Product

`knowledge/` tells the product story. Read the topic a task touches before changing what a person sees or pays:

- an audience's rights, a cap, a gate: `audiences.md`, `offer.md`
- a Meme's statuses, import or publication: `meme-lifecycle.md`
- a string, an email, a locale: `languages.md`
- video delivery, embeds, scraping: `content-rules.md`
- a platform, a scheduled job, a paid call: `platforms.md`
- words: `glossary.md`

What every change protects:

1. **The shortest path to the video.** An ad, a popup or an account asked before watching is Victor's call, argued out loud.
2. **Premium never blocks.** Read `offer.md` before adding or moving a Premium gate.
3. **Both languages ship together.** Every user-facing change lands in French and English at once. `languages.md` says which surfaces stay French only.
4. **The video files are the product.** A change to how a Meme is delivered, embedded or previewed keeps raw video URLs out of the DOM, the sitemap, the structured data and every API response.

## Cost

Before anything that runs on a schedule, holds a connection or calls a paid API on a hot path, answer out loud: does the database still sleep, and how many calls a month does it cost at current traffic. Cache before paying per call, in the database or in Vercel Runtime Cache.

## Environments

- **The dev server is Victor's.** It already runs on Victor's machine. Start or stop it only on request, and hand Victor anything interactive: a login, a prompt, a command that waits for input.
- **Reach for the tools first.** Run the `gh`, `vercel`, Neon, Stripe, Sentry and `bunny` CLIs or MCPs yourself before handing Victor a command or a dashboard step.
- **Read production freely, write it on request.** Write production (rows, env variables, platform settings) only when Victor asks in the conversation. Production migrations stay Victor's.
- **Name the target before a write.** Database tooling aims at production by default, and a branch, connection string or env file named after production may resolve elsewhere. Say which environment a command hits and what it resolves to.
- **The repository is public.** Issues, PRs and commits carry no account ID, key or threshold. Print no secret value.

## Hit every surface

The most common defect here is a change that works on the tested path and is missing everywhere else. Before calling a change done, walk this list and say which entries applied:

- **Both locales**: strings, plurals, emails, metadata, legal pages, the URL with and without `/en/`.
- **Every audience**: Visitor, User, Premium, and Victor in the administration. A gate for one needs a state for the others.
- **Both directions**: a way in comes with the way out and the way to see it. A dialog that opens meets one already open.
- **Server and client**: the same route renders on the server and hydrates on the client.
- **Phone and desktop**: layout, touch targets, native share, the video player.
- **Discoverability**: a new public route needs its sitemap entry, metadata and structured data.
- **Emails**: a flow that changes an account state usually sends one, in both locales.

## Verify

- Read a library's current docs instead of recalling them. Check Victor's premises against the code and the docs, and say when one is wrong.
- Prove a change with the smallest thing that proves it: the typecheck and lint of the scope, the tests of the behaviour, a script for data-shaped logic. Backend behaviour that can regress in silence gets a test.
- Build locally with `pnpm build:e2e`: `pnpm build` validates the production env, which lives on Vercel only.
- The e2e suite reads `.env.e2e` from the main checkout, the first line of `git worktree list`. Copy it into a worktree.
- The running site is invisible to you. For a visual or device check, name what to look at and on which surface, and let Victor confirm.
- A task is finished when nothing is left that only Victor can run. List what is left, in order.

## Scope

- Asked for the avatar feature, deliver the avatar feature. List what you saw along the way once, ranked, and let Victor pick. A "fais tout" covers everything listed, and nothing past it.
- Plans live in the conversation and in GitHub issues. Research reports stay out of the repository.
- Read the open issues before filing one.

## Git and GitHub

- **Commit and push on Victor's word only.** "push" sends one commit straight to `main`, for a small change. "go pr" opens a pull request, for a bigger topic.
- **Every issue and PR opens assigned and labelled**: `--assignee @me --label <label>`. The label follows the conventional type: `fix` → `bug`, `feat` → `enhancement`, `docs` → `documentation`, and `chore`, `test`, `refactor` carry their own name. A PR that closes an issue takes the issue's labels.
- **Arm auto-merge right after `gh pr create`**: `gh pr merge <number> --auto --rebase`.
- Conventional titles, in English.

## Docs

- `knowledge/` changes only with a product decision: who Petit Meme serves, what an audience can do, the offer, a platform, the vision. A new admin badge, a bug fix or a renamed file leaves it alone. It names no code, no price, no quota and no count.
- Agent docs (`AGENTS.md` files, project skills) change only when Victor asks. A skill reads the live setup instead of holding IDs or values, and its description triggers it without a pointer from here.

## Taste

Victor likes simple systems and code that looks obvious. Find the real constraint, then write the smallest thing that makes the correct behaviour unsurprising. Existing complexity earns its place again.

- Write code a person would write: let the types answer, keep each condition readable out loud, call a function directly.
- A CI or config file outside the lint may keep a comment that states a constraint the file cannot show.
- Writes that must all land run one after the other, so a failure stops the next one.
- The UI stays minimal, and feedback goes through the site's toasts. UI work runs the `frontend-design` skill.

## Reporting back

- After a dependency bump or a refactor, name the risk and what to test.
- Give a confidence level when guessing, and what would raise it.
- A session that ends mid-feature hands over: what is done, what is not, what to read first, which commands are pending.
