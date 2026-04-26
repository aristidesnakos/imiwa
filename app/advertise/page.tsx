'use client';

import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import { Users, Globe, Mail, CheckCircle, Megaphone, MapPin } from 'lucide-react';

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

const AUDIENCE_STATS = [
  { icon: Users, label: 'Visitors (YTD, growing)', value: '4K+' },
  { icon: Globe, label: 'Avg. Session Time', value: '4m 8s' },
  { icon: Megaphone, label: 'Top Referrers', value: 'Google · Bing · ChatGPT' },
  { icon: MapPin, label: 'Top Country', value: '🇺🇸 United States' },
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

export default function AdvertisePage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', website: '', budget: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

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
    } catch {
      setStatus('error');
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <>
      <Header />

      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-b from-japan-soft-mist via-background to-muted/20 pt-20 pb-16">
          <div className="container mx-auto px-4 text-center space-y-6 max-w-3xl">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-japan-sakura-waters border border-japan-sakura-waters/30 bg-japan-sakura-waters/10 rounded-full px-4 py-1.5">
              Advertising
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-japan-deep-ocean leading-tight">
              Reach an intent-driven audience of Japanese learners
            </h1>
            <p className="text-lg text-japan-mountain-mist leading-relaxed">
              MichiKanji attracts students, travel planners, and professionals who are actively learning Japanese — people who arrive via Google, Bing, and ChatGPT with a specific goal. That intent translates into action for the right brands.
            </p>
            <a
              href="#slots"
              className="inline-block bg-japan-deep-ocean text-white px-8 py-3 rounded-lg font-medium hover:bg-japan-deep-ocean/90 transition-colors"
            >
              View sponsor slots
            </a>
          </div>
        </section>

        {/* Audience Stats */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl font-bold text-center text-japan-deep-ocean mb-3">Our audience at a glance</h2>
            <p className="text-center text-japan-mountain-mist mb-10 max-w-2xl mx-auto text-sm">
              Real data from our analytics dashboard — no inflated numbers.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {AUDIENCE_STATS.map(({ icon: Icon, label, value }) => (
                <div key={label} className="text-center p-6 rounded-xl border border-japan-sakura-waters/20 bg-japan-soft-mist/20">
                  <Icon className="w-8 h-8 text-japan-sakura-waters mx-auto mb-3" />
                  <p className="text-xl font-bold text-japan-deep-ocean leading-tight">{value}</p>
                  <p className="text-sm text-japan-mountain-mist mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Audience Profile */}
        <section className="py-16 bg-japan-soft-mist/20">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl font-bold text-center text-japan-deep-ocean mb-4">Who visits MichiKanji?</h2>
            <p className="text-center text-japan-mountain-mist mb-10 max-w-2xl mx-auto">
              Our traffic is <strong>intent-driven</strong> — people come here with a purpose, which correlates with willingness to spend. Here are the four main visitor segments and their purchasing profiles.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {AUDIENCE_DEMOGRAPHICS.map(({ emoji, title, description }) => (
                <div key={title} className="p-5 rounded-xl border border-japan-sakura-waters/20 bg-background flex gap-4">
                  <span className="text-3xl shrink-0">{emoji}</span>
                  <div>
                    <h3 className="font-semibold text-japan-deep-ocean mb-1">{title}</h3>
                    <p className="text-sm text-japan-mountain-mist leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Top Countries */}
            <div className="bg-background rounded-xl border border-japan-sakura-waters/20 p-6">
              <div className="flex items-center gap-2 mb-5">
                <MapPin className="w-5 h-5 text-japan-sakura-waters" />
                <h3 className="font-semibold text-japan-deep-ocean">Top visitor countries (YTD)</h3>
              </div>
              <div className="space-y-3">
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
              </div>
              <p className="text-xs text-japan-mountain-mist mt-5 border-t border-japan-sakura-waters/10 pt-4">
                The US audience alone (30%+ of total) represents high purchasing power. Singapore and UK visitors also index well for premium consumer spending.
              </p>
            </div>
          </div>
        </section>

        {/* Who Should Advertise */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl font-bold text-center text-japan-deep-ocean mb-4">Best-fit advertisers</h2>
            <p className="text-center text-japan-mountain-mist mb-10 max-w-2xl mx-auto">
              Based on the audience profile above, these categories consistently convert well with intent-driven language learners.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {TARGET_ADVERTISERS.map(({ emoji, title, description }) => (
                <div key={title} className="p-5 rounded-xl border border-japan-sakura-waters/20 bg-background">
                  <div className="text-3xl mb-3">{emoji}</div>
                  <h3 className="font-semibold text-japan-deep-ocean mb-2">{title}</h3>
                  <p className="text-sm text-japan-mountain-mist leading-relaxed">{description}</p>
                </div>
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
                <div
                  key={slot.name}
                  className={`rounded-xl border-2 p-6 flex flex-col ${
                    slot.highlighted
                      ? 'border-japan-coral-sunset bg-japan-coral-sunset/5 shadow-xl shadow-japan-coral-sunset/20 animate-pulse-border'
                      : 'border-japan-deep-ocean/20 bg-background'
                  }`}
                >
                  {slot.highlighted && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-japan-coral-sunset mb-3">Largest audience</span>
                  )}
                  <h3 className="text-xl font-bold text-japan-deep-ocean">{slot.name}</h3>
                  <p className="text-xs font-medium text-japan-mountain-mist mt-1 mb-3">{slot.audience} · {slot.pages}</p>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-japan-deep-ocean">{slot.price}</span>
                    <span className="text-japan-mountain-mist">{slot.period}</span>
                  </div>
                  <p className="text-sm text-japan-mountain-mist mb-5 leading-relaxed">{slot.description}</p>
                  <ul className="space-y-2 flex-1 mb-6">
                    {slot.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${slot.highlighted ? 'text-japan-coral-sunset' : 'text-japan-sakura-waters'}`} />
                        <span className="text-japan-mountain-mist">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={slot.stripeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                      slot.highlighted
                        ? 'bg-japan-coral-sunset text-white hover:bg-japan-coral-sunset/90'
                        : 'border border-japan-deep-ocean/30 text-japan-deep-ocean hover:bg-japan-soft-mist'
                    }`}
                  >
                    Book this slot
                  </a>
                </div>
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
              <div className="text-center p-10 rounded-xl border border-japan-sakura-waters/30 bg-japan-soft-mist/40">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-japan-deep-ocean mb-2">Inquiry received!</h3>
                <p className="text-japan-mountain-mist">Thanks for reaching out. We&apos;ll be in touch shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 bg-background rounded-xl border border-japan-sakura-waters/20 p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-japan-deep-ocean mb-1.5">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-japan-sakura-waters/30 bg-japan-soft-mist/20 px-3 py-2.5 text-sm text-japan-deep-ocean placeholder-japan-mountain-mist/50 focus:outline-none focus:ring-2 focus:ring-japan-sakura-waters/40"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-japan-deep-ocean mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-japan-sakura-waters/30 bg-japan-soft-mist/20 px-3 py-2.5 text-sm text-japan-deep-ocean placeholder-japan-mountain-mist/50 focus:outline-none focus:ring-2 focus:ring-japan-sakura-waters/40"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-japan-deep-ocean mb-1.5">Company / Brand</label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      value={form.company}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-japan-sakura-waters/30 bg-japan-soft-mist/20 px-3 py-2.5 text-sm text-japan-deep-ocean placeholder-japan-mountain-mist/50 focus:outline-none focus:ring-2 focus:ring-japan-sakura-waters/40"
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-japan-deep-ocean mb-1.5">Website</label>
                    <input
                      id="website"
                      name="website"
                      type="url"
                      value={form.website}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-japan-sakura-waters/30 bg-japan-soft-mist/20 px-3 py-2.5 text-sm text-japan-deep-ocean placeholder-japan-mountain-mist/50 focus:outline-none focus:ring-2 focus:ring-japan-sakura-waters/40"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-japan-deep-ocean mb-1.5">Monthly Budget</label>
                  <select
                    id="budget"
                    name="budget"
                    value={form.budget}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-japan-sakura-waters/30 bg-japan-soft-mist/20 px-3 py-2.5 text-sm text-japan-deep-ocean focus:outline-none focus:ring-2 focus:ring-japan-sakura-waters/40"
                  >
                    <option value="">Select a range…</option>
                    <option value="Under $100">Under $100</option>
                    <option value="$100–$250">$100–$250</option>
                    <option value="$250–$500">$250–$500</option>
                    <option value="$500–$1000">$500–$1,000</option>
                    <option value="$1000+">$1,000+</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-japan-deep-ocean mb-1.5">
                    Tell us about your campaign <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-japan-sakura-waters/30 bg-japan-soft-mist/20 px-3 py-2.5 text-sm text-japan-deep-ocean placeholder-japan-mountain-mist/50 focus:outline-none focus:ring-2 focus:ring-japan-sakura-waters/40 resize-none"
                    placeholder="What product or service would you like to promote? What is your goal?"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-sm text-red-600">Something went wrong. Please try again or contact us directly at <a href="mailto:ari@llanai.com" className="underline">ari@llanai.com</a>.</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full bg-japan-deep-ocean text-white rounded-lg px-6 py-3 font-medium hover:bg-japan-deep-ocean/90 transition-colors disabled:opacity-60"
                >
                  {status === 'sending' ? 'Sending…' : 'Send inquiry'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
