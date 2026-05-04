import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dutyhive/ui';

export default function NewsletterConfirmedPage() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md items-center px-6 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Anmeldung bestätigt</CardTitle>
          <CardDescription>
            Danke! Du erhältst ab jetzt unsere Updates rund um DutyHive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/" className="text-sm text-brand-600 hover:underline">
            Zurück zur Startseite
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
