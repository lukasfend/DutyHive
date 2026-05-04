/**
 * MagicLink — sent by Better Auth's magic-link plugin when a user requests a
 * passwordless login.
 *
 * The recipient must click within ~5 minutes (Better Auth's default token
 * lifetime). Magic links are single-use.
 */
import { Button, Heading, Text } from '@react-email/components';
import { EmailLayout } from './layout';

export type MagicLinkProps = {
  /** Pre-built sign-in URL (token already embedded). */
  url: string;
};

export default function MagicLink({ url }: MagicLinkProps) {
  return (
    <EmailLayout preview="Dein Magic-Link für die Anmeldung bei DutyHive.">
      <Heading as="h1" className="mt-0 text-lg text-gray-900">
        Anmelden bei DutyHive
      </Heading>
      <Text>
        Klicke auf den Link, um dich anzumelden. Der Link gilt 5 Minuten und kann nur einmal
        verwendet werden.
      </Text>
      <Button
        href={url}
        className="my-4 inline-block rounded-md bg-blue-600 px-4 py-2 font-medium text-white"
      >
        Jetzt anmelden
      </Button>
      <Text className="text-xs text-gray-500">
        Wenn du dich nicht angemeldet hast, kannst du diese Mail ignorieren.
      </Text>
    </EmailLayout>
  );
}
