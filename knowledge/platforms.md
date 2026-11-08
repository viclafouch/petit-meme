# Platforms

Petit Meme runs on a handful of outside services. Each one has one job.

## How they get picked

- **Free tier and comfort.** At Petit Meme's size, most services cost nothing or almost nothing, and they have to be pleasant to build with.
- **Portable over locked in.** A service that only works on one host gets weighed against that lock. A plain scheduled call beats a host's own workflow engine.
- **Cost stays visible.** Hosting draws on a monthly credit, then bills. Every other service sits on a free or near free tier, where an overage bills in silence. Two invoices already taught this. An admin page that refreshed itself kept the database awake. A recommendation service got a call on every page view, where one stored answer would do.

## The services

### Vercel: hosting

Runs the site, the scheduled jobs, and the preview of each change. It holds a production release until the checks pass. It also keeps admin uploads for a moment, before they move to Bunny.

The Creator started on Vercel, left for Railway when Vercel's plan had no usage credit, then came back once it did. Vercel stays pleasant to work with. What bothers the Creator is the lock: moving away would mean changing code. The site's framework runs on other hosts too, which keeps that door open, and it is why a Vercel-only feature has to earn its place.

### Neon: the database

Holds the accounts, the Memes, the subscriptions and the activity. Each environment has its own copy: production, local work, and the automated tests. The database sleeps when nobody uses it, and that is what keeps it cheap: nothing should wake it for no reason.

### Bunny: the videos

Receives each video, encodes it, stores it and serves it to every screen, and keeps the files people export. It reports back when a video is ready. Picked for its price, and because encoding, storage, delivery and signed links sit in one place.

### Stripe: payments

Runs the checkout, the subscriptions, the invoices and the customer portal where people cancel. Stripe is the truth about money: Petit Meme keeps only what it needs to open Premium. The Stripe app on the Creator's phone sends a notification for each new account and each payment.

### Algolia: search

Powers the search, the trending Memes and the related Memes. It also counts what people export, to learn which results lead somewhere.

### Resend: email

Sends every email: account confirmation, password reset, subscription and gift emails, and the Creator's weekly recap.

### Google Gemini: AI Assist

Watches and listens to a video, searches Google to confirm where it comes from, then writes its record and its translations. It is the one model that takes video and sound together. When Google's service is saturated, AI Assist gives up after a set time instead of hanging.

In November 2026, a blind comparison on Memes with hand-written records picked Gemini 3.8 Flash over Gemini 4 Argon: records as good, faster answers, where Argon sometimes never answered. Pushing the video settings to their maximum made the records slower and dearer, not better. A sharper prompt did make them better. Models change from month to month, so the comparison runs again every few months, on the newest Gemini model and on the prompt, to keep the best record at the lowest cost.

### Anthropic Claude: AI search

Turns a description in plain words into a search. Picked because it answers fast and holds a strict answer format, which a search needs.

### Sentry: errors

Collects the errors from the site and the server. Expected errors and browser noise are filtered out, so a real error stands out. Some signals stay visible on purpose: blocked scraping attempts, and Gemini timing out.

### GitHub: code and decisions

Holds the code, the issues and the pull requests. Plans and decisions live in the issues. GitHub runs the checks that guard production.

### X and Discord: sign-in

People sign up with X, Discord or an email address. X is also where almost every Meme comes from.

### Google Search Console: visibility

Shows how Google indexes the Memes in video search.
