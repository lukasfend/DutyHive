/**
 * NewsletterConfirm — double-opt-in mail for the marketing newsletter.
 *
 * GDPR / TKG (AT) require a confirmed opt-in before we may send marketing
 * mail. This template carries the confirmation link; clicking it sets
 * `EmailSubscriber.confirmedAt` server-side. Until then no further mail
 * is sent.
 */
import { Button, Heading, Text } from '@react-email/components';
import { EmailLayout } from './layout';

export type NewsletterConfirmProps = {
  /** Pre-built confirmation URL (token already embedded). */
  confirmUrl: string;
  /** Pre-built unsubscribe URL — required for the List-Unsubscribe header. */
  unsubscribeUrl: string;
};

export default function NewsletterConfirm({ confirmUrl, unsubscribeUrl }: NewsletterConfirmProps) {
  return (
    <EmailLayout preview="Bestätige deine Newsletter-Anmeldung bei DutyHive.">
      <Heading as="h1" className="mt-0 text-lg text-gray-900">
        Willkommen!
      </Heading>
      <Text>
        Du hast dich für den DutyHive-Newsletter angemeldet. Damit wir dir Updates schicken dürfen,
        brauchen wir noch deine Bestätigung — bitte klicke einmal auf den Link.
      </Text>
      <Button
        href={confirmUrl}
        className="my-4 inline-block rounded-md bg-blue-600 px-4 py-2 font-medium text-white"
      >
        Anmeldung bestätigen
      </Button>
      <Text className="text-xs text-gray-500">
        Wenn du dich nicht angemeldet hast, kannst du diese Mail ignorieren oder{' '}
        <a href={unsubscribeUrl}>hier widersprechen</a>. Dein Eintrag wird dann gelöscht.
      </Text>
    </EmailLayout>
  );
}
