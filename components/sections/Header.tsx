'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen } from "lucide-react";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link
            className="flex items-center gap-2 shrink-0"
            href="/"
            title="Imiwa homepage"
          >
            <BookOpen className="w-8 h-8 text-accent" />
            <span className="font-bold text-2xl text-accent">
              Imiwa
            </span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-foreground hover:text-primary transition-colors">
            Home
          </Link>
          <Link href="/kanji" className="text-foreground hover:text-primary transition-colors">
            Kanji
          </Link>
          <Link href="/blog" className="text-foreground hover:text-primary transition-colors">
            Blog
          </Link>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              Settings
            </Button>
          </Link>
        </nav>

        {/* Mobile menu button - Placeholder for now, actual implementation might involve state */}
        <Button variant="outline" size="sm" className="md:hidden">
          Menu
        </Button>
      </div>
    </header>
  );
};

export default Header;
