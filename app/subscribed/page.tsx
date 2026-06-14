import Link from 'next/link';
import { Metadata } from 'next';
import { CheckCircle, XCircle, Mail } from 'lucide-react';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';

export const metadata: Metadata = {
  title: 'Subscription | MichiKanji',
  robots: { index: false, follow: false },
};

export default async function SubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string }>;
}) {
  const { status } = await searchParams;

  let icon = <Mail className="w-12 h-12 text-blue-600" />;
  let heading = 'Thanks!';
  let message = 'We received your request.';

  if (status === 'confirmed') {
    icon = <CheckCircle className="w-12 h-12 text-green-600" />;
    heading = "You're in!";
    message = 'Check your inbox for your free pack.';
  } else if (status === 'invalid') {
    icon = <XCircle className="w-12 h-12 text-red-500" />;
    heading = 'Link expired';
    message = 'This link is invalid or expired — please sign up again.';
  }

  return (
    <>
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-16 min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-md bg-white p-8 rounded-lg border border-gray-200 shadow-sm text-center">
          <div className="flex justify-center mb-5">{icon}</div>

          <h1 className="text-2xl font-bold text-gray-800 mb-3">{heading}</h1>
          <p className="text-gray-600 leading-relaxed mb-8">{message}</p>

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

      <Footer />
    </>
  );
}
