/**
 * EmailVerification — sent by Better Auth when a user signs up.
 *
 * The recipient must click the verification URL to activate their account.
 * Required by R-0001 mitigation (we never let unverified accounts sign in).
 */
import { Button, Heading, Text } from '@react-email/components';
import { EmailLayout } from './layout';

export type EmailVerificationProps = {
  /** Display name for the greeting. */
  name: string;
  /** Pre-built activation URL (token already embedded). */
  url: string;
};

export default function EmailVerification({ name, url }: EmailVerificationProps) {
  return (
    <EmailLayout preview="Bitte bestätige deine Email-Adresse, um dein Konto zu aktivieren.">
      <Heading as="h1" className="mt-0 text-lg text-gray-900">
        Hallo {name},
      </Heading>
      <Text>
        bitte bestätige deine Email-Adresse, um dein DutyHive-Konto zu aktivieren. Der Link gilt 24
        Stunden.
      </Text>
      <Button
        href={url}
        className="my-4 inline-block rounded-md bg-blue-600 px-4 py-2 font-medium text-white"
      >
        Email-Adresse bestätigen
      </Button>
      <Text className="text-xs text-gray-500">
        Klick funktioniert nicht? Kopiere die folgende Adresse in deinen Browser:
        <br />
        <span className="break-all text-gray-700">{url}</span>
      </Text>
      <Text className="text-xs text-gray-500">
        Wenn du dich nicht registriert hast, kannst du diese Mail ignorieren — ohne Klick wird kein
        Konto aktiviert.
      </Text>
    </EmailLayout>
  );
}
