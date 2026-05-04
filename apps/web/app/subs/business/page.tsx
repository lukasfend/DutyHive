import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dutyhive/ui';

/**
 * Business shell page (`business.dutyhive.com`).
 *
 * Empty product surface — Org/Member/Schedule management lands in a
 * separate release after Foundation.
 */
export default function BusinessHomePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-65px)] max-w-md items-center px-6 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Business — demnächst</CardTitle>
          <CardDescription>
            Mitarbeiter- und Dienstplanverwaltung für Gesundheitsbetriebe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[color:var(--color-muted)]">
            Geplant für die zweite Produkt-Release nach Foundation v0.1.0.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
