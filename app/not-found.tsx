import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-japan-soft-mist via-background to-muted/20">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto space-y-6">
            {/* Tan confused mascot */}
            <div className="flex justify-center">
              <Image
                src="/assets/tan-confused.png"
                alt="Tan the tanuki mascot looking confused"
                width={200}
                height={200}
                className="w-40 md:w-48 drop-shadow-md"
                priority
              />
            </div>

            {/* Heading */}
            <h1 className="text-4xl font-bold text-japan-deep-ocean">
              404 — Page Not Found
            </h1>

            {/* Friendly copy */}
            <p className="text-lg text-gray-600">
              Tan can&apos;t find this page either.{' '}
              Try searching for a kanji instead.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto border-japan-sakura-waters/30 text-japan-deep-ocean hover:bg-japan-soft-mist">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Link href="/kanji">
                <Button className="w-full sm:w-auto">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Browse Kanji
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
