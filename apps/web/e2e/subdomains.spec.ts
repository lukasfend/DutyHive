import { expect, test } from '@playwright/test';

const subdomains = [
  { host: 'lvh.me:3000', expectText: 'Werkzeuge für Schichtarbeit', label: 'marketing' },
  { host: 'app.lvh.me:3000', expectText: 'Konto-Zentrale', label: 'account' },
  { host: 'planner.lvh.me:3000', expectText: 'Planner — demnächst', label: 'planner' },
  { host: 'business.lvh.me:3000', expectText: 'Business — demnächst', label: 'business' },
  { host: 'checklist.lvh.me:3000', expectText: 'Checklists — demnächst', label: 'checklist' },
];

test.describe('subdomain proxy routing', () => {
  for (const sub of subdomains) {
    test(`${sub.label} subdomain renders its own page`, async ({ page }) => {
      await page.goto(`http://${sub.host}/`);
      await expect(page.getByText(sub.expectText)).toBeVisible();
    });
  }

  test('direct external request to /subs/* returns 404', async ({ request }) => {
    /*
     * The proxy rewrites /foo → /subs/<sub>/foo internally. A request that
     * hits /subs/marketing directly must be rejected — otherwise the
     * subdomain-bypass attack works.
     */
    const response = await request.get('http://lvh.me:3000/subs/marketing');
    expect(response.status()).toBe(404);
  });
});
