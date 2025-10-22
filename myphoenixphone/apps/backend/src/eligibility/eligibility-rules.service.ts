import { Injectable, Logger } from '@nestjs/common';
import type { SimSwapResult } from '../camara/sim-swap.service';
import type { ReachabilityResult } from '../camara/reachability.service';

/**
 * Eligibility reason codes
 */
export enum EligibilityReason {
  SIM_SWAP_RECENT = 'SIM_SWAP_RECENT',
  SIM_SWAP_OLD = 'SIM_SWAP_OLD',
  SIM_SWAP_UNKNOWN = 'SIM_SWAP_UNKNOWN',
  DEVICE_REACHABLE = 'DEVICE_REACHABLE',
  DEVICE_UNREACHABLE = 'DEVICE_UNREACHABLE',
  DEVICE_REACHABILITY_UNKNOWN = 'DEVICE_REACHABILITY_UNKNOWN',
  DEVICE_MODEL_ELIGIBLE = 'DEVICE_MODEL_ELIGIBLE',
  DEVICE_MODEL_NOT_FOUND = 'DEVICE_MODEL_NOT_FOUND',
  DEVICE_MODEL_UNKNOWN = 'DEVICE_MODEL_UNKNOWN',
  DEVICE_BRAND_NOT_ELIGIBLE = 'DEVICE_BRAND_NOT_ELIGIBLE',
  DEVICE_MODEL_NOT_ELIGIBLE = 'DEVICE_MODEL_NOT_ELIGIBLE',
  MEETS_CRITERIA = 'MEETS_CRITERIA',
  DOES_NOT_MEET_CRITERIA = 'DOES_NOT_MEET_CRITERIA',
}

/**
 * Eligibility evaluation result
 */
export interface EligibilityEvaluation {
  eligible: boolean;
  reasons: EligibilityReason[];
  snapshot: {
    simSwap?: {
      swappedAt?: string;
      daysAgo?: number;
    };
    reachability?: {
      reachable: boolean;
      connectivity?: string[];
    };
    device?: {
      manufacturer?: string;
      model?: string;
      variant?: string;
      eligible: boolean;
      reason: string;
      action?: 'donate' | 'visit_store';
    };
  };
}

/**
 * Configurable eligibility rules
 */
export interface EligibilityConfig {
  simSwapMaxDays: number; // SIM swap within this many days = eligible
  requireReachable: boolean; // Must be reachable to be eligible
  requireUnreachable: boolean; // Must be unreachable to be eligible (alternative criterion)
}

/**
 * Eligibility rules evaluation service
 * Implements business logic for determining eligibility based on network signals
 */
@Injectable()
export class EligibilityRulesService {
  private readonly logger = new Logger(EligibilityRulesService.name);
  private readonly config: EligibilityConfig;

  constructor() {
    // Load configuration from environment variables with defaults
    this.config = {
      simSwapMaxDays: parseInt(
        process.env.ELIGIBILITY_SIM_SWAP_MAX_DAYS || '30',
        10,
      ),
      requireReachable: process.env.ELIGIBILITY_REQUIRE_REACHABLE === 'true',
      requireUnreachable:
        process.env.ELIGIBILITY_REQUIRE_UNREACHABLE === 'true',
    };

    this.logger.log(
      `Eligibility rules configured: simSwapMaxDays=${this.config.simSwapMaxDays}, ` +
        `requireReachable=${this.config.requireReachable}, requireUnreachable=${this.config.requireUnreachable}`,
    );
  }

  /**
   * Evaluate eligibility based on SIM swap, reachability, and device model signals
   *
   * Current rules (configurable via env vars):
   * - SIM swap within X days: strong indicator of vulnerability
   * - Device unreachable: may indicate lost/stolen device
   * - Device model: must be in eligible list
   *
   * @param simSwap - SIM swap status from CAMARA
   * @param reachability - Device reachability status from CAMARA
   * @param deviceValidation - Device model validation result (optional)
   * @returns Eligibility evaluation with reasons and snapshot
   */
  evaluateEligibility(
    simSwap: SimSwapResult,
    reachability: ReachabilityResult,
    deviceValidation?: import('./device-model.service').DeviceModelValidation | null,
  ): EligibilityEvaluation {
    const reasons: EligibilityReason[] = [];
    const snapshot: EligibilityEvaluation['snapshot'] = {};

    // Evaluate SIM swap signal
    const simSwapEvaluation = this.evaluateSimSwap(simSwap);
    reasons.push(...simSwapEvaluation.reasons);
    snapshot.simSwap = simSwapEvaluation.snapshot;

    // Evaluate reachability signal
    const reachabilityEvaluation = this.evaluateReachability(reachability);
    reasons.push(...reachabilityEvaluation.reasons);
    snapshot.reachability = reachabilityEvaluation.snapshot;

    // Evaluate device model if provided
    const deviceEvaluation = this.evaluateDeviceModel(deviceValidation);
    reasons.push(...deviceEvaluation.reasons);
    snapshot.device = deviceEvaluation.snapshot;

    // Determine overall eligibility
    const eligible = this.determineEligibility(
      simSwapEvaluation,
      reachabilityEvaluation,
      deviceEvaluation,
    );

    if (eligible) {
      reasons.push(EligibilityReason.MEETS_CRITERIA);
    } else {
      reasons.push(EligibilityReason.DOES_NOT_MEET_CRITERIA);
    }

    this.logger.debug(
      `Eligibility evaluation: eligible=${eligible}, reasons=${reasons.join(', ')}`,
    );

    return { eligible, reasons, snapshot };
  }

  /**
   * Evaluate SIM swap signal
   */
  private evaluateSimSwap(simSwap: SimSwapResult): {
    reasons: EligibilityReason[];
    snapshot: EligibilityEvaluation['snapshot']['simSwap'];
    isRecentSwap: boolean;
  } {
    const reasons: EligibilityReason[] = [];
    const snapshot: EligibilityEvaluation['snapshot']['simSwap'] = {};

    if (!simSwap.swappedAt) {
      reasons.push(EligibilityReason.SIM_SWAP_UNKNOWN);
      return { reasons, snapshot, isRecentSwap: false };
    }

    // Calculate days since swap
    const swappedDate = new Date(simSwap.swappedAt);
    const now = new Date();
    const daysAgo = Math.floor(
      (now.getTime() - swappedDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    snapshot.swappedAt = simSwap.swappedAt;
    snapshot.daysAgo = daysAgo;

    // Check if swap is recent (within threshold)
    const isRecentSwap = daysAgo <= this.config.simSwapMaxDays;

    if (isRecentSwap) {
      reasons.push(EligibilityReason.SIM_SWAP_RECENT);
    } else {
      reasons.push(EligibilityReason.SIM_SWAP_OLD);
    }

    return { reasons, snapshot, isRecentSwap };
  }

  /**
   * Evaluate reachability signal
   */
  private evaluateReachability(reachability: ReachabilityResult): {
    reasons: EligibilityReason[];
    snapshot: EligibilityEvaluation['snapshot']['reachability'];
    isReachable: boolean;
  } {
    const reasons: EligibilityReason[] = [];
    const snapshot: EligibilityEvaluation['snapshot']['reachability'] = {
      reachable: reachability.reachable,
      connectivity: reachability.connectivity,
    };

    if (
      reachability.reachable === undefined ||
      reachability.reachable === null
    ) {
      reasons.push(EligibilityReason.DEVICE_REACHABILITY_UNKNOWN);
      return { reasons, snapshot, isReachable: false };
    }

    if (reachability.reachable) {
      reasons.push(EligibilityReason.DEVICE_REACHABLE);
    } else {
      reasons.push(EligibilityReason.DEVICE_UNREACHABLE);
    }

    return { reasons, snapshot, isReachable: reachability.reachable };
  }

  /**
   * Evaluate device model signal
   */
  private evaluateDeviceModel(
    deviceValidation?: import('./device-model.service').DeviceModelValidation | null,
  ): {
    reasons: EligibilityReason[];
    snapshot: EligibilityEvaluation['snapshot']['device'];
    isEligibleDevice: boolean;
  } {
    const reasons: EligibilityReason[] = [];

    // If no device validation provided, treat as eligible (optional criterion)
    if (!deviceValidation) {
      return {
        reasons: [],
        snapshot: undefined,
        isEligibleDevice: true,
      };
    }

    const snapshot: EligibilityEvaluation['snapshot']['device'] = {
      manufacturer: deviceValidation.manufacturer,
      model: deviceValidation.model,
      variant: deviceValidation.variant,
      eligible: deviceValidation.eligible,
      reason: deviceValidation.reason,
      action: deviceValidation.action,
    };

    // Add appropriate reason based on validation result
    if (deviceValidation.eligible) {
      reasons.push(EligibilityReason.DEVICE_MODEL_ELIGIBLE);
    } else {
      // Map device validation reason to eligibility reason
      const reason = deviceValidation.reason.toLowerCase();
      if (reason.includes('not found') || reason.includes('not_found')) {
        reasons.push(EligibilityReason.DEVICE_MODEL_NOT_FOUND);
      } else if (
        reason.includes('unknown') &&
        deviceValidation.action === 'visit_store'
      ) {
        reasons.push(EligibilityReason.DEVICE_MODEL_UNKNOWN);
      } else if (reason.includes('brand')) {
        reasons.push(EligibilityReason.DEVICE_BRAND_NOT_ELIGIBLE);
      } else {
        reasons.push(EligibilityReason.DEVICE_MODEL_NOT_ELIGIBLE);
      }
    }

    return {
      reasons,
      snapshot,
      isEligibleDevice: deviceValidation.eligible,
    };
  }

  /**
   * Determine overall eligibility based on signal evaluations
   *
   * Current logic:
   * - Recent SIM swap (within threshold) = eligible
   * - Optional: require specific reachability state
   * - Device model must be eligible (if provided)
   */
  private determineEligibility(
    simSwapEval: { isRecentSwap: boolean },
    reachabilityEval: { isReachable: boolean },
    deviceEval: { isEligibleDevice: boolean },
  ): boolean {
    // Primary criterion: recent SIM swap
    const meetsSimSwapCriterion = simSwapEval.isRecentSwap;

    // Optional reachability criteria (configurable)
    let meetsReachabilityCriterion = true;

    if (this.config.requireReachable) {
      meetsReachabilityCriterion = reachabilityEval.isReachable;
    } else if (this.config.requireUnreachable) {
      meetsReachabilityCriterion = !reachabilityEval.isReachable;
    }

    // Device model criterion (mandatory if device validation provided)
    const meetsDeviceCriterion = deviceEval.isEligibleDevice;

    // All criteria must be met
    return (
      meetsSimSwapCriterion &&
      meetsReachabilityCriterion &&
      meetsDeviceCriterion
    );
  }

  /**
   * Get current configuration (useful for testing and debugging)
   */
  getConfig(): EligibilityConfig {
    return { ...this.config };
  }
}
