import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ReachabilityService } from '../camara/reachability.service';
import { createHash } from 'crypto';

export interface DormantInputEvent {
  msisdn_hash: string;
  sim_swap: {
    occurred: boolean;
    ts: string;
  };
  old_device_reachability: {
    reachable: boolean;
    checked_ts: string;
    last_activity_ts?: string;
  };
  line_type: 'consumer' | 'business' | 'm2m';
  fraud_flag: boolean;
  metadata?: {
    swap_count_30d?: number;
    opt_out?: boolean;
    last_contact_ts?: string;
  };
}

@Injectable()
export class NetworkEventService {
  private readonly logger = new Logger(NetworkEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reachabilityService: ReachabilityService,
  ) {}

  /**
   * Hash MSISDN with environment-specific salt
   */
  hashMsisdn(msisdn: string): string {
    const salt = process.env.SALT_MSISDN_HASH;
    if (!salt) {
      throw new Error('SALT_MSISDN_HASH is not configured');
    }
    return createHash('sha256')
      .update(msisdn + salt)
      .digest('hex');
  }

  /**
   * Collect SIM swap + reachability signals for a phone number
   * and create a normalized DormantInputEvent
   */
  async collectSignals(msisdn: string): Promise<DormantInputEvent> {
    const msisdn_hash = this.hashMsisdn(msisdn);

    this.logger.debug(
      `Collecting signals for hashed MSISDN: ${msisdn_hash.substring(0, 8)}...`,
    );

    // Get reachability status
    let reachabilityData: {
      reachable: boolean;
      checked_ts: string;
      last_activity_ts?: string;
    };

    try {
      const reachabilityStatus =
        await this.reachabilityService.getReachabilityStatus(msisdn);
      reachabilityData = {
        reachable: reachabilityStatus.reachable,
        checked_ts: new Date().toISOString(),
        last_activity_ts: reachabilityStatus.lastStatusTime,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get reachability for ${msisdn_hash.substring(0, 8)}:`,
        error.message,
      );
      // Default to unknown reachability
      reachabilityData = {
        reachable: false,
        checked_ts: new Date().toISOString(),
      };
    }

    // Get SIM swap data from EligibilitySignal (populated by other services)
    // In production, this would call CAMARA SIM Swap API
    const signal = await this.prisma.eligibilitySignal.findUnique({
      where: { msisdn_hash },
    });

    const simSwapData = {
      occurred: !!signal?.sim_swapped_at,
      ts: signal?.sim_swapped_at?.toISOString() || new Date().toISOString(),
    };

    // Get metadata (opt-out, contact history, etc.)
    const optOut = await this.prisma.optOut.findUnique({
      where: { msisdn_hash },
    });

    const recentLeads = await this.prisma.lead.findMany({
      where: {
        msisdn_hash,
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    const swap_count_30d = recentLeads.length; // Simplified; in production count actual swaps
    const last_contact_ts = recentLeads[0]?.last_contact_at?.toISOString();

    // Construct the event
    const event: DormantInputEvent = {
      msisdn_hash,
      sim_swap: simSwapData,
      old_device_reachability: reachabilityData,
      line_type: 'consumer', // TODO: Get from subscription data
      fraud_flag: false, // TODO: Check fraud detection system
      metadata: {
        swap_count_30d,
        opt_out: !!optOut,
        last_contact_ts,
      },
    };

    return event;
  }

  /**
   * Store a network event for processing
   */
  async storeEvent(
    event: DormantInputEvent,
    eventType: string,
  ): Promise<string> {
    const networkEvent = await this.prisma.networkEvent.create({
      data: {
        msisdn_hash: event.msisdn_hash,
        event_type: eventType,
        payload: event as any,
        processed: false,
      },
    });

    this.logger.log(
      `Stored ${eventType} event ${networkEvent.id} for ${event.msisdn_hash.substring(0, 8)}...`,
    );
    return networkEvent.id;
  }

  /**
   * Mark event as processed
   */
  async markProcessed(eventId: string): Promise<void> {
    await this.prisma.networkEvent.update({
      where: { id: eventId },
      data: { processed: true },
    });
  }

  /**
   * Get unprocessed events for batch processing
   */
  async getUnprocessedEvents(
    limit = 100,
  ): Promise<Array<{ id: string; payload: DormantInputEvent }>> {
    const events = await this.prisma.networkEvent.findMany({
      where: { processed: false },
      orderBy: { created_at: 'asc' },
      take: limit,
    });

    return events.map((event) => ({
      id: event.id,
      // Prisma returns JsonValue; cast via unknown to DormantInputEvent
      payload: event.payload as unknown as DormantInputEvent,
    }));
  }

  /**
   * Clean up old processed events (retention policy)
   */
  async cleanupOldEvents(retentionDays = 90): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    );

    const result = await this.prisma.networkEvent.deleteMany({
      where: {
        processed: true,
        created_at: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old network events`);
    return result.count;
  }
}
