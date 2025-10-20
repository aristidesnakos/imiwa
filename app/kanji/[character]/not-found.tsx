import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Search, ArrowLeft, BookOpen } from 'lucide-react';

export default function KanjiNotFound() {
  return (
    <div className="container mx-auto p-8 text-center">
      <div className="max-w-md mx-auto space-y-6">
        {/* Icon */}
        <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
          <Search className="w-12 h-12 text-gray-400" />
        </div>
        
        {/* Title */}
        <h1 className="text-2xl font-bold">Kanji Not Found</h1>
        
        {/* Description */}
        <div className="space-y-2 text-gray-600">
          <p>
            The kanji you're looking for is not in our database yet.
          </p>
          <p className="text-sm">
            We currently support JLPT N5 kanji characters. More levels coming soon!
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
          <p>Can't find what you're looking for?</p>
          <p>Try searching for a different kanji character.</p>
        </div>
      </div>
    </div>
  );
}