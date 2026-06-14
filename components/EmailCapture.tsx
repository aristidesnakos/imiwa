'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { CheckCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trackEmailSignup } from '@/lib/analytics';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'sending' | 'success' | 'error';

interface EmailCaptureProps {
  source: string;
  title?: string;
  description?: string;
  cta?: string;
  className?: string;
}

export function EmailCapture({
  source,
  title = 'Get your free kanji pack',
  description = 'Drop your email and we’ll send printable practice sheets plus new study material.',
  cta = 'Send me the pack',
  className,
}: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('Something went wrong. Please try again.');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data?.error ?? 'Something went wrong. Please try again.');
        throw new Error(`Server responded with ${res.status}`);
      }

      // Fire the DataFast conversion goal.
      try {
        await trackEmailSignup(source);
      } catch {
        // Analytics failures must not block the success state.
      }

      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div
        className={cn(
          'rounded-lg border border-japan-sakura-waters/20 bg-white p-6 text-center shadow-sm',
          className
        )}
      >
        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-500" />
        <h3 className="mb-1 text-lg font-semibold text-japan-deep-ocean">Almost there!</h3>
        <p className="text-sm text-japan-mountain-mist">
          Check your email to confirm — your pack is on the way.
        </p>
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
          <Mail className="h-5 w-5 text-japan-deep-ocean" />
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
          disabled={status === 'sending'}
          className="flex-1"
        />
        <Button type="submit" disabled={status === 'sending'} className="shrink-0">
          {status === 'sending' ? 'Sending…' : cta}
        </Button>
      </form>

      {status === 'error' && (
        <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
      )}

      <p className="mt-3 text-xs text-japan-mountain-mist">
        Double opt-in. We&apos;ll only email you the pack and new sheets. Unsubscribe anytime.
      </p>
    </div>
  );
}

export default EmailCapture;
