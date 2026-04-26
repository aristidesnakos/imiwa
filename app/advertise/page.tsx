'use client';

import { useState } from 'react';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import { Users, Globe, TrendingUp, Mail, CheckCircle, Megaphone } from 'lucide-react';

const AD_PACKAGES = [
  {
    name: 'Starter',
    price: '$99',
    period: '/month',
    description: 'Perfect for small businesses and indie creators targeting Japanese learners.',
    features: [
      'Banner ad on all kanji pages',
      'Link to your website',
      'Monthly impression report',
      '30-day campaign',
    ],
  },
  {
    name: 'Growth',
    price: '$249',
    period: '/month',
    description: 'Ideal for language schools, travel companies, and Japan-focused brands.',
    features: [
      'Everything in Starter',
      'Custom headline & description',
      'Priority placement',
      'Click-through tracking',
      '90-day campaign',
    ],
    highlighted: true,
  },
  {
    name: 'Brand Partner',
    price: 'Custom',
    period: '',
    description: 'Deep integration for brands that want maximum visibility across the site.',
    features: [
      'Everything in Growth',
      'Featured placement on homepage',
      'Dedicated "Sponsored by" label',
      'Co-created content option',
      'Flexible duration',
    ],
  },
];

const AUDIENCE_STATS = [
  { icon: Users, label: 'Monthly Visitors', value: '50K+' },
  { icon: Globe, label: 'Countries Reached', value: '80+' },
  { icon: TrendingUp, label: 'Kanji Pages Viewed', value: '200K+/mo' },
  { icon: Megaphone, label: 'Avg. Session (min)', value: '4:30' },
];

const TARGET_ADVERTISERS = [
  { emoji: '✈️', title: 'Japan Travel & Tourism', description: 'Airlines, hotels, tour operators, and travel agencies targeting people planning trips to Japan.' },
  { emoji: '📚', title: 'Language Learning Apps', description: 'Japanese language apps, online courses, textbooks, and tutoring services.' },
  { emoji: '🍣', title: 'Japanese Culture & Food', description: 'Japanese restaurants, cooking kits, sake brands, anime streaming platforms, and cultural experiences.' },
  { emoji: '🎌', title: 'Japan-Inspired Products', description: 'Stationery, calligraphy kits, clothing, and lifestyle brands with a Japanese aesthetic.' },
  { emoji: '💻', title: 'Remote Work & Tech in Japan', description: 'Visa services, relocation consultants, and companies hiring globally with Japan offices.' },
  { emoji: '🎓', title: 'Study Abroad Programs', description: 'Universities, exchange programs, and certification bodies for Japanese language learners.' },
];

export default function AdvertisePage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', website: '', budget: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
              Reach thousands of Japanese learners every month
            </h1>
            <p className="text-lg text-japan-mountain-mist leading-relaxed">
              MichiKanji attracts students, travelers, and enthusiasts who are passionate about Japan and Japanese culture — a highly engaged audience for your brand.
            </p>
            <a
              href="#contact"
              className="inline-block bg-japan-deep-ocean text-white px-8 py-3 rounded-lg font-medium hover:bg-japan-deep-ocean/90 transition-colors"
            >
              Get in touch
            </a>
          </div>
        </section>

        {/* Audience Stats */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl font-bold text-center text-japan-deep-ocean mb-10">Our audience at a glance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {AUDIENCE_STATS.map(({ icon: Icon, label, value }) => (
                <div key={label} className="text-center p-6 rounded-xl border border-japan-sakura-waters/20 bg-japan-soft-mist/20">
                  <Icon className="w-8 h-8 text-japan-sakura-waters mx-auto mb-3" />
                  <p className="text-2xl font-bold text-japan-deep-ocean">{value}</p>
                  <p className="text-sm text-japan-mountain-mist mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who Should Advertise */}
        <section className="py-16 bg-japan-soft-mist/20">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl font-bold text-center text-japan-deep-ocean mb-4">Who advertises on MichiKanji?</h2>
            <p className="text-center text-japan-mountain-mist mb-10 max-w-2xl mx-auto">
              Our readers are curious, motivated, and ready to invest in their passion for Japan. Here are the types of businesses that resonate most with our community.
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

        {/* Ad Packages */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl font-bold text-center text-japan-deep-ocean mb-4">Advertising packages</h2>
            <p className="text-center text-japan-mountain-mist mb-10 max-w-2xl mx-auto">
              Choose a plan that fits your goals. All packages include a banner placement on our kanji reference pages where visitors spend most of their time.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {AD_PACKAGES.map((pkg) => (
                <div
                  key={pkg.name}
                  className={`rounded-xl border p-6 flex flex-col ${
                    pkg.highlighted
                      ? 'border-japan-sakura-waters bg-japan-soft-mist/40 shadow-lg'
                      : 'border-japan-sakura-waters/20 bg-background'
                  }`}
                >
                  {pkg.highlighted && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-japan-sakura-waters mb-3">Most popular</span>
                  )}
                  <h3 className="text-xl font-bold text-japan-deep-ocean">{pkg.name}</h3>
                  <div className="mt-2 mb-4">
                    <span className="text-3xl font-bold text-japan-deep-ocean">{pkg.price}</span>
                    {pkg.period && <span className="text-japan-mountain-mist">{pkg.period}</span>}
                  </div>
                  <p className="text-sm text-japan-mountain-mist mb-5 leading-relaxed">{pkg.description}</p>
                  <ul className="space-y-2 flex-1 mb-6">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-japan-sakura-waters mt-0.5 shrink-0" />
                        <span className="text-japan-mountain-mist">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#contact"
                    className={`text-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                      pkg.highlighted
                        ? 'bg-japan-deep-ocean text-white hover:bg-japan-deep-ocean/90'
                        : 'border border-japan-deep-ocean/30 text-japan-deep-ocean hover:bg-japan-soft-mist'
                    }`}
                  >
                    Get started
                  </a>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-japan-mountain-mist mt-8">
              Not sure which package is right for you?{' '}
              <a href="#contact" className="underline hover:text-japan-deep-ocean">Send us a message</a> and we'll help you decide.
            </p>
          </div>
        </section>

        {/* Contact Form */}
        <section id="contact" className="py-16 bg-japan-soft-mist/20">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="text-center mb-10">
              <Mail className="w-10 h-10 text-japan-sakura-waters mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-japan-deep-ocean mb-3">Start your campaign</h2>
              <p className="text-japan-mountain-mist">
                Fill out the form below and we'll get back to you within 1–2 business days.
              </p>
            </div>

            {status === 'success' ? (
              <div className="text-center p-10 rounded-xl border border-japan-sakura-waters/30 bg-japan-soft-mist/40">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-japan-deep-ocean mb-2">Inquiry received!</h3>
                <p className="text-japan-mountain-mist">Thanks for reaching out. We'll be in touch shortly.</p>
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
