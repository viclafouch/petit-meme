# Petit Meme

A platform for watching and sharing video memes. Victor is the only creator of memes. The public watches them, downloads them, shares them, and can generate personalised versions of them.

This file is the vocabulary of the project and the decisions the code cannot explain by itself. A term you coin and a constraint you discover both belong here, written the same way.

## Language

### Actors

**Visitor**:
Anyone acting on the site, identified by their IP address, whether they own an account or not.
_Avoid_: Viewer, anonymous, guest

**User**:
A Visitor who owns an account. Maps strictly to the Prisma `User` model.
_Avoid_: Member, account, customer

**Creator**:
Victor, the only person allowed to publish Memes. What he does on the site belongs to the Audit, never to the Activity: he is not his own audience.
_Avoid_: Author, admin (admin names the technical role, not the person)

### Content

**Meme**:
The unit of content and the reason the site exists: one short video, its title, its description, its keywords and its Categories. A Meme always carries exactly one Video. It is what the public browses, searches and shares, and the only object the Creator publishes.
_Avoid_: Post, clip, content, item

**Video**:
The video file itself, hosted and streamed by the CDN, referenced by its provider id. Distinct from the Meme: the Meme is the page and the metadata, the Video is what plays. A Video without a Meme is not visible anywhere.
_Avoid_: Media, asset, file

**Watermark**:
The mark burned into the video before publication. It is an invariant, not a state to check: a Meme published in production necessarily carries it, and the admin form cannot publish a Meme without it.
_Avoid_: Logo, overlay

**Category**:
A browsing axis for Memes, named by a slug and translated per locale. A Meme belongs to zero or more Categories.
_Avoid_: Tag, theme, collection

**ContentLocale**:
The language spoken or written **inside** a Meme, one of French, English or Universal. It is not the locale of the Visitor and it is not the locale of the interface. Universal means the Meme carries no language and belongs to both audiences.
_Avoid_: Language, locale on its own (ambiguous with the interface locale)

**Translation**:
The localized metadata of a Meme or a Category: title, description, keywords. It never translates the video, only what is written around it.
_Avoid_: i18n, version

### Surfaces

**Studio**:
The place where a User produces a Generation, that is the editor where they put their own text on a Meme.
_Avoid_: Editor, generator

**Reels**:
The full screen vertical browsing mode, one Meme after another. A distinct way of consuming the same Memes, not a distinct kind of content.
_Avoid_: Feed, stories, shorts

**Admin**:
The Creator's area: publication, moderation, figures. What happens there feeds the Audit, never the Activity.
_Avoid_: Dashboard, back office

### Actions on a Meme

**Export**:
The retrieval by a Visitor of the watermarked video file of a Meme. It comes in two intents, Download and Share.
_Avoid_: Sharing (the word names only one of the two intents)

**Download**:
An Export whose intent is to save the file on the device.

**Share**:
An Export whose intent is a native share. It is measured in two places that do not count the same thing. The Audience counter only keeps **completed** shares, since only the browser can know the outcome. The Activity Event keeps the **intent**, since the server sees the file go out and never learns what followed. An abandoned share therefore counts in the Activity and not in the Audience.
_Avoid_: Send, distribution

**Generation**:
The creation by a User of a variant of a Meme carrying their own text.
_Avoid_: Creation, editing

**View**:
The effective playback of a Meme by a Visitor, counted once per Meme, Visitor and day. A playback that is too short does not count.
_Avoid_: Watch, impression, display

**Bookmark**:
The link a User keeps towards a Meme in order to find it again. It belongs to the account, so a Visitor without an account has none. The free Plan caps how many a User can hold.
_Avoid_: Favorite, like, save (parts of the interface still say favorite, the word to converge on is Bookmark)

**Submission**:
The proposal by a User of a source link, a tweet or a YouTube video, for the Creator to turn into a Meme. It is the only way the public influences the catalogue, and it never publishes anything by itself: the Creator approves or rejects it, and an approved Submission becomes a Meme he publishes. Proposing is not creating.
_Avoid_: Upload, contribution, post

**AiSearch**:
A search phrased in natural language, answered by a model rather than by the search index. It costs money per call and is capped per Plan, unlike an ordinary search.
_Avoid_: Smart search, prompt

### Access

**Plan**:
What a User is entitled to: the number of Generations, of Bookmarks and of AiSearches. Free by default, lifted by Premium.
_Avoid_: Tier, offer

**Quota**:
What is left of a Plan's cap for a User, read at a given instant: the AiSearches already spent this month against `maxAiSearchesCount`. It names the figure and what remains of it, never the entitlement itself, which is the Plan. Only the AiSearch carries one today, the Generation and the Bookmark check their cap without ever naming the count.
_Avoid_: Limit, credits, allowance

**Premium**:
The state of a User whose Plan is paid and active. It is a state we read, never a flag we write by hand.
_Avoid_: Pro, paid member, VIP

**Subscription**:
The billing record behind Premium, owned by the payment provider and mirrored locally. It carries the dates and the cancellation, not the entitlements.
_Avoid_: Abonnement premium (mixes the state and the record), payment

### Observation

**Event**:
A timestamped fact attributed to a Visitor: a View, an Export, a Generation, a sign up, a subscription, a bookmark. Its attribution is frozen at the moment it happens: a Visitor who later creates an account does not recover their earlier Events.
_Avoid_: Action (the word already names an Export in the counters), trace, log

**Activity**:
The stream of Events, in the order they happened.
_Avoid_: History, journal (reserved for the Audit)

**Audit**:
The trail of the Creator's actions on the content, distinct from the Activity which only concerns the public.
_Avoid_: Admin activity

**Audience**:
The daily aggregate of Views, kept for the long term for the charts and the public counter of a Meme. It counts Views by the same rule as the Activity, so the two figures agree.
_Avoid_: Statistics, analytics

### Identity

**Avatar**:
The image that represents a User on the site. Always defined, possibly by a default value.
_Avoid_: Profile picture, image

**ProviderAvatar**:
The Avatar supplied by Discord or Twitter at sign up, frozen at that instant and never rewritten. It serves as the default choice and as a possible way back. Its lifetime is not guaranteed: a Discord URL contains the hash of the image, so it dies the day the person changes their picture. This is a known state, and the fallback is the AvatarSlot derived from the email.
_Avoid_: SSO picture, original avatar

**AvatarSlot**:
A slot in the Avatar catalogue, identified by its rank and not by the drawing it carries. A User picks an AvatarSlot, never a face: redrawing the catalogue changes what everyone sees without changing what anyone picked.
_Avoid_: Preset, template, default avatar

**VisitorKey**:
The identifier that tells two Visitors apart without naming them. Derived from the IP and renewed every day, it allows counting without keeping a re-identifiable trace.
_Avoid_: viewerKey, anonId, userToken

**AlgoliaUserToken**:
The stable token sent to Algolia for recommendation relevance. Distinct from the VisitorKey and set only with the Visitor's consent.
_Avoid_: userToken alone (ambiguous: at Algolia the word names an anonymous visitor)

## Constraints

Decisions that come undone easily and in good faith, because the code alone does not say why it is written this way.

**The Avatar catalogue is append-only.**
A file in `public/avatars/` is never deleted nor renamed. A User picked a rank, not a face: removing a file breaks their Avatar without them doing anything. Redrawing the same 24 files, on the other hand, is harmless.

**DiceBear is generated locally and never called through its API.**
`api.dicebear.com` is reserved for non commercial use and the site sells Stripe subscriptions. `@dicebear/core` stays in `devDependencies`: it serves the avatar generation script, never the runtime.

**The avatar style carries an attribution obligation.**
`AVATAR_STYLE_ID` is `adventurer-neutral`, published under CC BY 4.0, which requires the visible credit in section 8 of the legal notice. Changing style means rewriting that section in both locales: a CC0 style makes it useless, another CC BY style changes its text. The exact text is the one in `meta.license.text` of the style, and it is not translated.

**`/avatars/**` is served with a one week `max-age`, never as `immutable`.**
This is deliberate. A style change rewrites the same 24 files under the same names, and `immutable` would freeze the old drawing for up to a year on visitors' devices. Accepted trade off: a change takes up to seven days to propagate.

**`NODE_ENV` says how the code was built, never where it runs.**
A preview deployment is a production build, so `NODE_ENV` cannot tell it from the live site. Anything that must behave differently there, error reporting, rate limiting, secure cookies, reads the deployment environment instead. `NODE_ENV` remains the right question for everything else. On the server, when the platform does not say where the code runs, `NODE_ENV` decides after all, so a missing variable never silently downgrades production. `matchIsProductionDeployment`, `matchIsDeployed` and the Sentry server setup all fall back that way. The browser never sees `VERCEL_ENV`, which Vercel hands to the build only, so `vite.config.ts` copies it into `VITE_VERCEL_ENV`, a name Vite inlines. That spares a second variable to declare by hand on every Vercel scope. The browser does not share the server fallback: when the build has no `VERCEL_ENV`, it reads `development`, and Sentry stays silent there.

**The Sentry server setup reads `process.env`, never `serverEnv`.**
`instrument-server.ts` is imported before the app. `serverEnv` validates every server variable at once and throws when one is missing, so going through it would let a missing variable anywhere else take Sentry down with it.

**The end to end suite owns the `test` branch of the database, and empties it.**
Every run truncates every table but the migration history before seeding, listed from `pg_tables` rather than by hand, since a hand written list drifts each time a model appears. `.env.e2e` is loaded so that it wins over any exported variable, and the truncation refuses to run unless the connection string it sees is the one that file declares. That second check belongs next to the destruction, never at the call site.

**The phone has its own end to end project, and it runs the phone alone.**
`mobile-safari` is a WebKit on an iPhone viewport, and it takes the `*.mobile.spec.ts` files only. What the app hides past `md`, the Share button above all, has no other cover. Replaying the whole suite there is not an option: the roles that leave a mark on their account would be spent twice and a second checkout would be paid. The Web Share API is the one thing no runner can answer, since the sheet belongs to the operating system, so `navigator.share`, absent from Playwright's WebKit exactly as it is from a desktop browser, is replaced by a recorder in the spec that needs it. What the page hands over is the whole of what the site is responsible for. Autoplay is the other thing the runner gets wrong: Safari refuses an unmuted autoplay that Playwright's WebKit allows, so a running video would prove the runner and not the phone. The phone spec asserts the stream reaching WebKit, never the video starting on its own.

**The player puts the rest of the page out of reach with `inert`.**
The player is not a Radix dialog, so nothing does it on its own. A focus trap keeps the Tab key inside and leaves the library announced, clickable and swipeable to everyone who is not tabbing, so `inert` on everything else is the whole of it, and it is what the e2e assertions read. Escape belongs to the player alone: the library used to answer it too, on a path that closed the player without handing focus back. Safari does not focus a button when it is tapped, so the card the player was opened from is handed to it, and handing focus back to that card is the only thing that keeps a VoiceOver cursor where the Visitor left it. Only the phone project proves that last part, since Chrome focuses the card on the tap by itself.

**The e2e suite never deletes anything at Stripe.**
A deleted customer leaves an id that outlives it, and better-auth then hands that id to Stripe, which refuses it. Test mode customers pile up instead, which costs nothing and breaks nothing. The `billingPortal` role is the only one born with a real test mode customer: a billing portal session is created against one, and an invented id would be refused.

**A Premium is only recognised where the subscription is in the query cache.**
`useMemeExport` reads the cache and never fetches: an Export from a route that did not load the subscription sells Premium to someone who already bought it, and hands them a watermarked video. The `_default` layout loads it for everything under it, and any route outside that layout, `/reels` first, has to load it itself.

**The consent banner is the one prompt allowed to hold the screen.**
It lays a full screen veil and declares itself `aria-modal`, so nothing behind it is clickable while it is up. That contradicts the shortest path to the video on purpose: consent has to be a choice, not something collected while the Visitor is aiming at a play button. It still steps aside for a dialog that is already open, and every other prompt, the Premium reminder above all, waits its turn the same way.

**Every field written at sign up must be declared to better-auth.**
`transformInput` builds the inserted row by looping over the fields known to the better-auth schema only, and drops the rest without an error. A field returned by the `user.create.before` hook but missing from `USER_ADDITIONAL_FIELDS` is simply never written. This trap already cost `provider_avatar`, then the GDPR consent timestamps, then the email locale. A Prisma model one version behind drops them just as silently, and `signup.spec.ts` checks each of them.

**Sign up never says whether an address already has an account.**
`requireEmailVerification` makes better-auth answer a sign up on a taken address exactly as it answers a new one, and write nothing. Turning that option off turns the signup form into a way to ask whether someone has an account here. `signup.spec.ts` carries a test whose only job is to notice.

**The VisitorKey is a daily fingerprint, never the raw IP and never a stable one.**
It is `sha256(ip + day + secret)`. The raw IP is out because the key is copied into a JavaScript readable cookie and sent to Algolia as a `userToken`, which would expose it in two forbidden places. A fingerprint stable over time is out too: the table keeps 90 days, so it would amount to a persistent identifier for a marginal analytics gain. The daily renewal is the whole point, and two Visitors behind one connection counting as one is the accepted price.

**An Event is attributed at the instant it happens, and never re-attributed.**
A Visitor who later creates an account does not recover the Events they produced before signing up. Attaching them afterwards, by address, would credit one person with what another did behind the same family or office connection. A User's history therefore starts at sign up; the road before it is only in the Activity, for the 30 days it is kept. Any model change that assumes an Event can be updated after the fact breaks this.

**The counter of remaining AiSearches is handed back by the search itself, never refetched after it.**
The `AiSearchLog` the count reads is written with `waitUntil`, so it lands after the response has left. Asking the server again on success races that write: the answer can be the count from before, and it then stays on screen for as long as the query is fresh. The search already knows the figure, so it returns it and the client writes it straight into the cache. Going back to an `invalidateQueries` reads like a simplification and puts the race back, plus a round trip and a `count` on every search.

**The locale is a cookie, and the cookie is read before the URL.**
`cookie` comes first in the paraglide strategy, and paraglide writes `PARAGLIDE_LOCALE` on the first client render, not only when the language switcher is used. Two things follow. Walking once to `/en/` pins that browser to English, so a French road then redirects to its English twin instead of quietly undoing the choice. And a URL our router never builds still comes back in the right language: the `successUrl` handed to Stripe is a bare `/checkout/success`, and the cookie is the only thing that brings an English Visitor home in English. Putting `url` first would read as a simplification, and it would drop a paying Visitor back into French.

**The client entry hydrates with `StartClient`, never with the router alone.**
`StartClient` is the only thing that publishes the options of `createStart` to the browser, and `serializationAdapters` is among them. Without it a server function still answers, but its payload comes back with a tag no one on the client can read, so a refusal that carries a `StudioErrorCode` arrives as a bare seroval error and every caller falls back on its generic message. `RouterClient`, from the router alone, hydrates the page correctly and reads exactly like the right entry: it is the one that already cost the Bookmark cap its own message.

**The rate limit is a soft cap, counted in the memory of one instance.**
`rate-limit-store` keeps its counters in a `Map` that no other serverless instance sees, so a Visitor whose requests spread over several instances gets past the cap. The window is fixed, not sliding: the first request starts the clock, and the count resets only once the whole window has passed. It is simpler and cheaper than a sliding window, and it allows a burst across the boundary of two windows. Past `MAX_STORE_SIZE` keys the store drops the oldest inserted ones, an active key included. Each of these reads like a gap to close, and each is accepted because the cap is soft.

**The Watermark has one geometry and two filters.**
`scripts/watermark-videos.ts` burns it with the ffmpeg command line, and the Admin burns it in the browser with ffmpeg.wasm. Both read their figures from `~/constants/watermark`. `WATERMARK_WIDTH_RATIO` is a share of the shortest side of the video, so the mark stays visible on a portrait 9:16 Meme. `WATERMARK_MARGIN_RATIO` is a share of that same side, capped at `WATERMARK_MAX_MARGIN_IN_PIXELS` so a large video keeps the mark close to its corner. The command line filter measures the video through the `rw` and `rh` variables of `scale`, so the script needs ffmpeg 8 or later.

**Changing what an OG image draws means bumping `OG_VERSION`.**
`/api/og` answers with an immutable one year `Cache-Control`, so a URL that was already scraped is never fetched again. `OG_VERSION` sits in the query string of every URL `buildOgImageUrl` builds, and bumping it in `~/lib/seo` is the only way to get the new drawing served. Any edit to a template under `components/og/`, the backdrop included, needs it.

**The OG image fetch cache is shared by every render, and never empties.**
takumi-js fetches every remote image a template references on each render. `OG_IMAGE_FETCH_CACHE` sits at module scope so that every render reads the same one: measured on the home template, it took the fetches of a render from seven to none once warm, and it folds concurrent fetches of one URL into one. It is a plain `Map` with no eviction because the templates only reference fixed assets of the site. Moving it into the handler reads like a fix for a leak, and it brings every fetch back.

**The database pool stays small, so the e2e seed writes by the poolful.**
Neon bills compute time, so the pool stays small and lets the branch sleep. A caller that opens more transactions at once than `DATABASE_POOL_MAX_CONNECTIONS` queues on the pool, and a wait longer than its `connectionTimeoutMillis` fails. The e2e seed is that caller. Each write of `seed.setup.ts` nests its relations, so Prisma runs it in a transaction that holds a connection for its whole duration. Asking for every Meme at once leaves all but a poolful of them queued, and that wait breaks the timeout as soon as the runner sits further from the database than a laptop does. `createWithinPool` writes `DATABASE_POOL_MAX_CONNECTIONS` at a time, so nothing queues. A single `Promise.all` reads like a speed up and brings the timeout back.

**Bunny Storage is probed with a one byte GET, never a HEAD.**
Bunny Storage answers 401 to a HEAD request. `checkWatermarkExists` therefore sends a GET with `Range: bytes=0-0` and reads a 200 or a 206 as present. Going back to HEAD reads like a saving, and it reports every watermarked Video as missing.

**The build copies every variable of its env file into `process.env`.**
Vite hands `.env.[mode]` to `import.meta.env` only, filtered on `VITE_`, and never fills `process.env` from it. Nitro, the Sentry plugin and the rest of the server side read `process.env`. `vite.config.ts` therefore calls `loadEnv` without a prefix filter, which loads every variable of the mode, and merges the result into `process.env`. The line reads like a leftover, and removing it leaves the server side without the variables the file declares.

**takumi-js runs on its native addon, at build time as at runtime.**
Nitro adds the `wasm` and `unwasm` export conditions on every preset. Under `unwasm`, takumi-js resolves `#backend` to WebAssembly at build time, while Node resolves it to the native addon at runtime, so the OG image would be built against one backend and run on the other. `exportConditions: ['!unwasm']` negates that one condition and keeps both on native. It reads like a stray setting.

**A route rule header wins over the header a handler sets.**
The `/**` rule answers `Cache-Control: no-cache` for every route. `/api/og` sets its own immutable header, and still needs a rule of its own in `vite.config.ts` that repeats it, or `/**` downgrades the OG image to `no-cache`. That rule reads like a duplicate of the handler.

**A Video URL reaches the sitemap inside the video tags only, never in a `<loc>`.**
The memes sitemap hands each Video to Google through `<video:content_loc>`, the tag Google reads to index a video. A video host in a `<loc>` would offer Google a raw file where a page is expected, so `http-contracts.spec.ts` fails as soon as a `<loc>` of any sitemap names it.

**The vitest lint preset sits in an override, never in `extends`.**
The `vitest` preset of `@viclafouch/oxc-config` turns every category `off`, and oxlint merges `extends` from the first config to the last, so that preset placed there turns off the categories the presets before it turned on, across the whole repository. `oxlint.config.ts` spreads only its plugins and its rules into an override scoped to `**/*.test.ts`. The package README puts it in `extends`, which makes the override read like a mistake.
