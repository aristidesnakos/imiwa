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
> **As of 2026-09-23, episodes 1–4 have never been broadcast to anyone.** Nothing is broken in
> the send path; the send was never run, and it was blocked on two legal prerequisites. The
> privacy policy is now rewritten; the postal address is the one blocker left —
> see [The postal address](#the-postal-address).

## What this is, and what subscribers are promised

One email a week carrying one episode of *The Travels of Tan* — six panels of strict-N5 Japanese,
three quiz questions, and the answers. The promise is made in the email body itself
([`lib/email/quiz-email.ts`](../../lib/email/quiz-email.ts)): "A new episode goes up every week."

The cadence is now a value, not prose. `config.newsletter` in [`config.ts`](../../config.ts) holds
`sendDay: 6` (**Saturday**, decided 2026-09-16) and `writeLeadDays: 3`, so write-by is the
**Wednesday** before. [`lib/email/send-schedule.ts`](../../lib/email/send-schedule.ts) derives
`nextSendDate()`, `writeByDate(sendDate)` and `sendDayName()` from that config so nobody counts off a
calendar again — which is how the Send column in
[`docs/prd/episode-spec.md`](../prd/episode-spec.md) Part B stayed blank for three episodes. Nothing
in that module schedules anything; Resend owns scheduling.

There is no database. The confirmed list lives in a Resend Segment; a *pending* signup lives nowhere
at all, because the signed token is the record ([`lib/email/subscribe-token.ts`](../../lib/email/subscribe-token.ts)).
That is what keeps CLAUDE.md's "no server-side user state" rule intact.

## The three email paths

| Path | Trigger | Automatic? | Code |
|---|---|---|---|
| Double opt-in confirmation | A human types their address into a capture form | Yes | [`app/api/subscribe/route.ts`](../../app/api/subscribe/route.ts) → [`lib/email/confirmation-email.ts`](../../lib/email/confirmation-email.ts) |
| Welcome quiz card | That same human presses the button on `/confirm` | Yes | [`app/api/subscribe/confirm/route.ts`](../../app/api/subscribe/confirm/route.ts) → [`lib/email/quiz-email.ts`](../../lib/email/quiz-email.ts) |
| Weekly episode broadcast | An operator runs a command and then presses Send in Resend | **No** | [`scripts/stories/create-broadcast.ts`](../../scripts/stories/create-broadcast.ts) |

Both automatic sends are one-per-person and reactive: each is triggered by a specific person acting
on their own address, in the same request. Nothing in this repo sends to more than one recipient,
iterates contacts, or fires on a timer.

Which episode the welcome card carries travels inside the signed confirm token as an optional
`episode` slug, resolved against the registry on the way in and again on the way out. An unknown slug
is dropped, never fatal, and falls back to the newest episode. The welcome card is also the only
email in the flow carrying `List-Unsubscribe` / `List-Unsubscribe-Post`
([`app/api/unsubscribe/route.ts`](../../app/api/unsubscribe/route.ts)); the confirmation email must
never grow one, because suppressing the consent email breaks consent itself.

## The Saturday ritual

Write by Wednesday (send day minus `config.newsletter.writeLeadDays`). Everything below is done by a
person; none of it is triggered by a schedule.

1. **Import the episode.** `strips/ep-NN/script.json` in the strips repo is the source of truth.
   `scripts/stories/import-episode.py` derives `data/stories/ep-NN.ts` and the art. The generated
   data file is not editable — edit the script and re-import.
2. **Validate.** `pnpm validate:stories` — strict N5, bubble geometry, targets, quiz answer spread,
   assets. It is the contract; a failure here is a content bug, not a lint nit.
3. **Ship the page first.** Merge and deploy so `/stories/<slug>` is live. The broadcast body links
   to it and quotes it; `dynamicParams = false` means the episode is prerendered the moment it is in
   the registry.
4. **Check the subscribe path still works** before sending anything to anyone —
   [the end-to-end verification below](#end-to-end-verification). Do this on the first send after any
   change to env, Resend config, or the email modules.
5. **Create the draft.** `pnpm stories:create-broadcast <episode-slug>` — for example
   `pnpm stories:create-broadcast tan-goes-to-school`. It refuses to run while
   `config.business.postalAddress` is unset or looks like a PO Box — checked before it asks for
   credentials, so you learn that without a key. It POSTs one draft to Resend addressed to
   `RESEND_WEEKLY_STORIES_SEGMENT_ID`, from `config.resend.fromAdmin`, reply-to
   `config.resend.supportEmail`. It deliberately omits `send` and `scheduled_at`. It prints the draft
   id and the send slot to type into the dashboard — `Schedule it for Saturday <date>`, derived from
   `config.newsletter` via `nextSendDate()`, so the date is not counted off a calendar.
   **Do not re-run it after an ambiguous network response** — reconcile in the Resend dashboard
   first, because the Broadcast API has no documented idempotency key
   ([PRD §5 Phase 4](../prd/story-delivery-resend.md)).
6. **Review the draft in Resend and send a test**, then run
   [`docs/prd/episode-spec.md`](../prd/episode-spec.md) §A7. Items 1–3 and 10 are machine-checked by
   `validate:stories`; items 4–9 — Gmail web, Gmail mobile, Outlook.com, clip check, dark mode, reply
   path — are Ari's, and nobody else reports them as passed. On the **first** send, also open the
   test's raw headers and confirm Resend added `List-Unsubscribe` and `List-Unsubscribe-Post`, and
   that the plain-text part's `{{{RESEND_UNSUBSCRIBE_URL}}}` was replaced with a real link. As of
   2026-09-23 only a 2024 Resend blog post says it adds those headers to broadcasts, and the docs
   never show the placeholder inside `text`. A dashboard test email leaves out the custom Reply-To
   by design, so a missing reply-to there is not a bug.
7. **Schedule it by hand** in the Resend dashboard for the Saturday. Resend owns queueing,
   throttling, unsubscribe filtering and scheduling. *Unverified on the first send:* Resend's
   2025 Broadcast API launch post said an API-created broadcast can only be sent from the API; its
   2026 editor docs say API content is editable in the dashboard. If the dashboard will not
   schedule the draft, the documented alternative is one `POST /broadcasts/{id}/send` carrying
   `scheduled_at`, made by a person after review. That is still a reviewed, manual send, not a
   send route.
8. **Record the send date** in the Part B calendar table.

Running the script locally needs Resend credentials, and **they cannot come from `vercel env
pull`**: `RESEND_API_KEY` exists in Vercel only for Preview and Production, as a sensitive variable
the CLI reads back empty. Create a **Full access** key in Resend → API Keys (a Sending-access key
cannot create broadcasts; the API answers `401 restricted_api_key`) and put it in `.env.local` by
hand, with `RESEND_WEEKLY_STORIES_SEGMENT_ID` beside it. The script loads `.env.local` then `.env`
via dotenv and never prints a value.

## The postal address

Every commercial email must carry a valid physical postal address (CAN-SPAM), and the privacy
policy names the same address as the postal contact point for data requests, including erasure.
Both read `config.business` in [`config.ts`](../../config.ts), so they cannot disagree:

| Field | What it holds |
|---|---|
| `legalName` | `The Auspicious Company`, the Massachusetts company that operates MichiKanji and is the controller of subscriber data (confirmed 2026-09-23) |
| `registration` | The phrase the privacy policy uses to describe it |
| `postalAddress` | `null` until a mailbox exists; then `street`, `unit`, `locality`, `region`, `postalCode`, `country` |

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
| `RESEND_API_KEY` | `/api/subscribe`, `/api/subscribe/confirm`, `/api/unsubscribe`, `stories:create-broadcast` | `POST /api/subscribe` → `503 {"error":"Subscriptions are not configured."}`; confirm → the same 503; `POST /api/unsubscribe` → bare 503; the broadcast script exits with its usage error. The guard matters because `sendEmail` returns a **mock success** when the key is unset ([`lib/resend.ts`](../../lib/resend.ts)) — without it a signup would answer 200 and send nothing. |
| `EMAIL_TOKEN_SECRET` | Both subscribe routes, `/api/unsubscribe` | Same 503s. It HMACs both the 48h confirm token and the non-expiring unsubscribe token. Rotating it invalidates every confirmation link in flight **and every unsubscribe link ever sent** — rotate only in a send-free window. |
| `RESEND_WEEKLY_STORIES_SEGMENT_ID` | `/api/subscribe/confirm`, `stories:create-broadcast` | **This is the one that was missing for three episodes.** `/api/subscribe` still answers 200 and the confirmation email still goes out — that route does not check this variable — so the break is invisible until the person presses the confirm button and gets `503 {"error":"Subscriptions are not configured."}`. No contact, no segment membership, no welcome card. The broadcast script also refuses to create a draft. Set in Production and Development on 2026-09-16; **not yet in Preview**. |

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
**same value production signs with** or the confirm route answers 400. It needs `RESEND_API_KEY` too.
Locally that means `vercel env pull`; in CI, repository secrets.

One assertion covers three things: the confirm route answers 502 if either the contact create or the
segment add fails, so a 303 redirect proves both happened. `GET /contacts/{email}` does not report
segment membership, so there is nothing better to assert.

Still not proven, and deliberately: inbox placement, rendering, and the link inside the email body.
Those are human judgements — [§A7 items 4–9](../prd/episode-spec.md).

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

- **No cron, no send route, no contact loop.** The weekly send is a recorded kill decision in
  [PRD §5 Phase 4](../prd/story-delivery-resend.md), not an oversight. Resend owns queueing,
  throttling, unsubscribe filtering and scheduling; the application never pages through contacts or
  calls `POST /emails` once per recipient. `create-broadcast` creates a draft and stops.
- **No auto-send after validation.** §A7 items 4–9 are human judgements — CJK rendering in
  Outlook.com, dark mode, the Gmail clip link, the reply path. A script cannot pass them, so nothing
  should be able to send without a person who has.
- **Nothing schedules from `config.newsletter`.** It is the one definition the runbook, the pre-send
  output and the calendar agree with; `create-broadcast` *prints* the resulting date and a person
  types it into Resend. Printing is the whole extent of the automation — giving it a scheduler would
  reintroduce the thing §5 killed.
- **No bounce/complaint webhook.** `app/api/webhook/resend/route.ts` is a ShipFast leftover that
  parses `formData` for inbound forwarding; Resend's event webhooks post signed JSON and need a
  separate route. Confirm Resend already auto-suppresses hard bounces before building one —
  otherwise it is monitoring, not safety.
- **The Friday probe is monitoring, not sending.** `check-subscribe-live` reads one endpoint's
  configuration state and opens an Issue. It creates nothing, sends nothing, and has no credentials
  with which to do either — deliberately, so that adding a monitor did not quietly add a send path.
- **No single-use confirm tokens.** Enforcement needs storage, which needs the backend this project
  has repeatedly killed. A replay inside 48h is a no-op create.

## Known gaps

1. **`RESEND_WEEKLY_STORIES_SEGMENT_ID` is not set for Preview.** Production and Development have it
   as of 2026-09-16; Preview does not, so a preview deployment 503s at the confirm button exactly as
   production used to. It is not urgent — no real subscriber meets a preview URL — but it makes
   Preview useless for testing this path, which is the one place you would want to test it. The CLI
   in this repo is old enough that `vercel env add … preview` needs the interactive prompt; add it
   from the Vercel dashboard, or upgrade the CLI first.
2. **Repository secrets for the end-to-end walk are not set.** `pnpm check-subscribe-e2e` and its
   Friday job stay skipped until `RESEND_API_KEY` and `EMAIL_TOKEN_SECRET` exist as GitHub repository
   secrets. `EMAIL_TOKEN_SECRET` must be the **same value** production signs with.
3. **The Kit account is not cancelled.** `KIT_API_KEY` and `KIT_FORM_ID` were deleted from Vercel on
   2026-09-16 — they were referenced nowhere in code — so nothing in this project touches Kit any
   more. What is left is the account itself, which is a dashboard action and still costs money until
   someone does it (PRD M9; archive form `9824359`).
4. **The postal address is not set — the one thing still blocking the first broadcast.** Everything
   around it is built (2026-09-23): `config.business.postalAddress` renders in the footer of both
   episode emails, `stories:create-broadcast` refuses to run while it is `null`, and
   `validate:subscribe` refuses a PO Box. What is left is choosing the mailbox and getting its USPS
   Form 1583 accepted — [The postal address](#the-postal-address). Until then the welcome card still
   goes out, without the address line.
5. ~~**The privacy policy still describes a different product.**~~ **Rewritten 2026-09-23**
   ([`app/privacy-policy/page.tsx`](../../app/privacy-policy/page.tsx)), not amended: it now names
   the controller and every processor, describes what the code actually collects, and has a rights
   section. It reads identity and address from `config.business`, so it gains the address when the
   config does. The signup form now links to it. Two judgement calls it states rather than hides:
   Ahrefs consent is withdrawn by clearing site data, because nothing reopens the cookie banner; and
   DataFast sets first-party cookies before any consent, on a legitimate-interests basis.
6. **Unsubscribe has never been exercised for real** (PRD §11 item 6): no one has confirmed the
   `unsubscribed` flag flips, or that Gmail and Outlook render the one-click button.
7. **The Friday checks described above are not running.** As of 2026-09-23
   [`.github/workflows/subscribe-live-check.yml`](../../.github/workflows/subscribe-live-check.yml)
   exists only in a working tree: it has never been committed, so GitHub has never run it. Nothing
   is watching the signup path until it is pushed.
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
