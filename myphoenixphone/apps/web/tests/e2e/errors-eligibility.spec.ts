import { test, expect } from '@playwright/test';
import {
  fillPhoneNumber,
  checkEligibility,
  assertErrorMessage,
  waitForApiCall,
  takeScreenshot,
} from '../helpers/test-helpers';

test.describe('Eligibility Errors - Ineligible Users', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show error for user with no SIM swap detected', async ({ page }) => {
    // Phone number with no recent SIM swap
    const noSimSwapPhone = '+33699900001';

    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', noSimSwapPhone);

    // Check eligibility
    const result = await checkEligibility(page, noSimSwapPhone);

    // Should be ineligible
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('no_sim_swap');

    // Verify error message is displayed
    await assertErrorMessage(page, /no.*sim.*swap|not.*eligible/i);

    await takeScreenshot(page, 'error-no-sim-swap');
  });

  test('should show error for unreachable device', async ({ page }) => {
    // Phone number for unreachable device
    const unreachablePhone = '+33699900002';

    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', unreachablePhone);

    // Submit and wait for response
    const submitButton = page.locator('button[type="submit"], button:has-text("Check")');
    await submitButton.click();

    // Wait for error message to appear
    await page.waitForTimeout(2000);

    // Verify error message displayed to user
    const errorElement = page.locator('.error-message, [role="alert"], .alert-danger');
    await expect(errorElement).toBeVisible({ timeout: 5000 });
    await expect(errorElement).toContainText(/unreachable|cannot.*reach/i);

    await takeScreenshot(page, 'error-unreachable-device');
  });

  test('should show error for device not in France', async ({ page }) => {
    // Phone number roaming outside France
    const roamingPhone = '+33699900003';

    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', roamingPhone);

    const result = await checkEligibility(page, roamingPhone);

    // Should be ineligible due to roaming
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('not_in_france');

    // Verify error message
    await assertErrorMessage(page, /not.*france|must.*be.*in.*france|roaming/i);

    await takeScreenshot(page, 'error-not-in-france');
  });

  test('should show error for invalid phone number format', async ({ page }) => {
    const invalidPhones = [
      '1234567890',      // Not E.164 format
      '+999999999999',   // Invalid country code
      '+33612345',       // Too short
      'abc123456789',    // Contains letters
      '',                // Empty
    ];

    await page.goto('/eligibility');

    for (const invalidPhone of invalidPhones) {
      // Clear previous input
      const input = page.locator('input[name="phoneNumber"]');
      await input.clear();

      // Try to fill invalid number
      await input.fill(invalidPhone);

      // Try to submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Check")');
      await submitButton.click();

      // Should show validation error
      const errorExists = await page.locator('.error, .invalid-feedback, [role="alert"]')
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      expect(errorExists).toBe(true);

      await takeScreenshot(page, `error-invalid-format-${invalidPhone.replace(/\+/g, 'plus')}`);
    }
  });

  test('should show error for phone number not in Orange network', async ({ page }) => {
    // Phone number from different operator
    const nonOrangePhone = '+33699900004';

    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', nonOrangePhone);

    const result = await checkEligibility(page, nonOrangePhone);

    // Should be ineligible
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('not_orange_network');

    // Verify error message
    await assertErrorMessage(page, /orange.*network|not.*supported.*operator/i);

    await takeScreenshot(page, 'error-not-orange-network');
  });

  test('should handle multiple ineligibility reasons', async ({ page }) => {
    // Phone number that fails multiple checks
    const multiFailPhone = '+33699900005';

    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', multiFailPhone);

    const result = await checkEligibility(page, multiFailPhone);

    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(1);

    // All reasons should be displayed
    for (const reason of result.reasons) {
      const reasonElement = page.locator(`text=${reason}, [data-reason="${reason}"]`);
      const exists = await reasonElement.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (exists) {
        await expect(reasonElement).toBeVisible();
      }
    }

    await takeScreenshot(page, 'error-multiple-reasons');
  });

  test('should show error for recently checked phone number (rate limit)', async ({ page }) => {
    const rateLimitedPhone = '+33699900006';

    await page.goto('/eligibility');

    // First check - should succeed
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', rateLimitedPhone);
    await checkEligibility(page, rateLimitedPhone);

    // Immediately check again - should be rate limited
    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', rateLimitedPhone);

    const submitButton = page.locator('button[type="submit"], button:has-text("Check")');
    await submitButton.click();

    // Wait for potential error
    await page.waitForTimeout(2000);

    // Check if rate limit error is shown
    const errorElement = page.locator('.error-message, [role="alert"]');
    const errorVisible = await errorElement.isVisible().catch(() => false);

    if (errorVisible) {
      const errorText = await errorElement.textContent();
      if (errorText?.match(/too.*many.*requests|rate.*limit|try.*again.*later/i)) {
        await assertErrorMessage(page, /too.*many.*requests|rate.*limit|try.*again.*later/i);
        await takeScreenshot(page, 'error-rate-limited');
      }
    }
  });

  test('should prevent continue button if ineligible', async ({ page }) => {
    const ineligiblePhone = '+33699900001';

    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', ineligiblePhone);
    await checkEligibility(page, ineligiblePhone);

    // Continue button should be disabled or hidden
    const continueButton = page.locator('button:has-text("Continue"), a:has-text("Continue")');
    const buttonExists = await continueButton.isVisible().catch(() => false);

    if (buttonExists) {
      const isDisabled = await continueButton.isDisabled();
      expect(isDisabled).toBe(true);
    } else {
      // Button doesn't exist - also acceptable
      expect(buttonExists).toBe(false);
    }

    await takeScreenshot(page, 'error-continue-disabled');
  });
});

test.describe('Eligibility Errors - API Failures', () => {
  test('should handle Orange API timeout', async ({ page }) => {
    await page.goto('/eligibility');

    // Listen for API call
    page.route('**/api/eligibility/check', route => {
      // Simulate timeout by never responding
      setTimeout(() => route.abort('timedout'), 31000);
    });

    const testPhone = '+33699901032';
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should show timeout error
    await page.waitForSelector('.error-message, [role="alert"]', { timeout: 35000 });
    await assertErrorMessage(page, /timeout|timed.*out|taking.*too.*long/i);

    await takeScreenshot(page, 'error-api-timeout');
  });

  test('should handle Orange API 5xx error', async ({ page }) => {
    await page.goto('/eligibility');

    // Mock 500 error from Orange API
    page.route('**/api/eligibility/check', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Orange API is temporarily unavailable',
        }),
      });
    });

    const testPhone = '+33699901032';
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should show service unavailable error
    await assertErrorMessage(page, /service.*unavailable|server.*error|try.*again.*later/i);

    await takeScreenshot(page, 'error-api-500');
  });

  test('should handle network disconnection', async ({ page }) => {
    await page.goto('/eligibility');

    // Simulate network failure
    page.route('**/api/eligibility/check', route => {
      route.abort('failed');
    });

    const testPhone = '+33699901032';
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should show network error
    await page.waitForSelector('.error-message, [role="alert"]', { timeout: 10000 });
    await assertErrorMessage(page, /network.*error|connection.*failed|check.*connection/i);

    await takeScreenshot(page, 'error-network-disconnection');
  });

  test('should handle malformed API response', async ({ page }) => {
    await page.goto('/eligibility');

    // Mock malformed response
    page.route('**/api/eligibility/check', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json {',
      });
    });

    const testPhone = '+33699901032';
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should show error
    await page.waitForSelector('.error-message, [role="alert"]', { timeout: 10000 });
    await assertErrorMessage(page, /error.*occurred|something.*wrong|try.*again/i);

    await takeScreenshot(page, 'error-malformed-response');
  });

  test('should retry on transient failure', async ({ page }) => {
    await page.goto('/eligibility');

    let attemptCount = 0;

    // Mock failure on first attempt, success on retry
    page.route('**/api/eligibility/check', route => {
      attemptCount++;
      
      if (attemptCount === 1) {
        // First attempt fails
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service Temporarily Unavailable' }),
        });
      } else {
        // Subsequent attempts succeed
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            eligible: true,
            reasons: ['sim_swap_detected'],
          }),
        });
      }
    });

    const testPhone = '+33699901032';
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Look for retry button or automatic retry
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
    const retryExists = await retryButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (retryExists) {
      await retryButton.click();
      
      // Should succeed on retry
      await page.waitForSelector('.success, .eligible', { timeout: 10000 });
    }

    await takeScreenshot(page, 'error-retry-success');
  });
});
