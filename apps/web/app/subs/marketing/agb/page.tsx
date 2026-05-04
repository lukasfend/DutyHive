import type { Metadata } from 'next';
import { renderLegalDoc } from '../_lib/legal-page';

export const metadata: Metadata = {
  title: 'AGB',
  robots: { index: false, follow: true },
};

export default async function AgbPage() {
  const html = await renderLegalDoc('agb');
  return (
    <article
      className="prose mx-auto max-w-3xl px-6 py-12 prose-headings:font-semibold prose-a:text-brand-600"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
