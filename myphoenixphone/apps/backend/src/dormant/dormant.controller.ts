import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DormantDetectorService } from './dormant-detector.service';
import { NetworkEventService } from './network-event.service';
import type { DormantInputEvent } from './network-event.service';
import type { LeadOutput } from './dormant-detector.service';

@Controller('dormant')
export class DormantController {
  private readonly logger = new Logger(DormantController.name);

  constructor(
    private readonly detectorService: DormantDetectorService,
    private readonly eventService: NetworkEventService,
  ) {}

  /**
   * Internal endpoint: Process a dormant event
   * POST /dormant/process
   */
  @Post('process')
  @HttpCode(HttpStatus.OK)
  async processEvent(@Body() event: DormantInputEvent): Promise<LeadOutput> {
    this.logger.log(
      `Processing event for ${event.msisdn_hash.substring(0, 8)}...`,
    );

    // Store the event
    await this.eventService.storeEvent(event, 'dormant_check');

    // Process through detector
    const lead = await this.detectorService.process(event);

    return lead;
  }

  /**
   * Internal endpoint: Collect and process signals for a phone number
   * POST /dormant/collect
   */
  @Post('collect')
  @HttpCode(HttpStatus.OK)
  async collectAndProcess(
    @Body() body: { msisdn: string },
  ): Promise<LeadOutput> {
    const { msisdn } = body;
    this.logger.log(`Collecting signals for MSISDN`);

    // Collect signals from network
    const event = await this.eventService.collectSignals(msisdn);

    // Store the event
    const eventId = await this.eventService.storeEvent(event, 'dormant_check');

    // Process through detector
    const lead = await this.detectorService.process(event);

    // Mark event as processed
    await this.eventService.markProcessed(eventId);

    return lead;
  }

  /**
   * Get lead details by ID
   * GET /dormant/leads/:id
   */
  @Get('leads/:id')
  async getLead(@Param('id') id: string) {
    return this.detectorService.getLead(id);
  }

  /**
   * Get eligible leads for nudge campaign
   * GET /dormant/eligible
   */
  @Get('eligible')
  async getEligibleLeads() {
    return this.detectorService.getEligibleLeads();
  }

  /**
   * Query leads with filters (for campaign manager)
   * GET /dormant/leads?status=eligible&tier=4&limit=50
   */
  @Get('leads')
  async queryLeads(
    @Query('status') status?: string,
    @Query('tier') tier?: string,
    @Query('lastActiveBefore') lastActiveBefore?: string,
    @Query('lastActiveAfter') lastActiveAfter?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters = {
      status,
      tier: tier ? parseInt(tier, 10) : undefined,
      lastActiveBefore,
      lastActiveAfter,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    return this.detectorService.queryLeads(filters);
  }

  /**
   * Get dormant leads statistics
   * GET /dormant/stats
   */
  @Get('stats')
  async getStats() {
    return this.detectorService.getStats();
  }

  /**
   * Internal maintenance: Purge expired leads
   * POST /dormant/maintenance/purge
   */
  @Post('maintenance/purge')
  @HttpCode(HttpStatus.OK)
  async purgeExpired() {
    const count = await this.detectorService.purgeExpiredLeads();
    const eventCount = await this.eventService.cleanupOldEvents();

    return {
      leads_purged: count,
      events_cleaned: eventCount,
    };
  }
}
