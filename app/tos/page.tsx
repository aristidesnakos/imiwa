import Link from "next/link";
import { getSEOTags } from "@/lib/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Terms and Conditions | ${config.appName}`,
  canonicalUrlRelative: "/tos",
});

export default function TermsOfService() {
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

      <h1 className="text-3xl font-extrabold mb-8">Terms and Conditions for {config.appName}</h1>
      <p className="text-sm text-gray-600 mb-8">Last Updated: October 03, 2024</p>

      <div className="prose prose-slate max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold">AGREEMENT TO OUR LEGAL TERMS</h2>
          <p>
            We are The Auspicious Company, doing business as Auspicious and Llanai (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;), 
            a company registered in Massachusetts, United States.
          </p>
          <p>
            We operate the website https://www.llanai.com (the &quot;Site&quot;), the mobile application Llanai (the &quot;App&quot;), 
            as well as any other related products and services that refer or link to these legal terms (the &quot;Legal Terms&quot;) 
            (collectively, the &quot;Services&quot;).
          </p>
          <p>
            We provide a chatbot service aimed at improving users language learning skills by incorporating the use of artificial 
            intelligence tools. We provide a recommendation engine that tailors its content recommendation and generation based on 
            the content generated between the chatbot and the user.
          </p>
          <p>You can contact us by email at ari@llanai.com.</p>
        </section>

        <section>
          <p>
            These Legal Terms constitute a legally binding agreement made between you, whether personally or on behalf of an entity 
            (&quot;you&quot;), and The Auspicious Company, concerning your access to and use of the Services. You agree that by 
            accessing the Services, you have read, understood, and agreed to be bound by all of these Legal Terms. IF YOU DO NOT 
            AGREE WITH ALL OF THESE LEGAL TERMS, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SERVICES AND YOU MUST DISCONTINUE 
            USE IMMEDIATELY.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">TABLE OF CONTENTS</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>OUR SERVICES</li>
            <li>INTELLECTUAL PROPERTY RIGHTS</li>
            <li>USER REPRESENTATIONS</li>
            <li>USER REGISTRATION</li>
            <li>PURCHASES AND PAYMENT</li>
            <li>FREE TRIAL</li>
            <li>CANCELLATION</li>
            <li>PROHIBITED ACTIVITIES</li>
            <li>USER GENERATED CONTRIBUTIONS</li>
            <li>CONTRIBUTION LICENSE</li>
            <li>GUIDELINES FOR REVIEWS</li>
            <li>MOBILE APPLICATION LICENSE</li>
            <li>SOCIAL MEDIA</li>
            <li>SERVICES MANAGEMENT</li>
            <li>PRIVACY POLICY</li>
            <li>COPYRIGHT INFRINGEMENTS</li>
            <li>TERM AND TERMINATION</li>
            <li>MODIFICATIONS AND INTERRUPTIONS</li>
            <li>GOVERNING LAW</li>
            <li>DISPUTE RESOLUTION</li>
            <li>CORRECTIONS</li>
            <li>DISCLAIMER</li>
            <li>LIMITATIONS OF LIABILITY</li>
            <li>INDEMNIFICATION</li>
            <li>USER DATA</li>
            <li>ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES</li>
            <li>CALIFORNIA USERS AND RESIDENTS</li>
            <li>MISCELLANEOUS</li>
            <li>CONTACT US</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold">1. OUR SERVICES</h2>
          <p>
            The information provided when using the Services is not intended for distribution to or use by any person or entity 
            in any jurisdiction or country where such distribution or use would be contrary to law or regulation or which would 
            subject us to any registration requirement within such jurisdiction or country. Accordingly, those persons who choose 
            to access the Services from other locations do so on their own initiative and are solely responsible for compliance 
            with local laws, if and to the extent local laws are applicable.
          </p>
          <p>
            The Services are not tailored to comply with industry-specific regulations (Health Insurance Portability and 
            Accountability Act (HIPAA), Federal Information Security Management Act (FISMA), etc.), so if your interactions would 
            be subjected to such laws, you may not use the Services. You may not use the Services in a way that would violate 
            the Gramm-Leach-Bliley Act (GLBA).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. INTELLECTUAL PROPERTY RIGHTS</h2>
          <h3 className="text-lg font-medium mt-4">Our intellectual property</h3>
          <p>
            We are the owner or the licensee of all intellectual property rights in our Services, including all source code, 
            databases, functionality, software, website designs, audio, video, text, photographs, and graphics in the Services 
            (collectively, the &quot;Content&quot;), as well as the trademarks, service marks, and logos contained therein 
            (the &quot;Marks&quot;).
          </p>
          <p>
            Our Content and Marks are protected by copyright and trademark laws (and various other intellectual property rights 
            and unfair competition laws) and treaties in the United States and around the world.
          </p>
          <p>
            The Content and Marks are provided in or through the Services &quot;AS IS&quot; for your personal, non-commercial use only.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-medium">Your use of our Services</h3>
          <p>
            Subject to your compliance with these Legal Terms, including the &quot;PROHIBITED ACTIVITIES&quot; section below, 
            we grant you a non-exclusive, non-transferable, revocable license to:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>access the Services; and</li>
            <li>download or print a copy of any portion of the Content to which you have properly gained access</li>
          </ul>
          <p>solely for your personal, non-commercial use.</p>
        </section>

        <section className="mt-8">
          <p className="text-sm text-gray-600">
            For the complete terms and conditions, including sections on User Representations, Registration, Payments, 
            Prohibited Activities, and more, please contact us at {' '}
            <a href="mailto:ari@llanai.com" className="text-blue-600 hover:underline">ari@llanai.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}
