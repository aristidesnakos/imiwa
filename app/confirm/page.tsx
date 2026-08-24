import { Metadata } from 'next';
import { CheckCircle } from 'lucide-react';
import Header from '@/components/sections/Header';

export const metadata: Metadata = {
  title: 'Confirm your subscription | MichiKanji',
  robots: { index: false, follow: false },
};

/**
 * The page the confirmation email links to.
 *
 * It exists for one reason: a bare `GET` confirm link is auto-fetchable. Outlook
 * Safe Links, Gmail and corporate mail gateways fetch URLs they find in email,
 * and a scanner fetching a GET link is indistinguishable from a human clicking
 * it — which would silently subscribe people who never pressed anything. The
 * contact record IS our consent record (there is no other), so that caveat
 * would have to be written into the privacy policy rather than engineered away.
 *
 * One button that POSTs fixes it. Scanners do not POST. The form is plain HTML
 * with no `onSubmit`, so it also works with JavaScript disabled — which the
 * in-app browsers of some mail clients effectively are.
 *
 * Nothing is validated here. The token is opaque to this page; the route
 * handler verifies the signature and decides everything.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  // Next 15 hands route params in as a promise; awaiting it is the supported
  // shape, not an optimisation.
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params?.token === 'string' ? params.token : '';

  return (
    <>
      <Header />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-4 py-16"
      >
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <div className="mb-5 flex justify-center">
            <CheckCircle aria-hidden="true" className="h-12 w-12 text-japan-sakura-waters" />
          </div>

          <h1 className="mb-3 text-2xl font-bold text-japan-deep-ocean">
            One last tap
          </h1>

          {token ? (
            <>
              <p className="mb-8 leading-relaxed text-japan-mountain-mist">
                Press the button and you&rsquo;re on the list for the weekly story.
                That&rsquo;s the whole confirmation step.
              </p>

              <form method="POST" action="/api/subscribe/confirm">
                <input type="hidden" name="token" value={token} />
                <button
                  type="submit"
                  // Raw <button>, so the focus ring is added explicitly — it does
                  // not come through buttonVariants here. See CLAUDE.md.
                  className="inline-flex items-center justify-center rounded bg-primary px-5 py-2 font-medium text-primary-foreground transition duration-200 hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Yes, subscribe
                </button>
              </form>
            </>
          ) : (
            <p className="leading-relaxed text-japan-mountain-mist">
              This link is missing its confirmation code. Open the link in the
              email we sent you, or sign up again from any page on the site.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
