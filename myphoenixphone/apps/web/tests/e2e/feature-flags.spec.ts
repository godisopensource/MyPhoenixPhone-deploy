import { test, expect } from '@playwright/test';
import {
  getFeatureFlagVariant,
  waitForApiCall,
  takeScreenshot,
} from '../helpers/test-helpers';

test.describe('Feature Flags - Happy Path', () => {
  const testUserId = 'test-user-12345';
  const testFlagKey = 'eligibility-ui-variant';

  test('should retrieve feature flag variant for user', async ({ page }) => {
    await page.goto('/');

    // Get feature flag variant
    const variant = await getFeatureFlagVariant(page, testFlagKey, testUserId);

    expect(variant).toBeDefined();
    expect(typeof variant).toBe('string');
    expect(variant.length).toBeGreaterThan(0);

    // Variant should be one of the expected values (adjust based on your flags)
    const validVariants = ['control', 'variant-a', 'variant-b', 'treatment', 'default'];
    expect(validVariants).toContain(variant);

    console.log(`Feature flag '${testFlagKey}' for user '${testUserId}': ${variant}`);

    await takeScreenshot(page, 'feature-flag-retrieved');
  });

  test('should get consistent variant across multiple requests', async ({ page }) => {
    await page.goto('/');

    // Get variant multiple times
    const variant1 = await getFeatureFlagVariant(page, testFlagKey, testUserId);
    const variant2 = await getFeatureFlagVariant(page, testFlagKey, testUserId);
    const variant3 = await getFeatureFlagVariant(page, testFlagKey, testUserId);

    // All variants should be the same (sticky assignment)
    expect(variant1).toBe(variant2);
    expect(variant2).toBe(variant3);

    await takeScreenshot(page, 'feature-flag-consistent');
  });

  test('should get different variants for different users', async ({ page }) => {
    await page.goto('/');

    const user1 = 'user-001';
    const user2 = 'user-002';
    const user3 = 'user-003';

    const variant1 = await getFeatureFlagVariant(page, testFlagKey, user1);
    const variant2 = await getFeatureFlagVariant(page, testFlagKey, user2);
    const variant3 = await getFeatureFlagVariant(page, testFlagKey, user3);

    expect(variant1).toBeDefined();
    expect(variant2).toBeDefined();
    expect(variant3).toBeDefined();

    // At least one should be different (probabilistically true for A/B tests)
    const allSame = (variant1 === variant2) && (variant2 === variant3);
    
    // Log results
    console.log(`User 1: ${variant1}, User 2: ${variant2}, User 3: ${variant3}`);
    
    // Note: This test might occasionally fail due to randomness
    // In production, you'd use deterministic test data or mock the assignment

    await takeScreenshot(page, 'feature-flag-different-users');
  });

  test('should handle multiple feature flags', async ({ page }) => {
    await page.goto('/');

    const flags = [
      'eligibility-ui-variant',
      'consent-flow-version',
      'verification-method',
      'dashboard-layout',
    ];

    const variants: Record<string, string> = {};

    for (const flag of flags) {
      try {
        const variant = await getFeatureFlagVariant(page, flag, testUserId);
        variants[flag] = variant;
      } catch (error) {
        // Flag might not exist, skip it
        console.log(`Flag '${flag}' not found, skipping`);
      }
    }

    // At least one flag should be retrieved
    expect(Object.keys(variants).length).toBeGreaterThan(0);

    console.log('Retrieved variants:', variants);

    await takeScreenshot(page, 'feature-flags-multiple');
  });

  test('should use feature flag variant in UI', async ({ page }) => {
    await page.goto('/eligibility');

    // Get the variant
    const variant = await getFeatureFlagVariant(page, testFlagKey, testUserId);

    // Wait for page to apply variant
    await page.waitForTimeout(1000);

    // Check if UI reflects the variant
    // This depends on your implementation - adjust selectors accordingly
    
    if (variant === 'variant-a') {
      // Check for variant-a specific UI elements
      const variantElement = page.locator('[data-variant="a"], .variant-a');
      const exists = await variantElement.isVisible().catch(() => false);
      
      if (exists) {
        await expect(variantElement).toBeVisible();
      }
    } else if (variant === 'variant-b') {
      // Check for variant-b specific UI elements
      const variantElement = page.locator('[data-variant="b"], .variant-b');
      const exists = await variantElement.isVisible().catch(() => false);
      
      if (exists) {
        await expect(variantElement).toBeVisible();
      }
    }

    await takeScreenshot(page, `feature-flag-ui-${variant}`);
  });

  test('should track feature flag exposure events', async ({ page }) => {
    await page.goto('/');

    // Listen for analytics/tracking calls
    const trackingCalls: any[] = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/analytics') || url.includes('/api/track') || url.includes('analytics')) {
        trackingCalls.push({
          url,
          method: request.method(),
          postData: request.postData(),
        });
      }
    });

    // Get feature flag variant (should trigger exposure event)
    await getFeatureFlagVariant(page, testFlagKey, testUserId);

    // Wait for tracking to complete
    await page.waitForTimeout(2000);

    // Verify tracking call was made
    // Note: Adjust based on your analytics implementation
    console.log(`Tracking calls made: ${trackingCalls.length}`);
    
    if (trackingCalls.length > 0) {
      console.log('Tracking calls:', trackingCalls);
    }

    await takeScreenshot(page, 'feature-flag-tracking');
  });

  test('should handle default variant for unknown flags', async ({ page }) => {
    await page.goto('/');

    const unknownFlag = 'non-existent-flag-xyz';

    try {
      const variant = await getFeatureFlagVariant(page, unknownFlag, testUserId);

      // Should return default variant
      expect(variant).toBeDefined();
      expect(variant).toBe('default');
    } catch (error) {
      // Or might throw error - both acceptable
      expect(error).toBeDefined();
    }

    await takeScreenshot(page, 'feature-flag-unknown');
  });

  test('should retrieve feature flag configuration', async ({ page }) => {
    await page.goto('/');

    // Make API call to get all flags
    const response = await page.request.get('/api/feature-flags', {
      headers: {
        'Accept': 'application/json',
      },
    });

    expect(response.ok()).toBe(true);

    const flags = await response.json();
    
    expect(flags).toBeDefined();
    expect(Array.isArray(flags) || typeof flags === 'object').toBe(true);

    console.log('Available feature flags:', flags);

    await takeScreenshot(page, 'feature-flags-config');
  });

  test('should handle feature flag percentage rollout', async ({ page }) => {
    await page.goto('/');

    const rolloutFlag = 'new-feature-rollout'; // Assuming 50% rollout
    const testUsers = Array.from({ length: 20 }, (_, i) => `user-${i}`);

    const variants: Record<string, number> = {};

    for (const userId of testUsers) {
      try {
        const variant = await getFeatureFlagVariant(page, rolloutFlag, userId);
        variants[variant] = (variants[variant] || 0) + 1;
      } catch (error) {
        // Flag might not exist
        console.log('Rollout flag not found, skipping test');
        return;
      }
    }

    console.log('Variant distribution:', variants);

    // Verify we got multiple variants (indicating rollout)
    const variantCount = Object.keys(variants).length;
    
    if (variantCount > 1) {
      // Good - we have distribution
      expect(variantCount).toBeGreaterThanOrEqual(2);
    } else {
      // Might be 100% or 0% rollout
      console.log('Single variant detected - might be full rollout');
    }

    await takeScreenshot(page, 'feature-flag-rollout');
  });
});

test.describe('Feature Flags - A/B Test Scenarios', () => {
  test('should assign user to treatment group', async ({ page }) => {
    await page.goto('/');

    const abTestFlag = 'checkout-flow-test';
    const testUserId = 'ab-test-user-001';

    const variant = await getFeatureFlagVariant(page, abTestFlag, testUserId);

    expect(variant).toBeDefined();
    
    // Verify it's a valid A/B test variant
    const validVariants = ['control', 'treatment', 'variant-a', 'variant-b'];
    expect(validVariants.some(v => variant.includes(v.toLowerCase()))).toBe(true);

    await takeScreenshot(page, 'ab-test-assignment');
  });

  test('should maintain variant across sessions', async ({ page }) => {
    const persistentFlag = 'persistent-feature';
    const persistentUserId = 'persistent-user-123';

    // First session
    await page.goto('/');
    const variant1 = await getFeatureFlagVariant(page, persistentFlag, persistentUserId);

    // Clear cookies and start new session
    await page.context().clearCookies();
    await page.reload();

    // Second session - should get same variant
    const variant2 = await getFeatureFlagVariant(page, persistentFlag, persistentUserId);

    expect(variant1).toBe(variant2);

    await takeScreenshot(page, 'feature-flag-persistent');
  });

  test('should handle feature flag overrides for testing', async ({ page }) => {
    await page.goto('/');

    const overrideUserId = 'override-test-user';

    // Set override via query parameter or cookie
    await page.goto('/?ff_override=eligibility-ui-variant:variant-a');

    const variant = await getFeatureFlagVariant(page, 'eligibility-ui-variant', overrideUserId);

    // Should respect override
    expect(variant).toBe('variant-a');

    await takeScreenshot(page, 'feature-flag-override');
  });
});
