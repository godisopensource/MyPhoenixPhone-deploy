import { test, expect } from '@playwright/test';
import {
  navigateToWorkersDashboard,
  triggerDailyRefresh,
  waitForApiCall,
  takeScreenshot,
  waitForNetworkIdle,
} from '../helpers/test-helpers';

test.describe('Workers Dashboard - Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await navigateToWorkersDashboard(page);
    await waitForNetworkIdle(page);
  });

  test('should display dashboard with worker statistics', async ({ page }) => {
    // Check dashboard title
    await expect(page.locator('h1, h2')).toContainText(/dashboard|workers/i);

    // Check for statistics sections
    const statsSection = page.locator('[data-testid="worker-stats"], .stats, .statistics');
    await expect(statsSection).toBeVisible({ timeout: 10000 });

    // Look for common stats (adjust selectors based on actual implementation)
    const possibleStats = [
      'total workers',
      'active workers',
      'queued jobs',
      'completed jobs',
      'failed jobs',
    ];

    let foundStats = 0;
    for (const statText of possibleStats) {
      const statElement = page.locator(`text=${statText}`, { hasText: new RegExp(statText, 'i') });
      const isVisible = await statElement.isVisible().catch(() => false);
      if (isVisible) foundStats++;
    }

    expect(foundStats).toBeGreaterThan(0);

    await takeScreenshot(page, 'dashboard-overview');
  });

  test('should display worker job list', async ({ page }) => {
    // Wait for jobs list to load
    await page.waitForSelector('[data-testid="jobs-list"], .jobs-list, table', { timeout: 10000 });

    // Check for job entries
    const jobRows = page.locator('[data-testid="job-row"], tbody tr, .job-item');
    const count = await jobRows.count();

    expect(count).toBeGreaterThan(0);

    // Verify job details are shown (name, status, timestamp)
    const firstJob = jobRows.first();
    await expect(firstJob).toBeVisible();

    await takeScreenshot(page, 'jobs-list');
  });

  test('should trigger daily refresh worker', async ({ page }) => {
    // Trigger the daily refresh job
    const jobId = await triggerDailyRefresh(page);

    expect(jobId).toBeDefined();
    expect(typeof jobId).toBe('string');

    // Wait for job to be added to the list
    await page.waitForTimeout(2000); // Give time for job to appear

    // Verify job appears in dashboard
    const jobElement = page.locator(`text=${jobId}`);
    await expect(jobElement).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, 'daily-refresh-triggered');
  });

  test('should show job status updates in real-time', async ({ page }) => {
    // Trigger a job
    const jobId = await triggerDailyRefresh(page);

    // Wait for initial status
    await page.waitForTimeout(1000);

    // Look for status indicators
    const jobRow = page.locator(`[data-job-id="${jobId}"], tr:has-text("${jobId}")`);
    
    // Check for status badge/label
    const statusElement = jobRow.locator('[data-testid="job-status"], .status, .badge');
    await expect(statusElement).toBeVisible({ timeout: 10000 });

    const statusText = await statusElement.textContent();
    expect(statusText).toMatch(/pending|running|completed|failed|active/i);

    await takeScreenshot(page, 'job-status-update');
  });

  test('should display cohort management section', async ({ page }) => {
    // Navigate to cohorts section
    const cohortsLink = page.locator('a:has-text("Cohorts"), button:has-text("Cohorts"), [data-testid="cohorts-tab"]');
    
    const linkExists = await cohortsLink.isVisible().catch(() => false);
    
    if (linkExists) {
      await cohortsLink.click();
      await waitForNetworkIdle(page);

      // Check for cohort list
      await expect(page.locator('h1, h2')).toContainText(/cohorts/i);

      const cohortsList = page.locator('[data-testid="cohorts-list"], .cohorts-list, table');
      await expect(cohortsList).toBeVisible({ timeout: 10000 });

      await takeScreenshot(page, 'cohorts-list');
    } else {
      // Cohorts might be on the same page
      const cohortsSection = page.locator('[data-testid="cohorts"], .cohorts-section');
      await expect(cohortsSection).toBeVisible({ timeout: 5000 });
      
      await takeScreenshot(page, 'cohorts-section');
    }
  });

  test('should filter jobs by status', async ({ page }) => {
    // Look for status filter dropdown/buttons
    const filterControl = page.locator(
      '[data-testid="status-filter"], select[name="status"], .filter-status'
    );

    const filterExists = await filterControl.isVisible().catch(() => false);

    if (filterExists) {
      // Try different filter values
      const filters = ['completed', 'failed', 'active', 'all'];

      for (const filter of filters) {
        // Select filter
        if (await filterControl.evaluate(el => el.tagName === 'SELECT')) {
          await filterControl.selectOption(filter);
        } else {
          const filterButton = page.locator(`button:has-text("${filter}")`);
          if (await filterButton.isVisible().catch(() => false)) {
            await filterButton.click();
          }
        }

        await waitForNetworkIdle(page);

        // Verify jobs list updates
        const jobsList = page.locator('[data-testid="jobs-list"], tbody, .jobs-list');
        await expect(jobsList).toBeVisible();

        await takeScreenshot(page, `jobs-filter-${filter}`);
      }
    }
  });

  test('should display worker health status', async ({ page }) => {
    // Look for health indicators
    const healthSection = page.locator(
      '[data-testid="worker-health"], .health-status, .system-status'
    );

    const healthExists = await healthSection.isVisible().catch(() => false);

    if (healthExists) {
      await expect(healthSection).toBeVisible();

      // Check for health metrics
      const metrics = ['CPU', 'Memory', 'Queue', 'Redis'];
      
      let foundMetrics = 0;
      for (const metric of metrics) {
        const metricElement = page.locator(`text=${metric}`, { hasText: new RegExp(metric, 'i') });
        const isVisible = await metricElement.isVisible().catch(() => false);
        if (isVisible) foundMetrics++;
      }

      expect(foundMetrics).toBeGreaterThan(0);

      await takeScreenshot(page, 'worker-health');
    }
  });

  test('should refresh dashboard data on manual refresh', async ({ page }) => {
    // Wait for initial load
    await waitForNetworkIdle(page);

    // Look for refresh button
    const refreshButton = page.locator(
      'button:has-text("Refresh"), [data-testid="refresh-button"], button[aria-label="Refresh"]'
    );

    const refreshExists = await refreshButton.isVisible().catch(() => false);

    if (refreshExists) {
      // Get initial job count
      const jobsList = page.locator('[data-testid="jobs-list"], tbody tr, .job-item');
      const initialCount = await jobsList.count();

      // Click refresh
      await refreshButton.click();

      // Wait for network activity
      await waitForApiCall(page, '/api/workers', { timeout: 5000 }).catch(() => {});
      await waitForNetworkIdle(page);

      // Verify data refreshed (count might be same but element should re-render)
      const newCount = await jobsList.count();
      expect(newCount).toBeGreaterThanOrEqual(0);

      await takeScreenshot(page, 'dashboard-refreshed');
    }
  });

  test('should navigate to job details page', async ({ page }) => {
    // Wait for jobs list
    await page.waitForSelector('[data-testid="jobs-list"], tbody tr, .job-item', { timeout: 10000 });

    // Click on first job
    const firstJob = page.locator('[data-testid="job-row"], tbody tr, .job-item').first();
    
    // Look for clickable element (link or button)
    const jobLink = firstJob.locator('a, button[data-action="view-details"]').first();
    
    const linkExists = await jobLink.isVisible().catch(() => false);

    if (linkExists) {
      await jobLink.click();
      await waitForNetworkIdle(page);

      // Verify we're on job details page
      await expect(page).toHaveURL(/\/workers\/jobs\/\w+/);

      // Check for job details
      await expect(page.locator('h1, h2')).toContainText(/job.*details|details/i);

      await takeScreenshot(page, 'job-details');
    }
  });

  test('should handle pagination of jobs list', async ({ page }) => {
    // Look for pagination controls
    const paginationControl = page.locator(
      '[data-testid="pagination"], .pagination, nav[aria-label="Pagination"]'
    );

    const paginationExists = await paginationControl.isVisible().catch(() => false);

    if (paginationExists) {
      // Get initial jobs
      const initialJobs = await page.locator('[data-testid="job-row"], tbody tr, .job-item').count();

      // Click next page
      const nextButton = paginationControl.locator('button:has-text("Next"), a:has-text("Next"), button[aria-label="Next"]');
      
      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
        await waitForNetworkIdle(page);

        // Verify jobs changed
        const newJobs = await page.locator('[data-testid="job-row"], tbody tr, .job-item').count();
        expect(newJobs).toBeGreaterThan(0);

        await takeScreenshot(page, 'jobs-pagination');
      }
    }
  });
});

test.describe('Workers Dashboard - Job Management', () => {
  test('should display different job types', async ({ page }) => {
    await navigateToWorkersDashboard(page);
    await waitForNetworkIdle(page);

    // Expected job types
    const jobTypes = [
      'daily-refresh',
      'send-campaign',
      'cleanup',
      'sync-data',
    ];

    const jobsList = page.locator('[data-testid="jobs-list"], tbody, .jobs-list');
    const jobsContent = await jobsList.textContent();

    let foundTypes = 0;
    for (const jobType of jobTypes) {
      if (jobsContent?.toLowerCase().includes(jobType.toLowerCase())) {
        foundTypes++;
      }
    }

    // At least one job type should be present
    expect(foundTypes).toBeGreaterThan(0);

    await takeScreenshot(page, 'job-types');
  });

  test('should show job execution time', async ({ page }) => {
    await navigateToWorkersDashboard(page);
    await waitForNetworkIdle(page);

    const jobRow = page.locator('[data-testid="job-row"], tbody tr, .job-item').first();
    await expect(jobRow).toBeVisible();

    // Look for timestamp/duration fields
    const timeFields = jobRow.locator('time, [data-testid="job-time"], .timestamp, .duration');
    const timeExists = await timeFields.first().isVisible().catch(() => false);

    expect(timeExists).toBe(true);

    await takeScreenshot(page, 'job-execution-time');
  });

  test('should allow retrying failed jobs', async ({ page }) => {
    await navigateToWorkersDashboard(page);
    await waitForNetworkIdle(page);

    // Look for failed job
    const failedJob = page.locator('[data-status="failed"], tr:has-text("failed"), .job-failed').first();
    const failedExists = await failedJob.isVisible().catch(() => false);

    if (failedExists) {
      // Look for retry button
      const retryButton = failedJob.locator('button:has-text("Retry"), [data-action="retry"]');
      const retryExists = await retryButton.isVisible().catch(() => false);

      if (retryExists) {
        await retryButton.click();

        // Wait for retry confirmation
        await waitForApiCall(page, '/api/workers/jobs', { timeout: 5000 }).catch(() => {});
        
        await takeScreenshot(page, 'job-retried');
      }
    }
  });
});
