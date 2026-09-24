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
    // either value: /api/feedback and /api/advertise send *to* supportEmail,
    // and forwardRepliesTo is only the inbound webhook's forward target.
    supportEmail: "ari@llanai.com",
    forwardRepliesTo: "ari@llanai.com",
  },
  // The weekly story's cadence, in one place, because until now it existed only
  // as the word "weekly" in four pieces of prose and a blank column in
  // docs/prd/episode-spec.md. Nothing schedules from this — Resend owns
  // scheduling and the send stays a reviewed, manual act (see
  // docs/runbooks/newsletter.md). What it does is give the runbook, the
  // pre-send output and the calendar one definition to agree with, so "which
  // Saturday" is never re-derived by hand.
  newsletter: {
    // Saturday. Chosen 2026-09-16; before that there was no send day at all.
    sendDay: 6,
    // Write-by is send-day minus 3 — a Wednesday — which is the room the A7
    // pre-send checklist and one round of fixes actually need.
    writeLeadDays: 3,
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
    // is ever null again, the footer omits the line and
    // `pnpm stories:create-broadcast` refuses to run.
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