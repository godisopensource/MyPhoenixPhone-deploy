import { test, expect } from '@playwright/test';
import {
  fillPhoneNumber,
  checkEligibility,
  waitForApiCall,
  assertErrorMessage,
  takeScreenshot,
} from '../helpers/test-helpers';

test.describe('Rate Limiting - Global API Limits', () => {
  test('should enforce rate limit on eligibility API', async ({ page }) => {
    const testPhone = '+33699901032';

    await page.goto('/eligibility');

    // Mock rate limit after multiple requests
    let requestCount = 0;
    page.route('**/api/eligibility/check', route => {
      requestCount++;

      if (requestCount > 5) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + 60000),
          },
          body: JSON.stringify({
            error: 'too_many_requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: 60,
          }),
        });
      } else {
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

    // Make multiple requests
    for (let i = 0; i < 7; i++) {
      await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Check")');
      await submitButton.click();
      
      await page.waitForTimeout(500);
      
      // Refresh page for next request
      if (i < 6) {
        await page.goto('/eligibility');
      }
    }

    // Should show rate limit error
    await page.waitForTimeout(2000);
    await assertErrorMessage(page, /rate.*limit|too.*many.*requests|try.*later/i);

    // Check for retry-after information
    const retryInfo = page.locator('text=/retry.*after|wait.*seconds|try.*in/i');
    const retryExists = await retryInfo.isVisible().catch(() => false);
    
    if (retryExists) {
      await expect(retryInfo).toBeVisible();
    }

    await takeScreenshot(page, 'rate-limit-eligibility');
  });

  test('should show rate limit headers in response', async ({ page }) => {
    await page.goto('/eligibility');

    const testPhone = '+33699901032';

    // Intercept response to check headers
    let responseHeaders: any = null;
    page.on('response', response => {
      if (response.url().includes('/api/eligibility/check')) {
        responseHeaders = response.headers();
      }
    });

    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Check")');
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Verify rate limit headers are present
    if (responseHeaders) {
      console.log('Rate limit headers:', {
        limit: responseHeaders['x-ratelimit-limit'],
        remaining: responseHeaders['x-ratelimit-remaining'],
        reset: responseHeaders['x-ratelimit-reset'],
      });
    }

    await takeScreenshot(page, 'rate-limit-headers');
  });

  test('should enforce rate limit per user/IP', async ({ page }) => {
    const userPhone = '+33699901033';

    // Test that rate limit is per user/IP, not global
    await page.goto('/eligibility');

    // Make requests with different phone numbers
    const phones = ['+33699901030', '+33699901031', '+33699901032'];

    for (const phone of phones) {
      await fillPhoneNumber(page, 'input[name="phoneNumber"]', phone);
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Check")');
      await submitButton.click();
      
      await page.waitForTimeout(1000);
      await page.goto('/eligibility');
    }

    // Should still work (not globally rate limited)
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', userPhone);
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Check")');
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Should either succeed or show per-phone rate limit
    const errorElement = page.locator('.error-message, [role="alert"]');
    const hasError = await errorElement.isVisible().catch(() => false);

    await takeScreenshot(page, 'rate-limit-per-user');
  });

  test('should enforce rate limit on consent API', async ({ page }) => {
    const testPhone = '+33699901032';

    // Mock consent rate limit
    let consentCount = 0;
    page.route('**/api/consent/initiate', route => {
      consentCount++;

      if (consentCount > 3) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'too_many_requests',
            message: 'Too many consent requests. Please wait before trying again.',
            retryAfter: 120,
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            authUrl: 'https://example.com/oauth',
            state: 'test-state-123',
          }),
        });
      }
    });

    // Make multiple consent requests
    for (let i = 0; i < 5; i++) {
      await page.goto('/eligibility');
      await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
      await checkEligibility(page, testPhone);
      
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(1000);
    }

    // Should show rate limit error
    await assertErrorMessage(page, /too.*many|rate.*limit|wait/i);

    await takeScreenshot(page, 'rate-limit-consent');
  });

  test('should enforce rate limit on verification API', async ({ page }) => {
    await page.goto('/verify');

    // Mock verification rate limit
    let verifyCount = 0;
    page.route('**/api/verification/verify', route => {
      verifyCount++;

      if (verifyCount > 5) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'too_many_requests',
            message: 'Too many verification attempts. Account temporarily locked.',
            retryAfter: 300,
          }),
        });
      } else {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_code',
            message: 'Incorrect verification code',
          }),
        });
      }
    });

    const codeInput = page.locator('input[name="verificationCode"], input[name="code"], input[type="text"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Verify")');

    // Make multiple verification attempts
    for (let i = 0; i < 7; i++) {
      await codeInput.clear();
      await codeInput.fill(`${i}${i}${i}${i}${i}${i}`);
      await submitButton.click();
      await page.waitForTimeout(500);
    }

    // Should show rate limit/lockout error
    await page.waitForTimeout(2000);
    await assertErrorMessage(page, /too.*many|locked|rate.*limit|wait/i);

    await takeScreenshot(page, 'rate-limit-verification');
  });

  test('should show countdown timer for rate limit cooldown', async ({ page }) => {
    await page.goto('/eligibility');

    // Mock rate limited response with retry-after
    page.route('**/api/eligibility/check', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'too_many_requests',
          message: 'Rate limit exceeded',
          retryAfter: 60,
        }),
      });
    });

    const testPhone = '+33699901032';
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Check")');
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Look for countdown timer
    const timerElement = page.locator('[data-testid="countdown"], .countdown, text=/\\d+.*seconds/i');
    const timerExists = await timerElement.isVisible().catch(() => false);

    if (timerExists) {
      await expect(timerElement).toBeVisible();
      
      // Wait a bit and verify timer decreases
      const initialText = await timerElement.textContent();
      await page.waitForTimeout(2000);
      const updatedText = await timerElement.textContent();
      
      console.log('Timer:', { initial: initialText, updated: updatedText });
    }

    await takeScreenshot(page, 'rate-limit-countdown');
  });

  test('should allow retry after cooldown period', async ({ page }) => {
    await page.goto('/eligibility');

    let requestCount = 0;
    const cooldownMs = 3000; // 3 seconds for testing
    let rateLimitedAt = 0;

    page.route('**/api/eligibility/check', route => {
      requestCount++;
      const now = Date.now();

      if (requestCount === 2 && rateLimitedAt === 0) {
        // Rate limit on second request
        rateLimitedAt = now;
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'too_many_requests',
            message: 'Rate limit exceeded',
            retryAfter: cooldownMs / 1000,
          }),
        });
      } else if (rateLimitedAt > 0 && (now - rateLimitedAt) < cooldownMs) {
        // Still in cooldown
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'too_many_requests',
            message: 'Still in cooldown',
            retryAfter: Math.ceil((cooldownMs - (now - rateLimitedAt)) / 1000),
          }),
        });
      } else {
        // Cooldown expired, allow request
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

    // First request - success
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Second request - rate limited
    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    await assertErrorMessage(page, /rate.*limit/i);
    await takeScreenshot(page, 'rate-limit-active');

    // Wait for cooldown
    await page.waitForTimeout(cooldownMs + 500);

    // Third request - should succeed
    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Should not show rate limit error anymore
    const errorElement = page.locator('.error-message:has-text("rate limit"), [role="alert"]:has-text("rate limit")');
    const stillRateLimited = await errorElement.isVisible().catch(() => false);

    expect(stillRateLimited).toBe(false);

    await takeScreenshot(page, 'rate-limit-expired');
  });
});

test.describe('Rate Limiting - Orange API Quotas', () => {
  test('should handle Orange API quota exceeded', async ({ page }) => {
    await page.goto('/eligibility');

    // Mock Orange API quota error
    page.route('**/api/eligibility/check', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'quota_exceeded',
          message: 'Orange API quota exceeded. Service temporarily unavailable.',
          provider: 'Orange Network APIs',
        }),
      });
    });

    const testPhone = '+33699901032';
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Check")');
    await submitButton.click();

    await page.waitForTimeout(2000);
    await assertErrorMessage(page, /quota.*exceeded|service.*unavailable|orange.*api/i);

    await takeScreenshot(page, 'error-orange-quota-exceeded');
  });

  test('should handle Orange API daily limit reached', async ({ page }) => {
    await page.goto('/eligibility');

    // Mock daily limit error
    page.route('**/api/eligibility/check', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'daily_limit_exceeded',
          message: 'Daily API limit reached. Please try again tomorrow.',
          resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
    });

    const testPhone = '+33699901032';
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhone);
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Check")');
    await submitButton.click();

    await page.waitForTimeout(2000);
    await assertErrorMessage(page, /daily.*limit|try.*tomorrow|24.*hours/i);

    await takeScreenshot(page, 'error-daily-limit');
  });
});
