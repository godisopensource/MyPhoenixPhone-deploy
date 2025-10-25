import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Dormant Detection Service
 * 
 * Analyzes NetworkEvent data to calculate dormant probability scores
 * and identifies high-value dormant users ready for outreach.
 * 
 * Scoring Algorithm:
 * - SIM swap detected: +0.4 (strong signal)
 * - Device unreachable: +0.3 (moderate signal)
 * - No recent activity: +0.2 (weak signal)
 * - Time decay: older events get lower weight
 * 
 * Max score: 1.0 (highly dormant)
 * Min score: 0.0 (active user)
 */
@Injectable()
export class DormantDetectionService {
  private readonly logger = new Logger(DormantDetectionService.name);

  constructor(private readonly db: PrismaService) {}

  /**
   * Process all unprocessed network events and update Lead dormant scores
   */
  async detectDormantDevices(): Promise<{
    eventsProcessed: number;
    leadsCreated: number;
    leadsUpdated: number;
    errors: number;
  }> {
    this.logger.log('Starting dormant detection...');
    const startTime = Date.now();

    let eventsProcessed = 0;
    let leadsCreated = 0;
    let leadsUpdated = 0;
    let errors = 0;

    try {
      // Fetch unprocessed events
      const events = await this.db.networkEvent.findMany({
        where: { processed: false },
        orderBy: { created_at: 'asc' },
        take: 1000, // Process in batches
      });

      this.logger.log(`Found ${events.length} unprocessed events`);

      // Group events by msisdn_hash
      const eventsByMsisdn = this.groupEventsByMsisdn(events);

      // Process each user's events
      for (const [msisdnHash, userEvents] of Object.entries(eventsByMsisdn)) {
        try {
          const score = this.calculateDormantScore(userEvents);
          const signals = this.extractSignals(userEvents);

          // Check if Lead already exists
          const existingLead = await this.db.lead.findFirst({
            where: { msisdn_hash: msisdnHash },
            orderBy: { created_at: 'desc' },
          });

          if (existingLead) {
            // Update existing lead
            await this.db.lead.update({
              where: { id: existingLead.id },
              data: {
                dormant_score: score,
                signals: signals as Prisma.InputJsonValue,
                eligible: score >= 0.6, // Threshold for eligibility
                next_action: this.determineNextAction(score, existingLead),
                updated_at: new Date(),
              },
            });
            leadsUpdated++;
          } else {
            // Create new lead
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30-day window

            await this.db.lead.create({
              data: {
                msisdn_hash: msisdnHash,
                dormant_score: score,
                signals: signals as Prisma.InputJsonValue,
                eligible: score >= 0.6,
                activation_window_days: 30,
                next_action: score >= 0.6 ? 'send_nudge' : 'hold',
                exclusions: [],
                expires_at: expiresAt,
              },
            });
            leadsCreated++;
          }

          // Mark events as processed
          await this.db.networkEvent.updateMany({
            where: {
              id: { in: userEvents.map((e) => e.id) },
            },
            data: { processed: true },
          });

          eventsProcessed += userEvents.length;
        } catch (error) {
          this.logger.error(
            `Error processing events for ${msisdnHash}: ${error.message}`,
          );
          errors++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Dormant detection completed in ${duration}ms: ` +
          `${eventsProcessed} events, ${leadsCreated} created, ${leadsUpdated} updated, ${errors} errors`,
      );

      return { eventsProcessed, leadsCreated, leadsUpdated, errors };
    } catch (error) {
      this.logger.error(`Dormant detection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate dormant probability score from network events
   */
  private calculateDormantScore(
    events: Array<{
      event_type: string;
      payload: any;
      created_at: Date;
    }>,
  ): number {
    let score = 0;
    const now = Date.now();

    for (const event of events) {
      const ageInDays = (now - event.created_at.getTime()) / (1000 * 60 * 60 * 24);
      const timeDecay = Math.max(0, 1 - ageInDays / 90); // Decay over 90 days

      if (event.event_type === 'sim_swap') {
        // SIM swap is a strong signal
        const daysSinceSwap = event.payload.daysSinceLastSwap || 0;
        if (daysSinceSwap > 30) {
          score += 0.4 * timeDecay;
        }
      } else if (event.event_type === 'reachability_check') {
        // Device unreachable is a moderate signal
        const isReachable = event.payload.connectivity?.roaming === false;
        if (!isReachable) {
          score += 0.3 * timeDecay;
        }
      }
    }

    // No recent events = potential dormancy
    const mostRecentEvent = events[events.length - 1];
    if (mostRecentEvent) {
      const daysSinceLastEvent =
        (now - mostRecentEvent.created_at.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastEvent > 60) {
        score += 0.2;
      }
    }

    return Math.min(1.0, score);
  }

  /**
   * Extract signals from events for audit trail
   */
  private extractSignals(
    events: Array<{
      event_type: string;
      payload: any;
      created_at: Date;
    }>,
  ): Record<string, any> {
    const simSwapEvents = events.filter((e) => e.event_type === 'sim_swap');
    const reachabilityEvents = events.filter(
      (e) => e.event_type === 'reachability_check',
    );

    return {
      sim_swaps: simSwapEvents.length,
      last_sim_swap: simSwapEvents[simSwapEvents.length - 1]?.created_at,
      reachability_checks: reachabilityEvents.length,
      last_reachability_check:
        reachabilityEvents[reachabilityEvents.length - 1]?.created_at,
      last_event: events[events.length - 1]?.created_at,
      event_count: events.length,
    };
  }

  /**
   * Determine next action based on score and existing lead state
   */
  private determineNextAction(
    score: number,
    existingLead: {
      contact_count: number;
      last_contact_at: Date | null;
      expires_at: Date;
    },
  ): string {
    // Check if lead expired
    if (existingLead.expires_at < new Date()) {
      return 'expired';
    }

    // Check if already contacted too many times
    if (existingLead.contact_count >= 3) {
      return 'exclude';
    }

    // Check if recently contacted (wait 7 days between nudges)
    if (existingLead.last_contact_at) {
      const daysSinceContact =
        (Date.now() - existingLead.last_contact_at.getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceContact < 7) {
        return 'hold';
      }
    }

    // High score = send nudge
    if (score >= 0.6) {
      return 'send_nudge';
    }

    return 'hold';
  }

  /**
   * Group events by msisdn_hash for batch processing
   */
  private groupEventsByMsisdn(
    events: Array<{
      id: string;
      msisdn_hash: string;
      event_type: string;
      payload: any;
      created_at: Date;
    }>,
  ): Record<string, Array<any>> {
    const grouped: Record<string, Array<any>> = {};

    for (const event of events) {
      if (!grouped[event.msisdn_hash]) {
        grouped[event.msisdn_hash] = [];
      }
      grouped[event.msisdn_hash].push(event);
    }

    return grouped;
  }

  /**
   * Get dormant statistics for monitoring
   */
  async getDormantStats(): Promise<{
    total_leads: number;
    eligible_leads: number;
    avg_dormant_score: number;
    pending_nudges: number;
  }> {
    const [total, eligible, avgScore, pending] = await Promise.all([
      this.db.lead.count(),
      this.db.lead.count({ where: { eligible: true } }),
      this.db.lead.aggregate({
        _avg: { dormant_score: true },
      }),
      this.db.lead.count({
        where: {
          next_action: 'send_nudge',
          expires_at: { gt: new Date() },
        },
      }),
    ]);

    return {
      total_leads: total,
      eligible_leads: eligible,
      avg_dormant_score: avgScore._avg.dormant_score || 0,
      pending_nudges: pending,
    };
  }
}
