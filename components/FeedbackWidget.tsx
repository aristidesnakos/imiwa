'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { MessageSquare, Star, X, CheckCircle } from 'lucide-react';

type Status = 'idle' | 'sending' | 'success' | 'error';

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [form, setForm] = useState({ message: '', features: '', name: '', email: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [ratingError, setRatingError] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (rating === 0) {
      setRatingError(true);
      return;
    }
    setRatingError(false);
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, ...form }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form after closing so it's fresh next time
    setTimeout(() => {
      setRating(0);
      setHovered(0);
      setForm({ message: '', features: '', name: '', email: '' });
      setStatus('idle');
      setRatingError(false);
    }, 300);
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Share feedback"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-japan-deep-ocean px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-japan-deep-ocean/90 transition-colors focus:outline-none focus:ring-2 focus:ring-japan-sakura-waters/60"
      >
        <MessageSquare className="w-4 h-4" />
        Feedback
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end pb-20 pr-6 sm:items-center sm:justify-center sm:pb-0 sm:pr-0"
          role="dialog"
          aria-modal="true"
          aria-label="Feedback form"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md rounded-2xl bg-background border border-japan-sakura-waters/20 shadow-2xl p-6">
            {/* Close button */}
            <button
              onClick={handleClose}
              aria-label="Close feedback form"
              className="absolute top-4 right-4 text-japan-mountain-mist hover:text-japan-deep-ocean transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {status === 'success' ? (
              <div className="py-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-japan-deep-ocean mb-2">Thank you!</h3>
                <p className="text-japan-mountain-mist text-sm">Your feedback helps us improve MichiKanji.</p>
                <button
                  onClick={handleClose}
                  className="mt-6 text-sm underline text-japan-mountain-mist hover:text-japan-deep-ocean"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-japan-deep-ocean mb-1">Share your feedback</h2>
                <p className="text-sm text-japan-mountain-mist mb-5">
                  How is your experience with MichiKanji? Let us know what you think!
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Star rating */}
                  <div>
                    <label className="block text-sm font-medium text-japan-deep-ocean mb-2">
                      Overall rating <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          role="radio"
                          aria-checked={rating === star}
                          aria-label={`${star} star${star > 1 ? 's' : ''}`}
                          onClick={() => { setRating(star); setRatingError(false); }}
                          onMouseEnter={() => setHovered(star)}
                          onMouseLeave={() => setHovered(0)}
                          className="focus:outline-none focus:ring-2 focus:ring-japan-sakura-waters/60 rounded"
                        >
                          <Star
                            className={`w-7 h-7 transition-colors ${
                              star <= (hovered || rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-japan-mountain-mist/40'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {ratingError && (
                      <p className="text-sm text-red-600 mt-1">Please select a rating before submitting.</p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="fb-message" className="block text-sm font-medium text-japan-deep-ocean mb-1.5">
                      Your feedback <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="fb-message"
                      name="message"
                      required
                      rows={3}
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Tell us what you think…"
                      className="w-full rounded-lg border border-japan-sakura-waters/30 bg-japan-soft-mist/20 px-3 py-2.5 text-sm text-japan-deep-ocean placeholder-japan-mountain-mist/50 focus:outline-none focus:ring-2 focus:ring-japan-sakura-waters/40 resize-none"
                    />
                  </div>

                  {/* Feature requests */}
                  <div>
                    <label htmlFor="fb-features" className="block text-sm font-medium text-japan-deep-ocean mb-1.5">
                      Features you&apos;d like to see
                    </label>
                    <textarea
                      id="fb-features"
                      name="features"
                      rows={2}
                      value={form.features}
                      onChange={handleChange}
                      placeholder="Any features you'd love to see added?"
                      className="w-full rounded-lg border border-japan-sakura-waters/30 bg-japan-soft-mist/20 px-3 py-2.5 text-sm text-japan-deep-ocean placeholder-japan-mountain-mist/50 focus:outline-none focus:ring-2 focus:ring-japan-sakura-waters/40 resize-none"
                    />
                  </div>

                  {/* Optional name + email */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="fb-name" className="block text-sm font-medium text-japan-deep-ocean mb-1.5">Name</label>
                      <input
                        id="fb-name"
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Optional"
                        className="w-full rounded-lg border border-japan-sakura-waters/30 bg-japan-soft-mist/20 px-3 py-2.5 text-sm text-japan-deep-ocean placeholder-japan-mountain-mist/50 focus:outline-none focus:ring-2 focus:ring-japan-sakura-waters/40"
                      />
                    </div>
                    <div>
                      <label htmlFor="fb-email" className="block text-sm font-medium text-japan-deep-ocean mb-1.5">Email</label>
                      <input
                        id="fb-email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="Optional"
                        className="w-full rounded-lg border border-japan-sakura-waters/30 bg-japan-soft-mist/20 px-3 py-2.5 text-sm text-japan-deep-ocean placeholder-japan-mountain-mist/50 focus:outline-none focus:ring-2 focus:ring-japan-sakura-waters/40"
                      />
                    </div>
                  </div>

                  {status === 'error' && (
                    <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full bg-japan-deep-ocean text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-japan-deep-ocean/90 transition-colors disabled:opacity-60"
                  >
                    {status === 'sending' ? 'Sending…' : 'Send feedback'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
