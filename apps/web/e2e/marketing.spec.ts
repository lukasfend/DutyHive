import { expect, test } from '@playwright/test';

test.describe('marketing landing', () => {
  test('renders the hero copy from the DE i18n catalogue', async ({ page }) => {
    await page.goto('http://lvh.me:3000/');
    await expect(page.getByRole('heading', { name: 'DutyHive', level: 1 })).toBeVisible();
    await expect(page.getByText('Werkzeuge für Schichtarbeit')).toBeVisible();
  });

  test('renders the three product preview cards', async ({ page }) => {
    await page.goto('http://lvh.me:3000/');
    await expect(page.getByRole('heading', { name: 'Planner', level: 3 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Business', level: 3 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Checklists', level: 3 })).toBeVisible();
  });

  test('newsletter form is present and labelled', async ({ page }) => {
    await page.goto('http://lvh.me:3000/');
    await expect(page.getByLabel('Email-Adresse')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible();
  });

  test('cookie banner does NOT render in Foundation', async ({ page }) => {
    /*
     * Foundation policy: only essential cookies. Banner stays hidden until
     * Phase 5+ flips the prop in the marketing layout. This test pins that
     * decision — if someone removes the `disabled` prop, this test fails
     * and forces a deliberate review.
     */
    await page.goto('http://lvh.me:3000/');
    await expect(page.getByRole('dialog', { name: 'Cookies' })).not.toBeVisible();
  });
});
