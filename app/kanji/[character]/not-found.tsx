import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function KanjiNotFound() {
  return (
    <div className="container mx-auto p-8 text-center">
      <div className="max-w-md mx-auto space-y-6">
        {/* Tan confused mascot */}
        <div className="flex justify-center">
          <Image
            src="/assets/tan-confused.png"
            alt="Tan the tanuki mascot looking confused"
            width={160}
            height={160}
            className="w-32 md:w-40 drop-shadow-md"
          />
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold">Kanji Not Found</h1>
        
        {/* Description */}
        <div className="space-y-2 text-gray-600">
          <p>
            Tan couldn&apos;t find that one. The kanji you&apos;re looking for is not in our database yet.
          </p>
          <p className="text-sm">
            We currently support JLPT N5, N4, N3, N2, and N1 kanji characters.
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/kanji">
            <Button className="w-full sm:w-auto">
              <BookOpen className="w-4 h-4 mr-2" />
              Browse All Kanji
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
        
        {/* Additional Info */}
        <div className="mt-8 text-sm text-gray-500">
          <p>Try searching for a different kanji character.</p>
        </div>
      </div>
    </div>
  );
}