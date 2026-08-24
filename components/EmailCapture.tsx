'use client';

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { CheckCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trackEmailSignup, type EmailSignupSource } from '@/lib/analytics';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'sending' | 'success' | 'error';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

/**
 * Every string here is a promise about what arrives in the subscriber's inbox.
 * That promise used to be unkeepable, and it is worth recording why it is now
 * keepable, because the copy changed for a reason rather than a mood.
 *
 * Under Kit, what actually arrived was decided by the form behind `KIT_FORM_ID`
 * — configured in a dashboard, wired to this component by nothing but matching
 * copy. So the defaults hedged. Two things they could not assert:
 *
 *  - **That an incentive was coming.** The defaults before those promised a
 *    "free kanji pack" while `KIT_FORM_ID` pointed at a list with no incentive
 *    attached, so the capture path promised a pack three times and nothing ever
 *    arrived.
 *  - **That a confirmation email was on its way.** For a returning address it
 *    was not: Kit answered 2xx for an already-subscribed email without
 *    re-sending anything, and a fallback in `app/api/subscribe/route.ts` could
 *    mint an already-`active` subscriber that never saw a confirmation step at
 *    all. Hence the old "if this is your first time" hedge.
 *
 * Both causes are gone. `POST /api/subscribe` now sends the confirmation email
 * itself, unconditionally, on every accepted submission — returning address or
 * not — and it never creates a contact, so there is no path that skips consent.
 * The fallback that could is deleted. The confirmation promise is therefore
 * plainly true and the copy says it plainly.
 *
 * A surface with a real offer still passes its own copy, and is still
 * responsible for that copy being true. See docs/prd/story-delivery-resend.md.
 */
interface EmailCaptureProps {
  /**
   * Identifies this surface in the `email_signup` goal. Typed, not a free
   * string: per-surface CTR is read entirely off this value, so a typo would
   * split one surface's rate across two spellings silently. Now also validated
   * server-side: `/api/subscribe` rejects anything outside the list. See
   * EMAIL_SIGNUP_SOURCES in lib/analytics/email-signup-sources.
   */
  source: EmailSignupSource;
  title?: string;
  description?: string;
  cta?: string;
  /** Heading of the post-submit state. */
  successTitle?: string;
  /**
   * Body of the post-submit state. Must hold for a returning address too —
   * which it now does, because the confirmation email is sent on every accepted
   * submission rather than only for addresses the ESP considers new.
   */
  successMessage?: string;
  /** Small print under the form. */
  footnote?: string;
  className?: string;
}

export function EmailCapture({
  source,
  title = 'Get new study material by email',
  description = 'Drop your email and we’ll send new study material as it’s published.',
  cta = 'Sign me up',
  successTitle = 'Thanks!',
  successMessage = 'Check your inbox — there’s a confirmation link waiting. One tap and you’re on the list.',
  footnote = 'We’ll send one confirmation email to check it’s you. Nothing else arrives until you tap it, and you can unsubscribe anytime.',
  className,
}: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState(GENERIC_ERROR);
  const errorId = useId();
  const successRef = useRef<HTMLDivElement>(null);

  // The form unmounts on success, which would drop focus to <body> and leave a
  // screen-reader user with no idea the submit worked. Move focus onto the
  // message instead; the live region covers the case where focus is elsewhere.
  useEffect(() => {
    if (status === 'success') successRef.current?.focus();
  }, [status]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'sending') return;
    // Without this, a 400's "Invalid email address." survives into the next
    // attempt and gets shown for what may be an unrelated network failure.
    setErrorMessage(GENERIC_ERROR);
    setStatus('sending');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(typeof data?.error === 'string' ? data.error : GENERIC_ERROR);
        throw new Error(`Server responded with ${res.status}`);
      }

      // Show success FIRST. The subscription has already succeeded server-side,
      // and `trackEmailSignup` awaits a bare `fetch` with no timeout (see
      // lib/analytics -> sendGoal), so awaiting it here would let a stalled
      // analytics request pin the form in 'sending' — disabled, no error —
      // after the signup actually worked.
      setStatus('success');
      trackEmailSignup(source).catch(() => {
        // Analytics must never affect the subscription outcome.
      });
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div
        ref={successRef}
        role="status"
        aria-live="polite"
        tabIndex={-1}
        className={cn(
          'rounded-lg border border-japan-sakura-waters/20 bg-white p-6 text-center shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}
      >
        <CheckCircle aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-green-500" />
        {successTitle && (
          <h3 className="mb-1 text-lg font-semibold text-japan-deep-ocean">{successTitle}</h3>
        )}
        {successMessage && (
          <p className="text-sm text-japan-mountain-mist">{successMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-japan-sakura-waters/20 bg-white p-6 shadow-sm',
        className
      )}
    >
      {title && (
        <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-japan-deep-ocean">
          <Mail aria-hidden="true" className="h-5 w-5 text-japan-deep-ocean" />
          {title}
        </h3>
      )}
      {description && (
        <p className="mb-4 text-sm text-japan-mountain-mist">{description}</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          name="email"
          required
          value={email}
          onChange={handleChange}
          placeholder="you@example.com"
          aria-label="Email address"
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? errorId : undefined}
          disabled={status === 'sending'}
          className="flex-1"
        />
        <Button type="submit" disabled={status === 'sending'} className="shrink-0">
          {status === 'sending' ? 'Sending…' : cta}
        </Button>
      </form>

      {status === 'error' && (
        // role="alert" so the failure is announced; text-destructive-ink, not
        // the --destructive fill, per the palette's fill/ink split.
        <p id={errorId} role="alert" className="mt-2 text-sm text-destructive-ink">
          {errorMessage}
        </p>
      )}

      {footnote && (
        <p className="mt-3 text-xs text-japan-mountain-mist">{footnote}</p>
      )}
    </div>
  );
}

export default EmailCapture;
