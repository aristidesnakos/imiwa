'use client';

import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface FormData {
  name: string;
  email: string;
  company: string;
  website: string;
  budget: string;
  message: string;
}

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

export default function AdvertiseContactForm() {
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    company: '',
    website: '',
    budget: '',
    message: '',
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

  if (status === 'success') {
    return (
      <Card className="border-japan-sakura-waters/30 bg-japan-soft-mist/40">
        <CardContent className="flex flex-col items-center justify-center pt-10 pb-10 text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-japan-deep-ocean mb-1">Got it.</h3>
          <p className="text-japan-mountain-mist text-sm">I&apos;ll reply within a day.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-japan-sakura-waters/20">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className="border-japan-sakura-waters/30 bg-japan-soft-mist/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="border-japan-sakura-waters/30 bg-japan-soft-mist/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                name="company"
                type="text"
                value={form.company}
                onChange={handleChange}
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
                placeholder="https://"
                className="border-japan-sakura-waters/30 bg-japan-soft-mist/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Monthly budget</Label>
            <Select value={form.budget} onValueChange={(value) => setForm(prev => ({ ...prev, budget: value }))}>
              <SelectTrigger id="budget" className="border-japan-sakura-waters/30 bg-japan-soft-mist/20">
                <SelectValue placeholder="Pick a range" />
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
            <Label htmlFor="message">What are you promoting?</Label>
            <Textarea
              id="message"
              name="message"
              required
              value={form.message}
              onChange={handleChange}
              rows={4}
              className="border-japan-sakura-waters/30 bg-japan-soft-mist/20"
            />
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-600">
              Something broke. Try again, or email{' '}
              <a href="mailto:ari@llanai.com" className="underline">ari@llanai.com</a>.
            </p>
          )}

          <Button
            type="submit"
            disabled={status === 'sending'}
            className="w-full bg-japan-deep-ocean hover:bg-japan-deep-ocean/90"
          >
            {status === 'sending' ? 'Sending…' : 'Send'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
