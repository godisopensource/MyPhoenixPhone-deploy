import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailyRefreshService } from './daily-refresh.service';

/**
 * Workers Scheduler
 * 
 * Manages cron-based scheduling for background workers.
 * 
 * Schedule:
 * - Daily Refresh: Every day at 3:00 AM (Europe/Paris timezone)
 */
@Injectable()
export class WorkersScheduler {
  private readonly logger = new Logger(WorkersScheduler.name);

  constructor(private readonly dailyRefresh: DailyRefreshService) {}

  /**
   * Run daily refresh at 3 AM every day
   */
  @Cron('0 3 * * *', {
    name: 'daily-refresh',
    timeZone: 'Europe/Paris',
  })
  async handleDailyRefresh() {
    this.logger.log('Cron triggered: daily-refresh');
    
    try {
      const result = await this.dailyRefresh.runDailyRefresh('cron');
      this.logger.log(
        `Daily refresh completed: ${result.recordsProcessed} processed, ` +
          `${result.recordsCreated} created, ${result.recordsUpdated} updated`,
      );
    } catch (error) {
      this.logger.error(`Daily refresh failed: ${error.message}`);
    }
  }

  /**
   * Health check cron (runs every hour to ensure scheduler is alive)
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'scheduler-heartbeat',
  })
  async handleHeartbeat() {
    this.logger.debug('Scheduler heartbeat: alive');
  }
}
