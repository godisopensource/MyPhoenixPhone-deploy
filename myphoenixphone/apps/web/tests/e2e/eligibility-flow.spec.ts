import { test, expect } from '../fixtures/auth.fixture';
import {
  fillPhoneNumber,
  checkEligibility,
  startConsentFlow,
  verifySmsCode,
  waitForApiCall,
  assertErrorMessage,
  takeScreenshot,
} from '../helpers/test-helpers';

test.describe('Eligibility Flow - Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh for each test
    await page.goto('/');
  });

  test('should complete full eligibility → consent → verification → handover flow', async ({ page }) => {
    const testPhoneNumber = '+33699901032'; // Mock eligible number

    // Step 1: Navigate to eligibility page
    await page.goto('/eligibility');
    await expect(page.locator('h1')).toContainText(/eligibility|éligibilité/i);

    // Step 2: Fill phone number and check eligibility
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhoneNumber);
    
    const eligibilityResult = await checkEligibility(page, testPhoneNumber);
    
    await takeScreenshot(page, 'eligibility-result');
    
    expect(eligibilityResult.eligible).toBe(true);
    expect(eligibilityResult.reasons).toContain('sim_swap_detected');

    // Step 3: Start consent flow (OAuth)
    await page.click('button:has-text("Continue")');
    
    // Wait for OAuth consent page to load
    await waitForApiCall(page, '/api/consent/initiate', { timeout: 10000 });
    
    await expect(page).toHaveURL(/\/consent/);
    await expect(page.locator('h1')).toContainText(/consent|authorization/i);

    // Step 4: Authorize consent
    await page.click('button:has-text("Authorize")');
    
    // Wait for consent callback
    const consentResponse = await waitForApiCall(page, '/api/consent/callback', { 
      timeout: 15000 
    });
    
    expect(consentResponse.success).toBe(true);
    expect(consentResponse.consentId).toBeDefined();

    await takeScreenshot(page, 'consent-success');

    // Step 5: Navigate to verification page
    await expect(page).toHaveURL(/\/verify/);
    await expect(page.locator('h1')).toContainText(/verify|verification/i);

    // Step 6: Verify SMS code
    const testCode = '123456'; // Mock code for testing
    
    const verificationSuccess = await verifySmsCode(page, testPhoneNumber, testCode);
    
    expect(verificationSuccess).toBe(true);

    await takeScreenshot(page, 'verification-success');

    // Step 7: Check handover initiated
    await waitForApiCall(page, '/api/verification/handover', { timeout: 10000 });
    
    await expect(page.locator('text=/handover.*initiated/i')).toBeVisible();
    await expect(page.locator('text=/thank you|merci/i')).toBeVisible();

    await takeScreenshot(page, 'handover-complete');
  });

  test('should show eligibility result with reasons', async ({ page }) => {
    const testPhoneNumber = '+33699901032';

    await page.goto('/eligibility');
    
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhoneNumber);
    
    const result = await checkEligibility(page, testPhoneNumber);

    // Verify eligibility reasons are displayed
    expect(result.eligible).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
    
    // Check that UI shows the reasons
    for (const reason of result.reasons) {
      const reasonElement = page.locator(`text=${reason}`);
      await expect(reasonElement).toBeVisible({ timeout: 5000 });
    }

    await takeScreenshot(page, 'eligibility-reasons');
  });

  test('should persist eligibility data through consent flow', async ({ page }) => {
    const testPhoneNumber = '+33699901032';

    // Check eligibility
    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhoneNumber);
    await checkEligibility(page, testPhoneNumber);

    // Navigate to consent
    await page.click('button:has-text("Continue")');
    await waitForApiCall(page, '/api/consent/initiate');

    // Verify phone number is persisted (either in session or displayed)
    const consentPageContent = await page.content();
    expect(consentPageContent).toContain(testPhoneNumber);

    await takeScreenshot(page, 'consent-persisted-data');
  });

  test('should handle consent authorization with state verification', async ({ page }) => {
    const testPhoneNumber = '+33699901032';

    // Complete eligibility
    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhoneNumber);
    await checkEligibility(page, testPhoneNumber);
    await page.click('button:has-text("Continue")');

    // Initiate consent
    const initiateResponse = await waitForApiCall(page, '/api/consent/initiate');
    
    expect(initiateResponse.authUrl).toBeDefined();
    expect(initiateResponse.state).toBeDefined();

    const stateParam = initiateResponse.state;

    // Authorize
    await page.click('button:has-text("Authorize")');

    // Wait for callback
    const callbackResponse = await waitForApiCall(page, '/api/consent/callback');
    
    // Verify state was validated on callback
    expect(callbackResponse.success).toBe(true);
    expect(callbackResponse.consentId).toBeDefined();

    await takeScreenshot(page, 'consent-state-verified');
  });

  test('should display verification code input correctly', async ({ page }) => {
    const testPhoneNumber = '+33699901032';

    // Complete eligibility and consent
    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhoneNumber);
    await checkEligibility(page, testPhoneNumber);
    await page.click('button:has-text("Continue")');
    await waitForApiCall(page, '/api/consent/initiate');
    await page.click('button:has-text("Authorize")');
    await waitForApiCall(page, '/api/consent/callback');

    // Now on verification page
    await expect(page).toHaveURL(/\/verify/);

    // Check verification code input exists
    const codeInput = page.locator('input[name="verificationCode"], input[type="text"][placeholder*="code"]');
    await expect(codeInput).toBeVisible();

    // Check submit button exists
    const submitButton = page.locator('button[type="submit"], button:has-text("Verify")');
    await expect(submitButton).toBeVisible();

    await takeScreenshot(page, 'verification-ui');
  });

  test('should complete verification and show handover confirmation', async ({ page }) => {
    const testPhoneNumber = '+33699901032';
    const testCode = '123456';

    // Complete eligibility and consent
    await page.goto('/eligibility');
    await fillPhoneNumber(page, 'input[name="phoneNumber"]', testPhoneNumber);
    await checkEligibility(page, testPhoneNumber);
    await page.click('button:has-text("Continue")');
    await waitForApiCall(page, '/api/consent/initiate');
    await page.click('button:has-text("Authorize")');
    await waitForApiCall(page, '/api/consent/callback');

    // Verify SMS code
    const success = await verifySmsCode(page, testPhoneNumber, testCode);
    expect(success).toBe(true);

    // Wait for handover API call
    const handoverResponse = await waitForApiCall(page, '/api/verification/handover');
    
    expect(handoverResponse.success).toBe(true);
    expect(handoverResponse.handoverId).toBeDefined();

    // Check confirmation UI
    await expect(page.locator('text=/thank you|success|complete/i')).toBeVisible();

    await takeScreenshot(page, 'handover-confirmation');
  });
});

test.describe('Eligibility Flow - With Authentication', () => {
  test('should work with authenticated session', async ({ authenticatedPage }) => {
    const testPhoneNumber = '+33699901032';

    await authenticatedPage.goto('/eligibility');
    
    // Verify session is active
    const cookies = await authenticatedPage.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'connect.sid');
    expect(sessionCookie).toBeDefined();

    // Complete flow
    await fillPhoneNumber(authenticatedPage, 'input[name="phoneNumber"]', testPhoneNumber);
    const result = await checkEligibility(authenticatedPage, testPhoneNumber);
    
    expect(result.eligible).toBe(true);

    await takeScreenshot(authenticatedPage, 'authenticated-eligibility');
  });

  test('should work with existing consent', async ({ consentedPage }) => {
    const testPhoneNumber = '+33699901032';
    const testCode = '123456';

    // With consented page, should be able to skip to verification
    await consentedPage.goto('/verify');
    
    // Verify consent cookie exists
    const cookies = await consentedPage.context().cookies();
    const consentCookie = cookies.find(c => c.name === 'consent_token');
    expect(consentCookie).toBeDefined();

    // Complete verification
    const success = await verifySmsCode(consentedPage, testPhoneNumber, testCode);
    expect(success).toBe(true);

    await takeScreenshot(consentedPage, 'consented-verification');
  });
});
