import { brand } from '@dutyhive/config';
import { VersionBadge } from '../components/version-badge';

/**
 * Foundation Phase 1 placeholder homepage.
 *
 * In Phase 3 the proxy rewrites incoming traffic to /_sub/<subdomain>/...
 * and dedicated route-group pages take over (marketing on apex, account on
 * app.*, etc.). Until then this single page proves the build works end-to-end.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold tracking-tight">{brand.name}</h1>
      <p className="text-lg text-gray-600">{brand.tagline.de}</p>
      <p className="rounded bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
        Foundation Phase 1 · Skelett · {new Date().toISOString().slice(0, 10)}
      </p>
      <footer className="mt-12">
        <VersionBadge />
      </footer>
    </main>
  );
}
