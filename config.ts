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
  business: {
    // These three are the single source of truth for anything a regulator
    // reads. The privacy policy, the ToS and the broadcast footer all render
    // them from here rather than restating them, because three copies of a
    // postal address is three chances for one of them to go stale.
    legalName: "The Auspicious Company",
    // HARD BLOCKER before the first broadcast. CAN-SPAM (16 CFR 316.5) requires
    // a valid physical postal address in every commercial email, and a
    // residential one in a public footer is not the trade we want — so this
    // waits on a virtual-mailbox/registered-agent address rather than shipping
    // a home address. `assertBroadcastFooter()` in lib/email/broadcast-footer.ts
    // refuses to build a footer while this is empty, and `pnpm validate:subscribe`
    // reports it, so the gap cannot reach a send quietly.
    postalAddress: "",
    // Deliberately the llanai.com inbox: it is a live Google Workspace mailbox
    // that is actually read. An unread on-brand address would be worse than an
    // off-brand read one, because this is the address someone exercises a
    // right through.
    privacyEmail: "ari@llanai.com",
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
  auth: {
    // REQUIRED — the path to log in users
    loginUrl: "/signin",
    // REQUIRED — the path to redirect users after successful login
    callbackUrl: "/dashboard",
  }
} as ConfigProps;

export default config;