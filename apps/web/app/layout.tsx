import type { Metadata, Viewport } from 'next';
import { brand } from '@dutyhive/config';
import './globals.css';

/**
 * Root layout — applies to every route group.
 *
 * Phase 3 will introduce per-subdomain shells under app/_sub/[sub]/layout.tsx
 * that wrap children with subdomain-specific navigation and theme.
 *
 * `lang` is set to 'de' since DE is the only translated locale in Foundation.
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
