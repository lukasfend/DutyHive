import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dutyhive/ui';

/**
 * Planner shell page (`planner.dutyhive.com`).
 *
 * Empty product surface — the layout already provides the back-to-apex
 * navigation. The real planner ships in a separate release after Foundation.
 */
export default function PlannerHomePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-65px)] max-w-md items-center px-6 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Planner — demnächst</CardTitle>
          <CardDescription>
            Persönlicher Schichtplaner mit ICS-Export und PWA-Support. Wir bauen die Plattform
            gerade fertig.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[color:var(--color-muted)]">
            Geplant für die erste Produkt-Release nach Foundation v0.1.0.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
