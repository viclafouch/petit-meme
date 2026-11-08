# The offer

Petit Meme has two plans: Free and Premium. Free keeps the whole library. Premium lifts the caps and adds comfort.

## What Free keeps

Every Meme, watched, downloaded and shared, with no account. The downloaded video carries a watermark. With an account, bookmarks, Studio captions and AI searches come with a cap.

## What Premium adds

- **The video without the watermark**, straight from the original file.
- **The sound of every Meme.** Some Memes work as sound alone, like a voice message: the person who receives it hears the joke with no picture to give it away. Others need the picture. Sending the sound is a fun surprise, and that is why it is Premium only. The sound came after the video, and was not part of the first idea.
- **No personal caps** on bookmarks, the Studio and the AI search.
- **No invitations to subscribe.**

## How Premium is sold

Premium is pushed in the right place and at the right moment, and never blocks. An invitation appears when a free person reaches for a Premium feature, and its secondary choice still gives them what Free allows: asking for the sound offers the video instead. A periodic reminder speaks once, waits behind any dialog already open, and takes no for an answer.

## The subscription

- **Plans.** Monthly or yearly. The yearly plan costs less per month.
- **Start.** Payment through Stripe. Premium opens as soon as the payment goes through.
- **Cancellation.** One click, through the Stripe customer portal. Premium stays until the end of the period already paid, and the screens say "ends on" instead of "renews on". A cancelled subscription can be restored before that date.
- **Failed payment.** Premium closes while the payment fails, and comes back when Stripe collects it.
- **Invoices.** Stripe sends and keeps them. The Creator reads a User's full subscription and invoice history in the administration, read from Stripe when the page opens.
- **Account deletion.** A User who pays cancels first. Deleting the account also deletes the Stripe customer.

## Premium offered

The Creator gives lifetime Premium to friends and family, with no payment, and can take it back at any time. A gift never touches someone who pays. The person gets a gift email in their language, and their screens say "offered for life" with no invitation to pay. Paying Premium and offered Premium stay separate everywhere: a figure about paying subscribers never counts a gift.

## One way to count

Every screen that shows a subscription uses the same states and the same figures: the administration, the User's profile, the emails and the weekly recap. The states are:

- **Active**: Premium, renews on a date
- **Ending**: cancelled, still Premium until a date
- **Payment failing**: no Premium until Stripe collects
- **Ended**: the subscription is over
- **Offered**: lifetime Premium from the Creator

Paid months count only what was really paid.
