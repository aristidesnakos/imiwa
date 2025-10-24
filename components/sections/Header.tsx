'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen } from "lucide-react";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-sm border-b border-japan-sakura-waters/20">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link
            className="flex items-center gap-2 shrink-0"
            href="/"
            title="MichiKanji homepage"
          >
            <BookOpen className="w-8 h-8 text-japan-sakura-waters" />
            <span className="font-bold text-2xl text-japan-deep-ocean">
              MichiKanji
            </span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-japan-deep-ocean hover:text-japan-sakura-waters transition-colors font-medium">
            Home
          </Link>
          <Link href="/kanji" className="text-japan-deep-ocean hover:text-japan-sakura-waters transition-colors font-medium">
            Kanji
          </Link>
        </nav>

        {/* Mobile menu button */}
        <Button variant="outline" size="sm" className="md:hidden border-japan-sakura-waters/30 text-japan-deep-ocean hover:bg-japan-soft-mist">
          Menu
        </Button>
      </div>
    </header>
  );
};

export default Header;
