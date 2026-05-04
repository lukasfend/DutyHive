'use client';

/**
 * CookieBanner — bottom-fixed dismissible banner.
 *
 * Foundation policy: we set ONLY essential cookies (Better Auth session,
 * locale preference). Under the EU/AT cookie regime, essential cookies do
 * NOT require explicit consent — so this banner is not rendered in
 * Foundation. It exists so Phase 5+ can flip the rendering on once we add
 * analytics (PostHog/Plausible) or any non-essential storage.
 *
 * Persistence layer
 * -----------------
 * We use a single first-party cookie `dh_cookie_consent` rather than
 * localStorage so:
 *   - The decision survives a private-window-to-normal-window transition
 *   - Server-side rendering can read the decision and avoid a flash
 *   - SameSite=Lax + Secure (in prod) keeps the value safe
 *
 * Values: "accepted" | "declined" | absent (= undecided)
 *
 * Usage (Phase 5+):
 *   import { CookieBanner } from '@dutyhive/ui';
 *   ...
 *   <CookieBanner privacyHref="/datenschutz" />
 */
import { useEffect, useState } from 'react';
import { Button } from './button';
import { cn } from '../lib/cn';

const COOKIE_NAME = 'dh_cookie_consent';

export type CookieBannerProps = {
  /** Link to the privacy policy. Required so users can review before consenting. */
  privacyHref: string;
  /** Override copy for non-DE deployments. */
  text?: {
    title?: string;
    description?: string;
    accept?: string;
    decline?: string;
    privacyLabel?: string;
  };
  /** Optional callback when the user makes a choice. */
  onChoice?: (choice: 'accepted' | 'declined') => void;
  /** Hide the banner entirely (used by Foundation — only-essential cookies). */
  disabled?: boolean;
  className?: string;
};

function readConsent(): 'accepted' | 'declined' | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.split('=')[1];
  return value === 'accepted' || value === 'declined' ? value : null;
}

function writeConsent(value: 'accepted' | 'declined') {
  if (typeof document === 'undefined') return;
  const oneYear = 60 * 60 * 24 * 365;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${oneYear}; SameSite=Lax${secure}`;
}

export function CookieBanner({
  privacyHref,
  text,
  onChoice,
  disabled,
  className,
}: CookieBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (disabled) return;
    setVisible(readConsent() === null);
  }, [disabled]);

  if (disabled || !visible) return null;

  function decide(choice: 'accepted' | 'declined') {
    writeConsent(choice);
    onChoice?.(choice);
    setVisible(false);
  }

  const t = {
    title: text?.title ?? 'Cookies',
    description:
      text?.description ??
      'Wir verwenden technisch notwendige Cookies. Optionale Statistik-Cookies setzen wir nur mit Ihrer Zustimmung.',
    accept: text?.accept ?? 'Akzeptieren',
    decline: text?.decline ?? 'Nur notwendige',
    privacyLabel: text?.privacyLabel ?? 'Datenschutz',
  };

  return (
    <div
      role="dialog"
      aria-label={t.title}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 border-t border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4 shadow-lg',
        className,
      )}
    >
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--color-fg)]">
          {t.description}{' '}
          <a href={privacyHref} className="underline">
            {t.privacyLabel}
          </a>
          .
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => decide('declined')}>
            {t.decline}
          </Button>
          <Button variant="primary" size="sm" onClick={() => decide('accepted')}>
            {t.accept}
          </Button>
        </div>
      </div>
    </div>
  );
}
