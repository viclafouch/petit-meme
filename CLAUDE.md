# Petit Meme

A video meme library. Victor publishes every Meme, everyone else watches them, exports them and generates captioned versions of their own.

The site is live: real accounts, real subscriptions, real personal data, real invoices. I am its only developer, `main` deploys itself, and there is no staging. Pushed code is production code, and the review before the push is the only one there is.

It is also small, so a breaking change is cheap and the clean fix beats the compatible one.

## Ubiquitous language

`CONTEXT.md` holds it: the actors, the meaning of each action, and the decisions the code cannot justify by itself. Read it before you name a variable, a column, a message key or a commit, and speak it back to me.

Its distinctions are load bearing. An Export is not a Share, an Event is not an Audience row, a Submission is not a publication. A word marked *Avoid* blurs a distinction we need. A new domain word lands in `CONTEXT.md` before it lands in the code.

The "Constraints" half outranks the glossary. Each entry is a decision that looks like a mistake until you know why, which is exactly how it gets undone in good faith. A task that fights one of them is a conversation to have. A constraint you discover is a line to add.

In this file, **you** is the agent reading it, **I** is Victor, the Creator and the only developer.

## What makes Petit Meme special

The site stands out by being plain. It opens on a video, it plays, and nothing asks anything of the Visitor. That plainness is the product, and it is what to protect as the rest grows. Here is what we never compromise on.

1. **The path to the video stays the shortest one.** The consent banner is the only interruption that earns its place, and it earns it legally. An ad, an interstitial, a newsletter popup, an account demanded before watching: each competes with the video, so each has to win that comparison out loud before it ships.
2. **Premium sells itself, it never blocks.** Anonymous Visitors and free Users keep the whole library: browse, watch, Export, share. Premium lifts caps and adds comfort, so pushing it is welcome, in the right place and at the right moment. A reminder speaks once, waits its turn behind whatever dialog is already open, and takes no for an answer. Saying no leaves a Visitor with everything they already had.
3. **Bilingual by construction.** French is the base locale, English lives under `/en/`. Strings, emails, metadata and legal pages ship in both at once. One language working is half a feature.
4. **Mobile first, every browser.** Design starts on the phone. Safari on iOS counts as much as Chrome on desktop, and touch targets, native share, autoplay and keyboards all differ.
5. **Production data is real.** Migrations are additive: new optional fields, new indexes, new tables. A new required column carries a default. Dropping, renaming and resetting are off the table.
6. **The video files are the product.** Pages stay indexable while the underlying video URLs stay protected. Any change to how a Meme is delivered, embedded or previewed answers one question first: does a raw video URL come back into the DOM, the sitemap or an API response.

## Cost discipline

Every service sits on a free or near free tier, the hosting plan has no cap and no alert, and an overage is billed in silence. Two invoices already paid for this lesson: a database kept awake by a 60 second admin poll, and a recommendation API called on every page view instead of being cached.

Before anything that runs on a schedule, holds a connection, or calls a paid API on a hot path, answer two questions out loud: does this let the database sleep, and how many calls a month does it cost at current traffic. Cache in our own database rather than pay per call. A feature already included in a tier we hold is worth suggesting.

## A note from Victor

I like simple systems and code that looks obvious. Find the real constraint, then build the smallest thing that makes the correct behaviour unsurprising. Complexity that is already there has to earn its place again, and machinery that looks serious is still machinery.

Fight scope creep, including your own. Asked for the avatar feature, I want the avatar feature. Tell me about the four adjacent improvements, let me pick.

I read code better than paragraphs. Short answers. A reply that needs a table of contents is too long.

Everything below is a good default. What I ask for in the conversation wins over it.

## The ways to hurt yourself

1. **The dev server is mine.** It is already running on my side. Same for anything interactive: a login flow, a migration against the local database, a command that waits for input. Hand me the exact command and wait for me to come back.
2. **Database tooling aims at production by default.** A branch, a connection string or an environment file named after production may resolve to something else entirely. Name the environment out loud and confirm what it actually points at before any write. Reading production is yours, writing it is mine to trigger.
3. **Only handler bodies are stripped from the client bundle.** Server clients and secrets survive at module scope and either break the build or ship to the browser. Lifting a helper out of a handler is the moment to check.
4. **A migration that looks additive can still rewrite data.** Read the generated SQL before it runs. Ship schema work with the commands in order, the environment for each, and what happens to the rows that already exist.

## Hit every surface

The most common defect here is a change that works on the path you tested and is missing everywhere else. Before calling a change done, walk this list and say which entries applied.

- **Both locales.** Strings, plurals, emails, metadata, legal pages, and the URL shape with and without `/en/`.
- **Every audience.** Anonymous Visitor, signed in User, Premium, and the Creator in Admin. A gate for one of them needs a state for the others.
- **Both directions.** A way in comes with the way out and the way to see it. A dialog that opens meets one that is already open. A one way door is a bug.
- **Server and client.** The same route renders on the server and hydrates on the client. State that exists on one side only is a hydration bug waiting.
- **Phone and desktop.** Layout, touch targets, native share, video player.
- **Discoverability.** A new public route means sitemap, metadata and structured data, or it is invisible.
- **Emails.** A flow that changes an account state usually carries one, in both locales.

## Research before writing

Read the documentation of a library rather than recall it. Versions move fast here and the remembered answer is often one major behind. My assertions get the same treatment: check the premise, and tell me when it is wrong instead of building on it.

Several unknowns left means asking before writing code. One round of questions is cheaper than a plan built on a guess. An unknown with an obvious default is yours to take, out loud.

## Verifying

Prove the change with the smallest thing that proves it: type check and lint the scope you touched, run the tests covering the behaviour you changed, write a targeted script when the logic is data shaped. Backend behaviour that can regress in silence earns a test rather than a paragraph.

The running site is invisible to you. When the last proof is visual or device specific, say what to look at and on which surface, and let me confirm.

A task is finished when nothing is left that only I can run. Anything left is listed, in order.

## Reporting back

French, plain technical language, short sentences. The first line says the outcome.

- What changed and why, then stop.
- What is dangerous. After a dependency bump or a refactor I want the risk and what to test, not the list of bugs upstream fixed.
- A confidence level when you are guessing, and what would raise it.
- A step skipped or a thing gone wrong belongs in the first sentence.
- A session ending mid feature hands over: what is done, what is not, what to read first, which commands are still pending.

## Scope

The specification is what I asked for in the conversation. Plans live in the conversation too, this repository holds no plan file for a feature. Work that needs steps checks in between them.

There is no `docs/` directory, and adding one is a conversation to have first. Prose about the code goes stale the day the code moves, and I will move the code without moving the prose. What outlives a feature belongs in one of three places instead: a constraint in `CONTEXT.md`, a rule in `.claude/rules/`, or a GitHub issue for anything still to do. `specs/` is the scratch area of the Playwright agents, never a place to keep anything.

## Git

Commit and push on my word only. `main` is the branch and pushing it deploys, so the last look at the diff happens before the push, not after. One concern per commit, conventional title, English for messages and branches.

## Taste

Write code a person would write. The tell of the other kind is defensive noise: a triple guard where the type already answers, a ternary chain nobody can read out loud, an abstraction wrapping a single call. When you catch yourself producing it, name the real constraint and write the small version instead.
