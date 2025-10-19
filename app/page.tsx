import { Suspense } from "react";
import Header from "@/components/sections/Header";
import Hero from "@/components/sections/Hero";
import Problem from "@/components/sections/Problem";
import Experience from "@/components/sections/Experience";
import Pricing from "@/components/sections/Pricing";
import FAQ from "@/components/sections/FAQ";
import Footer from "@/components/sections/Footer";
import { getSEOTags } from "@/lib/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `${config.appName} - ${config.appDescription}`,
  description: config.appDescription,
  canonicalUrlRelative: "/",
});

export default function LandingPage() {
  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <Header />
      </Suspense>
      
      <main>
        {/* Hero Section - The main value proposition */}
        <Hero />
        
        {/* Problem Section - What problems we solve */}
        <Problem />
        
        {/* Experience/Features Section - How we solve them */}
        <Experience />
        
        {/* Pricing Section - Investment options */}
        <Pricing />
        
        {/* FAQ Section - Address common questions */}
        <FAQ />
      </main>

      <Footer />
    </>
  );
}
