'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import logo from "@/app/icon.png"; // Assuming logo path is correct
import { useUser } from "@/context/user";

const Header = () => {
  const { profile } = useUser();

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link
            className="flex items-center gap-2 shrink-0"
            href="/"
            title="Llanai homepage"
          >
            <Image
              src={logo}
              alt="Llanai logo"
              className="w-8 h-8 rounded-full"
              priority={true}
              width={32}
              height={32}
            />
            <span className="font-bold text-2xl text-accent">
              Llanai
            </span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-foreground hover:text-primary transition-colors">
            Home
          </Link>
          <Link href="#pricing" className="text-foreground hover:text-primary transition-colors">
            Pricing
          </Link>
          <Link href="/blog" className="text-foreground hover:text-primary transition-colors">
            Blog
          </Link>
          {profile?.name ? (
            <Link href="/journal">
              <Button variant="outline" size="sm">
                {profile.name}
              </Button>
            </Link>
          ) : (
            <Link href="/signin">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
          )}
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
