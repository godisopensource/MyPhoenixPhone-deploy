# End-to-End (E2E) Testing with Playwright

This directory contains E2E tests that verify the complete user flows in a real browser environment.

## What is E2E Testing?

E2E tests simulate real user interactions with the application:
- Testing the complete frontend + backend integration
- Running in real browsers (Chromium, Firefox, WebKit)
- Verifying UI behavior, navigation, and data flow
- Catching integration issues that unit tests miss

## Directory Structure

```
tests/
├── e2e/                    # E2E test files
│   └── smoke.spec.ts      # Basic smoke tests
├── fixtures/              # Test fixtures (auth, data setup)
│   └── auth.fixture.ts    # Authentication fixtures
├── helpers/               # Helper functions for tests
│   └── test-helpers.ts    # Common test utilities
└── .gitignore            # Ignore test artifacts
```

## Setup

### Install Dependencies

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Install browsers
npx playwright install --with-deps chromium
```

### Configuration

Edit `playwright.config.ts` to customize:
- **baseURL**: Frontend URL (default: http://localhost:3000)
- **webServer**: Auto-start frontend/backend for tests
- **browsers**: Which browsers to test (chromium, firefox, webkit)
- **retries**: How many times to retry failed tests
- **screenshots/videos**: When to capture test artifacts

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run in UI Mode (Interactive)

```bash
npm run test:e2e:ui
```

This opens Playwright's UI where you can:
- Run tests interactively
- See live browser preview
- Debug step-by-step
- Inspect DOM elements

### Run in Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

Shows the browser window during test execution.

### Debug Tests

```bash
npm run test:e2e:debug
```

Opens Playwright Inspector for debugging:
- Step through tests line by line
- Inspect page state at each step
- Record and generate test code

### View Test Report

```bash
npm run test:e2e:report
```

Opens HTML report with:
- Test results and timing
- Screenshots on failure
- Video recordings
- Trace viewer for debugging

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/MyPhoenixPhone/);
});
```

### Using Custom Fixtures

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test('authenticated user can access dashboard', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage.locator('h1')).toContainText('Dashboard');
});
```

### Using Test Helpers

```typescript
import { test, expect } from '@playwright/test';
import { checkEligibility, fillPhoneNumber } from '../helpers/test-helpers';

test('check device eligibility', async ({ page }) => {
  const result = await checkEligibility(page, '+33612345678');
  expect(result.eligible).toBe(true);
});
```

## Test Categories

### Smoke Tests (`smoke.spec.ts`)
Basic tests to verify the application is running:
- Homepage loads
- Backend health check
- Navigation works
- No console errors

### Happy Path Tests
Main user flows that should always work:
- Eligibility → Consent → Verification → Handover
- Workers dashboard access
- Feature flag variant assignment

### Error Scenario Tests
How the app handles errors:
- Ineligible devices
- Expired verification codes
- Rate limiting
- Network failures

## Best Practices

### 1. Use Data Test IDs

```html
<button data-testid="submit-button">Submit</button>
```

```typescript
await page.click('[data-testid="submit-button"]');
```

### 2. Wait for Elements

```typescript
// ❌ Don't assume elements are immediately available
await page.click('button');

// ✅ Wait for element to be visible
await page.waitForSelector('button', { state: 'visible' });
await page.click('button');
```

### 3. Use Page Object Pattern

```typescript
class EligibilityPage {
  constructor(private page: Page) {}
  
  async fillPhoneNumber(phone: string) {
    await this.page.fill('[name="phoneNumber"]', phone);
  }
  
  async submit() {
    await this.page.click('[type="submit"]');
  }
  
  async getResult() {
    return await this.page.locator('[data-testid="result"]').textContent();
  }
}
```

### 4. Handle Network Requests

```typescript
// Mock API response
await page.route('/api/eligibility*', (route) => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ eligible: true }),
  });
});

// Wait for API call
await page.waitForResponse('/api/eligibility*');
```

### 5. Clean Up After Tests

```typescript
test.afterEach(async ({ page }) => {
  // Clear cookies and storage
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
});
```

## Debugging Failed Tests

### 1. Check Screenshots

Failed tests automatically capture screenshots:
```
test-results/<test-name>/<retry-number>/test-failed-1.png
```

### 2. Watch Video

Videos are recorded on failure:
```
test-results/<test-name>/<retry-number>/video.webm
```

### 3. View Trace

Traces capture full test execution:
```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

### 4. Run with Debug

```bash
npm run test:e2e:debug
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Install Dependencies
  run: npm ci

- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium

- name: Run E2E Tests
  run: npm run test:e2e
  env:
    CI: true

- name: Upload Test Results
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Tests timeout

- Increase timeout in `playwright.config.ts`:
  ```typescript
  timeout: 60 * 1000, // 60 seconds
  ```

### Can't connect to backend

- Check `webServer.url` in config
- Verify backend is running on correct port
- Check DATABASE_URL environment variable

### Browser not found

- Run `npx playwright install --with-deps chromium`
- Check system dependencies are installed

### Flaky tests

- Use `test.retry()` for unreliable tests
- Add explicit waits: `waitForSelector`, `waitForLoadState`
- Use `test.setTimeout()` for slow tests

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Test Generator](https://playwright.dev/docs/codegen)
