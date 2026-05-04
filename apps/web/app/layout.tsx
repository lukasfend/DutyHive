import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { brand } from '@dutyhive/config';
import './globals.css';

/**
 * Root layout — applies to every route group.
 *
 * Wraps the tree with `<NextIntlClientProvider>` so client components can
 * call `useTranslations()`. The locale + messages are resolved server-side
 * by `next-intl/server` from the request-config plugin in next.config.ts.
 *
 * Per-subdomain layouts under `app/subs/<sub>/layout.tsx` add their own
 * chrome (header, nav, footer) on top of this root.
 */
export const metadata: Metadata = {
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`,
  },
  description: brand.tagline.de,
  applicationName: brand.name,
  authors: [{ name: brand.name }],
  generator: 'Next.js',
  referrer: 'strict-origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
