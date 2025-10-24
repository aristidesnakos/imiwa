import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-japan-sakura-waters/20 bg-gradient-to-br from-background to-japan-soft-mist">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-japan-sakura-waters" />
              <h2 className="text-xl font-bold text-japan-deep-ocean">MichiKanji</h2>
            </div>
            <p className="text-sm text-japan-mountain-mist">
              Learn Japanese kanji with interactive stroke order diagrams. Master JLPT N5-N1 characters.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold mb-4 text-japan-deep-ocean">Learn</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-japan-mountain-mist hover:text-japan-sakura-waters transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/kanji" className="text-sm text-japan-mountain-mist hover:text-japan-sakura-waters transition-colors">
                  All Kanji
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4 text-japan-deep-ocean">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="https://llanai.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-japan-mountain-mist hover:text-japan-sakura-waters transition-colors flex items-center gap-1"
                >
                  Japanese Learning Journal
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4 text-japan-deep-ocean">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/tos" 
                  className="text-sm text-japan-mountain-mist hover:text-japan-sakura-waters transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy-policy" 
                  className="text-sm text-japan-mountain-mist hover:text-japan-sakura-waters transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="mailto:ari@llanai.com"
                  className="text-sm text-japan-mountain-mist hover:text-japan-sakura-waters transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-8 pt-8 border-t border-japan-sakura-waters/20">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-sm text-japan-mountain-mist text-center sm:text-left">
              © {new Date().getFullYear()} MichiKanji. All rights reserved.
            </div>
            <div className="text-sm text-japan-mountain-mist text-center sm:text-right">
              Made by{" "}
              <Link 
                href="https://theauspiciouscompany.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-japan-sakura-waters transition-colors underline"
              >
                The Auspicious Company
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
