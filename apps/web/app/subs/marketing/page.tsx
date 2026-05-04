import { getTranslations } from 'next-intl/server';
import { brand } from '@dutyhive/config';
import { Card, CardDescription, CardHeader, CardTitle } from '@dutyhive/ui';
import { VersionBadge } from '../../../components/version-badge';

/**
 * Marketing landing page (apex `dutyhive.com`).
 *
 * Phase 3 wires next-intl: copy comes from @dutyhive/i18n message catalogues
 * (DE primary, EN stubbed for future translators). Phase 4 layers in the
 * newsletter form and the cookie banner.
 */
export default async function MarketingHomePage() {
  const t = await getTranslations('marketing');
  const tProducts = await getTranslations('marketing.products');

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="flex flex-col items-center gap-4 text-center">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-900">
          {t('preAlphaBadge')}
        </span>
        <h1 className="text-5xl font-bold tracking-tight">{brand.name}</h1>
        <p className="max-w-2xl text-lg text-[color:var(--color-muted)]">{t('tagline')}</p>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{tProducts('planner.title')}</CardTitle>
            <CardDescription>{tProducts('planner.description')}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tProducts('business.title')}</CardTitle>
            <CardDescription>{tProducts('business.description')}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tProducts('checklist.title')}</CardTitle>
            <CardDescription>{tProducts('checklist.description')}</CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="mt-16 flex justify-center">
        <VersionBadge />
      </section>
    </main>
  );
}
