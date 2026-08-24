import Link from "next/link";
import { getSEOTags } from "@/lib/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Privacy Policy | ${config.appName}`,
  canonicalUrlRelative: "/privacy-policy",
});

/**
 * Rewritten 2026-08-24, not amended.
 *
 * The document this replaced was ShipFast boilerplate describing a different
 * product: it claimed to collect account passwords, payment information and IP
 * addresses, named no email processor, stated no legal basis, and published no
 * route for a data-subject request. None of that was true of MichiKanji, and
 * all of it was about to become the document that has to describe a real
 * subscriber list accurately. See docs/prd/story-delivery-resend.md §9.
 *
 * The rule for editing this file: every sentence must be checkable against the
 * code. If a claim here stops matching what we actually do, it is the claim
 * that is wrong.
 */

const LAST_UPDATED = "24 August 2026";

/**
 * The postal address is a hard blocker on the first broadcast (CAN-SPAM), but
 * it is NOT a blocker on this page — an email address is a sufficient contact
 * route for a data-subject request. So the address renders when there is one
 * and the line disappears when there is not, rather than printing a label with
 * nothing after it. `pnpm validate:subscribe` is what refuses to let the gap
 * reach a send.
 */
const postalAddress = config.business.postalAddress.trim();

const link = "text-primary underline underline-offset-2 hover:brightness-90";

export default function PrivacyPolicy() {
  return (
    <main id="main-content" tabIndex={-1} className="max-w-3xl mx-auto py-12 px-4">
      <Link href="/" className="btn btn-ghost inline-flex items-center mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5 mr-1"
        >
          <path
            fillRule="evenodd"
            d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
            clipRule="evenodd"
          />
        </svg>
        Back
      </Link>

      <h1 className="text-3xl font-extrabold mb-2">Privacy Policy for {config.appName}</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="prose prose-slate max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold">The short version</h2>
          <p>
            {config.appName} has no accounts, no passwords and no payment forms. Your study
            progress, your review schedule and your cookie choices are stored in your own
            browser and are never sent to us — we cannot read them, and we cannot restore
            them for you.
          </p>
          <p>
            The only personal information we hold is an <strong>email address</strong>, and only
            if you asked for the weekly story and then confirmed it by clicking the button in a
            confirmation email. Everything below is the long version of those two paragraphs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">1. Who we are</h2>
          <p>
            {config.appName} is operated by {config.business.legalName} (&quot;we,&quot;
            &quot;us,&quot; &quot;our&quot;), a company registered in Massachusetts, United
            States. For the purposes of the UK and EU GDPR we are the <em>data controller</em>{" "}
            for the information described here.
          </p>
          <p>
            {postalAddress ? (
              <>
                Postal address: {postalAddress}
                <br />
              </>
            ) : null}
            Email:{" "}
            <a href={`mailto:${config.business.privacyEmail}`} className={link}>
              {config.business.privacyEmail}
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. What we collect</h2>

          <h3 className="text-lg font-semibold mt-4">a. If you only read the site</h3>
          <p>
            Nothing you type, and no account. Our analytics providers (section 5) record the
            visit, and our host records a standard server log entry for the request.
          </p>

          <h3 className="text-lg font-semibold mt-4">b. If you subscribe to the weekly story</h3>
          <p>
            Your email address, and the page you subscribed from. Section 4 describes exactly
            what happens to it and when.
          </p>

          <h3 className="text-lg font-semibold mt-4">
            c. If you send feedback or ask about a sponsorship
          </h3>
          <p>
            Whatever you write in the form, plus the email address you give so we can reply.
            These arrive as email in a mailbox we read; they are not stored in a database.
          </p>

          <h3 className="text-lg font-semibold mt-4">d. What stays on your device</h3>
          <p>
            Your learning data never leaves your browser. We store it in your browser&apos;s
            local storage under the keys <code>kanji-progress</code>, <code>kanji-srs</code>,{" "}
            <code>mk-announcements</code> and <code>cookie-consent</code>. It is not transmitted
            to us or to anyone else. Clearing your browser data deletes it permanently, and we
            have no copy to restore.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. What we do not collect</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong>No accounts and no passwords.</strong> There is nothing to sign in to.
            </li>
            <li>
              <strong>No payment information.</strong> Printable packs and workbooks are sold
              through third-party stores that handle checkout entirely on their own systems
              under their own privacy policies. No card details ever reach us.
            </li>
            <li>
              <strong>No profiles built from your study data</strong>, because that data never
              reaches us in the first place.
            </li>
            <li>
              <strong>We do not sell or share personal information</strong> for cross-context
              behavioural advertising, and we never have.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. The weekly story email</h2>
          <p>
            This is the only place we hold personal information, so it is worth describing
            precisely.
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>
              You enter your address in a form. <strong>Nothing is stored at this point.</strong>{" "}
              We create a signed token that contains your address, valid for 48 hours, and send
              it to you in a confirmation email. If you never click, the token expires and no
              record of you exists anywhere.
            </li>
            <li>
              You click the button in that email. Only then is a contact created on our
              subscriber list.
            </li>
          </ol>
          <p className="mt-4">
            Because of that ordering, <strong>the contact record is the consent record</strong>:
            a contact cannot exist on our list unless the confirmation button was pressed, and
            the record carries the date it was created. That is the only consent artefact we
            keep, and we keep no other record of unconfirmed signups.
          </p>
          <p>
            Every email we send carries a one-click unsubscribe link and our postal address.
            Unsubscribing is immediate and needs no reply from us. We record whether an email
            was opened; we deliberately do <strong>not</strong> track which links you click.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Who processes data on our behalf</h2>
          <p>
            We use a small number of service providers. They process data only on our
            instructions, for the purposes below.
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong>Resend</strong> (United States) — sends our email and stores the
              subscriber list and unsubscribe state.
            </li>
            <li>
              <strong>Vercel</strong> (United States) — hosts the site and keeps short-lived
              request logs.
            </li>
            <li>
              <strong>DataFast</strong> — privacy-focused website analytics. Loads on every page
              and records the visit, the page and the referrer.
            </li>
            <li>
              <strong>Ahrefs Web Analytics</strong> — additional traffic analytics.{" "}
              <strong>Loads only if you accept analytics cookies</strong>, and is removed from
              the page if you later withdraw that consent.
            </li>
            <li>
              <strong>Google Search Console</strong> — reports aggregate search performance to
              us. We receive counts and rankings, not individuals.
            </li>
          </ul>
          <p className="mt-4">
            Some of these providers are based outside the UK and EEA. Where that is the case,
            transfers rely on the providers&apos; own approved transfer mechanisms, such as the
            EU Standard Contractual Clauses.
          </p>
          <p>
            We may also disclose information where the law requires it, or to establish or
            defend legal claims. If the business is ever sold or merged, the subscriber list
            would transfer with it, and we would email you before that happened.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Our legal basis for using it</h2>
          <p>If the UK or EU GDPR applies to you, our lawful bases are:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong>The weekly story email — your consent</strong> (Art. 6(1)(a)), given by
              the confirmation click described in section 4. You can withdraw it at any time by
              unsubscribing, and withdrawing does not affect anything sent before then.
            </li>
            <li>
              <strong>Ahrefs analytics — your consent</strong> (Art. 6(1)(a)), given through the
              cookie banner.
            </li>
            <li>
              <strong>Replying to your feedback or sponsorship enquiry</strong> — our legitimate
              interest in answering someone who contacted us (Art. 6(1)(f)), and where relevant
              taking steps at your request before entering a contract (Art. 6(1)(b)).
            </li>
            <li>
              <strong>Running the site, keeping it secure and understanding aggregate traffic</strong>{" "}
              — our legitimate interest in operating a functioning website (Art. 6(1)(f)).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. How long we keep it</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong>Your email address:</strong> until you unsubscribe or ask us to erase it.
              After an unsubscribe, our email provider keeps a suppression entry so that we
              cannot accidentally email you again — that entry exists to protect you, and we ask
              them to remove it too if you request full erasure.
            </li>
            <li>
              <strong>Feedback and sponsorship emails:</strong> kept in our mailbox for as long
              as the conversation is useful, and reviewed periodically.
            </li>
            <li>
              <strong>Analytics:</strong> retained in aggregate by the providers above under
              their own retention schedules.
            </li>
            <li>
              <strong>Your learning data:</strong> kept by your browser until you clear it. We
              never had it.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Your rights, and how to use them</h2>
          <p>
            Depending on where you live you have the right to access the personal information we
            hold about you, to correct it, to have it erased, to restrict or object to how we
            use it, to receive it in a portable format, and to withdraw consent at any time. If
            you are in California, you also have the right to know what we collect and to
            request deletion, and the right not to be discriminated against for exercising
            either.
          </p>
          <p>
            <strong>
              To exercise any of these, email{" "}
              <a href={`mailto:${config.business.privacyEmail}`} className={link}>
                {config.business.privacyEmail}
              </a>
              .
            </strong>{" "}
            You do not need a particular form of words — &quot;delete my data&quot; is enough. We
            will reply within 30 days, there is no charge, and we may ask you to send the
            request from the address on file so we do not act on someone else&apos;s behalf.
          </p>
          <p>
            If you are in the UK or EEA and think we have handled your information badly, you can
            complain to your national data protection authority. We would rather you told us
            first, but that right does not depend on it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Cookies</h2>
          <p>
            The banner you saw on your first visit splits cookies into three groups, and your
            choice is remembered in your browser for twelve months.
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <strong>Necessary</strong> — required for the site to work, including the record
              of your cookie choice itself. These cannot be switched off.
            </li>
            <li>
              <strong>Functional</strong> — remember preferences you have set.
            </li>
            <li>
              <strong>Analytics</strong> — the consent-gated Ahrefs script described in section
              5.
            </li>
          </ul>
          <p className="mt-4">
            You can change your mind at any time by clearing site data in your browser, which
            makes the banner reappear.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Advertising and sponsorship</h2>
          <p>
            We sell sponsorship placements directly. Information a sponsor gives us is used only
            to manage and deliver that placement. We do not sell advertiser or reader data, and
            we do not share advertiser contact details with anyone. Prospective sponsors are
            shown aggregate figures — page views, audience make-up — that identify no individual.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">11. Children</h2>
          <p>
            {config.appName} is not directed at children under 13, and we do not knowingly
            collect their personal information. If you believe a child has subscribed, email us
            and we will delete the address.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">12. Changes to this policy</h2>
          <p>
            If we make a material change — a new processor, a new purpose, a new category of
            data — we will update the date at the top of this page and, for anything affecting
            subscribers, say so in the email itself before it takes effect.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">13. Contact</h2>
          <p>
            {config.business.legalName}
            <br />
            {postalAddress ? (
              <>
                {postalAddress}
                <br />
              </>
            ) : null}
            <a href={`mailto:${config.business.privacyEmail}`} className={link}>
              {config.business.privacyEmail}
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
