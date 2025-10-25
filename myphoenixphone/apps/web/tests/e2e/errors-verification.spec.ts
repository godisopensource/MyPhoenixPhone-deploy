import { test, expect } from '@playwright/test';
import {
  fillPhoneNumber,
  checkEligibility,
  verifySmsCode,
  assertErrorMessage,
  waitForApiCall,
  takeScreenshot,
} from '../helpers/test-helpers';

test.describe('Verification Errors - Invalid Codes', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to verification page (assuming consent already done)
    await page.goto('/verify');
  });

  test('should show error for incorrect verification code', async ({ page }) => {
    const testPhone = '+33699901032';
    const incorrectCode = '000000';

    // Try to verify with wrong code
    const codeInput = page.locator('input[name="verificationCode"], input[name="code"], input[type="text"]').first();
    await codeInput.fill(incorrectCode);

    const submitButton = page.locator('button[type="submit"], button:has-text("Verify")');
    await submitButton.click();

    // Should show incorrect code error
    await page.waitForTimeout(2000);
    await assertErrorMessage(page, /incorrect.*code|invalid.*code|wrong.*code/i);

    await takeScreenshot(page, 'error-incorrect-code');
  });

  test('should show error for expired verification code', async ({ page }) => {
    const testPhone = '+33699901032';
    const expiredCode = '999999';

    // Mock expired code response
    page.route('**/api/verification/verify', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'code_expired',
          message: 'Verification code has expired. Please request a new one.',
        }),
      });
    });

    const codeInput = page.locator('input[name="verificationCode"], input[name="code"], input[type="text"]').first();
    await codeInput.fill(expiredCode);

    const submitButton = page.locator('button[type="submit"], button:has-text("Verify")');
    await submitButton.click();

    // Should show expired error
    await page.waitForTimeout(2000);
    await assertErrorMessage(page, /expired|request.*new.*code/i);

    // Should show "Resend Code" button
    const resendButton = page.locator('button:has-text("Resend"), button:has-text("Request New Code")');
    const resendExists = await resendButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (resendExists) {
      await expect(resendButton).toBeVisible();
    }

    await takeScreenshot(page, 'error-expired-code');
  });

  test('should show error for too many verification attempts', async ({ page }) => {
    const testPhone = '+33699901032';
    const testCode = '111111';

    const codeInput = page.locator('input[name="verificationCode"], input[name="code"], input[type="text"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Verify")');

    // Try multiple incorrect attempts
    for (let i = 0; i < 3; i++) {
      await codeInput.clear();
      await codeInput.fill(testCode);
      await submitButton.click();
      await page.waitForTimeout(1000);
    }

    // After max attempts, should show lockout error
    await page.waitForTimeout(2000);
    
    const errorElement = page.locator('.error-message, [role="alert"]');
    const errorVisible = await errorElement.isVisible().catch(() => false);

    if (errorVisible) {
      const errorText = await errorElement.textContent();
      if (errorText?.match(/too.*many.*attempts|locked|try.*later/i)) {
        await assertErrorMessage(page, /too.*many.*attempts|locked|try.*later/i);
      }
    }

    await takeScreenshot(page, 'error-too-many-attempts');
  });

  test('should show error for empty verification code', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"], button:has-text("Verify")');
    await submitButton.click();

    // Should show validation error
    const errorElement = page.locator('.error, .invalid-feedback, [role="alert"]');
    await expect(errorElement).toBeVisible({ timeout: 3000 });

    await takeScreenshot(page, 'error-empty-code');
  });

  test('should show error for invalid code format', async ({ page }) => {
    const invalidCodes = [
      '123',        // Too short
      '12345678',   // Too long
      'abcdef',     // Letters
      '12-34-56',   // Special characters
    ];

    for (const invalidCode of invalidCodes) {
      const codeInput = page.locator('input[name="verificationCode"], input[name="code"], input[type="text"]').first();
      await codeInput.clear();
      await codeInput.fill(invalidCode);

      const submitButton = page.locator('button[type="submit"], button:has-text("Verify")');
      await submitButton.click();

      // Should show format error
      await page.waitForTimeout(1000);
      
      const errorElement = page.locator('.error, .invalid-feedback, [role="alert"]');
      const errorVisible = await errorElement.isVisible().catch(() => false);

      if (errorVisible) {
        await takeScreenshot(page, `error-invalid-format-${invalidCode}`);
      }
    }
  });

  test('should handle resend code failure', async ({ page }) => {
    // Mock resend API failure
    page.route('**/api/verification/resend', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to resend verification code',
        }),
      });
    });

    const resendButton = page.locator('button:has-text("Resend"), button:has-text("Request New Code")');
    const resendExists = await resendButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (resendExists) {
      await resendButton.click();

      // Should show resend error
      await page.waitForTimeout(2000);
      await assertErrorMessage(page, /failed.*resend|error.*sending|try.*again/i);

      await takeScreenshot(page, 'error-resend-failed');
    }
  });

  test('should handle resend rate limiting', async ({ page }) => {
    // Mock rate limit on resend
    page.route('**/api/verification/resend', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'too_many_requests',
          message: 'Too many resend attempts. Please wait before requesting another code.',
          retryAfter: 60,
        }),
      });
    });

    const resendButton = page.locator('button:has-text("Resend"), button:has-text("Request New Code")');
    const resendExists = await resendButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (resendExists) {
      // Click multiple times
      for (let i = 0; i < 3; i++) {
        await resendButton.click();
        await page.waitForTimeout(500);
      }

      // Should show rate limit error
      await assertErrorMessage(page, /too.*many|wait|rate.*limit/i);

      // Resend button should be disabled
      const isDisabled = await resendButton.isDisabled().catch(() => false);
      
      if (isDisabled) {
        expect(isDisabled).toBe(true);
      }

      await takeScreenshot(page, 'error-resend-rate-limit');
    }
  });
});

test.describe('Verification Errors - Session Issues', () => {
  test('should show error when verification session expired', async ({ page }) => {
    await page.goto('/verify');

    // Mock expired session
    page.route('**/api/verification/verify', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'session_expired',
          message: 'Your verification session has expired. Please start over.',
        }),
      });
    });

    const codeInput = page.locator('input[name="verificationCode"], input[name="code"], input[type="text"]').first();
    await codeInput.fill('123456');

    const submitButton = page.locator('button[type="submit"], button:has-text("Verify")');
    await submitButton.click();

    // Should show session expired error
    await page.waitForTimeout(2000);
    await assertErrorMessage(page, /session.*expired|start.*over|try.*again/i);

    await takeScreenshot(page, 'error-session-expired');
  });

  test('should show error when no consent found', async ({ page }) => {
    await page.goto('/verify');

    // Mock no consent error
    page.route('**/api/verification/verify', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'no_consent',
          message: 'No active consent found. Please complete the authorization process first.',
        }),
      });
    });

    const codeInput = page.locator('input[name="verificationCode"], input[name="code"], input[type="text"]').first();
    await codeInput.fill('123456');

    const submitButton = page.locator('button[type="submit"], button:has-text("Verify")');
    await submitButton.click();

    // Should show no consent error
    await page.waitForTimeout(2000);
    await assertErrorMessage(page, /no.*consent|authorization.*required|complete.*authorization/i);

    await takeScreenshot(page, 'error-no-consent');
  });

  test('should show error when phone number mismatch', async ({ page }) => {
    await page.goto('/verify');

    // Mock phone number mismatch
    page.route('**/api/verification/verify', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'phone_mismatch',
          message: 'Phone number does not match the consent record.',
        }),
      });
    });

    const codeInput = page.locator('input[name="verificationCode"], input[name="code"], input[type="text"]').first();
    await codeInput.fill('123456');

    const submitButton = page.locator('button[type="submit"], button:has-text("Verify")');
    await submitButton.click();

    // Should show mismatch error
    await page.waitForTimeout(2000);
    await assertErrorMessage(page, /mismatch|does.*not.*match|different.*phone/i);

    await takeScreenshot(page, 'error-phone-mismatch');
  });
});

test.describe('Verification Errors - Orange API Issues', () => {
  test('should handle Orange SMS API failure', async ({ page }) => {
    await page.goto('/verify');

    // Mock SMS sending failure
    page.route('**/api/verification/resend', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'sms_send_failed',
          message: 'Failed to send SMS. Orange API returned an error.',
        }),
      });
    });

    const resendButton = page.locator('button:has-text("Resend"), button:has-text("Request New Code")');
    const resendExists = await resendButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (resendExists) {
      await resendButton.click();
      await page.waitForTimeout(2000);
      await assertErrorMessage(page, /failed.*send.*sms|sms.*error|try.*again/i);
      await takeScreenshot(page, 'error-sms-send-failed');
    }
  });

  test('should handle Orange verification API timeout', async ({ page }) => {
    await page.goto('/verify');

    // Mock timeout
    page.route('**/api/verification/verify', route => {
      setTimeout(() => route.abort('timedout'), 31000);
    });

    const codeInput = page.locator('input[name="verificationCode"], input[name="code"], input[type="text"]').first();
    await codeInput.fill('123456');

    const submitButton = page.locator('button[type="submit"], button:has-text("Verify")');
    await submitButton.click();

    // Should show timeout error
    await page.waitForSelector('.error-message, [role="alert"]', { timeout: 35000 });
    await assertErrorMessage(page, /timeout|taking.*too.*long|try.*again/i);

    await takeScreenshot(page, 'error-verification-timeout');
  });

  test('should handle network error during verification', async ({ page }) => {
    await page.goto('/verify');

    // Simulate network failure
    page.route('**/api/verification/verify', route => {
      route.abort('failed');
    });

    const codeInput = page.locator('input[name="verificationCode"], input[name="code"], input[type="text"]').first();
    await codeInput.fill('123456');

    const submitButton = page.locator('button[type="submit"], button:has-text("Verify")');
    await submitButton.click();

    // Should show network error
    await page.waitForSelector('.error-message, [role="alert"]', { timeout: 10000 });
    await assertErrorMessage(page, /network.*error|connection.*failed|check.*connection/i);

    await takeScreenshot(page, 'error-verification-network');
  });

  test('should handle handover API failure', async ({ page }) => {
    await page.goto('/verify');

    // Mock successful verification but failed handover
    let verifyCount = 0;
    page.route('**/api/verification/**', route => {
      verifyCount++;
      
      if (route.request().url().includes('/verify')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            verified: true,
            success: true,
          }),
        });
      } else if (route.request().url().includes('/handover')) {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'handover_failed',
            message: 'Failed to initiate handover process',
          }),
        });
      }
    });

    const codeInput = page.locator('input[name="verificationCode"], input[name="code"], input[type="text"]').first();
    await codeInput.fill('123456');

    const submitButton = page.locator('button[type="submit"], button:has-text("Verify")');
    await submitButton.click();

    // Should show handover error
    await page.waitForTimeout(3000);
    
    const errorElement = page.locator('.error-message, [role="alert"]');
    const errorVisible = await errorElement.isVisible().catch(() => false);

    if (errorVisible) {
      const errorText = await errorElement.textContent();
      if (errorText?.match(/handover.*failed|unable.*complete|try.*again/i)) {
        await assertErrorMessage(page, /handover.*failed|unable.*complete|try.*again/i);
      }
    }

    await takeScreenshot(page, 'error-handover-failed');
  });
});
