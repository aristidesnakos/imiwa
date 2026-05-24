'use client';

import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import { Mail, CheckCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const SPONSOR_SLOTS = [
  {
    name: 'N5 — Japan Explorer',
    audience: 'Beginners',
    pages: '~88 pages',
    price: '$59',
    period: '/month',
    description: 'Reach motivated beginners studying the 88 most essential kanji — a high-intent audience just starting their Japanese journey.',
    features: [
      'Exclusive banner on all N5 kanji pages',
      'Your headline, description & CTA',
      'Link to your website',
      'One sponsor per slot — no competition',
    ],
    stripeUrl: 'https://buy.stripe.com/3cIbJ3a2IcjUa0j3ms6Vq00',
  },
  {
    name: 'N4–N3 — Serious Learner',
    audience: 'Intermediate',
    pages: '~540 pages',
    price: '$79',
    period: '/month',
    description: 'The largest audience segment: committed learners who have moved past the basics and are actively preparing for JLPT exams.',
    features: [
      'Exclusive banner on all N4 & N3 kanji pages',
      'Your headline, description & CTA',
      'Link to your website',
      'One sponsor per slot — no competition',
    ],
    highlighted: true,
    stripeUrl: 'https://buy.stripe.com/9B68wR8YE97I8Wf0ag6Vq01',
  },
  {
    name: 'N2–N1 — Deep Immersion',
    audience: 'Advanced',
    pages: '~1,370 pages',
    price: '$99',
    period: '/month',
    description: 'The broadest reach on the site: advanced learners, professionals, and near-native readers who engage deeply with the material.',
    features: [
      'Exclusive banner on all N2 & N1 kanji pages',
      'Your headline, description & CTA',
      'Link to your website',
      'One sponsor per slot — no competition',
    ],
    stripeUrl: 'https://buy.stripe.com/28E28tdeU1Fg0pJbSY6Vq02',
  },
];

const AUDIENCE_DEMOGRAPHICS = [
  {
    emoji: '🎓',
    title: 'Students & Academics',
    description: 'College and university students studying Japanese for credit or JLPT exams. Often have part-time income and spend on study materials, textbooks, and apps.',
  },
  {
    emoji: '✈️',
    title: 'Travel Planners',
    description: 'People planning trips to Japan who want to learn basic kanji before they go. Typically employed adults with disposable income for flights, hotels, and experiences.',
  },
  {
    emoji: '💼',
    title: 'Professionals & Business People',
    description: 'Expats, remote workers, and business professionals who work with Japanese clients or companies. High disposable income and a need for premium language tools.',
  },
  {
    emoji: '🎌',
    title: 'Anime & Manga Fans',
    description: 'Enthusiasts who want to read manga and watch anime without subtitles. A large and passionate segment—many spend on merchandise, streaming, and learning subscriptions.',
  },
];

const TOP_COUNTRIES = [
  { flag: '🇺🇸', country: 'United States', visitors: '1,200', note: 'Largest segment — high purchasing power' },
  { flag: '🇯🇵', country: 'Japan', visitors: '301', note: 'Native context learners & expats' },
  { flag: '🇸🇬', country: 'Singapore', visitors: '235', note: 'High-income English-speaking market' },
  { flag: '🇮🇳', country: 'India', visitors: '197', note: 'Fast-growing tech-savvy learners' },
  { flag: '🇬🇧', country: 'United Kingdom', visitors: '175', note: 'Strong purchasing power' },
];

const TARGET_ADVERTISERS = [
  { emoji: '📚', title: 'Japanese Language Apps & Courses', description: 'Online courses, JLPT prep tools, flashcard apps, and tutoring services. Visitors are actively learning and ready to upgrade their study toolkit.' },
  { emoji: '✈️', title: 'Japan Travel & Tourism', description: 'Airlines, hotels, tour operators, and travel agencies. A large portion of visitors are planning a first or repeat trip to Japan.' },
  { emoji: '🎌', title: 'Anime & Manga Platforms', description: 'Streaming services, manga subscriptions, and fan merchandise. The anime/manga community overlaps significantly with kanji learners.' },
  { emoji: '🖊️', title: 'Stationery & Calligraphy', description: 'Japanese-style notebooks, brush pens, calligraphy kits, and premium stationery brands. A natural fit for people practicing writing.' },
  { emoji: '💼', title: 'Japan Visa & Relocation Services', description: 'Visa consultants, job boards for Japan, and relocation agencies. Professionals in the audience are often researching life or work in Japan.' },
  { emoji: '🎓', title: 'JLPT Prep & Certification', description: 'Test prep books, practice exams, and certification programs. Visitors studying for N5–N1 are a highly motivated, conversion-ready audience.' },
];

interface FormData {
  name: string;
  email: string;
  company: string;
  website: string;
  budget: string;
  message: string;
}

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

export default function AdvertisePage() {
  const [form, setForm] = useState<FormData>({ 
    name: '', 
    email: '', 
    company: '', 
    website: '', 
    budget: '', 
    message: '' 
  });
  const [status, setStatus] = useState<FormStatus>('idle');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/advertise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      setStatus('success');
      setForm({ name: '', email: '', company: '', website: '', budget: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setForm(prev => ({ ...prev, budget: value }));
  };

  return (
    <>
      <Header />

      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-b from-japan-soft-mist via-background to-muted/20 pt-20 pb-16">
          <div className="container mx-auto px-4 text-center space-y-6 max-w-3xl">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-japan-sakura-waters border border-japan-sakura-waters/30 bg-japan-sakura-waters/10 rounded-full px-4 py-2">
              Advertising
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-japan-deep-ocean leading-tight">
              Reach an intent-driven audience of Japanese learners
            </h1>
            <p className="text-lg text-japan-mountain-mist leading-relaxed">
              MichiKanji attracts students, travel planners, and professionals who are actively learning Japanese — people who arrive via Google, Bing, and ChatGPT with a specific goal. That intent translates to engagement and conversions.
            </p>
            <Button 
              asChild 
              className="bg-japan-deep-ocean hover:bg-japan-deep-ocean/90"
            >
              <a href="#slots">View sponsor slots</a>
            </Button>
          </div>
        </section>

        {/* Analytics Widget Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-japan-deep-ocean mb-3">Our audience at a glance</h2>
              <p className="text-japan-mountain-mist max-w-2xl mx-auto text-sm">
                Real data from our analytics dashboard — live metrics updated automatically.
              </p>
            </div>
            <div className="flex justify-center">
              <iframe
                src="https://datafa.st/widgets/695c3143ed2abc9092737a33/analytics?mainTextSize=16&primaryColor=%23e78468&secondaryColor=%238dcdff"
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  width: '100%', 
                  maxWidth: '800px', 
                  height: '180px' 
                }}
                frameBorder={0}
                allowTransparency={true}
                title="MichiKanji Analytics Widget"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* Audience Profile */}
        <section className="py-16 bg-japan-soft-mist/20">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl font-bold text-center text-japan-deep-ocean mb-4">Who visits MichiKanji?</h2>
            <p className="text-center text-japan-mountain-mist mb-10 max-w-2xl mx-auto">
              Our traffic is <strong>intent-driven</strong> — people come here with a purpose, which correlates with willingness to spend. Here are the four main visitor segments and their purchasing patterns.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {AUDIENCE_DEMOGRAPHICS.map(({ emoji, title, description }) => (
                <Card key={title} className="border-japan-sakura-waters/20 bg-background">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <span className="text-3xl shrink-0">{emoji}</span>
                      <CardTitle className="text-lg">{title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-japan-mountain-mist leading-relaxed">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Top Countries */}
            <Card className="border-japan-sakura-waters/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-japan-sakura-waters" />
                  <CardTitle>Top visitor countries (YTD)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {TOP_COUNTRIES.map(({ flag, country, visitors, note }) => (
                  <div key={country} className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2 min-w-[160px]">
                      <span className="text-lg">{flag}</span>
                      <span className="font-medium text-japan-deep-ocean">{country}</span>
                    </span>
                    <span className="font-bold text-japan-deep-ocean w-14 text-right shrink-0">{visitors}</span>
                    <span className="text-japan-mountain-mist hidden sm:block">{note}</span>
                  </div>
                ))}
                <p className="text-xs text-japan-mountain-mist mt-5 pt-4 border-t border-japan-sakura-waters/10">
                  The US audience alone (30%+ of total) represents high purchasing power. Singapore and UK visitors also index well for premium consumer spending.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Best-fit Advertisers */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl font-bold text-center text-japan-deep-ocean mb-4">Best-fit advertisers</h2>
            <p className="text-center text-japan-mountain-mist mb-10 max-w-2xl mx-auto">
              Based on the audience profile above, these categories consistently convert well with intent-driven language learners.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {TARGET_ADVERTISERS.map(({ emoji, title, description }) => (
                <Card key={title} className="border-japan-sakura-waters/20 bg-background flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="text-3xl mb-2">{emoji}</div>
                    <CardTitle className="text-base">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-japan-mountain-mist leading-relaxed">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Sponsor Slots */}
        <section id="slots" className="py-16 bg-japan-soft-mist/20">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl font-bold text-center text-japan-deep-ocean mb-4">Sponsor slots</h2>
            <p className="text-center text-japan-mountain-mist mb-10 max-w-2xl mx-auto">
              Each slot is exclusive — one sponsor per JLPT tier at a time. Your banner appears on every page in that tier, giving you a clean, uncluttered presence with a highly targeted audience.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SPONSOR_SLOTS.map((slot) => (
                <Card 
                  key={slot.name}
                  className={`flex flex-col border-2 ${
                    slot.highlighted
                      ? 'border-japan-coral-sunset bg-japan-coral-sunset/5 shadow-xl shadow-japan-coral-sunset/20 animate-pulse-border'
                      : 'border-japan-deep-ocean/20'
                  }`}
                >
                  {slot.highlighted && (
                    <div className="px-6 pt-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-japan-coral-sunset">
                        Largest audience
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{slot.name}</CardTitle>
                    <CardDescription>{slot.audience} · {slot.pages}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-japan-deep-ocean">{slot.price}</span>
                      <span className="text-japan-mountain-mist ml-1">{slot.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <p className="text-sm text-japan-mountain-mist leading-relaxed">{slot.description}</p>
                    <ul className="space-y-2">
                      {slot.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <span className={`mt-0.5 shrink-0 ${slot.highlighted ? 'text-japan-coral-sunset' : 'text-japan-sakura-waters'}`}>
                            ✓
                          </span>
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
              Questions before booking?{' '}
              <a href="#contact" className="underline hover:text-japan-deep-ocean">Send us a message</a> and we&apos;ll get back to you promptly.
            </p>
          </div>
        </section>

        {/* Contact Form */}
        <section id="contact" className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="text-center mb-10">
              <Mail className="w-10 h-10 text-japan-sakura-waters mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-japan-deep-ocean mb-3">Have a question before booking?</h2>
              <p className="text-japan-mountain-mist">
                Fill out the form below and we&apos;ll get back to you within 1–2 business days.
              </p>
            </div>

            {status === 'success' ? (
              <Card className="border-japan-sakura-waters/30 bg-japan-soft-mist/40">
                <CardContent className="flex flex-col items-center justify-center pt-10">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold text-japan-deep-ocean mb-2">Inquiry received!</h3>
                  <p className="text-japan-mountain-mist">Thanks for reaching out. We&apos;ll be in touch shortly.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-japan-sakura-waters/20">
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          required
                          value={form.name}
                          onChange={handleChange}
                          placeholder="Your name"
                          className="border-japan-sakura-waters/30 bg-japan-soft-mist/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          value={form.email}
                          onChange={handleChange}
                          placeholder="you@example.com"
                          className="border-japan-sakura-waters/30 bg-japan-soft-mist/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="company">Company / Brand</Label>
                        <Input
                          id="company"
                          name="company"
                          type="text"
                          value={form.company}
                          onChange={handleChange}
                          placeholder="Acme Corp"
                          className="border-japan-sakura-waters/30 bg-japan-soft-mist/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          name="website"
                          type="url"
                          value={form.website}
                          onChange={handleChange}
                          placeholder="https://example.com"
                          className="border-japan-sakura-waters/30 bg-japan-soft-mist/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budget">Monthly Budget</Label>
                      <Select value={form.budget} onValueChange={handleSelectChange}>
                        <SelectTrigger id="budget" className="border-japan-sakura-waters/30 bg-japan-soft-mist/20">
                          <SelectValue placeholder="Select a range…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Under $100">Under $100</SelectItem>
                          <SelectItem value="$100–$250">$100–$250</SelectItem>
                          <SelectItem value="$250–$500">$250–$500</SelectItem>
                          <SelectItem value="$500–$1000">$500–$1,000</SelectItem>
                          <SelectItem value="$1000+">$1,000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Tell us about your campaign *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        required
                        value={form.message}
                        onChange={handleChange}
                        placeholder="What product or service would you like to promote? What is your goal?"
                        rows={5}
                        className="border-japan-sakura-waters/30 bg-japan-soft-mist/20"
                      />
                    </div>

                    {status === 'error' && (
                      <p className="text-sm text-red-600">
                        Something went wrong. Please try again or contact us directly at{' '}
                        <a href="mailto:ari@llanai.com" className="underline">
                          ari@llanai.com
                        </a>
                        .
                      </p>
                    )}

                    <Button 
                      type="submit" 
                      disabled={status === 'sending'}
                      className="w-full bg-japan-deep-ocean hover:bg-japan-deep-ocean/90"
                    >
                      {status === 'sending' ? 'Sending…' : 'Send inquiry'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
