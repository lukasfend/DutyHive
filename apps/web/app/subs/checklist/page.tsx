import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dutyhive/ui';

/**
 * Checklist shell page (`checklist.dutyhive.com`).
 *
 * Empty product surface — configurable checklists with audit trail land in
 * a separate release after Foundation.
 */
export default function ChecklistHomePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-65px)] max-w-md items-center px-6 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Checklists — demnächst</CardTitle>
          <CardDescription>
            Konfigurierbare Checklisten mit lückenlosem Audit-Trail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[color:var(--color-muted)]">
            Geplant für die dritte Produkt-Release nach Foundation v0.1.0.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
