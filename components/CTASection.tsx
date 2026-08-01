import Image from 'next/image';

/**
 * The promo for llanai, rendered as a genuine top-level section of whatever page
 * hosts it.
 *
 * Both variants head themselves with an <h2>, not the <h3> they used to carry.
 * Unlike the sponsor banner — which is someone else's copy and stays out of the
 * outline entirely — this is our own pitch, it is the last thing we ask the
 * reader to do, and it is the only content in its band. The old <h3> made it a
 * subsection of nothing: every caller drops this into a bare <section>, so a
 * screen reader attached it to whichever real section happened to precede it
 * ("Related kanji" on the kanji page), announcing an outbound advert as part of
 * that section's content.
 *
 * Both routes that render this — /kanji/[character] and /kanji/progress — have
 * exactly one <h1> and use <h2> for peer sections, so the promotion slots in
 * without colliding: on the kanji page it joins the writing/readings/related
 * headings as a sibling, and on the progress page it is the only <h2> under the
 * <h1> (its stat cards use CardTitle, which renders a <div>). Any new caller
 * needs to be able to accept an <h2>.
 *
 * The type scale stays where it was on purpose. Heading rank is the document's
 * structure and font size is the page's visual rhythm; a call to action that
 * shouted as loudly as the sections a reader actually came for would misprice
 * itself.
 */
interface CTASectionProps {
  className?: string;
  variant?: 'default' | 'with-image';
}

export function CTASection({ className = "", variant = 'with-image' }: CTASectionProps) {
  if (variant === 'default') {
    return (
      <div className={`mb-6 md:mb-8 ${className}`}>
        <div className="bg-gray-50 p-4 md:p-6 rounded-lg">
          <h2 className="font-semibold mb-3 text-base md:text-lg">Ready to Start Your Language Learning Journey?</h2>
          <p className="mb-4 text-sm md:text-base">
            Practice Japanese with AI-powered feedback tailored to your learning goals.
          </p>
          <a 
            href="https://llanai.com" 
            className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block text-sm md:text-base w-full sm:w-auto text-center"
          >
            Start Japanese Practice
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-6 md:mb-8 ${className}`}>
      <div className="bg-gray-50 rounded-lg overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Content Section */}
          <div className="p-6 md:p-8 flex flex-col justify-center order-2 lg:order-1">
            <h2 className="font-semibold mb-4 text-lg text-gray-900">
              Learn to express yourself in Japanese
            </h2>
            <p className="mb-6 text-sm md:text-base text-gray-600 leading-relaxed">
              Journal and get instant corrections with a custom curriculum.
            </p>
            <div>
              <a 
                href="https://llanai.com" 
                className="bg-blue-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block text-sm md:text-base w-full sm:w-auto text-center shadow-sm"
              >
                Start Journaling in Japanese
              </a>
            </div>
          </div>

          {/* Image Section */}
          <div className="p-6 relative h-48 md:h-64 lg:h-full min-h-[200px] order-1 lg:order-2">
            <Image
              src="/assets/llanai-exemplary-correction-journal.png"
              alt="Japanese learning interface showing text correction and feedback"
              fill
              className="object-contain object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}