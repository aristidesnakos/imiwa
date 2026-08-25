# Story Delivery on Our Own Domain — Resend PRD (Option C)

**Version 1.2** · Created 2026-08-24 · Revised 2026-08-24 · Revised 2026-08-25 · Owner: Ari Nakos
**Status:** Approved in principle 2026-08-24. Nothing built. Kit is still the wired ESP and the
capture path is still unmerged, so no visitor can subscribe to anything today.

**v1.1 — corrections from a pre-implementation review against the codebase.** Two findings would have
shipped broken and are fixed in place: **M7's contact-property segmentation does not exist in the
installed Resend SDK** (§5 API surface note, M7, M8), and **Phase 2 step 8 would have wired the
confirmation email to a dead `fs`-based template loader** that cannot survive Next's file tracing
(§5 Phase 2). Also corrected: `/subscribed` already exists and is not free (new M14); `config.ts` is
a four-value change, not two (§3); the `michikanji-episode` skill cannot be found (M11); a bare `GET`
confirm link is auto-clickable by mail scanners (§5, §7, open question 5); the announcement-bar
suppression needs a stated mechanism (§6); and several line and path citations were stale. The
argument in §1 is unchanged, and everything the review confirmed correct is unchanged.
**v1.2 — corrections from driving the live dashboard, 2026-08-25.** Three assumptions in this
document are wrong, and they were wrong in a way no amount of reading the installed SDK could have
caught, because the platform moved underneath it. Read this block before trusting any Resend
mechanic below.

1. **There is no `audience_id` any more, and no audience to create.** Resend now has ONE Audience per
   account: the dashboard shows a singular "Audience" at `/audience/` with no id in the URL and no
   create button, and what used to be several audiences is now Segments and Topics inside that one.
   The contacts API is a flat `POST /contacts` with `email`, `first_name`, `last_name`,
   `unsubscribed`, `properties`, `segments`, `topics`; contacts are global to the account, keyed by
   email. So M8's `RESEND_AUDIENCE_ID` cannot be obtained, and the code as merged would have answered
   503 to every confirmation forever, blaming a variable that cannot exist. Fixed in
   `lib/email/audience.ts`.

2. **Custom contact properties exist, so §9.5's concession is reversed.** This document accepted that
   dropping `source` from Resend meant the audience would no longer record which surface someone
   consented through — DataFast would hold it, but as analytics rather than a consent artefact. There
   is now a `source` property (declared in the dashboard 2026-08-25) and the confirm route writes it
   in a second, deliberately non-fatal call after the contact exists. It is enrichment; the contact
   is the consent.

3. **`stories.michikanji.com` cannot be added, and click tracking was never on.** The Resend account
   is at its plan's domain limit (Pro includes 10; 12 are in use), so "Add domain" opens an upgrade
   wall — §3's reputation-isolation decision is deferred and the newsletter sends from the already
   verified apex. Separately, Resend disables open *and* click tracking by default for every domain
   and `michikanji.com` has no tracking subdomain, so the CJK double-encoding trap is dormant rather
   than live: §5 Phase 1's "turn click tracking off" is already true and needs no action. Enabling
   open tracking would cost a verified tracking-subdomain CNAME, since any tracking requires one.

Also: **the Kit deadline in this plan does not exist.** Kit's own billing page states the
subscription cancels itself at the end of the trial and downgrades to free, so nothing converts to
paid on 2026-09-03. (Creator is $39/mo for 1,000 subscribers, not $33.)

**Related:** [`weekly-story-newsletter.md`](./weekly-story-newsletter.md) (the pilot) ·
[`story-pages.md`](./story-pages.md) (the pages — carried forward unchanged) ·
[`episode-spec.md`](./episode-spec.md) (the format) ·
[`phase-0-growth-monetization.md`](./phase-0-growth-monetization.md) (SG1's capture pipeline)

## Sections this supersedes

Recorded up front because this repo already has one document contradicting itself
(`strategy-forecast.md` §8 supersedes four of its own sections written the same day). When these
conflict with anything below, this document wins:

| Document | Section | Fate |
|---|---|---|
| `weekly-story-newsletter.md` | "Sending: manual, no cron" (Kit Broadcasts) | Replaced by §5 Phase 4 |
| `weekly-story-newsletter.md` | Open decision 1 — Kit form identity | Void. No Kit forms exist after cutover |
| `weekly-story-newsletter.md` | "Current state" table, rows 1 and 6 | Replaced by §4 |
| `weekly-story-newsletter.md` | Sequence row "By ~2026-09-03 — Kit trial" | Replaced by §4 migration task M9 |
| `episode-spec.md` | A8 "Kit settings that matter" | Replaced by §3 |
| `episode-spec.md` | A7 items 4–9 (Kit preview / test sends) | Rewritten against Resend, §5 Phase 4 |
| `phase-0-growth-monetization.md` | The "second Kit form + env var" carry-over obligation | Void — SG1 gets a `source` value, not a second form |

Unchanged and still binding: everything in `story-pages.md`, everything in `episode-spec.md` Parts A1–A6
and Part B, and the decision gate in `weekly-story-newsletter.md`.

---

## 1. The decision, and why the timing is the whole argument

Send the weekly story from `michikanji.com`, off our own list, with the episode living as typed data
in this repo and rendering to a page we own. Kit exits.

The case is not that Resend is a better product than Kit. It is that **the list is empty**, so the
migration costs nothing today and costs more every week we wait. Three facts fix the timing:

- **Kit's free plan cannot do "our domain."** A custom authenticated sending domain is a Creator-plan
  feature at $33/mo. The stated goal — own this — is unreachable on the tier we planned to sit on.
  The free tier's *subscriber cap* is deliberately not part of this argument, because this document
  had it wrong: v1.0 said 1,000 where `weekly-story-newsletter.md` — a row this document claims to
  supersede — says 10,000. Confirm the real number at M1. Whichever it is, the domain restriction is
  what decides this, and 10,000 would only make the §9 rollback stronger.
- **Resend Pro is already paid.** $20/mo, 50k emails/month, no daily cap. Marginal cost of Option C
  is zero. (The free tier's 100/day cap would have broken any broadcast past 100 subscribers; that
  constraint no longer applies.)
- **Kit's trial lapses ~2026-09-03.** A decision was due anyway.

Second-order gain: the read signal improves. Today it would be opens, which Apple Mail Privacy
Protection inflates into near-noise. With the email as a teaser linking to our own page, the signal
becomes click-through measured at the destination by DataFast — which we control, and which is a far
better proxy for "did they read it."

**Cost of being wrong:** low and symmetric. If deliverability disappoints, Kit free is still there at
1,000 subscribers and the list is still small enough to move back. See §9.

## 2. Scope

**In.** Sending identity on our domain. List ownership. Double opt-in. Unsubscribe. Episode content
as typed data. `/stories` pages. Migration off Kit, completely. **And the compliance surface a real
list creates** — processor disclosure, DPA, erasure route, postal address (§11, added v1.1).

**Explicitly still out, and unchanged by any of this: a database.** The list lives in a Resend
Audience; the pending-signup record is a signed token that expires. Nothing stateful is deployed and
nothing personal is committed to the repo. §11 works through why, and why a git-stored list is worse
rather than cheaper.

**Out — carried over from the existing kill list, none of it reopened by this change.** Cron or send
automation before the pilot validates. Any database, accounts, or server-side user state. Paywall or
quiz gate. A second domain. N4 escalation. Audio. The reciprocal "stories featuring this kanji" block
on `/kanji/[character]` (deferred until there is a story corpus worth linking to — *not* blocked on
bytes. The "9.0 kB headroom" v1.0 cited is not derivable from `lighthouserc.js`, which gives that
route ~32 kB of script headroom: a 260 kB budget against a 228 kB baseline. Do not quote 9.0 kB as a
constraint anywhere.)

## 3. Sending identity

**Sending subdomain: `stories.michikanji.com`.** Not the apex. Resend's own guidance is to isolate
sending reputation on a subdomain, and there is a specific reason here: the `/api/subscribe` code
comment currently justifies keeping the list on Kit as protection for transactional deliverability. A
separate verified subdomain protects it better than a separate vendor did, because the reputations are
genuinely independent while the vendor is not a variable.

| Setting | Value | Why |
|---|---|---|
| Sending domain | `stories.michikanji.com`, DKIM + SPF verified | Reputation isolation |
| DMARC | `p=none` at cutover, monitor, tighten later | A young domain with a strict policy fails closed on a misconfiguration |
| From name | `Ari at MichiKanji` | Settled 2026-08-23 — a person, not a brand; the pilot's only signal is replies |
| Reply-to | **`ari@llanai.com`** — settled 2026-08-24 | A real, monitored Google Workspace inbox. Cross-domain reply-to needs no DKIM/SPF alignment, and it keeps replies clear of the unauthenticated inbound webhook (§7) |
| Open tracking | On | Weak signal, free, and the only in-email number |
| **Click tracking** | **Off** | See below — this one is not a preference |

**Click tracking must be off, and this is a finding rather than a taste.** Resend rewrites links when
click tracking is on. `episode-spec.md` §A5 documents that percent-encoded CJK URLs
(`/kanji/%E5%B1%B1`) survive exactly one encoding pass and produce `%25E5%25B1%25B1` and a 404 if
anything in the chain re-encodes them. An ESP link rewriter is precisely that risk. And we do not need
it: every link in the email points at a page we own and instrument, so DataFast counts the arrival.
If someone later wants Resend click data, it must be proven against a live CJK URL in a test send
first.

**`config.ts` — two of the four values move, and two correctly stay.** All four
`config.resend.*` values read `ari@llanai.com` (`config.ts:17–20`), but they are not the same kind of
value, and v1.1 was wrong to treat them as one fix. **Sender identities move; inbound destinations
stay.**

| Value | Fate | Why |
|---|---|---|
| `fromAdmin` | → `michikanji.com` | **Required, and it is the highest-priority line in this document.** It is what `sendEmail` actually sends from (`lib/resend.ts:48`), which means the double-opt-in consent email built in Phase 2 step 8 would arrive from `Admin <ari@llanai.com>`. A consent email for MichiKanji sent from an unrelated domain is a brand failure and a spam-complaint generator, and it is the one email we are legally obliged to deliver |
| `fromNoReply` | → `michikanji.com` | Same class. Dormant today, but it is a From identity and must not be left as a trap |
| `supportEmail` | **stays `ari@llanai.com`** | An inbound destination, not a sender. `/api/feedback` and `/api/advertise` send *to* it (`app/api/feedback/route.ts:37`, `app/api/advertise/route.ts:40`). Nothing user-visible carries it |
| `forwardRepliesTo` | **stays `ari@llanai.com`** | Also an inbound destination (`app/api/webhook/resend/route.ts:16`). With reply-to now pointing at `llanai.com` directly, this path is no longer the newsletter's reply route at all — see §7 |

The From address is the DKIM-signed, brand-visible one; the other two are just where mail lands. The
apex is **already a verified Resend sending domain** — `resend._domainkey.michikanji.com` carries a
DKIM key and `send.michikanji.com` carries Resend's SPF and `feedback-smtp` MX — so moving the two
From identities to `michikanji.com` needs **no new DNS records at all**.

## 4. Migration — every task, explicitly

The list is empty, so this is a code-and-config migration, not a data migration. Confirm that claim
before starting: **M1 gates everything else.**

| # | Task | Where | Notes |
|---|---|---|---|
| M1 | Check Kit's confirmed + unconfirmed subscriber count | Kit dashboard | Expected: 0 real, possibly a test address. If it is not ~0, stop and re-plan — a CSV import of confirmed contacts is fine, but importing *unconfirmed* addresses into a new sending domain is how a cold domain gets burned on day one |
| M2 | Decide branch strategy | `feat/weekly-story-capture` (ahead **6**, unmerged — it was ahead 2 when v1.0 was written; re-check rather than quoting) | **Do not merge the Kit-wired endpoint and migrate after.** Rewrite `/api/subscribe` on this branch and merge once. Merging first means changing a live consent flow under real subscribers |
| M3 | Rewrite `app/api/subscribe/route.ts` | code | Keep the rate limiter (`rateLimit(2, 10*60*1000)`) and its position before payload validation. Replace the Kit proxy with token-mint + transactional send (§5) |
| M4 | **Delete the single-opt-in fallback** | `app/api/subscribe/route.ts:81–93` | The `POST /v4/subscribers` retry mints a `state: active` subscriber that skips consent (phase-0 risk #6). It exists only to work around a Kit form-add quirk. With Kit gone it has no reason to exist, and shipping it into a new stack would carry a consent bug across a migration |
| M5 | Tighten `source` validation | `app/api/subscribe/route.ts` | Today any non-empty string passes. Validate against `EmailSignupSource` — at **`lib/analytics/index.ts:256`**, not `lib/analytics.ts` (line right, path stale). Two implementation notes v1.0 glossed: it is a *type*, erased at runtime, so validation needs a `const` array to check against — export the array and derive the type from it; and `lib/analytics/index.ts` is a browser module (nine `window`/`document` references), so put that array where a route handler can import it without pulling client code into the server bundle. Justification corrected: this is worth doing because an unvalidated free string reaches an email we send, **not** because Resend needs it — see M7 |
| M6 | Update `EmailCapture` copy **and its doc comment** | `components/EmailCapture.tsx` | The defaults deliberately refuse to promise a confirmation email because Kit's behaviour for a returning address was unknowable from our side. After cutover we send that email ourselves, so the promise becomes true and the copy can say so plainly. The 30-line comment block explaining why it could not is now wrong and must be rewritten, not left to rot |
| M7 | **Drop `referrer` segmentation — do not replace it** | Resend | **Corrected in v1.1: the mechanism v1.0 specified does not exist.** In the installed `resend@4.8.0` a contact is exactly `{id, email, first_name, last_name, unsubscribed}` scoped to an `audienceId` (`node_modules/resend/dist/index.d.ts:507`, `:516`); the string "segment" appears **zero** times in the shipped type surface, and `Broadcast.audience_id` (`:397`) is the only targeting handle there is. There is no custom-property field to put `source` in. It is also not needed: per-surface signup CTR is **already** measured by DataFast at capture time via `trackEmailSignup(source)` (`lib/analytics/index.ts:259`). A Resend-side `source` would only add per-surface *send* targeting, which nothing at forty subscribers wants. **Decision: one audience; `source` is not stored in Resend at all.** If per-surface sending is ever genuinely needed, the mechanism is one audience per source (M8), not a property. Update every doc saying "referrer, not tags" to say the surface lives in DataFast, not in the ESP |
| M8 | Env vars | Vercel + `.env.example` | Remove `KIT_API_KEY`, `KIT_FORM_ID`. Add `RESEND_AUDIENCE_ID` — singular, one audience, per the corrected M7 (no segment id; the concept does not exist in 4.8.0) — and `EMAIL_TOKEN_SECRET`. Read the audience id through one helper rather than `process.env` at the call site, so that if per-surface sending ever arrives it becomes a source→id map in one place. `RESEND_API_KEY` is already set in Vercel (confirmed 2026-08-24) |
| M9 | Cancel the Kit trial before **2026-09-03** | Kit dashboard | It converts to paid if ignored. Archive form `9824359` |
| M10 | Rewrite `episode-spec.md` §A8, §A7 items 4–9, **and §A5** | docs | Kit composer → Resend broadcast preview and test send. §A5 was missed in v1.0: it names Kit by vendor ("Kit rewrites links for click tracking, then the client may re-encode") inside the mechanism that justifies the encoding rule, and turning click tracking off changes that paragraph's premise. **Keep the rule** — pre-encode every URL, always — and fix the reason it gives |
| M11 | **Locate — or author — the `michikanji-episode` skill** | skill | **It could not be found**: not in `~/.claude/skills/` (16 skills, none by that name), not in `~/.claude/plugins/`, not in `.claude/skills/` (which holds only `track-datafast-goal.md`). v1.0 says "update", which nobody can act on. Either find where it actually lives, or treat this as *create* and author the pre-send checks against Resend from `episode-spec.md` §A7. Still the one deliverable outside the repo |
| M12 | **Privacy policy: rewrite, not amend** | `app/privacy-policy/page.tsx` | Scoped in v1.0 as "name the processor". It is larger: the page names **no** email processor, has no data-subject-rights section and no legal basis, and it describes data we do not collect — "Account information (name, email address, password)" and "Payment information", when there are no accounts and no server-side user state. Inherited boilerplate for a different product, about to become the document that has to describe a real email list. Also in scope: the Resend DPA, a published erasure address, and a postal address for the email footer (CAN-SPAM). **Two of these are unmet today, with Kit.** Full list in §11 |
| M13 | Mark superseded sections | `weekly-story-newsletter.md`, `phase-0-growth-monetization.md` | Per the table at the top. Do this in the same PR, not "later" |
| M14 | **Rewrite `/subscribed` — it already exists** | `app/subscribed/page.tsx` | v1.0's §5 treats this as a new page. It is live, and both its copy and its 24-line comment are written for Kit's post-confirmation redirect ("set it as the form's confirmation redirect in the Kit dashboard") — false in every clause after cutover. It also carries 11 violations frozen in `scripts/palette-baseline.json` (`{"stock": 9, "blackWhite": 2}`), so the `?state=expired` branch and its re-subscribe form must be written in brand tokens: `palette-check.yml` fails on any *increase* |

## 5. Architecture and build order

```
data/stories/ep-NN.ts  ──▶ pnpm validate:stories ──▶ /stories/[slug]      (canonical, indexable)
        │                                                   ▲
        └──────────────▶ broadcast body (teaser) ───────────┘  link + DataFast measures arrival

EmailCapture ──▶ POST /api/subscribe ──▶ signed token (48h) ──▶ DOI email (transactional, Resend)
                                                                        │
                       /subscribed  ◀── create contact ◀── GET /api/subscribe/confirm?token=…
```

**The design constraint that shapes all of it: no server-side user state** (`CLAUDE.md`). A pending,
unconfirmed subscriber is state. We do not store it — **the signed token *is* the pending record.**
Payload `{ email, source }`, 48h expiry, HMAC-signed with `EMAIL_TOKEN_SECRET` using the already-installed
`jsonwebtoken` (a real `dependencies` entry at `^9.0.3`, so there is no packaging problem). A contact
exists in Resend only after the link is fetched, which means the list contains confirmed addresses
only by construction rather than by policy — **modulo link prefetchers.** Outlook Safe Links, Gmail
and corporate mail gateways fetch URLs they find in email, and a scanner fetching a bare `GET` confirm
link is indistinguishable from a human clicking it. Do not state the guarantee more strongly than
that sentence does. §7 carries the mitigation and the call.

Known and accepted: a token can be replayed within its 48h window. Contact creation is idempotent, so
a replay is a no-op. Single-use enforcement would require storage, which would require the backend we
have repeatedly killed. Not worth it for a free newsletter.

**API surface note.** Use plain `fetch` against Resend's REST API — the same pattern the current Kit
proxy uses — rather than the SDK. `resend` is a **caret range** (`^4.8.0`) in `dependencies`, not
pinned as v1.0 claimed, so an install can move it underneath us; calling REST directly keeps this work
decoupled from an SDK upgrade.

Resend's contacts/broadcasts surface has been moving, and **the installed version is behind the
public docs.** What `4.8.0` actually offers, read off the shipped types in
`node_modules/resend/dist/index.d.ts`:

- contacts are **audience-scoped** — `audienceId` is required on create (`:516`);
- a contact carries only `{id, email, first_name, last_name, unsubscribed}` (`:507`) — **no custom
  properties**;
- the string "segment" appears **zero** times in the entire type surface;
- a broadcast targets exactly one `audience_id` (`:397`).

That is the evidence the corrected M7 rests on. The newer docs describing `POST /contacts` and
`segment_id` targeting describe a surface this project does not have installed — do not design
against them without upgrading first and re-reading the types. **Verify against the live docs on the
day of implementation *and* against the installed `.d.ts` for what is actually callable**, and record
both in a code comment.

### Phase 1 — sending identity (no code, ~1h + DNS propagation)

1. Add and verify `stories.michikanji.com` in Resend. DKIM + SPF records at the registrar. Click
   tracking **off**, open tracking on.
2. Add a reporting address to DMARC. The record **already exists** — `_dmarc.michikanji.com` is
   `v=DMARC1; p=none;` and, with no `sp=`, subdomains inherit it — but it carries no `rua=`, so
   nothing is being reported. One-line edit, not a new record.
3. Create the audience. **One audience, and no `source` contact property** — the property does not
   exist in `resend@4.8.0` (corrected M7; this step still carried the v1.0 mechanism through v1.1).
4. Fix `config.resend.*` off `llanai.com` (M-task, one commit).

### Phase 2 — capture path (~4h)

5. Env vars + `.env.example` block replacing the Kit block, with the same explanatory-comment density
   the Kit block has.
6. `POST /api/subscribe` rewritten: rate limit → validate email → validate `source` against the union
   → **guard on missing config** → mint token → send DOI email → `200`. It never creates a contact.

   Keep the missing-config guard the Kit route already has (`app/api/subscribe/route.ts:66–70`, a
   `503`). It is three lines and it matters more here than it did with Kit, because `sendEmail`
   returns a **mock success** when `RESEND_API_KEY` is unset (`lib/resend.ts:41–44`). Without the
   guard, a preview deployment or a key-rotation window answers `200`, tells the subscriber to check
   their inbox, sends nothing, and logs a single `console.warn`. The key is set in production today,
   which is precisely why this failure would go unnoticed.
7. `GET /api/subscribe/confirm`: verify token → create contact with `unsubscribed: false` (**no
   `source` property** — it does not exist, see the corrected M7) → redirect `/subscribed`. Expired
   token → `/subscribed?state=expired` with a re-subscribe form. Invalid signature → 400, no detail.
   `/subscribed` is an **existing live page**, not a new one — see M14 before touching it.
8. DOI email body as an **inlined template literal in TypeScript**, sent through `sendEmail`
   (`lib/resend.ts:28`, which takes raw `html` and is the only email path with a live caller). One
   link, no images, no marketing copy — it is transactional and should look it.

   **Do not follow the two `.html` files in `lib/emails/templates/`, as v1.0 instructed.** They are
   read by `loadTemplate` (`lib/utils/emailUtils.ts:10–34`), which does
   `fs.readFile(path.join(process.cwd(), 'lib', 'emails', 'templates', name + '.html'))` with the
   name as a **runtime variable** — so Next's file tracing cannot see the path, and `next.config.js`
   sets no `outputFileTracingIncludes`. This is the identical trap `CLAUDE.md` documents for
   `lib/sentences/published.ts`: *"a runtime `fs` read works at build time and then fails in a
   serverless function because Next's file tracing never saw the path."* Both callers —
   `sendSubConfirmEmail` (`lib/resend.ts:78`) and `sendDailyDigest` (`lib/resend.ts:123`) — have
   **zero call sites anywhere in the repo**, so the path has never run in production and the bug has
   never fired. Wiring the consent email to it would make the one email we are legally obliged to
   deliver the first user of a loader that passes under `pnpm dev` and 500s on Vercel.
9. **Live test, before anything else ships.** Fresh address; confirm *no contact exists in Resend
   before the click* (this is the check that catches an accidental single-opt-in path — checking only
   the end state cannot detect it); click; confirm the contact appears; re-submit the same address and
   confirm no duplicate and no second confirmation storm. If the confirm step ships as a bare `GET`
   (§7), add one test to an address behind a scanning gateway — a corporate Outlook account is ideal —
   and check whether the contact appears *before anyone clicks anything*.

### Phase 3 — the content spine (~1 working day)

Unchanged from `story-pages.md` §7 — that plan is orthogonal to the ESP and survives intact:
`lib/stories/types.ts` + pattern library → `data/stories/ep-01.ts` → `scripts/validate-stories.ts`
(the strict-N5 assertion) → `/stories/[slug]` → `/stories` hub → JSON-LD + `validate:schema`
extension + sitemap → Lighthouse budgets for the new routes.

### Phase 4 — the send (~1h)

10. Compose the broadcast from the episode data. The body **must** contain
    `{{{RESEND_UNSUBSCRIBE_URL}}}` — Resend handles the unsubscribe flow, but only if the variable is
    present.
11. Run the rewritten `episode-spec.md` §A7 checklist. Items 1–3 and 10 are machine-checkable and
    belong in `validate:stories`; items 4–9 (test sends to Gmail web, Gmail mobile, Outlook.com; clip
    check; dark mode; reply path) are Ari's, and are never reported as passed by anyone else.
12. Schedule. Manual. No cron — unchanged kill decision.

### Deliberately not in Phase 4

**A bounce/complaint webhook.** `app/api/webhook/resend/route.ts` exists but is a ShipFast leftover
that parses `formData` for inbound-mail forwarding; Resend's event webhooks post signed JSON and would
need a separate route with signature verification. Before building it, **confirm whether Resend
already auto-suppresses hard bounces and complaints on its own contact list.** If it does, this route
is monitoring, not safety, and monitoring a list of forty people is theatre. Revisit at episode 2 with
the first real delivery report in hand.

## 6. The page, and the clutter rule

The stated goal is that this is legible and helps people learn. That is a constraint on what else is
allowed on the page, so write it as a rule rather than an intention:

- **`/stories/*` carries exactly one call to action** — subscribe — placed **below** the story. No
  workbook CTA, no Pro CTA, nothing above the fold but the episode.
- **The site-wide announcement bar is suppressed on `/stories/*`.** It is mounted in
  `app/layout.tsx:124` and is the only behavioural trigger the site has. A reading page is the one
  place it costs more than it returns. Mechanism, stated so it is not rediscovered mid-build: it sits
  in the **root** layout, which cannot read the pathname on the server, so suppression is a
  `usePathname()` check inside `AnnouncementBanner` itself. That is safe here — the component is
  Hydration Pattern A (`mounted` flag, `return null` before mount), so server HTML contains no bar
  either way and there is no flash-then-remove.
- **Learning affordances, from `story-pages.md`:** furigana toggle (default on), answers in a real
  `<details>`, derived vocab table, assembled grammar notes. These are the page's reason to exist —
  none of them are possible in email.

**Assets.** Tan art is native to the page and constrained in the email. On the page: one hero per
episode from `public/assets/tan-*.png` (`tan-brush`, `tan-celebrate`, `tan-confused`, `tan-head`,
`tan-point` exist today), alt text mandatory, and any new art zoom-checked for anatomy errors before
it ships — see the mascot-asset-QA rule. In the email: at most one small decorative image, and the
episode must read correctly with images blocked, because Outlook blocks them by default. Story text as
an image stays banned (`episode-spec.md` §A1).

## 7. Risks

| Risk | Why it is real | Mitigation |
|---|---|---|
| Cold sending domain, zero reputation | New subdomain, first sends | List is tiny; DMARC `p=none` first; DKIM+SPF before episode 1; no volume ramp needed at this size |
| Click-tracking rewrite breaks CJK URLs | §A5's double-encoding trap meets an ESP link rewriter | Click tracking off. Measure arrivals at our own page |
| No native double opt-in | Resend has none | We build it (§5). Token-as-record, no storage |
| Token replay inside 48h | No single-use enforcement without storage | Accepted. Contact creation is idempotent |
| **A link scanner auto-confirms a subscription** | Safe Links, Gmail and corporate gateways fetch URLs found in email; a bare `GET` confirm is indistinguishable from a human click, which weakens §5's "confirmed by construction" | Either accept it and state the guarantee as "confirmed by construction, modulo prefetchers", or make the confirm link render a page with one **"Yes, subscribe"** button that POSTs. One extra page, no storage, design intact. **Ari's call at Phase 2 — open question 5** |
| **Sending commercial email with no postal address** | CAN-SPAM requires a valid physical postal address in commercial email, and there is none in the repo, the footer, the ToS or the privacy policy | Decide the address before episode 1 and put it in the broadcast footer — see §11 |
| **Privacy policy describes a product we do not run** | It lists "Account information (name, email address, password)" and "Payment information" as collected; there are no accounts and no server-side user state. It names no email processor at all | M12 was scoped as "add Resend"; it is actually a rewrite. See §11 |
| Secret rotation invalidates pending confirmations | 48h window | Rotate only in a send-free window |
| One vendor for transactional *and* marketing | Vendor failure is now correlated | Accepted at this scale. Separate subdomains keep the reputations independent |
| Thinner broadcast analytics than Kit | Resend is transactional-first | The signal we actually want is page click-through, measured by DataFast |
| Consent bug carried across the migration | M4's fallback path | Delete it, and run the pre-click check in Phase 2 step 9 |

## 8. What this does not change

Weekly authoring load: identical — 8–14 sentence pairs, 3–5 targets, 3 questions, 3 answers, a reply
prompt, pattern tags. No cron, no accounts, no paywall. The decision gate in
`weekly-story-newsletter.md` stands as written, with one upgrade: "click-through to `/kanji/<char>`
pages is meaningfully non-zero" is now measured on pages we own rather than inferred from an ESP.

## 9. Effort and rollback

| Phase | Effort |
|---|---|
| 1 — sending identity | ~1h + DNS propagation |
| 2 — capture path | ~4h |
| 3 — content spine (`story-pages.md` §7) | ~1 working day |
| 4 — first send | ~1h |
| Compliance (§11) — privacy-policy rewrite, DPA, postal address, erasure route | ~2–3h, mostly writing *(added v1.1)* |
| **Total to episode 1 under our own domain** | **~2 days engineering + ~1h dashboard/DNS** |

The v1.0 total of ~1.5 days omitted §11 entirely and assumed `/subscribed` was a new page rather than
a rewrite (M14). Neither correction changes the decision — they change the estimate.

**Rollback.** After episode 2, read delivered rate, bounce rate and complaint rate. If deliverability
is materially worse than a hosted ESP would give, Kit free is still available (subscriber cap to be
confirmed at M1 — §1; whether it is 1,000 or 10,000, both are far above where we will be) and the
list is still small enough to export and move. The cost of returning in six weeks is roughly the
cost of not leaving today — which is the same reason the migration is cheap now.

## 10. Open questions for Ari

1. **DNS access** — where is `michikanji.com` DNS administered, and can DKIM/SPF records be added
   today? Phase 1 blocks on this and nothing else.
2. ~~**Reply-to inbox**~~ — **resolved 2026-08-24: `ari@llanai.com`.** A live Google Workspace
   inbox. Accepted trade-off: subscribers see a different domain when they hit reply. Accepted gain:
   replies never traverse the unauthenticated inbound webhook. Does **not** extend to `fromAdmin` —
   see §3.
3. **Send day** — the calendar's write-by is send-day minus 3, and it is still blank.
4. **Transactional from-address** — `michikanji.com` apex or `mail.michikanji.com`? Affects one DNS
   record and `config.ts`.
5. **Bare `GET` confirm, or a confirm button?** A `GET` link can be auto-fetched by a mail scanner,
   which confirms a subscription with no human involved. A one-button page fixes it for the cost of
   one route and no storage. At forty subscribers either is defensible — but §5 must not claim more
   than the chosen one delivers. *(Added v1.1.)*
6. **Postal address for the email footer.** CAN-SPAM requires one and we have none anywhere. A
   registered business address, or a mail-forwarding box — this blocks episode 1, not Phase 1.
   *(Added v1.1 — see §11.)*
7. **Resend DPA.** Has one been accepted on the account? GDPR Art. 28 requires it before Resend
   processes subscriber data on our behalf. Dashboard task, minutes, but it is not optional.
   *(Added v1.1 — see §11.)*

---

## 11. Where the list actually lives — and what that obliges us to

*Added in v1.1, in answer to a direct question: does an email list mean this project finally needs a
database?*

**No. Resend stores the list, and it costs nothing beyond the $20/mo already being paid.**

A Resend **Audience** *is* the subscriber database — a hosted contact list with an id, which is what
`RESEND_AUDIENCE_ID` points at. The installed SDK confirms the whole lifecycle is theirs:
`contacts.create({audienceId, email, unsubscribed})`, `contacts.list({audienceId})`, `contacts.get`,
`contacts.update`, `contacts.remove`. Resend also owns the unsubscribe flow — that is what
`{{{RESEND_UNSUBSCRIBE_URL}}}` in §5 Phase 4 is: their hosted page, their state change, no code from
us. There is no tier to upgrade and no storage add-on; audiences are part of the account.

So the `CLAUDE.md` rule stands exactly as written, and it is worth being precise about what it says.
"No server-side user state" is a rule about **our** infrastructure: we run no database, we hold no
session, we deploy nothing stateful. It has never meant "no third party ever holds a record" — Stripe
already holds payment records and DataFast already holds visitor records. Resend joins that list as a
**processor**. The architecture in §5 is what keeps our side of it clean:

| Record | Where it lives | Who runs it |
|---|---|---|
| Pending, unconfirmed signup | **Nowhere** — the signed token *is* the record, and it expires | — |
| Confirmed subscriber | Resend Audience | Resend |
| Unsubscribe state | Resend, via `{{{RESEND_UNSUBSCRIBE_URL}}}` | Resend |
| Which surface someone signed up from | DataFast, at capture time (`trackEmailSignup`) | DataFast |
| Anything at all | ~~Our database~~ | There isn't one |

### The GitHub-list idea, and why to drop it

Storing addresses in the repo and updating them with a GitHub Action is worse on every axis, and the
cost saving is zero because Resend's storage is already paid for:

- **It is a data-protection problem, not a storage choice.** A public repo publishes the list
  outright. A private repo is barely better: git history is permanent and append-only, so an erasure
  request (GDPR Art. 17) stops being a `DELETE` and becomes a history rewrite across every clone and
  fork. Personal data does not belong in version control.
- **It does not remove the need for Resend contacts anyway.** A broadcast with a working unsubscribe
  link is sent *to an audience*. A list in a file would have to be synced into one before every send —
  so we would be maintaining two lists and a sync, not avoiding one.
- **It means building unsubscribe ourselves**, and unsubscribe is the one part of this that is
  legally mandatory and unforgiving.
- **Rate limits and secrets get worse**, not better: a workflow with write access to a subscriber file
  is a far larger blast radius than an API key that can only append to an audience.

**Recommendation: no database, no repo-stored list. Resend Audiences, as §5 already describes.** The
one thing worth doing is an occasional manual CSV export as a portability backup, so a vendor exit is
never blocked on the vendor — which is what §9's rollback already assumes.

### What we owe, once a list exists

This is the part v1.0 under-scoped: M12 was written as "add Resend to the privacy policy". It is more
than that, and two items below are genuinely unmet today, with Kit, before any of this ships.

1. **Name the processor and rewrite the policy around the real product.** `app/privacy-policy/page.tsx`
   names **no** email processor, has no data-subject-rights section (access, erasure, portability, or
   objection), no legal basis, and no controller identity. Worse, it describes data we do not collect:
   "Account information (name, email address, password)" and "Payment information" are listed as
   collected, and there are no accounts and no server-side user state. It is inherited boilerplate
   describing a different product, and it is about to become the document that has to describe the
   email list accurately. **Rewrite it, do not append to it.**
2. **Accept a DPA with Resend** (Art. 28). Dashboard task. Open question 7.
3. **A postal address in every commercial email.** CAN-SPAM requires it; there is none in the repo,
   footer, ToS or privacy policy. Open question 6, blocks episode 1.
4. **A working erasure route.** `contacts.remove` covers the mechanism; what is missing is a stated
   address a person can write to, published in the policy.
5. **Keep the consent record legible.** With the §5 design, the consent record *is* "a contact exists
   in this audience, with this `created_at`" — the contact cannot exist unless the confirmation link
   was fetched. That is defensible and worth writing down verbatim in the policy, because it is the
   only record there is. Note the one thing the corrected M7 gives up: dropping `source` from Resend
   means the *audience* no longer records which surface someone consented through. DataFast has it,
   but as analytics, not as a consent artefact. At one audience and one offer this is immaterial;
   revisit it the moment a second, materially different offer points at the same audience.
6. **Unsubscribe must work before episode 1**, and it is checked by sending a real one to yourself —
   `{{{RESEND_UNSUBSCRIBE_URL}}}` silently does nothing if the variable is absent from the body
   (§5 Phase 4 step 10).

None of this needs a database. All of it needs deciding before the first send rather than after it.
