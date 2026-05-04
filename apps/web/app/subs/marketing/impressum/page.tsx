import type { Metadata } from 'next';
import { renderLegalDoc } from '../_lib/legal-page';

export const metadata: Metadata = {
  title: 'Impressum',
  robots: { index: false, follow: true }, // Foundation drafts — keep out of search.
};

export default async function ImpressumPage() {
  const html = await renderLegalDoc('impressum');
  return (
    <article
      className="prose mx-auto max-w-3xl px-6 py-12 prose-headings:font-semibold prose-a:text-brand-600"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
