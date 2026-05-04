import Link from 'next/link';
import { brand } from '@dutyhive/config';
import { CookieBanner } from '@dutyhive/ui';

/**
 * Marketing layout (apex `dutyhive.com`).
 *
 * Public-facing chrome: brand wordmark on the left, link to the app on the
 * right. The footer carries legal-page links and the version badge. Phase 4
 * fills in the navigation with i18n strings and adds the cookie banner stub.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-[color:var(--color-border)]">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            {brand.name}
          </Link>
          <Link
            href={`https://app.${brand.domain}`}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Anmelden →
          </Link>
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      {/* Cookie banner is wired here but stays hidden in Foundation —
          we set only essential cookies (Better Auth session, locale prefs)
          which don't require explicit consent under EU/AT rules. Flip
          `disabled={false}` when Phase 5+ adds analytics. */}
      <CookieBanner privacyHref="/datenschutz" disabled />

      <footer className="border-t border-[color:var(--color-border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-6 text-sm text-[color:var(--color-muted)] sm:flex-row sm:items-center">
          <span>
            © {year} {brand.name}. Alle Rechte vorbehalten.
          </span>
          <div className="flex gap-4">
            <Link href="/impressum" className="hover:text-[color:var(--color-fg)]">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-[color:var(--color-fg)]">
              Datenschutz
            </Link>
            <Link href="/agb" className="hover:text-[color:var(--color-fg)]">
              AGB
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
