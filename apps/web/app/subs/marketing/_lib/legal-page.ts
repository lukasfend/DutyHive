/**
 * Helper for rendering one of the legal Markdown documents into HTML.
 *
 * The Markdown source lives in `docs/legal/<doc>.de.md` so editors and
 * lawyers can review it without booting the app. We resolve the path at
 * request time (Server Component) using `process.cwd()`, which Next.js
 * reliably sets to the project root in dev and to the standalone output
 * root in prod (we add the `docs/` folder to outputFileTracingIncludes so
 * it ships with the build).
 *
 * The "Entwurf" warning at the top of every file is preserved on render —
 * we want every reader to see that the documents are not lawyer-reviewed.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { marked } from 'marked';

export type LegalDocKey = 'impressum' | 'datenschutz' | 'agb';

const DOC_FILES: Record<LegalDocKey, string> = {
  impressum: 'impressum.de.md',
  datenschutz: 'datenschutz.de.md',
  agb: 'agb.de.md',
};

export async function renderLegalDoc(key: LegalDocKey): Promise<string> {
  const repoRoot = resolve(process.cwd(), '..', '..');
  const filePath = resolve(repoRoot, 'docs', 'legal', DOC_FILES[key]);
  const source = await readFile(filePath, 'utf8');
  return marked.parse(source, { async: false }) as string;
}
