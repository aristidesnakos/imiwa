import Link from 'next/link';
import { Metadata } from 'next';
import { CheckCircle, Clock } from 'lucide-react';
import Header from '@/components/sections/Header';
import { EmailCapture } from '@/components/EmailCapture';
import {
  isEmailSignupSource,
  type EmailSignupSource,
} from '@/lib/analytics/email-signup-sources';

export const metadata: Metadata = {
  title: 'Subscription | MichiKanji',
  robots: { index: false, follow: false },
};

/**
 * Where `POST /api/subscribe/confirm` sends people, in both of its outcomes.
 *
 * Two states, and the difference matters: arriving here plain means a contact
 * was actually created in Resend, because the route redirects here only after
 * that call succeeds. Arriving with `?state=expired` means the token's
 * signature verified but its 48h window had closed — nobody was subscribed, and
 * the honest thing is to say so and offer the form again.
 *
 * `source` is carried on the expired redirect so the re-subscribe form stays
 * attributed to the surface the person originally signed up from. It is safe to
 * trust: it is read off a payload whose signature was verified, just past its
 * expiry (see lib/email/subscribe-token.ts). It is still re-validated here,
 * because it arrives as a query string and query strings are typed by nobody.
 *
 * This page previously described Kit's post-confirmation redirect and told the
 * reader to "set it as the form's confirmation redirect in the Kit dashboard".
 * False in every clause after the migration, and it also carried 11 off-palette
 * usages frozen in scripts/palette-baseline.json. Both are fixed here.
 */
export default async function SubscribedPage({
  searchParams,
}: {
  // Next 15 hands route params in as a promise; awaiting it is the supported
  // shape, not an optimisation.
  searchParams: Promise<{ state?: string; source?: string }>;
}) {
  const params = await searchParams;
  const expired = params?.state === 'expired';
  const source: EmailSignupSource = isEmailSignupSource(params?.source)
    ? params.source
    : 'homepage-weekly-story';

  return (
    <>
      <Header />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4 py-16"
      >
        {expired ? (
          <div className="w-full max-w-md">
            <div className="mb-6 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
              <div className="mb-5 flex justify-center">
                <Clock aria-hidden="true" className="h-12 w-12 text-japan-coral-sunset-ink" />
              </div>

              <h1 className="mb-3 text-2xl font-bold text-japan-deep-ocean">
                That link had expired
              </h1>
              <p className="leading-relaxed text-japan-mountain-mist">
                Confirmation links last 48 hours, and this one was past it &mdash; so
                you&rsquo;re not on the list yet. Pop your address in again and
                I&rsquo;ll send a fresh one straight away.
              </p>
            </div>

            <EmailCapture
              source={source}
              title="Try that again"
              description="Same address is fine. The new link is good for another 48 hours."
              cta="Send a new link"
            />
          </div>
        ) : (
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <div className="mb-5 flex justify-center">
              <CheckCircle aria-hidden="true" className="h-12 w-12 text-japan-sakura-waters" />
            </div>

            <h1 className="mb-3 text-2xl font-bold text-japan-deep-ocean">
              You&rsquo;re in!
            </h1>
            <p className="mb-8 leading-relaxed text-japan-mountain-mist">
              You&rsquo;re confirmed and on the list. When the next story goes out
              it&rsquo;ll land in your inbox &mdash; if you don&rsquo;t see it there,
              check your promotions or spam folder.
            </p>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded bg-primary px-5 py-2 font-medium text-primary-foreground transition duration-200 hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Back to home
              </Link>
              <Link
                href="/kanji"
                className="inline-flex items-center justify-center rounded bg-muted px-5 py-2 font-medium text-japan-deep-ocean transition duration-200 hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Browse kanji
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
