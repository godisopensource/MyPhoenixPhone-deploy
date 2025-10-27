import { Controller, Get, Post, Query, Param } from '@nestjs/common';
import { DormantDetectionService } from './dormant-detection.service';
import { CohortBuilderService } from './cohort-builder.service';
import { DailyRefreshService } from './daily-refresh.service';

/**
 * Workers Controller
 *
 * Provides monitoring and manual trigger endpoints for background workers.
 *
 * Endpoints:
 * - GET /workers/status - Overall worker health
 * - GET /workers/dormant/stats - Dormant detection statistics
 * - GET /workers/cohorts - Cohort statistics
 * - GET /workers/cohorts/:name/members - Cohort member list
 * - GET /workers/runs - Worker run history
 * - POST /workers/daily-refresh - Manual trigger for daily refresh
 */
@Controller('workers')
export class WorkersController {
  constructor(
    private readonly dormantDetection: DormantDetectionService,
    private readonly cohortBuilder: CohortBuilderService,
    private readonly dailyRefresh: DailyRefreshService,
  ) {}

  /**
   * Get overall worker status
   */
  @Get('status')
  async getStatus() {
    const [dormantStats, cohortStats, workerStats] = await Promise.all([
      this.dormantDetection.getDormantStats(),
      this.cohortBuilder.getCohortStats(),
      this.dailyRefresh.getWorkerStats(),
    ]);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      dormant: dormantStats,
      cohorts: cohortStats,
      worker: workerStats,
    };
  }

  /**
   * Get dormant detection statistics
   */
  @Get('dormant/stats')
  async getDormantStats() {
    return this.dormantDetection.getDormantStats();
  }

  /**
   * Get cohort statistics
   */
  @Get('cohorts')
  async getCohorts() {
    return this.cohortBuilder.getCohortStats();
  }

  /**
   * Get cohort members
   */
  @Get('cohorts/:name/members')
  async getCohortMembers(
    @Param('name') name: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cohortBuilder.getCohortMembers(
      name,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /**
   * Get worker run history
   */
  @Get('runs')
  async getWorkerRuns(@Query('limit') limit?: string) {
    return this.dailyRefresh.getWorkerRunHistory(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * Get worker statistics
   */
  @Get('stats')
  async getWorkerStats() {
    return this.dailyRefresh.getWorkerStats();
  }

  /**
   * Manually trigger daily refresh (for testing/emergency)
   */
  @Post('daily-refresh')
  async triggerDailyRefresh(@Query('triggeredBy') triggeredBy?: string) {
    return this.dailyRefresh.runDailyRefresh('manual', triggeredBy);
  }

  /**
   * Manually trigger dormant detection only
   */
  @Post('dormant/detect')
  async triggerDormantDetection() {
    return this.dormantDetection.detectDormantDevices();
  }

  /**
   * Manually trigger cohort rebuild only
   */
  @Post('cohorts/rebuild')
  async triggerCohortRebuild() {
    return this.cohortBuilder.rebuildCohorts();
  }
}
