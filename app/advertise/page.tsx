import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import AdvertiseContactForm from '@/components/sections/advertise/AdvertiseContactForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Plane, Briefcase, BookOpen, Check, Users } from 'lucide-react';
import { getMonthlyVisitors } from '@/lib/datafast/getMonthlyVisitors';

const SPONSOR_SLOTS = [
  {
    name: 'N5 — Beginner',
    audience: 'Beginners',
    pages: '~88 pages',
    price: '$59',
    period: '/mo',
    description: 'Motivated learners studying the first 88 kanji — day one of the journey.',
    features: ['Banner on every N5 page', 'Your headline, copy, and link', 'One advertiser, no rotation'],
    stripeUrl: 'https://buy.stripe.com/3cIbJ3a2IcjUa0j3ms6Vq00',
  },
  {
    name: 'N4–N3 — Intermediate',
    audience: 'Intermediate',
    pages: '~540 pages',
    price: '$79',
    period: '/mo',
    description: 'The biggest segment: learners past the basics, working toward JLPT.',
    features: ['Banner on every N4 and N3 page', 'Your headline, copy, and link', 'One advertiser, no rotation'],
    highlighted: true,
    stripeUrl: 'https://buy.stripe.com/9B68wR8YE97I8Wf0ag6Vq01',
  },
  {
    name: 'N2–N1 — Advanced',
    audience: 'Advanced',
    pages: '~1,370 pages',
    price: '$99',
    period: '/mo',
    description: 'Advanced learners and professionals. Widest reach on the site.',
    features: ['Banner on every N2 and N1 page', 'Your headline, copy, and link', 'One advertiser, no rotation'],
    stripeUrl: 'https://buy.stripe.com/28E28tdeU1Fg0pJbSY6Vq02',
  },
];

const AUDIENCE = [
  { Icon: GraduationCap, title: 'Students', description: 'College students taking Japanese or prepping for JLPT.' },
  { Icon: Plane, title: 'Travelers', description: 'Adults learning enough kanji before a trip to Japan.' },
  { Icon: Briefcase, title: 'Professionals', description: 'Expats and people working with Japanese clients or teams.' },
  { Icon: BookOpen, title: 'Anime & manga readers', description: 'Fans reading the source without subtitles.' },
];

function formatVisitors(count: number | null): string {
  if (count === null || count < 100) return '2,000+';
  return count.toLocaleString('en-US');
}

export default async function AdvertisePage() {
  const monthlyVisitors = await getMonthlyVisitors();

  return (
    <>
      <Header />

      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-b from-japan-soft-mist via-background to-muted/20 pt-20 pb-14">
          <div className="container mx-auto px-4 text-center space-y-5 max-w-2xl">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-japan-sakura-waters border border-japan-sakura-waters/30 bg-japan-sakura-waters/10 rounded-full px-4 py-1.5">
              Advertise on MichiKanji
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-japan-deep-ocean leading-tight">
              A clean place to reach Japanese learners.
            </h1>
            <p className="text-lg text-japan-mountain-mist leading-relaxed">
              I built MichiKanji to help people get deeper into the Japanese language and culture. If you sell something that helps that same goal, put it in front of the right people here. One advertiser per JLPT tier. Flat monthly rate. No auctions.
            </p>
            <div className="pt-1">
              <Button asChild className="bg-japan-deep-ocean hover:bg-japan-deep-ocean/90">
                <a href="#slots">See the slots</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Headline stat */}
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card className="border-japan-sakura-waters/20 bg-japan-soft-mist/30">
              <CardContent className="flex items-center gap-5 py-7 px-6">
                <div className="shrink-0 w-12 h-12 rounded-full bg-japan-coral-sunset/15 flex items-center justify-center">
                  <Users className="w-6 h-6 text-japan-coral-sunset" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-japan-deep-ocean leading-tight">
                    {formatVisitors(monthlyVisitors)} learners
                  </div>
                  <div className="text-sm text-japan-mountain-mist">
                    on MichiKanji in the last 30 days — looking up specific kanji, not browsing.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Who reads MichiKanji */}
        <section className="py-14 bg-japan-soft-mist/20">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl font-bold text-center text-japan-deep-ocean mb-3">Who reads MichiKanji</h2>
            <p className="text-center text-japan-mountain-mist mb-10 max-w-2xl mx-auto text-sm">
              Four kinds of people show up here. They came looking for a specific kanji — that&apos;s intent you can&apos;t buy elsewhere.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
              {AUDIENCE.map(({ Icon, title, description }) => (
                <Card key={title} className="border-japan-sakura-waters/20 bg-background">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-japan-sakura-waters/15 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-japan-sakura-waters" />
                      </div>
                      <CardTitle className="text-base pt-1.5">{title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-japan-mountain-mist leading-relaxed">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-center text-sm text-japan-mountain-mist max-w-2xl mx-auto">
              The fits that work: language apps, JLPT prep, Japan travel, stationery and writing tools, relocation and visa services.
            </p>
          </div>
        </section>

        {/* Sponsor Slots */}
        <section id="slots" className="py-14 bg-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl font-bold text-center text-japan-deep-ocean mb-3">Pick a tier</h2>
            <p className="text-center text-japan-mountain-mist mb-10 max-w-2xl mx-auto text-sm">
              One advertiser per tier. Your banner runs on every page in that tier. Flat monthly rate. Cancel anytime.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {SPONSOR_SLOTS.map((slot) => (
                <Card
                  key={slot.name}
                  className={`flex flex-col border-2 ${
                    slot.highlighted
                      ? 'border-japan-coral-sunset bg-japan-coral-sunset/5 shadow-xl shadow-japan-coral-sunset/20 animate-pulse-border'
                      : 'border-japan-deep-ocean/15'
                  }`}
                >
                  {slot.highlighted && (
                    <div className="px-6 pt-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-japan-coral-sunset">
                        Biggest audience
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg">{slot.name}</CardTitle>
                    <CardDescription>{slot.audience} · {slot.pages}</CardDescription>
                    <div className="mt-3">
                      <span className="text-3xl font-bold text-japan-deep-ocean">{slot.price}</span>
                      <span className="text-japan-mountain-mist ml-1">{slot.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <p className="text-sm text-japan-mountain-mist leading-relaxed">{slot.description}</p>
                    <ul className="space-y-2">
                      {slot.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check
                            className={`w-4 h-4 mt-0.5 shrink-0 ${
                              slot.highlighted ? 'text-japan-coral-sunset' : 'text-japan-sakura-waters'
                            }`}
                          />
                          <span className="text-japan-mountain-mist">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <div className="px-6 pb-6">
                    <Button
                      asChild
                      className={`w-full ${
                        slot.highlighted
                          ? 'bg-japan-coral-sunset hover:bg-japan-coral-sunset/90'
                          : 'border border-japan-deep-ocean/30 text-japan-deep-ocean hover:bg-japan-soft-mist'
                      }`}
                      variant={slot.highlighted ? 'default' : 'outline'}
                    >
                      <a href={slot.stripeUrl} target="_blank" rel="noopener noreferrer">
                        Book this slot
                      </a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            <p className="text-center text-sm text-japan-mountain-mist mt-8">
              Want to talk first?{' '}
              <a href="#contact" className="underline hover:text-japan-deep-ocean">Send a note</a>.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="py-14 bg-japan-soft-mist/20">
          <div className="container mx-auto px-4 max-w-xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-japan-deep-ocean mb-2">Talk first?</h2>
              <p className="text-japan-mountain-mist text-sm">
                Send a note. I read every one — usually back within a day.
              </p>
            </div>
            <AdvertiseContactForm />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
