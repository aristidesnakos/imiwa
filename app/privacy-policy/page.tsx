import Link from "next/link";
import { getSEOTags } from "@/lib/seo";
import config from "@/config";
import { postalAddressLines } from "@/lib/business/postal-address";

export const metadata = getSEOTags({
  title: `Privacy Policy | ${config.appName}`,
  canonicalUrlRelative: "/privacy-policy",
});

/**
 * Rewritten 2026-09-23, not amended. The previous text was inherited
 * boilerplate for a different product: it listed accounts, passwords and
 * payment data we have never collected, named no email processor, and had no
 * data-subject-rights section — and it was about to become the document
 * describing a real email list (docs/prd/story-delivery-resend.md M12, §11).
 *
 * Everything here describes what the code actually does, so when the code
 * changes, this changes with it. The claims worth re-checking on any edit:
 *
 *  - DataFast loads on every page, unconditionally (app/layout.tsx); Ahrefs
 *    loads only after analytics consent (lib/analytics/index.ts).
 *  - Progress lives in localStorage and never reaches a server (CLAUDE.md,
 *    "No server-side user state").
 *  - A pending signup is stored nowhere: the signed token is the record
 *    (lib/email/subscribe-token.ts). The Resend contact is created only by the
 *    confirm button, and it is the consent record.
 *  - The signup source goes to DataFast as a goal without the address
 *    (components/EmailCapture.tsx), never onto the contact.
 *  - Feedback and advertising inquiries are emailed to config.resend.supportEmail
 *    (no FEEDBACK_/INQUIRY_WEBHOOK_URL is set in Vercel as of this rewrite; if
 *    one is ever set, the chat tool it posts to becomes a processor to name).
 *
 * The controller identity and postal address come from `config.business`, the
 * same definition the email footer renders, so the two cannot disagree.
 */

const LAST_UPDATED = "September 24, 2026";

const H2 = "mb-3 text-xl font-semibold text-japan-deep-ocean";
const H3 = "mb-2 mt-6 text-base font-semibold text-japan-deep-ocean";
const P = "leading-relaxed";
const LIST = "list-disc space-y-2 pl-6 leading-relaxed";
const LINK =
  "rounded-sm font-medium text-japan-deep-ocean underline underline-offset-2 hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function PrivacyPolicy() {
  const { legalName, registration, postalAddress } = config.business;
  const email = config.resend.supportEmail;
  const addressLines = postalAddress ? postalAddressLines(postalAddress) : null;

  const emailLink = (
    <a href={`mailto:${email}`} className={LINK}>
      {email}
    </a>
  );

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="btn btn-ghost mb-6 inline-flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="mr-1 h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
            clipRule="evenodd"
          />
        </svg>
        Back
      </Link>

      <h1 className="mb-2 text-3xl font-extrabold text-japan-deep-ocean">Privacy Policy</h1>
      <p className="mb-10 text-sm text-japan-mountain-mist">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-10 text-foreground">
        <section>
          <h2 className={H2}>Who we are</h2>
          <p className={P}>
            {config.appName} (www.michikanji.com) is run by {legalName}, {registration} (“we”, “us”).
            We decide how the personal information described here is used, which makes us its
            controller. You can reach us at {emailLink}
            {addressLines ? <>, or by post at the address at the end of this page</> : null}.
          </p>
        </section>

        <section>
          <h2 className={H2}>The short version</h2>
          <ul className={LIST}>
            <li>There are no accounts. Your study progress stays in your own browser and is never sent to us.</li>
            <li>We only have your email address if you subscribe to the weekly story, and only after you confirm it.</li>
            <li>We count visits with privacy-focused analytics. A second analytics tool runs only if you allow it.</li>
            <li>We don’t sell or rent personal information, and we don’t use advertising networks or advertising cookies.</li>
          </ul>
        </section>

        <section>
          <h2 className={H2}>What we collect, and why</h2>

          <h3 className={H3}>When you browse the site</h3>
          <ul className={LIST}>
            <li>
              <strong>Visit analytics (DataFast).</strong> The pages you visit, the site that referred you,
              an approximate location derived from your IP address, and your browser and device type.
              DataFast sets first-party cookies so that a returning browser is counted once. We use this to
              learn which pages help learners. Legal basis: our legitimate interests.
            </li>
            <li>
              <strong>Optional analytics (Ahrefs Web Analytics).</strong> Loaded only if you turn on
              analytics in the cookie banner. Legal basis: your consent. To withdraw it, clear this
              site’s data in your browser; the banner will ask again on your next visit.
            </li>
            <li>
              <strong>Server logs (Vercel).</strong> Our host records requests, including IP address and
              browser, to run and secure the site. Our sign-up form also holds your IP address in memory for
              ten minutes, to limit repeated submissions. Legal basis: our legitimate interests.
            </li>
          </ul>

          <h3 className={H3}>Your learning progress</h3>
          <p className={P}>
            Your progress, review schedule, dismissed announcements and cookie choice are stored in your
            browser’s local storage. They never leave your device, and we cannot see them. Clearing this
            site’s data in your browser deletes them.
          </p>

          <h3 className={H3}>The weekly story email</h3>
          <ul className={LIST}>
            <li>
              <strong>What we hold:</strong> your email address, when you confirmed your subscription, and
              whether you have unsubscribed.
            </li>
            <li>
              <strong>How you join:</strong> you enter your address, we send one confirmation email, and
              nothing else happens unless you press the button in it. Until then we store nothing: the link
              in that email carries your request itself, signed so it cannot be forged, and it expires after
              48 hours.
            </li>
            <li>
              <strong>Our record of your consent</strong> is your subscriber entry. It can only be created
              by pressing that button, and it records when you did.
            </li>
            <li>
              <strong>Which page you signed up from</strong> is counted in our analytics as a sign-up event.
              It is not stored with your email address.
            </li>
            <li>
              <strong>Why:</strong> to send you the story you asked for, about once a week. Legal basis:
              your consent, which you can withdraw at any time.
            </li>
            <li>
              <strong>Leaving:</strong> every email has an unsubscribe link, and most mail apps also show a
              one-click Unsubscribe button. After you unsubscribe we keep your address marked as
              unsubscribed, so that it is never emailed again by mistake. If you would rather we delete it
              entirely, ask us (see “Your rights” below).
            </li>
            <li>Giving us your address is optional. Without it, we just can’t send you the story.</li>
          </ul>

          <h3 className={H3}>When you write to us</h3>
          <p className={P}>
            Replies to our emails, messages from the site’s feedback form, and advertising inquiries reach our
            inbox with whatever you included: typically your name, email address and message, and for
            advertisers your company, website and budget. We use them to answer you. Legal basis: our
            legitimate interests, or steps you asked us to take before entering an agreement.
          </p>

          <h3 className={H3}>Buying the book</h3>
          <p className={P}>
            The {config.appName} book is sold on Amazon. Following a link to it takes you off our site, and
            Amazon’s own privacy notice applies there. We don’t receive your payment or order details.
          </p>
        </section>

        <section>
          <h2 className={H2}>Who handles data for us</h2>
          <p className={P}>These service providers process data on our behalf and only on our instructions:</p>
          <ul className={`${LIST} mt-3`}>
            <li><strong>Resend</strong>: sends our emails and stores the subscriber list</li>
            <li><strong>Vercel</strong>: hosts the website</li>
            <li><strong>DataFast</strong>: visit analytics</li>
            <li><strong>Ahrefs</strong>: optional analytics, only with your consent</li>
            <li><strong>Google Workspace</strong>: our email inbox</li>
          </ul>
          <p className={`${P} mt-3`}>
            We also disclose information when the law requires it, or to protect our rights or the safety of
            our users.
          </p>
        </section>

        <section>
          <h2 className={H2}>Where your data is processed</h2>
          <p className={P}>
            We are based in the United States. Your information is processed in the United States and in the
            other countries where our service providers operate.
          </p>
        </section>

        <section>
          <h2 className={H2}>How long we keep it</h2>
          <ul className={LIST}>
            <li>
              <strong>Subscribers:</strong> while you are subscribed. After you unsubscribe, only as the
              do-not-email marker described above, until you ask us to delete it.
            </li>
            <li>
              <strong>Unconfirmed sign-ups:</strong> nothing is stored, and the confirmation link expires
              after 48 hours.
            </li>
            <li><strong>Messages to us:</strong> as long as we need to deal with them and any follow-up.</li>
            <li><strong>Analytics and server logs:</strong> for the periods those providers set.</li>
          </ul>
        </section>

        <section>
          <h2 className={H2}>Your rights</h2>
          <p className={P}>Wherever you live, you can ask us to:</p>
          <ul className={`${LIST} mt-3`}>
            <li>tell you what personal information we hold about you, and give you a copy</li>
            <li>correct it</li>
            <li>delete it</li>
            <li>stop using it, or restrict how we use it</li>
            <li>
              stop relying on your consent. Unsubscribing does this for email. Withdrawing consent doesn’t
              affect anything we did before you withdrew it.
            </li>
          </ul>
          <p className={`${P} mt-3`}>
            To make a request, email {emailLink}
            {addressLines ? <> or write to us at the postal address below</> : null}. We will reply within one
            month. If you are in the European Union or the United Kingdom, you also have the right to complain
            to your local data protection authority.
          </p>
          <p className={`${P} mt-3`}>We don’t use your information to make automated decisions about you.</p>
        </section>

        <section>
          <h2 className={H2}>Children</h2>
          <p className={P}>
            {config.appName} is not directed at children under 13, and we don’t knowingly collect their
            personal information. If you believe a child has subscribed, tell us and we will delete it.
          </p>
        </section>

        <section>
          <h2 className={H2}>Changes to this policy</h2>
          <p className={P}>
            When we change this policy, we update the date at the top. If a change affects how we use your
            information in a meaningful way, we will tell subscribers by email before it takes effect.
          </p>
        </section>

        <section>
          <h2 className={H2}>Contact</h2>
          <address className="not-italic leading-relaxed">
            {legalName}
            <br />
            {addressLines?.map(line => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
            {emailLink}
          </address>
        </section>
      </div>
    </main>
  );
}
