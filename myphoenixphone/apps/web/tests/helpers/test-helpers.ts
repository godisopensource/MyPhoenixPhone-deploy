import { Page, expect } from '@playwright/test';

/**
 * Helper functions for E2E tests
 * 
 * These helpers encapsulate common interactions and assertions
 * to keep tests DRY and maintainable.
 */

/**
 * Wait for API call to complete
 */
export async function waitForApiCall(
  page: Page,
  urlPattern: string | RegExp,
  options?: { timeout?: number }
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: options?.timeout || 5000 }
  );
}

/**
 * Fill phone number input with proper formatting
 */
export async function fillPhoneNumber(
  page: Page,
  selector: string,
  phoneNumber: string
): Promise<void> {
  await page.fill(selector, phoneNumber);
  await expect(page.locator(selector)).toHaveValue(phoneNumber);
}

/**
 * Start consent flow
 */
export async function startConsentFlow(
  page: Page,
  phoneNumber: string
): Promise<void> {
  await page.goto('/consents/start');
  await fillPhoneNumber(page, '[name="phoneNumber"]', phoneNumber);
  await page.click('button[type="submit"]');
  
  // Wait for redirect to OAuth provider or callback
  await page.waitForURL(/oauth|callback/, { timeout: 10000 });
}

/**
 * Complete eligibility check
 */
export async function checkEligibility(
  page: Page,
  phoneNumber: string
): Promise<{ eligible: boolean; reasons: string[] }> {
  await page.goto('/eligibility');
  await fillPhoneNumber(page, '[name="phoneNumber"]', phoneNumber);
  await page.click('button[type="submit"]');
  
  // Wait for results
  await page.waitForSelector('[data-testid="eligibility-result"]', {
    timeout: 10000,
  });
  
  // Extract eligibility data
  const eligible = await page.locator('[data-testid="eligible-status"]').isVisible();
  const reasonElements = await page.locator('[data-testid="eligibility-reason"]').all();
  const reasons = await Promise.all(
    reasonElements.map((el) => el.textContent())
  ).then((texts) => texts.filter((t): t is string => t !== null));
  
  return { eligible, reasons };
}

/**
 * Send and verify SMS code
 */
export async function verifySmsCode(
  page: Page,
  phoneNumber: string,
  code: string
): Promise<boolean> {
  await page.goto('/verify');
  await fillPhoneNumber(page, '[name="phoneNumber"]', phoneNumber);
  await page.click('button[data-testid="send-code"]');
  
  // Wait for code input to appear
  await page.waitForSelector('[name="code"]', { timeout: 5000 });
  
  // Fill and submit code
  await page.fill('[name="code"]', code);
  await page.click('button[data-testid="verify-code"]');
  
  // Check result
  const successMessage = page.locator('[data-testid="verification-success"]');
  const errorMessage = page.locator('[data-testid="verification-error"]');
  
  try {
    await successMessage.waitFor({ timeout: 3000 });
    return true;
  } catch {
    await errorMessage.waitFor({ timeout: 1000 });
    return false;
  }
}

/**
 * Navigate to workers dashboard
 */
export async function navigateToWorkersDashboard(page: Page): Promise<void> {
  await page.goto('/workers');
  await expect(page).toHaveTitle(/workers|dashboard/i);
}

/**
 * Trigger daily refresh job
 */
export async function triggerDailyRefresh(page: Page): Promise<void> {
  await navigateToWorkersDashboard(page);
  await page.click('button[data-testid="trigger-daily-refresh"]');
  
  // Wait for confirmation
  await page.waitForSelector('[data-testid="refresh-started"]', {
    timeout: 3000,
  });
}

/**
 * Check feature flag variant
 */
export async function getFeatureFlagVariant(
  page: Page,
  flagKey: string,
  userId: string
): Promise<string> {
  const response = await page.request.get(
    `/api/feature-flags/${flagKey}/variant/${userId}`
  );
  
  expect(response.ok()).toBeTruthy();
  
  const data = await response.json();
  return data.variant;
}

/**
 * Assert error message is displayed
 */
export async function assertErrorMessage(
  page: Page,
  expectedMessage: string | RegExp
): Promise<void> {
  const errorElement = page.locator('[role="alert"], [data-testid="error-message"]');
  await expect(errorElement).toBeVisible();
  
  if (typeof expectedMessage === 'string') {
    await expect(errorElement).toContainText(expectedMessage);
  } else {
    const text = await errorElement.textContent();
    expect(text).toMatch(expectedMessage);
  }
}

/**
 * Clear all cookies and local storage
 */
export async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  await page.screenshot({
    path: `screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(
  page: Page,
  options?: { timeout?: number; idleTime?: number }
): Promise<void> {
  await page.waitForLoadState('networkidle', {
    timeout: options?.timeout || 30000,
  });
}
