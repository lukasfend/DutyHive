/**
 * Shared email layout — every template renders inside this shell.
 *
 * Keeps the brand wordmark, container width, and footer consistent across
 * all transactional + newsletter mail. Tailwind classes are NOT available
 * inside email templates (most clients strip them); colors come from the
 * `style` attribute with hex values mirroring the design tokens.
 */
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { brand } from '@dutyhive/config';
import type { ReactNode } from 'react';

export type EmailLayoutProps = {
  /** Inbox preview line shown by clients before the user opens the message. */
  preview: string;
  children: ReactNode;
};

/**
 * `<Tailwind>` from @react-email lets us write Tailwind classes; the
 * renderer inlines the resulting styles for client compatibility.
 */
export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="de">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto my-8 max-w-xl rounded-lg bg-white p-8 shadow-sm">
            <Section className="border-b border-gray-200 pb-4">
              <Text className="m-0 text-xl font-semibold text-gray-900">{brand.name}</Text>
            </Section>
            <Section className="py-6 text-sm leading-6 text-gray-700">{children}</Section>
            <Hr className="border-gray-200" />
            <Section className="pt-4 text-xs text-gray-500">
              <Text className="m-0">
                {brand.name} · <a href={`https://${brand.domain}`}>{brand.domain}</a>
              </Text>
              <Text className="m-0">
                Diese Nachricht wurde an Sie versendet, weil Sie eine Aktion auf {brand.domain}{' '}
                ausgelöst haben. Antworten Sie auf{' '}
                <a href={`mailto:${brand.contact.supportEmail}`}>{brand.contact.supportEmail}</a>{' '}
                wenn dies ein Irrtum war.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
