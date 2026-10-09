import { ConfigProps } from "./types/config";

const config = {
  appName: "MichiKanji",
  appDescription: "Learn Japanese kanji with interactive stroke order diagrams. Master JLPT N5, N4, N3, N2, and N1 kanji with animated guides.",
  keywords: ["japanese", "kanji", "stroke order", "jlpt", "learning", "dictionary"],
  domainName: "www.michikanji.com",
  crisp: {
    // Crisp website ID. Leave empty if not using Crisp
    id: "",
    onlyShowOnRoutes: ["/"],
  },
  stripe: {
    plans: [],
  },
  resend: {
    // Sender identities vs inbound destinations — two different kinds of value,
    // and only the first kind moved. See docs/prd/story-delivery-resend.md §3.
    //
    // The From address is the one that is DKIM-signed and the one a subscriber
    // reads. `fromAdmin` is what `sendEmail` actually sends from
    // (lib/resend.ts:48), which makes it the From on the double-opt-in consent
    // email — the single email we are legally obliged to deliver. It cannot go
    // out branded as a different company.
    //
    // The apex is already a verified Resend sending domain: michikanji.com
    // carries a `resend._domainkey` DKIM record and `send.michikanji.com`
    // carries Resend's SPF and `feedback-smtp` MX. No new DNS was needed.
    fromNoReply: `MichiKanji <noreply@michikanji.com>`,
    fromAdmin: `Ari at MichiKanji <ari@michikanji.com>`,
    // Inbound destinations — deliberately still llanai.com. These are where
    // mail LANDS, never a sender identity, and llanai.com is a live Google
    // Workspace inbox that is actually read. Nothing user-visible carries
    // either value: /api/feedback sends *to* supportEmail,
    // and forwardRepliesTo is only the inbound webhook's forward target.
    supportEmail: "ari@llanai.com",
    forwardRepliesTo: "ari@llanai.com",
  },
  // The weekly story's cadence, in one place, because until 2026-09-16 it
  // existed only as the word "weekly" in four pieces of prose and a blank
  // column in docs/prd/episode-spec.md. Since 2026-09-27 the weekly job
  // (.github/workflows/weekly-broadcast.yml, running
  // scripts/stories/schedule-weekly-broadcast.ts) schedules from it: it asks
  // Resend to send the next episode at `sendDay` + `sendTimeUtc`, and Resend
  // does the sending. The runbook, the job and the calendar all read this one
  // definition, so "which Saturday" is never re-derived by hand.
  // Procedure: docs/runbooks/newsletter.md.
  newsletter: {
    // Saturday. Chosen 2026-09-16; before that there was no send day at all.
    // If it moves, move the job's cron too: it runs on the write-by day and on
    // the day before the send.
    sendDay: 6,
    // The time of day the broadcast is scheduled for, in UTC, as HH:MM. A UTC
    // time rather than a local one so it never moves with anyone's daylight
    // saving. Chosen 2026-09-27, with the scheduler.
    sendTimeUtc: "13:00",
    // Write-by is send-day minus 3 — a Wednesday — which is the room the A7
    // pre-send checklist and one round of fixes actually need.
    writeLeadDays: 3,
    // The lowest episode number the weekly job will ever broadcast. Episodes 1
    // to 6 have already reached every subscriber: 1 to 5 through the site and
    // the welcome card, and 6 through the welcome card, because until
    // 2026-10-09 a new subscriber's confirmation email carried the newest
    // registered episode. So the job never broadcasts them, and the welcome
    // email may always send them; from here up, it waits for the broadcast
    // (lib/email/welcome-episode.ts). Moved from 6 to 7 on 2026-09-30 by the owner, who
    // had Episode 6's scheduled broadcast deleted. The queue starts here and
    // runs in episode order.
    firstBroadcastEpisode: 7,
  },
  // Who legally sends the newsletter, and where post reaches them. One
  // definition for three obligations that must agree: the email footer
  // (CAN-SPAM: a valid physical postal address in every commercial email), the
  // privacy policy (GDPR Art. 13: the controller's identity and contact
  // details) and the erasure route (a subscriber must be able to write to us).
  business: {
    legalName: "The Auspicious Company",
    registration: "a company registered in Massachusetts, United States",
    // Supplied by the owner on 2026-09-24: a private mailbox at a mail
    // receiving agency, copied exactly as the agency gives it ("#4015" is its
    // unit). A private mailbox is a valid CAN-SPAM address only while it is
    // "accurately registered" with the agency, i.e. its USPS Form 1583 stays
    // accepted (16 CFR 316.2(p)). Never a USPS PO Box — `pnpm validate:subscribe`
    // rejects one, because the address also has to name a physical place.
    // It prints in every episode email's footer and on /privacy-policy. If it
    // is ever null again, the footer omits the line and both broadcast
    // scripts, `pnpm stories:schedule-broadcast` and
    // `pnpm stories:create-broadcast`, refuse to run.
    // Procedure: docs/runbooks/newsletter.md.
    postalAddress: {
      street: "9169 W State St",
      unit: "#4015",
      locality: "Garden City",
      region: "ID",
      postalCode: "83714",
      country: "United States",
    },
  },
  auth: {
    // REQUIRED — the path to log in users
    loginUrl: "/signin",
    // REQUIRED — the path to redirect users after successful login
    callbackUrl: "/dashboard",
  }
} as ConfigProps;

export default config;