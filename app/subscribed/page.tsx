import Link from 'next/link';
import { Metadata } from 'next';
import { CheckCircle } from 'lucide-react';
import Header from '@/components/sections/Header';

export const metadata: Metadata = {
  title: 'Subscription | MichiKanji',
  robots: { index: false, follow: false },
};

// Static thank-you page, reached after a subscriber clicks the Kit
// confirmation link — set it as the form's confirmation redirect in the Kit
// dashboard. Nothing gates direct navigation, so treat arrival here as a hint,
// not proof that anyone confirmed anything.
//
// One page serves every Kit form, because `/api/subscribe` has a single
// `KIT_FORM_ID` and Kit's redirect is configured per form. So this copy has to
// stay true for every offer that points here — today the weekly story list,
// which sends nothing until the next send day, and later the practice pack,
// which arrives immediately. It previously read "check your inbox for your free
// pack", which was false for the only list actually wired up. If an offer ever
// needs its own wording, give it its own route rather than making this one
// vague enough to cover both. See docs/prd/weekly-story-newsletter.md,
// "Open decisions".
export default function SubscribedPage() {
  return (
    <>
      <Header />

      <main id="main-content" tabIndex={-1} className="max-w-4xl mx-auto px-4 py-16 min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-md bg-white p-8 rounded-lg border border-gray-200 shadow-sm text-center">
          <div className="flex justify-center mb-5">
            <CheckCircle aria-hidden="true" className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-3">You&apos;re in!</h1>
          <p className="text-gray-600 leading-relaxed mb-8">
            You&apos;re on the list. When the next email goes out it&apos;ll land in your
            inbox — if you don&apos;t see us there, check your promotions or spam folder.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded transition-colors duration-200"
            >
              Back to home
            </Link>
            <Link
              href="/kanji"
              className="inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-5 rounded transition-colors duration-200"
            >
              Browse kanji
            </Link>
          </div>
        </div>
      </main>

    </>
  );
}
