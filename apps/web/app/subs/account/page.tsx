import Link from 'next/link';
import {
  buttonStyles,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from '@dutyhive/ui';

/**
 * Account hub landing page (`app.dutyhive.com`).
 *
 * Phase 3 placeholder. The Better Auth handler at `/api/auth/[...all]` is
 * already wired (Phase 2); the real sign-in / sign-up forms come in Phase 4.
 *
 * `buttonStyles` (instead of `<Button>`) wraps a `<Link>` directly so the
 * resulting markup is `<a class="...">` — putting `<a>` inside a `<button>`
 * would be invalid HTML.
 */
export default function AccountHomePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-65px)] max-w-md items-center px-6 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Konto-Zentrale</CardTitle>
          <CardDescription>
            Hier melden Sie sich an, verwalten Ihr Profil und wechseln zwischen Organisationen.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link
            href="/sign-in"
            className={cn(buttonStyles({ variant: 'primary', size: 'lg' }), 'w-full')}
          >
            Anmelden
          </Link>
          <Link
            href="/sign-up"
            className={cn(buttonStyles({ variant: 'secondary', size: 'lg' }), 'w-full')}
          >
            Konto erstellen
          </Link>
          <p className="mt-2 text-center text-xs text-[color:var(--color-muted)]">
            Foundation Phase 3 · Login-Formulare in Phase 4
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
