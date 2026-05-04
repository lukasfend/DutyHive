import Link from 'next/link';
import { brand } from '@dutyhive/config';

/**
 * Account layout (`app.dutyhive.com`).
 *
 * Houses sign-in / sign-up and the future organization switcher. Foundation
 * Phase 3 ships placeholder nav; Phase 4 wires the real auth forms.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-[color:var(--color-border)]">
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href={`https://${brand.domain}`} className="text-lg font-semibold tracking-tight">
            {brand.name}
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/sign-in"
              className="text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
            >
              Anmelden
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
            >
              Konto erstellen
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
