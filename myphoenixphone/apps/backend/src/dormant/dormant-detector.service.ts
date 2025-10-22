import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DormantInputEvent } from './network-event.service';

export interface LeadOutput {
  lead_id: string;
  msisdn_hash: string;
  dormant_score: number;
  eligible: boolean;
  activation_window_days: number;
  next_action: 'send_nudge' | 'hold' | 'exclude' | 'expired';
  exclusions: string[];
  signals: {
    days_since_swap: number;
    days_unreachable: number;
    swap_count_30d: number;
  };
  created_at: Date;
  expires_at: Date;
}

type ExclusionReason =
  | 'too_soon_after_swap'
  | 'business_line'
  | 'm2m_line'
  | 'fraud_flag'
  | 'opt_out'
  | 'recently_contacted'
  | 'multiple_swaps_detected'
  | 'device_still_reachable'
  | 'no_swap_detected';

@Injectable()
export class DormantDetectorService {
  private readonly logger = new Logger(DormantDetectorService.name);

  // Configuration from RULES.md
  private readonly MIN_DAYS_AFTER_SWAP = Number(process.env.MIN_DAYS_AFTER_SWAP) || 3;
  private readonly MAX_ACTIVATION_WINDOW_DAYS = Number(process.env.MAX_ACTIVATION_WINDOW_DAYS) || 14;
  private readonly LEAD_TTL_DAYS = Number(process.env.LEAD_TTL_DAYS) || 30;
  private readonly MAX_SWAPS_30D_THRESHOLD = Number(process.env.MAX_SWAPS_30D_THRESHOLD) || 2;
  private readonly MIN_DAYS_BETWEEN_CONTACTS = Number(process.env.MIN_DAYS_BETWEEN_CONTACTS) || 14;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process a dormant event and create/update a lead
   * Implements the complete rule engine from RULES.md
   */
  async process(event: DormantInputEvent): Promise<LeadOutput> {
    this.logger.debug(`Processing event for ${event.msisdn_hash.substring(0, 8)}...`);

    // Calculate signals
    const signals = this.calculateSignals(event);
    
    // Check exclusions
    const exclusions = this.checkExclusions(event, signals);
    
    // Calculate dormant score
    const dormant_score = this.calculateScore(event, signals, exclusions);
    
    // Determine eligibility and next action
    const eligible = exclusions.length === 0 && signals.days_since_swap >= this.MIN_DAYS_AFTER_SWAP;
    const next_action = this.determineNextAction(signals, exclusions);
    
    // Calculate activation window
    const activation_window_days = this.calculateActivationWindow(signals);
    
    // Create or update lead with idempotency
    const lead = await this.createOrUpdateLead({
      msisdn_hash: event.msisdn_hash,
      dormant_score,
      eligible,
      activation_window_days,
      next_action,
      exclusions,
      signals,
    });

    return {
      lead_id: lead.id,
      msisdn_hash: lead.msisdn_hash,
      dormant_score: lead.dormant_score,
      eligible: lead.eligible,
      activation_window_days: lead.activation_window_days,
      next_action: lead.next_action as LeadOutput['next_action'],
      exclusions: lead.exclusions,
      signals: lead.signals as LeadOutput['signals'],
      created_at: lead.created_at,
      expires_at: lead.expires_at,
    };
  }

  /**
   * Calculate signal metrics from event
   */
  private calculateSignals(event: DormantInputEvent) {
    const now = Date.now();
    const swapTime = new Date(event.sim_swap.ts).getTime();
    const reachabilityTime = new Date(event.old_device_reachability.checked_ts).getTime();
    
    const days_since_swap = (now - swapTime) / (1000 * 60 * 60 * 24);
    
    let days_unreachable = 0;
    if (!event.old_device_reachability.reachable && event.old_device_reachability.last_activity_ts) {
      const lastActivityTime = new Date(event.old_device_reachability.last_activity_ts).getTime();
      days_unreachable = (now - lastActivityTime) / (1000 * 60 * 60 * 24);
    } else if (!event.old_device_reachability.reachable) {
      // If no last activity, assume unreachable since swap
      days_unreachable = days_since_swap;
    }
    
    const swap_count_30d = event.metadata?.swap_count_30d || 1;

    return {
      days_since_swap,
      days_unreachable,
      swap_count_30d,
    };
  }

  /**
   * Check all exclusion rules from RULES.md
   */
  private checkExclusions(
    event: DormantInputEvent,
    signals: { days_since_swap: number; swap_count_30d: number },
  ): ExclusionReason[] {
    const exclusions: ExclusionReason[] = [];

    // Rule: No swap detected
    if (!event.sim_swap.occurred) {
      exclusions.push('no_swap_detected');
    }

    // Rule: Too soon after swap (< MIN_DAYS_AFTER_SWAP)
    if (signals.days_since_swap < this.MIN_DAYS_AFTER_SWAP) {
      exclusions.push('too_soon_after_swap');
    }

    // Rule: Business line
    if (event.line_type === 'business') {
      exclusions.push('business_line');
    }

    // Rule: M2M line
    if (event.line_type === 'm2m') {
      exclusions.push('m2m_line');
    }

    // Rule: Fraud flag
    if (event.fraud_flag) {
      exclusions.push('fraud_flag');
    }

    // Rule: User opted out
    if (event.metadata?.opt_out) {
      exclusions.push('opt_out');
    }

    // Rule: Recently contacted (< MIN_DAYS_BETWEEN_CONTACTS)
    if (event.metadata?.last_contact_ts) {
      const daysSinceContact =
        (Date.now() - new Date(event.metadata.last_contact_ts).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceContact < this.MIN_DAYS_BETWEEN_CONTACTS) {
        exclusions.push('recently_contacted');
      }
    }

    // Rule: Multiple swaps detected (> MAX_SWAPS_30D_THRESHOLD)
    if (signals.swap_count_30d > this.MAX_SWAPS_30D_THRESHOLD) {
      exclusions.push('multiple_swaps_detected');
    }

    // Rule: Device still reachable
    if (event.old_device_reachability.reachable) {
      exclusions.push('device_still_reachable');
    }

    return exclusions;
  }

  /**
   * Calculate dormant score using formula from RULES.md
   * 
   * dormant_score = 
   *   0.40 × swap_signal +
   *   0.35 × unreachability_signal +
   *   0.15 × time_window_signal +
   *   0.10 × history_signal
   */
  private calculateScore(
    event: DormantInputEvent,
    signals: { days_since_swap: number; days_unreachable: number; swap_count_30d: number },
    exclusions: ExclusionReason[],
  ): number {
    // If excluded, score is 0
    if (exclusions.length > 0) {
      return 0;
    }

    // Swap signal: 1 if occurred, else 0
    const swap_signal = event.sim_swap.occurred ? 1.0 : 0.0;

    // Unreachability signal: min(days_unreachable / 7, 1.0)
    const unreachability_signal = Math.min(signals.days_unreachable / 7, 1.0);

    // Time window signal: 1 if 3 ≤ days_since_swap ≤ 14, else decay
    let time_window_signal: number;
    if (
      signals.days_since_swap >= this.MIN_DAYS_AFTER_SWAP &&
      signals.days_since_swap <= this.MAX_ACTIVATION_WINDOW_DAYS
    ) {
      time_window_signal = 1.0;
    } else {
      // Decay: max(0, 1 - abs(days_since_swap - 8.5) / 5.5)
      const optimal_midpoint = (this.MIN_DAYS_AFTER_SWAP + this.MAX_ACTIVATION_WINDOW_DAYS) / 2;
      const decay_factor = this.MAX_ACTIVATION_WINDOW_DAYS - this.MIN_DAYS_AFTER_SWAP;
      time_window_signal = Math.max(0, 1 - Math.abs(signals.days_since_swap - optimal_midpoint) / decay_factor);
    }

    // History signal: max(0, 1 - swap_count_30d / 3)
    const history_signal = Math.max(0, 1 - signals.swap_count_30d / 3);

    // Weighted sum
    const score =
      0.4 * swap_signal +
      0.35 * unreachability_signal +
      0.15 * time_window_signal +
      0.1 * history_signal;

    return Math.min(1.0, Math.max(0.0, score)); // Clamp to [0, 1]
  }

  /**
   * Determine next action based on signals and exclusions
   */
  private determineNextAction(
    signals: { days_since_swap: number },
    exclusions: ExclusionReason[],
  ): 'send_nudge' | 'hold' | 'exclude' | 'expired' {
    if (exclusions.length > 0) {
      return 'exclude';
    }

    if (signals.days_since_swap < this.MIN_DAYS_AFTER_SWAP) {
      return 'hold';
    }

    if (signals.days_since_swap > this.MAX_ACTIVATION_WINDOW_DAYS) {
      return 'expired';
    }

    return 'send_nudge';
  }

  /**
   * Calculate remaining days in activation window
   */
  private calculateActivationWindow(signals: { days_since_swap: number }): number {
    const days_remaining = this.MAX_ACTIVATION_WINDOW_DAYS - signals.days_since_swap;
    return Math.max(1, Math.ceil(days_remaining));
  }

  /**
   * Create or update lead with idempotency
   * Uses unique constraint on (msisdn_hash, created_at::date) for daily idempotency
   */
  private async createOrUpdateLead(data: {
    msisdn_hash: string;
    dormant_score: number;
    eligible: boolean;
    activation_window_days: number;
    next_action: string;
    exclusions: string[];
    signals: any;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + this.LEAD_TTL_DAYS);

    // Check if lead already exists for today
    const existingLead = await this.prisma.lead.findFirst({
      where: {
        msisdn_hash: data.msisdn_hash,
        created_at: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (existingLead) {
      this.logger.debug(`Updating existing lead ${existingLead.id}`);
      return this.prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          dormant_score: data.dormant_score,
          eligible: data.eligible,
          activation_window_days: data.activation_window_days,
          next_action: data.next_action,
          exclusions: data.exclusions,
          signals: data.signals,
        },
      });
    }

    // Create new lead
    this.logger.log(`Creating new lead for ${data.msisdn_hash.substring(0, 8)}...`);
    return this.prisma.lead.create({
      data: {
        msisdn_hash: data.msisdn_hash,
        dormant_score: data.dormant_score,
        eligible: data.eligible,
        activation_window_days: data.activation_window_days,
        next_action: data.next_action,
        exclusions: data.exclusions,
        signals: data.signals,
        expires_at,
      },
    });
  }

  /**
   * Purge expired leads (TTL enforcement)
   */
  async purgeExpiredLeads(): Promise<number> {
    const result = await this.prisma.lead.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Purged ${result.count} expired leads`);
    return result.count;
  }

  /**
   * Get lead by ID
   */
  async getLead(leadId: string) {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        contact_attempts: {
          orderBy: { created_at: 'desc' },
        },
      },
    });
  }

  /**
   * Get eligible leads for nudge sending
   */
  async getEligibleLeads(limit = 100) {
    return this.prisma.lead.findMany({
      where: {
        eligible: true,
        next_action: 'send_nudge',
        contact_count: {
          lt: 2, // Max 2 contacts per lead
        },
        expires_at: {
          gt: new Date(),
        },
      },
      orderBy: { dormant_score: 'desc' },
      take: limit,
    });
  }
}
