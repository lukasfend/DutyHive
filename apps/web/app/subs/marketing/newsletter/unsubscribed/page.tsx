import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dutyhive/ui';

export default function NewsletterUnsubscribedPage() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md items-center px-6 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Abgemeldet</CardTitle>
          <CardDescription>
            Wir senden dir keine weiteren Mails. Schade, dass du gehst — sollten wir wieder
            interessanter werden, schreib uns einfach.
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
