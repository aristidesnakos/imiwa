'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { trackConversion } from '@/lib/analytics';

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
            <Image
              src="/assets/tan-head.png"
              alt="Tan the tanuki mascot"
              width={80}
              height={40}
              className="h-10 w-auto"
            />
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
          <Link
            href="/free-resources"
            className="text-japan-deep-ocean hover:text-japan-sakura-waters transition-colors font-medium"
            onClick={async () => {
              await trackConversion({
                name: 'free_resources_clicked',
                properties: {
                  source: 'header_nav'
                }
              });
            }}
          >
            Free Resources
          </Link>
          <Link href="/advertise" className="text-japan-deep-ocean hover:text-japan-sakura-waters transition-colors font-medium">
            Advertise
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
