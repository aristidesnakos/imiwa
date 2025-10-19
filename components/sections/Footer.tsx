import Link from "next/link";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-primary">Llanai</h2>
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Llanai. All rights reserved.
            </span>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link 
              href="/tos" 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Terms
            </Link>
            <Link 
              href="/privacy-policy" 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy
            </Link>
            <Link 
              href="mailto:ari@llanai.com" // Assuming contact email from config.ts
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
