# Newsletter runbook — the weekly story

> **Fixed 2026-09-16: production accepts subscribers again.**
> `RESEND_WEEKLY_STORIES_SEGMENT_ID` had never been set in Vercel, so
> [`app/api/subscribe/confirm/route.ts`](../../app/api/subscribe/confirm/route.ts) answered
> `503 {"error":"Subscriptions are not configured."}` at the confirm button and no contact was ever
> created — while `POST /api/subscribe` kept answering 200 and sending the consent email, which is
> what hid it. The variable is now set in Production and Development and the deployment has picked it
> up; `pnpm check-subscribe-live` passes. **Preview still lacks it** — see
> [Known gaps](#known-gaps). This is the failure the [Friday checks](#the-automated-checks)
> exist to catch.
>
> **Since 2026-09-27 the weekly send is scheduled by a job, not by hand.** Six episodes had been
> published and none broadcast: the manual ritual this replaces was never once run, so the owner
> decided the scheduling should run itself.
> [`.github/workflows/weekly-broadcast.yml`](../../.github/workflows/weekly-broadcast.yml) runs every
> Wednesday and Friday at 12:07 UTC, schedules the next episode in Resend for Saturday at 13:00 UTC,
> and opens a GitHub issue to review it ([the Saturday ritual](#the-saturday-ritual)). Resend still
> does the sending. Its two repository secrets were set on 2026-09-28, and a dry run that day
> planned Episode 6 for Sat 2026-10-03 13:00 UTC ([Known gaps](#known-gaps) 2). On 2026-09-30 the
> owner deleted that scheduled broadcast and moved `firstBroadcastEpisode` to 7, so the Wednesday
> 2026-09-30 run books Episode 7 for that Saturday instead. The segment holds 4 confirmed subscribers and none of the owner's own
> addresses (2026-09-27), so add one before that send. [Known gaps](#known-gaps) 6, a real unsubscribe, is worth doing before
> it too. Both legal prerequisites were met on 2026-09-23 and 2026-09-24:
> [The postal address](#the-postal-address).

## What this is, and what subscribers are promised

One email a week carrying one episode of *The Travels of Tan* — six panels of strict-N5 Japanese,
three quiz questions, and the answers. The promise is made in the email body itself
([`lib/email/quiz-email.ts`](../../lib/email/quiz-email.ts)): "A new episode goes up every week."

The cadence is now a value, not prose. `config.newsletter` in [`config.ts`](../../config.ts) holds
`sendDay: 6` (**Saturday**, decided 2026-09-16), `sendTimeUtc: '13:00'` and `writeLeadDays: 3`, so
write-by is the **Wednesday** before, plus `firstBroadcastEpisode: 7`, where the broadcast queue
starts. [`lib/email/send-schedule.ts`](../../lib/email/send-schedule.ts) derives `nextSendDate()`,
`nextSendAt()`, `writeByDate(sendDate)` and `sendDayName()` from that config so nobody counts off a
calendar again — which is how the Send column in
[`docs/prd/episode-spec.md`](../prd/episode-spec.md) Part B stayed blank for three episodes. That
module only computes: the weekly job passes `nextSendAt()` to Resend as `scheduled_at`, and Resend
does the sending.

There is no database. The confirmed list lives in a Resend Segment; a *pending* signup is never added
to it, because the signed token is the record ([`lib/email/subscribe-token.ts`](../../lib/email/subscribe-token.ts)).
That is what keeps CLAUDE.md's "no server-side user state" rule intact. It is not the same as
"stored nowhere": Resend's send log keeps the confirmation email itself (address, subject, time),
and the privacy policy says so. Unconfirmed addresses can be read straight out of that log.

## The three email paths

| Path | Trigger | Automatic? | Code |
|---|---|---|---|
| Double opt-in confirmation | A human types their address into a capture form | Yes | [`app/api/subscribe/route.ts`](../../app/api/subscribe/route.ts) → [`lib/email/confirmation-email.ts`](../../lib/email/confirmation-email.ts) |
| Welcome quiz card | That same human presses the button on `/confirm` | Yes | [`app/api/subscribe/confirm/route.ts`](../../app/api/subscribe/confirm/route.ts) → [`lib/email/quiz-email.ts`](../../lib/email/quiz-email.ts) |
| Weekly episode broadcast | The weekly job schedules it in Resend (Wednesday or Friday, for Saturday 13:00 UTC); Resend sends it unless a person cancels it | **Scheduled by a job**, since 2026-09-27 | [`scripts/stories/schedule-weekly-broadcast.ts`](../../scripts/stories/schedule-weekly-broadcast.ts), built by [`lib/email/broadcast.ts`](../../lib/email/broadcast.ts) |

The first two sends are one-per-person and reactive: each is triggered by a specific person acting
on their own address, in the same request. Nothing in this repo sends to more than one recipient or
iterates contacts. One thing runs on a timer, the weekly job, and it does not send: it asks Resend to
schedule one broadcast to the segment, and Resend sends it.

Which episode the welcome card carries travels inside the signed confirm token as an optional
`episode` slug, resolved against the registry on the way in and again on the way out. An unknown slug
is dropped, never fatal, and falls back to the newest episode. The welcome card is also the only
email in the flow carrying `List-Unsubscribe` / `List-Unsubscribe-Post`
([`app/api/unsubscribe/route.ts`](../../app/api/unsubscribe/route.ts)); the confirmation email must
never grow one, because suppressing the consent email breaks consent itself.

## The Saturday ritual

Since 2026-09-27 a job schedules the send. A person imports the episode, reviews what the job
scheduled, and can stop it. Write-by is still Wednesday (send day minus
`config.newsletter.writeLeadDays`), because the job's first run each week is then.

### What the job does

[`.github/workflows/weekly-broadcast.yml`](../../.github/workflows/weekly-broadcast.yml) runs
[`scripts/stories/schedule-weekly-broadcast.ts`](../../scripts/stories/schedule-weekly-broadcast.ts)
(`pnpm stories:schedule-broadcast`) every **Wednesday and Friday at 12:07 UTC**. It also runs on
demand (Actions → Weekly Broadcast → Run workflow), and a dry-run switch there makes it print its
plan and change nothing. Each run:

1. **Checks its own rules first.** `pnpm validate:broadcast` asserts the slot and queue logic
   against a synthetic clock and fake Resend state, because most changes reach `main` without a
   pull request.
2. **Reads every broadcast in Resend. Resend is the ledger; there is no state file in the repo.** An
   episode's broadcast is the one named exactly `Episode N: <title>`, the name
   [`lib/email/broadcast.ts`](../../lib/email/broadcast.ts) gives it. Only broadcasts to the
   weekly-stories segment count.
3. **Picks the next episode:** the lowest-numbered registered episode, from
   `config.newsletter.firstBroadcastEpisode` (7) up, that has no broadcast scheduled, queued,
   sending, sent or cancelled. It goes by `number`, never `publishedAt`. Episodes 1 to 6 have
   already reached every subscriber and are never sent: 1 to 5 went up before the list's first
   broadcast, and 6 went out through the welcome card, since a new subscriber's confirmation email
   carries the latest episode. Subscribers meet them on the site and through the welcome card.
4. **Does nothing if a send is already booked.** If any episode broadcast is scheduled, whatever its
   date, or any other broadcast has the Saturday, the job leaves it: one broadcast per send slot.
   So episode 7 goes out on Sat 2026-10-03, and an episode 8 would wait for the Saturday after.
5. **Guards the send.** It refuses unless the episode page answers 200 in production (episode 6 once
   shipped as a 404 on a green validator) and `config.business.postalAddress` passes
   `postalAddressProblems`. A run that finds an episode already scheduled checks its page again.
6. **Schedules it** for the next Saturday at `config.newsletter.sendTimeUtc` (13:00 UTC), as an ISO
   `scheduled_at`, never less than 30 minutes ahead: a run on Saturday after 12:30 UTC books the
   following Saturday. It creates a draft and schedules it in two separate calls. The Broadcast API
   has no idempotency key, and a lost response to a single create-and-schedule call could book the
   episode twice. If exactly one draft for the episode already exists (from `create-broadcast`, or an
   earlier run cut short), the job schedules that draft instead, but only if it is byte for byte
   what the builder makes today.
7. **Opens the review issue,** "Weekly story scheduled: Episode N for Sat YYYY-MM-DD 13:00 UTC"
   (label `newsletter`). It carries the broadcast id and one line on how to cancel it. Friday's run
   comments on it while it is open. The Wednesday after the send, the job closes it with Resend's
   record of when the broadcast went out.
8. **With nothing to schedule, it does not fail.** It opens "No episode queued for Saturday
   YYYY-MM-DD — import one by Friday": the write-by reminder. Season one is fully published, so from
   Sat 2026-10-10 on this is the expected state until an episode 8 is imported.

It never sends, and it never reads a contact. It makes at most two calls that change anything,
create a draft and schedule it, and Resend does the queueing, throttling, unsubscribe filtering and
the send itself at `scheduled_at`. When the state is ambiguous it stops rather than guess: two
drafts for one episode, a near-miss name such as `Episode 6 - …` that has gone out, a status it does
not know, or a draft that is no longer what the builder makes. A stop makes the run red and opens a
`newsletter-alarm` issue carrying the end of the job's output, which says what to change in Resend.
A job with no secrets does the same.

### What a person still does

1. **Import the episode by Friday.** `strips/ep-NN/script.json` in the strips repo is the source of
   truth; `scripts/stories/import-episode.py` derives `data/stories/ep-NN.ts` and the art, and the
   generated file is not editable. Register it in `lib/stories/index.ts`, then run
   `pnpm stories:render-email-panels <slug>`: the email shows each panel with its speech bubbles baked
   into a JPEG (`public/stories/<slug>/e1.jpg`..`e6.jpg`, because a mail client cannot lay text over an
   image), and the importer does not make them. Look at the email before it goes: `pnpm email:preview
   <slug> --local` writes it to a file to open in a browser. Run `pnpm validate:stories` (the contract: a
   failure is a content bug, not a lint nit, and it fails while any `e*.jpg` is missing), then merge and
   deploy so `/stories/<slug>` and its email images are live. The broadcast links to the
   page and quotes it. Imported by Wednesday 12:07 UTC, the episode gets a three-day review window;
   by Friday 12:07 UTC, one day. After Friday's run, run the workflow by hand before Saturday
   12:30 UTC, or the episode waits a week.
2. **Review in the window.** The review issue arrives when the job schedules. Open the broadcast in
   Resend and run [`docs/prd/episode-spec.md`](../prd/episode-spec.md) §A7. Items 1–3 and 10 are
   machine-checked by `validate:stories`. Items 4–9 (Gmail web, Gmail mobile, Outlook.com, clip
   check, dark mode, reply path) are Ari's, on a test send, and nobody else reports them as passed.
   *Unverified until the first send:* whether Resend's Test email works on a broadcast that is
   already scheduled. If it does not, the welcome card is the same email (`pnpm validate:subscribe`
   asserts the two differ only in `utm_content` and the unsubscribe link), and subscribing one of
   your addresses through the episode page's form sends you that episode's card. A dashboard test
   email leaves out the custom Reply-To by design, so a missing reply-to there is not a bug. Close
   the issue when you are satisfied, or leave it; nothing waits on it. After any change to env,
   Resend config or the email modules, walk [the end-to-end verification](#end-to-end-verification)
   too.
3. **The first-send header check.** On the list's first broadcast the review issue carries one more
   box: once the broadcast has gone out, open your own copy's raw headers. Confirm that Resend added
   `List-Unsubscribe` and `List-Unsubscribe-Post`, and that the plain-text part's
   `{{{RESEND_UNSUBSCRIBE_URL}}}` became a real link. As of 2026-09-23 only a 2024 Resend blog post
   says Resend adds those headers to broadcasts, and the docs never show the placeholder inside
   `text`.
4. **Record the send** in the Part B calendar's Sent column, from Resend's record of it: the closing
   comment on the review issue, `pnpm newsletter:stats`, or the dashboard. Never from the plan.

**Put one of your own addresses in the segment.** As of 2026-09-27 the segment holds 4 confirmed
subscribers, and the owner's two test contacts are not among them, so nobody on our side receives
the broadcast. Add one of your addresses to the weekly-stories segment in the Resend dashboard, or
subscribe it through the site's form. Then every broadcast lands in a human inbox, and the
first-send header check has a copy to open. Do it in the dashboard or the form; never write the
address into this repo.

### Cancelling or rescheduling

All of this is done in Resend (Broadcasts), in the dashboard or through its API. The job finds out
by itself on its next run.

- **Stop it for this Saturday:** cancel it. A cancelled scheduled broadcast goes back to `draft`
  and nothing is sent
  ([Resend](https://resend.com/docs/api-reference/broadcasts/cancel-broadcast)). The Saturday is
  then **held**: the job already opened that Saturday's review issue, so it schedules nothing else
  for that day, and Friday's run says so on the issue. The following week's runs schedule the same
  broadcast for the Saturday after.
- **Rebuild it:** delete it instead. Deleting a scheduled broadcast also cancels it. The Saturday is
  held the same way, and the following week's run builds a fresh broadcast from the episode data, so
  this is the one to use after fixing the episode itself.
- **Move it:** change its time in Resend. The job leaves a scheduled episode broadcast alone,
  whatever its date, and schedules nothing ahead of it.
- **Send it this Saturday after all,** after a hold: schedule it yourself in Resend. *Unverified:*
  Resend's 2025 Broadcast API launch post said an API-created broadcast can only be sent from the
  API, and its 2026 editor docs say API content is editable in the dashboard. If the dashboard will
  not schedule it, one `POST /broadcasts/{id}/send` carrying `scheduled_at` will.
- **Stop the job altogether:** Actions → Weekly Broadcast → Disable workflow.

Do not rename a broadcast, or rename or delete a review issue: the job finds both by their exact
names, and a deleted review issue takes its Saturday's hold with it.

### Running it by hand

`pnpm stories:schedule-broadcast --dry-run` needs no credentials and changes nothing. It prints the
slot, the candidate episode and "Resend state unknown (no key)". Given a key, it also prints the
broadcasts that bear on the run. A real run needs `GITHUB_TOKEN` and `GITHUB_REPOSITORY` as well as
the Resend pair, because the review issue is part of the contract, so use the workflow.

The manual fallback, `pnpm stories:create-broadcast <episode-slug>`, still makes a draft and only a
draft, with the same builder. It refuses to run while `config.business.postalAddress` is unset or
looks like a PO Box, and checks that before it asks for credentials. A draft it makes for the next
episode in the queue is scheduled by the job's next run; delete it if that is not what you want.
**Do not re-run it after an ambiguous network response.** Reconcile in the Resend dashboard first,
because the Broadcast API has no idempotency key.

Running either script locally needs Resend credentials, and **they cannot come from `vercel env
pull`**: `RESEND_API_KEY` exists in Vercel only for Preview and Production, as a sensitive variable
the CLI reads back empty. Create a **Full access** key in Resend → API Keys (a Sending-access key
cannot create broadcasts; the API answers `401 restricted_api_key`) and put it in `.env.local` by
hand, with `RESEND_WEEKLY_STORIES_SEGMENT_ID` beside it. The scripts load `.env.local` then `.env`
via dotenv and never print a value. The weekly job reads the same two values from GitHub repository
secrets instead ([Known gaps](#known-gaps) 2).

## The postal address

Every commercial email must carry a valid physical postal address (CAN-SPAM), and the privacy
policy names the same address as the postal contact point for data requests, including erasure.
Both read `config.business` in [`config.ts`](../../config.ts), so they cannot disagree:

| Field | What it holds |
|---|---|
| `legalName` | `The Auspicious Company`, the Massachusetts company that operates MichiKanji and is the controller of subscriber data (confirmed 2026-09-23) |
| `registration` | The phrase the privacy policy uses to describe it |
| `postalAddress` | `street`, `unit`, `locality`, `region`, `postalCode`, `country`. Set on 2026-09-24 to the private mailbox the owner supplied, with its `#4015` as the unit. `null` drops the footer line and stops both broadcast scripts |

**What it has to be.** A street address that reaches us: in practice a private mailbox at a
commercial mail receiving agency (a "virtual mailbox"). CAN-SPAM
([16 CFR 316.2(p)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-316/section-316.2))
accepts one only once it is "accurately registered" with the agency, which means **USPS Form 1583
completed and accepted**, so fill the field after that, not at signup. Never a USPS PO Box:
CAN-SPAM alone would accept one, but the address also has to name a physical place, and
`pnpm validate:subscribe` refuses one. Mail sent there must actually reach us. Scan-and-email is
fine, but an address nobody collects from is not "valid", and it is the published route for erasure
requests.

**Filling it in.** Copy the address exactly as the provider prints it, suite / `PMB` / `#` in
`unit`. Run `pnpm validate:subscribe`, deploy, and read `/privacy-policy`. The policy updates on that
deploy; the email footer on the next send.

**Keeping it valid.** Keep the plan renewed and the Form 1583 ID documents current (providers
re-verify expired ID). If the address ever changes, change the config the same day and redeploy: the
policy must never name an address that no longer reaches us.

The EU e-Commerce Directive's "geographic address at which the service provider is established"
(Art. 5) is **not** the governing rule here, contrary to what earlier drafts of the PRD assumed: it
binds providers established in the EU, and the operator is a US company. GDPR still applies to EU
subscribers, which raises a separate question (an Art. 27 EU representative) recorded in
[Known gaps](#known-gaps).

## Required environment

Set in every Vercel environment. Reference copy: [`.env.example`](../../.env.example).

| Variable | Used by | What breaks without it |
|---|---|---|
| `RESEND_API_KEY` | `/api/subscribe`, `/api/subscribe/confirm`, `/api/unsubscribe`, `stories:create-broadcast`, `stories:schedule-broadcast` | `POST /api/subscribe` → `503 {"error":"Subscriptions are not configured."}`; confirm → the same 503; `POST /api/unsubscribe` → bare 503; the broadcast scripts exit with an error naming it. The guard matters because `sendEmail` returns a **mock success** when the key is unset ([`lib/resend.ts`](../../lib/resend.ts)) — without it a signup would answer 200 and send nothing. |
| `EMAIL_TOKEN_SECRET` | Both subscribe routes, `/api/unsubscribe` | Same 503s. It HMACs both the 48h confirm token and the non-expiring unsubscribe token. Rotating it invalidates every confirmation link in flight **and every unsubscribe link ever sent** — rotate only in a send-free window. |
| `RESEND_WEEKLY_STORIES_SEGMENT_ID` | `/api/subscribe/confirm`, `stories:create-broadcast`, `stories:schedule-broadcast` | **This is the one that was missing for three episodes.** `/api/subscribe` still answers 200 and the confirmation email still goes out — that route does not check this variable — so the break is invisible until the person presses the confirm button and gets `503 {"error":"Subscriptions are not configured."}`. No contact, no segment membership, no welcome card. The broadcast scripts also refuse to run. Set in Production and Development on 2026-09-16; **not yet in Preview**. |

The weekly job does not read Vercel. It needs its own copies of `RESEND_API_KEY` (a **Full access**
key) and `RESEND_WEEKLY_STORIES_SEGMENT_ID` as GitHub repository secrets, and it fails, with an
issue, while either is missing ([Known gaps](#known-gaps) 2).

The variables are read at runtime by the deployment that was **built with them**, so adding one to
Vercel changes nothing until a redeploy. That is the trap worth internalising: on 2026-09-16 the
project had the variable set and the site still 503ing, until the deployment was rebuilt. Run
`pnpm check-subscribe-live` after the redeploy, not after the `vercel env add`.

`KIT_API_KEY` and `KIT_FORM_ID` are gone from Vercel as of 2026-09-16. Kit survives in this repo only
as historical rationale — the comment in
[`app/api/subscribe/route.ts`](../../app/api/subscribe/route.ts) explaining why its consent-skipping
fallback is *deliberately not reimplemented*, and two in
[`components/EmailCapture.tsx`](../../components/EmailCapture.tsx). Leave those: they are why the
code looks the way it does.

## The automated checks

Two, deliberately split by what they cost and what they need.

### The cheap probe — no secrets, runs anywhere

```bash
pnpm check-subscribe-live
```

One unauthenticated POST to `/api/subscribe/confirm` carrying an empty token. The route checks its
configuration *before* it parses the token, so the answer separates the two states without creating a
contact or sending anyone an email: `400 Missing token.` means configured, `503` means one of the
three variables is missing. It needs no secrets, which is the only reason it can run unattended.

Because confirm requires all three variables and `/api/subscribe` requires two of them, a passing
probe means the whole capture path's configuration is present.
[`.github/workflows/subscribe-live-check.yml`](../../.github/workflows/subscribe-live-check.yml) runs
it every Friday at 06:00 UTC — the morning before the send — and on any push touching the subscribe
routes, then runs the end-to-end walk below, and opens a GitHub Issue when either fails. The walk
skips with a notice rather than failing if its secrets are absent, so the credential-free probe still
runs on an unconfigured repo. It exists because nothing else could have caught the
outage described at the top of this file: the token model was correct, the build was green and the
deploy succeeded, and none of them can see a missing environment variable.

What it cannot tell you: whether the Resend key is valid, whether the segment id points at a real
segment, or whether mail is being delivered. That is what the second check is for.

### The end-to-end walk — needs secrets, sends real mail

```bash
pnpm check-subscribe-e2e
```

Actually does it: subscribes a unique address, confirms it, asserts Resend holds the contact, and
deletes the contact again in a `finally` so a failed run never leaves one sitting in the live segment.

The address is `delivered+mk-e2e-<stamp>@resend.dev`. Resend reserves that as a sink that simulates
successful delivery, which is the only honest way to send real mail from CI — a made-up address at
our own domain would hard-bounce, and bounces wreck a young sending reputation faster than anything
else. The sends do count against the monthly quota: two per run, against 50k.

It mints the confirm token locally rather than reading the sink, so `EMAIL_TOKEN_SECRET` must be the
**same value production signs with** or the confirm route answers 400. It needs `RESEND_API_KEY` too,
a **Full access** key, because it reads the contact back and deletes it. Locally, put both in
`.env.local` by hand: `vercel env pull` reads the key back empty, as
[the Saturday ritual](#the-saturday-ritual) explains for the broadcast script. In CI, repository
secrets.

One assertion covers three things: the confirm route answers 502 if either the contact create or the
segment add fails, so a 303 redirect proves both happened. `GET /contacts/{email}` does not report
segment membership, so there is nothing better to assert.

Still not proven, and deliberately: inbox placement, rendering, and the link inside the email body.
Those are human judgements — [§A7 items 4–9](../prd/episode-spec.md).

## Measuring the newsletter

As of 2026-09-27 the list is four confirmed subscribers, no broadcast has gone out, and **Resend's
open and click tracking are off** on `michikanji.com`, the only sending domain. So Resend holds no
open or click data at all. Its email log shows every message as "delivered", including confirmation
emails that each subscriber must have opened, and clicked through, to become one. Nothing is broken:
Resend was never asked to record either.

### The signals, and how to read each

| Signal | Where to read it | Needs tracking on? | What it tells you |
|---|---|---|---|
| Arrivals from the email | DataFast, UTM tab | No | Someone followed a link in a given email to the site |
| Replies | The inbox behind `config.resend.supportEmail` | No | Someone read closely enough to write back |
| Unsubscribes | `pnpm newsletter:stats`, or the Resend dashboard | No | Someone decided to leave |
| Delivered, bounced, complained | `pnpm newsletter:stats`, or the Resend dashboard | No | Whether the mail arrived, and whether anyone marked it as spam |
| Opens | `pnpm newsletter:stats`, or the Resend dashboard | Open tracking | An upper bound at best (see Apple, below) |
| Clicks, counted by Resend | `pnpm newsletter:stats`, or the Resend dashboard | Click tracking | Off by decision (see the last subsection) |

**Arrivals in DataFast: the click signal that works today.** Every content link in the episode email
carries `utm_source=newsletter`, `utm_medium=email`, `utm_campaign=<episode slug>` and
`utm_content=welcome` or `weekly` ([`lib/email/utm.ts`](../../lib/email/utm.ts)). DataFast reads
them with no setup: open the UTM tab, filter on `utm_source=newsletter`, then break it down by
campaign (which episode) and content (the welcome card or the weekly send). It counts visits, not
clicks, and cannot see a browser that blocks analytics; a forwarded email's reader counts like a
subscriber. The tag is identical for every recipient, so it says which email a visit came from,
never who made it. The unsubscribe link, the `{{{RESEND_UNSUBSCRIBE_URL}}}` placeholder, `mailto:`
links, images and the whole confirmation email are never tagged, and the plain-text part tags only
its "Read the episode" link. `pnpm validate:subscribe` asserts all of that. The renderers default
to `welcome`, so **the broadcast must pass `'weekly'`**, or its arrivals are filed under the
welcome card.

**Replies.** The welcome card and the broadcast both set reply-to `config.resend.supportEmail`, so
replies land in that inbox and nowhere Resend or DataFast can see. Count them per episode by hand.
At this size a reply is worth more than any rate: it is the signal the pilot's decision gate reads
([`episode-spec.md`](../prd/episode-spec.md) §A8).

**Unsubscribes.** `newsletter:stats` counts the segment's contacts as subscribed and unsubscribed:
the list as it stands, whichever link was used (the welcome card carries our own
`/api/unsubscribe`, the broadcast Resend's). Per broadcast, it prints the unsubscribes Resend
attributes to that send. On a list of four, one unsubscribe is a quarter of the list; read it as
one person's decision, and read their reply if they sent one.

**Resend's broadcast numbers.** Delivered, bounced, complained and unsubscribed are recorded
whatever the tracking settings. Opens need open tracking and clicks need click tracking on the
sending domain, and **neither is retroactive**: a send made while a switch was off has no events,
whatever the switch says later. The dashboard shows them under Broadcasts, one broadcast at a time.
The API exposes them through `GET /emails/metrics`, filtered by broadcast id; `GET /broadcasts`
itself carries no numbers at all. Verified against the live docs on 2026-09-27:
[metrics](https://resend.com/docs/api-reference/emails/get-metrics),
[broadcasts](https://resend.com/docs/api-reference/broadcasts/get-broadcast),
[segment contacts](https://resend.com/docs/api-reference/segments/list-segment-contacts),
[domains](https://resend.com/docs/api-reference/domains/list-domains) (which carry each domain's
`open_tracking` and `click_tracking`), and [tracking](https://resend.com/docs/dashboard/domains/tracking)
itself.

### Opens overcount: clicks and replies are the honest signals

Open tracking is a tiny remote image, and Apple Mail's Mail Privacy Protection downloads remote
content in the background when a message arrives, not when someone reads it
([Apple](https://support.apple.com/guide/mail/use-mail-privacy-protection-mlhl03be2866/mac)). Every
Apple Mail reader with it on counts as an open on delivery, read or not, and Resend itself says
open rates "can be inaccurate"
([Resend](https://resend.com/docs/knowledge-base/why-are-my-open-rates-not-accurate)). An open rate
is an upper bound with an unknown amount of air in it. Arrivals and replies are things a person
did. Clicks are harder to fake than opens but not impossible: some corporate mail gateways follow
links to scan them, which a Resend click-tracking redirect would count as a click.

### Four people is an anecdote, not data

With four subscribers, one person moves any rate by 25 percentage points. "50% opened" is two
people, and next week's "75%" can be the same two plus somebody's iPhone. No rate from this list,
Resend's or DataFast's, means anything yet. Read the events themselves: which episode drew an
arrival, who replied and what they said, who left. `newsletter:stats` prints that arithmetic at the
foot of every report so nobody has to remember it. Rates start to carry information once the list
is in the hundreds, and even then one week against the next is mostly noise.

### Running `pnpm newsletter:stats`

```bash
pnpm newsletter:stats
```

It is read-only: it sends, schedules and changes nothing. It needs `RESEND_API_KEY`, a **Full
access** key (a Sending-access key cannot read contacts or broadcasts), and
`RESEND_WEEKLY_STORIES_SEGMENT_ID`, both in `.env.local` by hand, for the reason
[the Saturday ritual](#the-saturday-ritual) gives. Without a key it exits with one line; without
the segment id it skips the subscriber count and reports the rest. It prints:

- the segment's contacts, subscribed against unsubscribed;
- each sending domain's open and click tracking as set today;
- every broadcast, newest first, with its status and its sent or scheduled time; then delivered of
  sent, bounced, complained and unsubscribed; and opens and clicks where the domain records them.
  Where it does not, it prints **"not recorded: open tracking is off on …"**, never a 0% that
  would read as "nobody opened it";
- what Resend cannot count: the list-size arithmetic above, the DataFast filter, and the reply
  inbox.

It counts contacts without keeping or printing an address, and scrubs addresses, keys and the
segment id from any error it prints. Resend caches the numbers for up to 15 minutes and keeps them
only for the plan's retention window.

### The tracking decision, still open

Tracking is a per-domain switch in Resend, and it is **off**. Turning it on is the owner's call,
and not yet made. These are the facts it turns on:

- **It would reach the confirmation email.** Everything this repo sends goes from one domain,
  `michikanji.com` (`config.resend.fromAdmin`): the consent email, the welcome card and the
  broadcast. Switched on there, the pixel and the rewritten links land in the confirmation email
  too, which reaches people who have agreed to nothing, some of whom never asked to be signed up.
  Avoiding that takes two sending identities: the confirmation stays on an untracked domain, and
  the welcome card and broadcast move to a tracked subdomain (`stories.michikanji.com` was
  [PRD §3](../prd/story-delivery-resend.md)'s plan all along). That is new DNS records and a
  from-address change in code, not just the switch.
- **Click tracking should stay off.** [PRD §3](../prd/story-delivery-resend.md) turned it off on
  purpose: Resend's redirect is one more hop that can re-encode a percent-encoded CJK URL into a
  404, and it records each clicker's IP address and browser. Arrivals in DataFast already answer
  "did anyone go and read it" without either.
- **Open tracking buys little at this size.** Apple inflates it, and four people make any rate an
  anecdote.
- **The privacy policy promises notice.** It says a change that affects how subscribers'
  information is used in a meaningful way is emailed to them before it takes effect, and recording
  who opened what is the kind of change it means. Tell the list first.
- **The disclosure is written, and held.** A separate privacy-policy commit
  (`docs(privacy): disclose open and click tracking in the story email`) says the emails carry a
  pixel and tracked links, what Resend records and why, and how to avoid both: images off, or
  unsubscribe. It ships **the same day** the switch is turned on, and not before. It is written for
  the switch as it exists today, one domain for everything, so it tells readers the confirmation
  email is tracked too. If the confirmation moves to an untracked domain first, cut that bullet
  before it ships.
- **EU subscribers.** Article 5(3) of the ePrivacy Directive governs storing information on, or
  reading it from, a user's device. The EDPB's
  [Guidelines 2/2023](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf)
  (version 2.0, adopted 7 October 2024, §§47–51) read it as covering email tracking pixels and
  tracking links. France's CNIL adopted a
  [recommendation](https://www.cnil.fr/fr/recommandation-pixel-suivi-courriels) on 12 March 2026
  that treats a pixel measuring individual opens as needing the recipient's consent, with narrow
  exemptions (some aggregate and deliverability measurement among them), and says its reach
  includes senders outside the EU. That is a regulator's guidance on applying French law, not a
  statute, and how any of it applies to a US operator with a handful of EU subscribers is the same
  lawyer's question as [Known gaps](#known-gaps) 8. What is certain is narrower: the signup form
  asks for no tracking consent, so the conservative reading is no pixel for EU subscribers without
  an opt-in collected at signup. The same EDPB reading covers tracking links, and its own example
  (§49) is a source tag rather than a per-person one, so the UTM tags are not categorically
  outside it. They carry no per-person identifier and are read by the DataFast script that already
  runs without consent, the judgement call the privacy policy already states, rather than a new
  one.

**If the switch is turned on, in this order.** Settle the confirmation-email question. Email the
list that tracking starts on a given date. On that date, turn the switch on and deploy the held
privacy commit together, with its `LAST_UPDATED` set to that day. Then run `pnpm newsletter:stats`
and check it reports the new setting.

## End-to-end verification

Run against production with a real inbox you control. Ten minutes, and it is the only way to know
the whole path works — each stage fails in a place the previous stage cannot see.

1. Open `https://www.michikanji.com/stories/<slug>` and subscribe through the quiz form at the foot of
   the episode. Expect the form's success state; a `400` means the address or the `source` was
   rejected, a `503` means `RESEND_API_KEY` or `EMAIL_TOKEN_SECRET` is missing.
2. **Expect the confirmation email** within a minute, from `Ari at MichiKanji <ari@michikanji.com>`,
   subject `Confirm your MichiKanji subscription`. No images, one link. If it does not arrive, the
   send failed silently — check the function logs for `[api/subscribe]`.
3. Click through to `/confirm` and **press the button**. The link is deliberately not a bare `GET`
   confirm: mail scanners fetch links, and only a POST proves a human. Rate limiting is 2 submissions
   per 10 minutes per IP, so do not loop step 1.
4. **Expect a 303 redirect to `/subscribed`.** A `503` here is the missing segment id. A `502` is
   Resend rejecting the contact create or the segment add — the detail is in the function log under
   `[api/subscribe/confirm]`.
5. **Expect the welcome quiz card**, subject `The Travels of Tan — <title>`, carrying the episode you
   subscribed from. Its failure is deliberately non-fatal: if step 4 redirected but no card arrives,
   you are subscribed and the email send is the thing that broke.
6. **Check the Resend dashboard**: the contact exists and is in the Weekly Stories segment.
7. **Unsubscribe.** Click the client's one-click Unsubscribe button (RFC 8058) or the link in the
   card, and confirm the contact's `unsubscribed` flag flips in Resend. This is still unticked in
   [PRD §11 item 6](../prd/story-delivery-resend.md) and should be done once for real before the
   first broadcast.
8. Re-subscribing the same address later is safe: contact creation is idempotent, and a replayed
   token inside its 48h window is a no-op.

## Deliberately not automated

- **The cron is no longer on this list: reversed 2026-09-27.** "No cron" was a recorded kill
  decision in [PRD §5 Phase 4](../prd/story-delivery-resend.md), and it held until six episodes
  were published and none broadcast. The manual send depended on someone remembering a ritual, and
  nobody ran it once. The owner chose the replacement: a job that schedules the send, with a review
  window. [The Saturday ritual](#the-saturday-ritual) describes it; the PRD carries a dated note.
- **Still no send route and no contact loop.** Nothing in the application sends a broadcast. No
  route or endpoint can, and nothing pages through contacts or calls `POST /emails` once per
  recipient. The job asks Resend to schedule one broadcast to the segment and stops. Resend owns
  queueing, throttling, unsubscribe filtering and the send itself. `create-broadcast` still creates
  a draft and stops.
- **No send without a window to stop it.** §A7 items 4–9 are human judgements: CJK rendering in
  Outlook.com, dark mode, the Gmail clip link, the reply path. A script cannot pass them. What
  changed is the default: the send now goes ahead unless a person cancels it. The job never
  schedules less than 30 minutes ahead, its normal runs leave one to three days, and it opens a
  review issue saying how to cancel.
- **Only the job schedules from `config.newsletter`.** It is still the one definition the runbook,
  the job and the calendar agree with: `nextSendAt()` turns `sendDay` and `sendTimeUtc` into the
  `scheduled_at` the job sends Resend.
- **No bounce/complaint webhook.** `app/api/webhook/resend/route.ts` is a ShipFast leftover that
  parses `formData` for inbound forwarding; Resend's event webhooks post signed JSON and need a
  separate route. Confirm Resend already auto-suppresses hard bounces before building one —
  otherwise it is monitoring, not safety.
- **The Friday probe is monitoring, not sending.** `check-subscribe-live` reads one endpoint's
  configuration state and opens an Issue. It creates nothing, sends nothing, and has no credentials
  with which to do either — deliberately, so that adding a monitor did not quietly add a send path.
  The weekly job, unlike the probe, holds a key able to send. It uses it only to read broadcasts
  and to ask Resend to schedule one.
- **No single-use confirm tokens.** Enforcement needs storage, which needs the backend this project
  has repeatedly killed. A replay inside 48h is a no-op create.

## Known gaps

1. **`RESEND_WEEKLY_STORIES_SEGMENT_ID` is not set for Preview.** Production and Development have it
   as of 2026-09-16; Preview does not, so a preview deployment 503s at the confirm button exactly as
   production used to. It is not urgent — no real subscriber meets a preview URL — but it makes
   Preview useless for testing this path, which is the one place you would want to test it. The CLI
   in this repo is old enough that `vercel env add … preview` needs the interactive prompt; add it
   from the Vercel dashboard, or upgrade the CLI first.
2. ~~**The GitHub repository secrets are not set, so the weekly job cannot schedule anything.**~~
   **`RESEND_API_KEY` and `RESEND_WEEKLY_STORIES_SEGMENT_ID` set 2026-09-28.** A dry run from the
   Actions tab the same day listed Resend's broadcasts (so the key is Full access; a Sending-access
   key is refused), found none on the account, and planned Episode 6 for Saturday 2026-10-03 13:00
   UTC with both guards passing. What a dry run cannot prove is the segment id: it is first used by
   the real create call, so a wrong one fails that run loudly with an issue, and Friday's run is the
   retry. **Still open:** `EMAIL_TOKEN_SECRET`, which must be the **same value** production signs
   with. Until it exists, `pnpm check-subscribe-e2e` and its Friday job stay skipped. Add it under
   Settings → Secrets and variables → Actions.
3. **Kit: nothing to migrate.** The Kit trial ended without a charge, and the account holds 0
   subscribers (checked 2026-09-27). `KIT_API_KEY` and `KIT_FORM_ID` were deleted from Vercel on
   2026-09-16 and nothing in this project touches Kit. Closing the account is optional housekeeping
   (PRD M9; archive form `9824359`).
4. ~~**The postal address is not set — the one thing still blocking the first broadcast.**~~
   **Set 2026-09-24** from the address the owner supplied. `config.business.postalAddress` renders
   in the footer of both episode emails and on the privacy policy, `stories:create-broadcast` no
   longer refuses on the address, and `validate:subscribe` checks the real address as well as the
   sample.
   Until the deploy that ships it, the welcome card still goes out without the address line.
   Keeping it valid: [The postal address](#the-postal-address).
5. ~~**The privacy policy still describes a different product.**~~ **Rewritten 2026-09-23**
   ([`app/privacy-policy/page.tsx`](../../app/privacy-policy/page.tsx)), not amended: it now names
   the controller and every processor, describes what the code actually collects, and has a rights
   section. It reads identity and address from `config.business`, so it gains the address when the
   config does. The signup form now links to it. Two judgement calls it states rather than hides:
   Ahrefs consent is withdrawn by clearing site data, because nothing reopens the cookie banner; and
   DataFast sets first-party cookies before any consent, on a legitimate-interests basis.
6. **Unsubscribe has never been exercised for real** (PRD §11 item 6): no one has confirmed the
   `unsubscribed` flag flips, or that Gmail and Outlook render the one-click button.
7. ~~**The Friday checks described above are not running.**~~ **Committed 2026-09-24.** Until then
   [`.github/workflows/subscribe-live-check.yml`](../../.github/workflows/subscribe-live-check.yml)
   existed only in a working tree, so GitHub had never run it. It runs from the push that puts it on
   `main`; its end-to-end job stays skipped until gap 2's `EMAIL_TOKEN_SECRET` exists.
8. **GDPR Art. 27 — an EU representative.** The operator is a US company with no EU establishment,
   sending a regular newsletter to EU (and UK) residents. Art. 27 asks such a controller to appoint
   a representative in the Union unless its processing is "occasional", and a weekly send is not
   occasional (EDPB Guidelines 3/2018: occasional means not carried out regularly). The prior
   question is whether GDPR reaches us at all under Art. 3(2): being reachable from the EU is not
   enough (Recital 23), but knowingly taking EU sign-ups for a recurring newsletter leans towards
   "offering" a service. That call is a lawyer's. UK GDPR has the same article. Cheapest published
   price seen 2026-09-23: Prighter, EUR 39/mo or EUR 420/yr per region (UK 10% off as a second
   product); EDPO lists EUR 1,920/yr (EU) and GBP 1,080/yr (UK). Not decided; the policy names no
   representative, correctly, because none exists.
9. **GitHub's scheduler is best effort.** Per
   [GitHub's docs](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows),
   a scheduled run can be delayed at busy times, the start of every hour among them, and under
   enough load dropped; the weekly job runs at seven past the hour for that reason. It runs on two
   days so that each covers the other. A week in which both runs are dropped schedules nothing, and nothing says so. Separately,
   GitHub disables scheduled workflows in a public repository after 60 days with no activity;
   re-enable it in the Actions tab if that ever happens.
