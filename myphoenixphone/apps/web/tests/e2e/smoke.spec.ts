import { test, expect } from '@playwright/test';

/**
 * Smoke Tests
 * 
 * Basic tests to verify the application is running and accessible.
 * These should be the first tests to run in CI/CD.
 */

test.describe('Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Verify the page loaded
    await expect(page).toHaveTitle(/MyPhoenixPhone|Home/i);
    
    // Verify key elements are present
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('backend health check responds', async ({ page }) => {
    // Check if backend is accessible
    const response = await page.request.get('http://localhost:3003/health');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('backend metrics endpoint responds', async ({ page }) => {
    const response = await page.request.get('http://localhost:3003/metrics');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    // Metrics should be in Prometheus format
    const text = await response.text();
    expect(text).toContain('# HELP');
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Check if there are any navigation links
    const links = page.locator('a[href]');
    const count = await links.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Try navigating to a link if available
    if (count > 0) {
      const firstLink = links.first();
      const href = await firstLink.getAttribute('href');
      
      if (href && href.startsWith('/')) {
        await firstLink.click();
        await expect(page).toHaveURL(new RegExp(href));
      }
    }
  });

  test('no console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // There should be no console errors
    expect(errors).toHaveLength(0);
  });

  test('favicon loads', async ({ page }) => {
    await page.goto('/');
    
    const faviconResponse = await page.request.get('/favicon.ico');
    expect(faviconResponse.ok()).toBeTruthy();
  });

  test('CSS loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Wait for styles to load
    await page.waitForLoadState('networkidle');
    
    // Check if any element has computed styles
    const body = page.locator('body');
    const backgroundColor = await body.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    
    // Should have some background color set
    expect(backgroundColor).toBeTruthy();
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
  });

  test('JavaScript is enabled and working', async ({ page }) => {
    await page.goto('/');
    
    // Test that JavaScript can run
    const result = await page.evaluate(() => {
      return 1 + 1;
    });
    
    expect(result).toBe(2);
  });
});

test.describe('API Smoke Tests', () => {
  test('Swagger UI is accessible', async ({ page }) => {
    const response = await page.request.get('http://localhost:3003/api');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    // Should return HTML for Swagger UI
    const html = await response.text();
    expect(html).toContain('swagger');
  });

  test('OpenAPI spec is generated', async ({ page }) => {
    const response = await page.request.get('http://localhost:3003/api-json');
    
    expect(response.ok()).toBeTruthy();
    
    const spec = await response.json();
    expect(spec).toHaveProperty('openapi');
    expect(spec).toHaveProperty('paths');
  });
});
