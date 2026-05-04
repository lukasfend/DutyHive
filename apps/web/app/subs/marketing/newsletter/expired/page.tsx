import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dutyhive/ui';

export default function NewsletterExpiredPage() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md items-center px-6 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Link abgelaufen oder ungültig</CardTitle>
          <CardDescription>
            Der Bestätigungslink ist abgelaufen oder wurde bereits genutzt. Du kannst dich unten
            einfach noch einmal anmelden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/" className="text-sm text-brand-600 hover:underline">
            Zur Startseite mit Newsletter-Form
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
