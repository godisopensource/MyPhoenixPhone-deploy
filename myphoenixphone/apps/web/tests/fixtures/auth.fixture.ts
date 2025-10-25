import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Custom fixtures for E2E tests
 * 
 * These fixtures provide pre-configured test states like authenticated users,
 * valid consents, and test data.
 */

type TestFixtures = {
  authenticatedPage: Page;
  consentedPage: Page;
};

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  /**
   * Page with authenticated session
   * 
   * Usage:
   * test('my test', async ({ authenticatedPage }) => {
   *   await authenticatedPage.goto('/dashboard');
   * });
   */
  authenticatedPage: async ({ page }, use) => {
    // Set up authentication cookie/session
    await page.context().addCookies([
      {
        name: 'connect.sid',
        value: 's%3Atest-session-id.test-signature',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
    
    await use(page);
  },

  /**
   * Page with valid user consent
   * 
   * This fixture sets up a page with both authentication and a valid
   * OIDC consent token from Orange.
   * 
   * Usage:
   * test('my test', async ({ consentedPage }) => {
   *   await consentedPage.goto('/eligibility');
   * });
   */
  consentedPage: async ({ page }, use) => {
    // Set up authentication
    await page.context().addCookies([
      {
        name: 'connect.sid',
        value: 's%3Atest-session-id-with-consent.test-signature',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    // Optionally navigate to consent flow and complete it
    // This is a placeholder - actual implementation would depend on your consent flow
    // await page.goto('/consents/start');
    // await page.fill('[name="phoneNumber"]', '+33612345678');
    // await page.click('button[type="submit"]');
    // Wait for redirect back from OAuth provider
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
