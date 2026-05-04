import Link from 'next/link';
import { brand } from '@dutyhive/config';

/**
 * Checklist shell layout (`checklist.dutyhive.com`).
 *
 * Foundation ships an empty product surface. Real product navigation lands
 * with the checklist release.
 */
export default function ChecklistLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-[color:var(--color-border)]">
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">
            {brand.name} <span className="text-[color:var(--color-muted)]">Checklists</span>
          </span>
          <Link
            href={`https://${brand.domain}`}
            className="text-sm text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
          >
            ← {brand.domain}
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
