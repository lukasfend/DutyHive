import { expect, test } from '@playwright/test';

const MAILPIT_BASE = 'http://localhost:8025';

/**
 * End-to-end newsletter signup flow.
 *
 * 1. Submit the form on the marketing landing.
 * 2. Confirm a mail lands in Mailpit.
 * 3. Pull the confirmation URL from the mail body and visit it.
 * 4. Assert the success page renders.
 */
test('newsletter double-opt-in lands in Mailpit and confirms', async ({ page, request }) => {
  const email = `e2e-${Date.now()}@example.com`;

  // Submit the form.
  await page.goto('http://lvh.me:3000/');
  await page.getByLabel('Email-Adresse').fill(email);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page.getByText('Fast geschafft')).toBeVisible();

  // Find the matching mail in Mailpit. Search by recipient.
  const search = await request.get(
    `${MAILPIT_BASE}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
  );
  expect(search.ok()).toBeTruthy();
  const searchJson = (await search.json()) as { messages: Array<{ ID: string }> };
  expect(searchJson.messages.length).toBeGreaterThan(0);
  const messageId = searchJson.messages[0]!.ID;

  // Pull the body and extract the confirmation URL.
  const body = await request.get(`${MAILPIT_BASE}/api/v1/message/${messageId}`);
  const bodyJson = (await body.json()) as { HTML: string };
  const match = bodyJson.HTML.match(/https?:\/\/[^"']+\/api\/subscribe\/confirm\?token=[a-f0-9]+/);
  expect(match, 'confirm URL present in mail body').toBeTruthy();
  const confirmUrl = match![0]!;

  // Visit the confirm URL — Next will redirect to /newsletter/confirmed.
  await page.goto(confirmUrl);
  await expect(page.getByText('Anmeldung bestätigt')).toBeVisible();
});
