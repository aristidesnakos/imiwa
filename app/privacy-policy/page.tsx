import Link from "next/link";
import { getSEOTags } from "@/lib/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Privacy Policy | ${config.appName}`,
  canonicalUrlRelative: "/privacy-policy",
});

export default function PrivacyPolicy() {
  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <Link href="/" className="btn btn-ghost inline-flex items-center mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5 mr-1"
        >
          <path
            fillRule="evenodd"
            d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
            clipRule="evenodd"
          />
        </svg>
        Back
      </Link>

      <h1 className="text-3xl font-extrabold mb-8">Privacy Policy for {config.appName}</h1>
      <p className="text-sm text-gray-600 mb-8">Last Updated: April 1, 2025</p>

      <div className="prose prose-slate max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold">1. INTRODUCTION</h2>
          <p>
            We are The Auspicious Company, doing business as Auspicious and Llanai (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;), 
            a company registered in Massachusetts, United States.
          </p>
          <p>
            We operate the website https://www.llanai.com (the &quot;Site&quot;), the mobile application Llanai (the &quot;App&quot;), 
            as well as any other related products and services that refer or link to this Privacy Policy 
            (collectively, the &quot;Services&quot;).
          </p>
          <p>
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Services. 
            Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the Services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. INFORMATION WE COLLECT</h2>
          <p>We collect information that you provide directly to us, including:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Account information (name, email address, password)</li>
            <li>Profile information (language preferences, learning goals)</li>
            <li>Content you create (writing samples, language exercises)</li>
            <li>Payment information (when you subscribe to premium features)</li>
            <li>Communications with us</li>
          </ul>
          <p className="mt-4">
            We also collect certain information automatically when you use our Services, including:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Usage data (interactions, features used, time spent)</li>
            <li>Device information (IP address, browser type, operating system)</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. HOW WE USE YOUR INFORMATION</h2>
          <p>We use the information we collect for various purposes, including to:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Provide, maintain, and improve our Services</li>
            <li>Personalize your language learning experience</li>
            <li>Process transactions and manage your account</li>
            <li>Communicate with you about our Services</li>
            <li>Monitor and analyze usage patterns and trends</li>
            <li>Protect against, identify, and prevent fraud and other illegal activity</li>
            <li>Comply with our legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. DATA SHARING</h2>
          <p>
            We may share your information with third parties in certain circumstances, including:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Service providers who perform services on our behalf</li>
            <li>Business partners with whom we jointly offer products or services</li>
            <li>In connection with a business transaction (e.g., merger or acquisition)</li>
            <li>When required by law or to protect our rights</li>
          </ul>
          <p className="mt-4">
            We do not sell your personal information to third parties for their direct marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. DATA RETENTION</h2>
          <p>
            We store the information we collect about you for as long as is necessary for the purposes for which we 
            originally collected it, or for other legitimate business purposes, including to meet our legal, regulatory, 
            or other compliance obligations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. CHILDREN&apos;S PRIVACY</h2>
          <p>
            Our Services are not intended for children under 13 years of age. We do not knowingly collect or solicit 
            personal information from children under 13. If we learn we have collected personal information from a child 
            under 13, we will delete that information as quickly as possible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. UPDATES TO THIS POLICY</h2>
          <p>
            We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email 
            or through the Services prior to the change becoming effective. Your continued use of our Services after any 
            changes indicates your acceptance of the new Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. CONTACT US</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at: {' '}
            <a href="mailto:ari@llanai.com" className="text-blue-600 hover:underline">ari@llanai.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}
