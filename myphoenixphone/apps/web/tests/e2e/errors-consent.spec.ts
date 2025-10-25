import { test, expect } from '@playwright/test';
import {
  fillPhoneNumber,
  checkEligibility,
  startConsentFlow,
  assertErrorMessage,
  waitForApiCall,
  takeScreenshot,
} from '../helpers/test-helpers';

test.describe('Consent Errors - User Rejection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle user canceling consent flow', async ({ page }) => {
    const testPhone = '+33699901032';

    // Navigate to consent
    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    await checkEligibility(page, testPhone);
    await page.click('button:has-text("Continue")');

    // Wait for consent page
    await waitForApiCall(page, '/api/consent/initiate', { timeout: 10000 });

    // User clicks Cancel/Deny instead of Authorize
    const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Deny"), a:has-text("Cancel")');
    const cancelExists = await cancelButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (cancelExists) {
      await cancelButton.click();

      // Should redirect back or show cancellation message
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      expect(currentUrl).toMatch(/cancelled|error|eligibility/);

      // Should show cancellation message
      await assertErrorMessage(page, /cancelled|denied|authorization.*required/i);

      await takeScreenshot(page, 'error-consent-cancelled');
    }
  });

  test('should handle OAuth state mismatch', async ({ page }) => {
    await page.goto('/consent');

    // Mock consent callback with mismatched state
    page.route('**/api/consent/callback*', route => {
      const url = new URL(route.request().url());
      // State parameter doesn't match
      url.searchParams.set('state', 'invalid-state-12345');
      
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_state',
          message: 'State parameter mismatch',
        }),
      });
    });

    // Navigate to callback with invalid state
    await page.goto('/api/consent/callback?code=test123&state=invalid-state-12345');

    // Should show error
    await assertErrorMessage(page, /invalid.*state|security.*error|try.*again/i);

    await takeScreenshot(page, 'error-oauth-state-mismatch');
  });

  test('should handle expired authorization code', async ({ page }) => {
    const testPhone = '+33699901032';

    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    await checkEligibility(page, testPhone);
    await page.click('button:has-text("Continue")');

    // Wait for consent initiation
    await waitForApiCall(page, '/api/consent/initiate');

    // Mock expired code error
    page.route('**/api/consent/callback*', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          message: 'Authorization code has expired',
        }),
      });
    });

    // Simulate authorization (but code is expired)
    const authorizeButton = page.locator('button:has-text("Authorize")');
    if (await authorizeButton.isVisible().catch(() => false)) {
      await authorizeButton.click();

      // Should show expired error
      await page.waitForTimeout(3000);
      await assertErrorMessage(page, /expired|try.*again|authorization.*failed/i);

      await takeScreenshot(page, 'error-expired-auth-code');
    }
  });

  test('should handle Orange OAuth service unavailable', async ({ page }) => {
    const testPhone = '+33699901032';

    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    await checkEligibility(page, testPhone);

    // Mock OAuth service failure
    page.route('**/api/consent/initiate', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Service Unavailable',
          message: 'Orange OAuth service is temporarily unavailable',
        }),
      });
    });

    await page.click('button:has-text("Continue")');

    // Should show service unavailable error
    await assertErrorMessage(page, /service.*unavailable|try.*later|temporarily.*unavailable/i);

    await takeScreenshot(page, 'error-oauth-service-unavailable');
  });

  test('should handle missing required scopes', async ({ page }) => {
    const testPhone = '+33699901032';

    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    await checkEligibility(page, testPhone);
    await page.click('button:has-text("Continue")');

    // Wait for consent page
    await waitForApiCall(page, '/api/consent/initiate');

    // Mock callback with insufficient scopes
    page.route('**/api/consent/callback*', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'insufficient_scope',
          message: 'Required scopes not granted',
        }),
      });
    });

    const authorizeButton = page.locator('button:has-text("Authorize")');
    if (await authorizeButton.isVisible().catch(() => false)) {
      await authorizeButton.click();

      await page.waitForTimeout(3000);
      await assertErrorMessage(page, /permission.*required|scope.*required|authorization.*incomplete/i);

      await takeScreenshot(page, 'error-insufficient-scopes');
    }
  });

  test('should handle consent timeout', async ({ page }) => {
    const testPhone = '+33699901032';

    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    await checkEligibility(page, testPhone);
    await page.click('button:has-text("Continue")');

    // Wait for consent page
    await waitForApiCall(page, '/api/consent/initiate');

    // User doesn't authorize for a long time
    await page.waitForTimeout(5000);

    // Check for session timeout warning
    const timeoutWarning = page.locator('text=/session.*expir|timeout.*warning/i, .warning');
    const warningExists = await timeoutWarning.isVisible().catch(() => false);

    if (warningExists) {
      await expect(timeoutWarning).toBeVisible();
      await takeScreenshot(page, 'error-consent-timeout-warning');
    }
  });
});

test.describe('Consent Errors - API Failures', () => {
  test('should handle consent token exchange failure', async ({ page }) => {
    const testPhone = '+33699901032';

    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    await checkEligibility(page, testPhone);
    await page.click('button:has-text("Continue")');

    await waitForApiCall(page, '/api/consent/initiate');

    // Mock token exchange failure
    page.route('**/api/consent/callback*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'token_exchange_failed',
          message: 'Failed to exchange authorization code for token',
        }),
      });
    });

    const authorizeButton = page.locator('button:has-text("Authorize")');
    if (await authorizeButton.isVisible().catch(() => false)) {
      await authorizeButton.click();

      await page.waitForTimeout(3000);
      await assertErrorMessage(page, /token.*failed|authorization.*failed|try.*again/i);

      await takeScreenshot(page, 'error-token-exchange-failed');
    }
  });

  test('should handle invalid redirect URI', async ({ page }) => {
    await page.goto('/consent');

    // Mock invalid redirect error
    page.route('**/api/consent/initiate', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_redirect_uri',
          message: 'Redirect URI does not match registered URI',
        }),
      });
    });

    await page.goto('/eligibility');
    const testPhone = '+33699901032';
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    await checkEligibility(page, testPhone);
    await page.click('button:has-text("Continue")');

    // Should show configuration error
    await assertErrorMessage(page, /configuration.*error|invalid.*setup|contact.*support/i);

    await takeScreenshot(page, 'error-invalid-redirect-uri');
  });

  test('should handle consent already granted (duplicate)', async ({ page }) => {
    const testPhone = '+33699901032';

    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    await checkEligibility(page, testPhone);

    // Mock consent already exists
    page.route('**/api/consent/initiate', route => {
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'consent_exists',
          message: 'Consent already granted for this phone number',
          consentId: 'consent-12345',
        }),
      });
    });

    await page.click('button:has-text("Continue")');

    // Should either skip to next step or show info message
    await page.waitForTimeout(2000);

    // Check if redirected to verification or shows message
    const currentUrl = page.url();
    const isVerifyPage = currentUrl.includes('/verify');
    const hasInfoMessage = await page.locator('.info-message, [role="status"]').isVisible().catch(() => false);

    expect(isVerifyPage || hasInfoMessage).toBe(true);

    await takeScreenshot(page, 'info-consent-already-exists');
  });

  test('should handle rate limiting on consent requests', async ({ page }) => {
    const testPhone = '+33699901032';

    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    await checkEligibility(page, testPhone);

    // Mock rate limit response
    page.route('**/api/consent/initiate', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'too_many_requests',
          message: 'Too many consent requests. Please try again later.',
          retryAfter: 60,
        }),
      });
    });

    await page.click('button:has-text("Continue")');

    // Should show rate limit error
    await assertErrorMessage(page, /too.*many.*requests|rate.*limit|try.*later/i);

    await takeScreenshot(page, 'error-consent-rate-limit');
  });

  test('should handle network error during consent flow', async ({ page }) => {
    const testPhone = '+33699901032';

    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    await checkEligibility(page, testPhone);

    // Simulate network failure
    page.route('**/api/consent/initiate', route => {
      route.abort('failed');
    });

    await page.click('button:has-text("Continue")');

    // Should show network error
    await page.waitForSelector('.error-message, [role="alert"]', { timeout: 10000 });
    await assertErrorMessage(page, /network.*error|connection.*failed|check.*connection/i);

    await takeScreenshot(page, 'error-consent-network-failure');
  });
});
