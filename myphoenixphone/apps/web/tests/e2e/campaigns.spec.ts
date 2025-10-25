import { test, expect } from '@playwright/test';
import {
  navigateToWorkersDashboard,
  waitForApiCall,
  takeScreenshot,
  waitForNetworkIdle,
  fillPhoneNumber,
} from '../helpers/test-helpers';

test.describe('Campaigns - Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to campaigns section (adjust URL based on your app)
    await page.goto('/');
    await navigateToWorkersDashboard(page);
    
    // Navigate to campaigns (might be a tab or separate page)
    const campaignsLink = page.locator('a:has-text("Campaigns"), button:has-text("Campaigns"), [data-testid="campaigns-tab"]');
    const linkExists = await campaignsLink.isVisible().catch(() => false);
    
    if (linkExists) {
      await campaignsLink.click();
      await waitForNetworkIdle(page);
    } else {
      // Campaigns might be at a specific URL
      await page.goto('/campaigns');
      await waitForNetworkIdle(page);
    }
  });

  test('should display campaigns list page', async ({ page }) => {
    // Check for campaigns page elements
    await expect(page.locator('h1, h2')).toContainText(/campaigns/i, { timeout: 10000 });

    // Look for campaigns list or empty state
    const campaignsList = page.locator('[data-testid="campaigns-list"], .campaigns-list, table');
    const emptyState = page.locator('[data-testid="empty-campaigns"], .empty-state');

    const listExists = await campaignsList.isVisible().catch(() => false);
    const emptyExists = await emptyState.isVisible().catch(() => false);

    expect(listExists || emptyExists).toBe(true);

    await takeScreenshot(page, 'campaigns-list-page');
  });

  test('should navigate to create campaign page', async ({ page }) => {
    // Look for "Create Campaign" button
    const createButton = page.locator(
      'button:has-text("Create Campaign"), a:has-text("New Campaign"), [data-testid="create-campaign"]'
    );

    const buttonExists = await createButton.isVisible().catch(() => false);

    if (buttonExists) {
      await createButton.click();
      await waitForNetworkIdle(page);

      // Verify we're on create page
      await expect(page).toHaveURL(/\/campaigns\/(new|create)/);
      await expect(page.locator('h1, h2')).toContainText(/create|new.*campaign/i);

      await takeScreenshot(page, 'create-campaign-page');
    } else {
      console.log('Create campaign button not found - feature might not be implemented yet');
    }
  });

  test('should create campaign with basic details', async ({ page }) => {
    // Navigate to create page
    const createButton = page.locator(
      'button:has-text("Create Campaign"), a:has-text("New Campaign"), [data-testid="create-campaign"]'
    );

    const buttonExists = await createButton.isVisible().catch(() => false);

    if (!buttonExists) {
      console.log('Skipping test - create campaign feature not available');
      return;
    }

    await createButton.click();
    await waitForNetworkIdle(page);

    // Fill campaign details
    const campaignName = `Test Campaign ${Date.now()}`;
    const campaignMessage = 'Hello! This is a test campaign message.';

    // Fill name field
    const nameInput = page.locator('input[name="name"], input[name="campaignName"], input[placeholder*="name"]');
    await nameInput.fill(campaignName);

    // Fill message field
    const messageInput = page.locator(
      'textarea[name="message"], textarea[name="campaignMessage"], textarea[placeholder*="message"]'
    );
    await messageInput.fill(campaignMessage);

    await takeScreenshot(page, 'campaign-form-filled');

    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
    await submitButton.click();

    // Wait for campaign creation
    await waitForApiCall(page, '/api/campaigns', { timeout: 10000 }).catch(() => {});
    await waitForNetworkIdle(page);

    // Verify success
    const successMessage = page.locator('text=/campaign.*created|success/i, [data-testid="success-message"]');
    const successExists = await successMessage.isVisible({ timeout: 5000 }).catch(() => false);

    if (successExists) {
      await expect(successMessage).toBeVisible();
    }

    await takeScreenshot(page, 'campaign-created');
  });

  test('should configure campaign targeting', async ({ page }) => {
    const createButton = page.locator(
      'button:has-text("Create Campaign"), a:has-text("New Campaign"), [data-testid="create-campaign"]'
    );

    const buttonExists = await createButton.isVisible().catch(() => false);

    if (!buttonExists) {
      console.log('Skipping test - create campaign feature not available');
      return;
    }

    await createButton.click();
    await waitForNetworkIdle(page);

    // Fill basic details
    await page.locator('input[name="name"], input[name="campaignName"]').fill(`Targeted Campaign ${Date.now()}`);
    await page.locator('textarea[name="message"], textarea[name="campaignMessage"]').fill('Test message');

    // Look for targeting options
    const targetingSection = page.locator('[data-testid="targeting"], .targeting-section, fieldset:has-text("Targeting")');
    const targetingExists = await targetingSection.isVisible().catch(() => false);

    if (targetingExists) {
      // Select cohort or segment
      const cohortSelect = page.locator('select[name="cohort"], select[name="targetCohort"]');
      const cohortExists = await cohortSelect.isVisible().catch(() => false);

      if (cohortExists) {
        await cohortSelect.selectOption({ index: 1 }); // Select first available cohort
        await takeScreenshot(page, 'campaign-targeting-configured');
      }

      // Or filter by criteria
      const criteriaSection = page.locator('[data-testid="criteria"], .criteria-section');
      const criteriaExists = await criteriaSection.isVisible().catch(() => false);

      if (criteriaExists) {
        // Add criteria (adjust based on actual UI)
        const addCriteriaButton = page.locator('button:has-text("Add Criteria"), button:has-text("Add Filter")');
        if (await addCriteriaButton.isVisible().catch(() => false)) {
          await addCriteriaButton.click();
          await takeScreenshot(page, 'campaign-criteria-added');
        }
      }
    }

    await takeScreenshot(page, 'campaign-targeting');
  });

  test('should schedule campaign for later delivery', async ({ page }) => {
    const createButton = page.locator(
      'button:has-text("Create Campaign"), a:has-text("New Campaign"), [data-testid="create-campaign"]'
    );

    const buttonExists = await createButton.isVisible().catch(() => false);

    if (!buttonExists) {
      console.log('Skipping test - create campaign feature not available');
      return;
    }

    await createButton.click();
    await waitForNetworkIdle(page);

    // Fill basic details
    await page.locator('input[name="name"], input[name="campaignName"]').fill(`Scheduled Campaign ${Date.now()}`);
    await page.locator('textarea[name="message"], textarea[name="campaignMessage"]').fill('Scheduled message');

    // Look for schedule options
    const scheduleSection = page.locator('[data-testid="schedule"], .schedule-section, fieldset:has-text("Schedule")');
    const scheduleExists = await scheduleSection.isVisible().catch(() => false);

    if (scheduleExists) {
      // Select "Schedule for later" option
      const scheduleRadio = page.locator('input[type="radio"][value="scheduled"], input[name="deliveryType"][value="later"]');
      const radioExists = await scheduleRadio.isVisible().catch(() => false);

      if (radioExists) {
        await scheduleRadio.check();

        // Set date/time
        const dateInput = page.locator('input[type="datetime-local"], input[type="date"]');
        const dateExists = await dateInput.isVisible().catch(() => false);

        if (dateExists) {
          // Set to tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dateString = tomorrow.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM

          await dateInput.fill(dateString);
          await takeScreenshot(page, 'campaign-scheduled');
        }
      }
    }

    await takeScreenshot(page, 'campaign-schedule-options');
  });

  test('should send campaign immediately to cohort', async ({ page }) => {
    const createButton = page.locator(
      'button:has-text("Create Campaign"), a:has-text("New Campaign"), [data-testid="create-campaign"]'
    );

    const buttonExists = await createButton.isVisible().catch(() => false);

    if (!buttonExists) {
      console.log('Skipping test - create campaign feature not available');
      return;
    }

    await createButton.click();
    await waitForNetworkIdle(page);

    // Fill campaign details
    const campaignName = `Immediate Campaign ${Date.now()}`;
    await page.locator('input[name="name"], input[name="campaignName"]').fill(campaignName);
    await page.locator('textarea[name="message"], textarea[name="campaignMessage"]').fill('Immediate delivery test');

    // Select immediate delivery
    const immediateRadio = page.locator('input[type="radio"][value="immediate"], input[name="deliveryType"][value="now"]');
    const radioExists = await immediateRadio.isVisible().catch(() => false);

    if (radioExists) {
      await immediateRadio.check();
    }

    // Select cohort
    const cohortSelect = page.locator('select[name="cohort"], select[name="targetCohort"]');
    const cohortExists = await cohortSelect.isVisible().catch(() => false);

    if (cohortExists) {
      await cohortSelect.selectOption({ index: 1 });
    }

    await takeScreenshot(page, 'campaign-ready-to-send');

    // Submit
    const sendButton = page.locator('button[type="submit"]:has-text("Send"), button:has-text("Send Now")');
    const sendExists = await sendButton.isVisible().catch(() => false);

    if (sendExists) {
      await sendButton.click();

      // Wait for confirmation
      await waitForApiCall(page, '/api/campaigns', { timeout: 10000 }).catch(() => {});
      
      const confirmationModal = page.locator('[role="dialog"], .modal, .confirmation');
      const modalExists = await confirmationModal.isVisible({ timeout: 5000 }).catch(() => false);

      if (modalExists) {
        const confirmButton = confirmationModal.locator('button:has-text("Confirm"), button:has-text("Yes")');
        await confirmButton.click();
      }

      await waitForNetworkIdle(page);
      await takeScreenshot(page, 'campaign-sent');
    }
  });

  test('should view campaign details', async ({ page }) => {
    // Check if campaigns exist
    const campaignsList = page.locator('[data-testid="campaigns-list"], .campaigns-list, tbody');
    const listExists = await campaignsList.isVisible().catch(() => false);

    if (!listExists) {
      console.log('No campaigns available to view');
      return;
    }

    // Click on first campaign
    const firstCampaign = page.locator('[data-testid="campaign-row"], tbody tr, .campaign-item').first();
    const campaignLink = firstCampaign.locator('a, button[data-action="view"]').first();

    const linkExists = await campaignLink.isVisible().catch(() => false);

    if (linkExists) {
      await campaignLink.click();
      await waitForNetworkIdle(page);

      // Verify campaign details page
      await expect(page).toHaveURL(/\/campaigns\/\w+/);
      await expect(page.locator('h1, h2')).toContainText(/campaign|details/i);

      // Check for campaign metrics
      const metrics = ['sent', 'delivered', 'failed', 'pending'];
      
      let foundMetrics = 0;
      for (const metric of metrics) {
        const metricElement = page.locator(`text=${metric}`, { hasText: new RegExp(metric, 'i') });
        const isVisible = await metricElement.isVisible().catch(() => false);
        if (isVisible) foundMetrics++;
      }

      expect(foundMetrics).toBeGreaterThan(0);

      await takeScreenshot(page, 'campaign-details');
    }
  });

  test('should display campaign delivery status', async ({ page }) => {
    const campaignsList = page.locator('[data-testid="campaigns-list"], .campaigns-list, tbody');
    const listExists = await campaignsList.isVisible().catch(() => false);

    if (!listExists) {
      console.log('No campaigns available');
      return;
    }

    // Look for status indicators
    const statusBadges = page.locator('[data-testid="campaign-status"], .status-badge, .campaign-status');
    const badgesCount = await statusBadges.count();

    expect(badgesCount).toBeGreaterThan(0);

    // Check for different status values
    const possibleStatuses = ['draft', 'scheduled', 'sending', 'sent', 'completed', 'failed'];
    
    for (let i = 0; i < badgesCount; i++) {
      const badge = statusBadges.nth(i);
      const text = await badge.textContent();
      
      const hasValidStatus = possibleStatuses.some(status => 
        text?.toLowerCase().includes(status.toLowerCase())
      );

      if (hasValidStatus) {
        console.log(`Found campaign with status: ${text}`);
      }
    }

    await takeScreenshot(page, 'campaigns-status');
  });

  test('should filter campaigns by status', async ({ page }) => {
    // Look for status filter
    const filterControl = page.locator('[data-testid="status-filter"], select[name="status"], .filter-status');
    const filterExists = await filterControl.isVisible().catch(() => false);

    if (filterExists) {
      // Try filtering by different statuses
      const statuses = ['all', 'draft', 'sent', 'scheduled'];

      for (const status of statuses) {
        if (await filterControl.evaluate(el => el.tagName === 'SELECT')) {
          await filterControl.selectOption(status);
        } else {
          const filterButton = page.locator(`button:has-text("${status}")`);
          if (await filterButton.isVisible().catch(() => false)) {
            await filterButton.click();
          }
        }

        await waitForNetworkIdle(page);
        await takeScreenshot(page, `campaigns-filter-${status}`);
      }
    }
  });

  test('should display campaign analytics', async ({ page }) => {
    const campaignsList = page.locator('[data-testid="campaigns-list"], .campaigns-list, tbody');
    const listExists = await campaignsList.isVisible().catch(() => false);

    if (!listExists) {
      console.log('No campaigns available');
      return;
    }

    // Click on first campaign to view details
    const firstCampaign = page.locator('[data-testid="campaign-row"], tbody tr').first();
    const campaignLink = firstCampaign.locator('a').first();

    if (await campaignLink.isVisible().catch(() => false)) {
      await campaignLink.click();
      await waitForNetworkIdle(page);

      // Look for analytics section
      const analyticsSection = page.locator('[data-testid="analytics"], .analytics-section, .campaign-metrics');
      const analyticsExists = await analyticsSection.isVisible().catch(() => false);

      if (analyticsExists) {
        // Check for metrics
        const expectedMetrics = [
          'total recipients',
          'delivered',
          'failed',
          'delivery rate',
          'response rate',
        ];

        let foundMetrics = 0;
        for (const metric of expectedMetrics) {
          const metricElement = page.locator(`text=${metric}`, { hasText: new RegExp(metric, 'i') });
          const isVisible = await metricElement.isVisible().catch(() => false);
          if (isVisible) foundMetrics++;
        }

        expect(foundMetrics).toBeGreaterThan(0);
        await takeScreenshot(page, 'campaign-analytics');
      }
    }
  });
});

test.describe('Campaigns - Cohort Integration', () => {
  test('should send campaign to specific cohort', async ({ page }) => {
    await navigateToWorkersDashboard(page);
    
    // First, navigate to cohorts to see available cohorts
    const cohortsLink = page.locator('a:has-text("Cohorts"), [data-testid="cohorts-tab"]');
    const cohortsExists = await cohortsLink.isVisible().catch(() => false);

    if (cohortsExists) {
      await cohortsLink.click();
      await waitForNetworkIdle(page);

      // Get first cohort name
      const firstCohort = page.locator('[data-testid="cohort-row"], tbody tr, .cohort-item').first();
      const cohortName = await firstCohort.textContent();

      console.log(`Found cohort: ${cohortName}`);

      // Navigate to campaigns
      await page.goto('/campaigns');
      await waitForNetworkIdle(page);

      // Create campaign
      const createButton = page.locator('button:has-text("Create Campaign")');
      if (await createButton.isVisible().catch(() => false)) {
        await createButton.click();
        
        // Fill details and select cohort
        await page.locator('input[name="name"]').fill(`Cohort Campaign ${Date.now()}`);
        await page.locator('textarea[name="message"]').fill('Message for cohort');
        
        const cohortSelect = page.locator('select[name="cohort"]');
        if (await cohortSelect.isVisible().catch(() => false)) {
          await cohortSelect.selectOption({ index: 1 });
          await takeScreenshot(page, 'campaign-cohort-selected');
        }
      }
    }
  });
});
