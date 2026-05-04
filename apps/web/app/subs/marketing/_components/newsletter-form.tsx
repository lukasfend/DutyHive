'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@dutyhive/ui';

/**
 * Newsletter sign-up form (client component).
 *
 * Posts to `/api/subscribe` and renders one of three states:
 *   idle    — show the form
 *   sending — disable inputs, show "Sende …"
 *   success — replace the form with a confirmation card
 *   error   — show error text below the form, keep the form filled in
 *
 * The API always returns `{ ok: true }` for valid requests (regardless of
 * whether the email is new, pending, or already confirmed) so we cannot
 * leak subscriber list status. The "success" state therefore really means
 * "your request was accepted; check your inbox if it's a new signup."
 */
type Status = 'idle' | 'sending' | 'success' | 'error';

export function NewsletterForm() {
  const t = useTranslations('marketing.newsletter');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing.hero' }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('successTitle')}</CardTitle>
          <CardDescription>{t('successMessage')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newsletter-email">{t('emailLabel')}</Label>
            <Input
              id="newsletter-email"
              type="email"
              required
              autoComplete="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'sending'}
            />
          </div>
          <Button type="submit" disabled={status === 'sending'} className="w-full">
            {status === 'sending' ? t('submitting') : t('submit')}
          </Button>
          <p className="text-xs text-[color:var(--color-muted)]">
            {t('consent')}{' '}
            <Link href="/datenschutz" className="underline hover:text-[color:var(--color-fg)]">
              Datenschutz
            </Link>
            .
          </p>
          {status === 'error' && (
            <p className="text-xs text-[color:var(--color-danger)]">{t('errorMessage')}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
