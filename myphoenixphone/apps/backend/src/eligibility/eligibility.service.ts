import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { SimSwapService } from '../camara/sim-swap.service';
import { ReachabilityService } from '../camara/reachability.service';
import { DeviceModelService } from './device-model.service';
import { ConsentRepository } from '../consent/consent.repository';
import { EligibilitySignalRepository } from './eligibility.repository';
import {
  EligibilityRulesService,
  EligibilityEvaluation,
} from './eligibility-rules.service';
import { createHash } from 'crypto';
import { Counter, Histogram } from 'prom-client';
import { metricsRegistry } from '../metrics/metrics.middleware';

const eligibilityChecks = new Counter({
  name: 'eligibility_checks_total',
  help: 'Total eligibility checks performed',
  labelNames: ['result'] as const,
  registers: [metricsRegistry],
});

const eligibilityDuration = new Histogram({
  name: 'eligibility_check_duration_seconds',
  help: 'Duration of eligibility checks',
  labelNames: ['result'] as const,
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

/**
 * Eligibility service - orchestrates network signal collection and evaluation
 *
 * Responsibilities:
 * - Hash MSISDN for privacy
 * - Fetch signals from CAMARA adapters (SIM Swap, Reachability)
 * - Store signals in database
 * - Apply eligibility rules
 * - Return evaluation with reasons
 */
@Injectable()
export class EligibilityService {
  private readonly logger = new Logger(EligibilityService.name);

  constructor(
    private readonly simSwapService: SimSwapService,
    private readonly reachabilityService: ReachabilityService,
    private readonly deviceModelService: DeviceModelService,
    private readonly consentRepository: ConsentRepository,
    private readonly signalRepository: EligibilitySignalRepository,
    private readonly rulesService: EligibilityRulesService,
  ) {}

  /**
   * Check eligibility for a phone number
   *
   * @param phoneNumber - E.164 format phone number (e.g., +33612345678)
   * @returns Eligibility evaluation with reasons and snapshot
   */
  async checkEligibility(phoneNumber: string): Promise<EligibilityEvaluation> {
    const timer = eligibilityDuration.startTimer();

    try {
      this.logger.log(`Checking eligibility for phone number`);

      // Hash MSISDN for privacy (SEC-01 requirement)
      const msisdnHash = this.hashMsisdn(phoneNumber);
      this.logger.debug(`MSISDN hash: ${msisdnHash.substring(0, 12)}...`);

      // Retrieve device selection from consent proof
      const consents =
        await this.consentRepository.findByMsisdnHash(msisdnHash);
      const latestConsent = consents
        .filter((c) => !c.revoked_at)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0];

      const proof = latestConsent?.proof as any;
      const deviceSelection = proof?.device_selection || null;
      this.logger.debug(`Device selection: ${JSON.stringify(deviceSelection)}`);

      // Validate device model if provided
      let deviceValidation:
        | import('./device-model.service').DeviceModelValidation
        | null = null;
      if (deviceSelection) {
        deviceValidation =
          this.deviceModelService.validateDeviceSelection(deviceSelection);
        this.logger.debug(
          `Device validation: ${JSON.stringify(deviceValidation)}`,
        );
      }

      // Fetch signals from CAMARA adapters in parallel
      const [simSwapResult, reachabilityResult] = await Promise.all([
        this.simSwapService.getSimSwapStatus(phoneNumber),
        this.reachabilityService.isReachable(phoneNumber),
      ]);

      this.logger.debug(
        `Signals fetched: simSwap=${JSON.stringify(simSwapResult)}, ` +
          `reachability=${JSON.stringify(reachabilityResult)}`,
      );

      // Store signals in database
      await this.signalRepository.upsert(msisdnHash, {
        sim_swapped_at: simSwapResult.swappedAt
          ? new Date(simSwapResult.swappedAt)
          : null,
        reachable: reachabilityResult.reachable,
      });

      // Evaluate eligibility using rules service
      const evaluation = this.rulesService.evaluateEligibility(
        simSwapResult,
        reachabilityResult,
        deviceValidation,
      );

      // Record metrics
      const result = evaluation.eligible ? 'eligible' : 'ineligible';
      eligibilityChecks.inc({ result });
      timer({ result });

      this.logger.log(
        `Eligibility check complete: eligible=${evaluation.eligible}, ` +
          `reasons=${evaluation.reasons.join(', ')}`,
      );

      return evaluation;
    } catch (error) {
      timer({ result: 'error' });
      eligibilityChecks.inc({ result: 'error' });

      this.logger.error(
        `Eligibility check failed: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to check eligibility',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Hash MSISDN using SHA-256 with salt
   * Implements SEC-01 requirement: no raw MSISDN in storage/logs
   *
   * @param msisdn - Phone number to hash
   * @returns Hex-encoded hash
   */
  private hashMsisdn(msisdn: string): string {
    const salt = process.env.SALT_MSISDN_HASH || 'default-salt-change-me';
    return createHash('sha256').update(salt).update(msisdn).digest('hex');
  }

  /**
   * Get stored eligibility signals for a phone number
   * Useful for debugging and audit trails
   *
   * @param phoneNumber - E.164 format phone number
   * @returns Stored eligibility signals or null
   */
  async getStoredSignals(phoneNumber: string) {
    const msisdnHash = this.hashMsisdn(phoneNumber);
    return this.signalRepository.findByMsisdnHash(msisdnHash);
  }
}
