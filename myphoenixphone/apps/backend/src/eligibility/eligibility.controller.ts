import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { EligibilityService } from './eligibility.service';
import { ConsentGuard } from './consent.guard';
import type { EligibilityEvaluation } from './eligibility-rules.service';

/**
 * Query parameters for GET /eligibility
 */
class EligibilityQueryDto {
  phoneNumber: string;
}

/**
 * Eligibility controller - exposes eligibility check endpoints
 *
 * Endpoints:
 * - GET /eligibility?phoneNumber=+33612345678
 *   Requires valid consent (enforced by ConsentGuard)
 *   Returns eligibility evaluation with reasons and snapshot
 */
@Controller('eligibility')
export class EligibilityController {
  private readonly logger = new Logger(EligibilityController.name);

  constructor(private readonly eligibilityService: EligibilityService) {}

  /**
   * Check eligibility for a phone number
   *
   * @param query - Contains phoneNumber in E.164 format
   * @returns Eligibility evaluation
   *
   * Example request:
   * GET /eligibility?phoneNumber=+33612345678
   *
   * Example response:
   * {
   *   "eligible": true,
   *   "reasons": ["SIM_SWAP_RECENT", "DEVICE_REACHABLE", "MEETS_CRITERIA"],
   *   "snapshot": {
   *     "simSwap": {
   *       "swappedAt": "2025-10-16T10:30:00.000Z",
   *       "daysAgo": 5
   *     },
   *     "reachability": {
   *       "reachable": true,
   *       "connectivity": ["DATA"]
   *     }
   *   }
   * }
   */
  @Get()
  @UseGuards(ConsentGuard)
  @HttpCode(HttpStatus.OK)
  async checkEligibility(
    @Query() query: EligibilityQueryDto,
  ): Promise<EligibilityEvaluation> {
    this.logger.log(`Eligibility check requested for phone number`);

    const evaluation = await this.eligibilityService.checkEligibility(
      query.phoneNumber,
    );

    this.logger.log(
      `Eligibility check completed: eligible=${evaluation.eligible}, ` +
        `reasons=${evaluation.reasons.length}`,
    );

    return evaluation;
  }

  /**
   * Get stored eligibility signals (for debugging/audit)
   * Protected by consent guard
   *
   * @param query - Contains phoneNumber in E.164 format
   * @returns Stored eligibility signals or null
   */
  @Get('signals')
  @UseGuards(ConsentGuard)
  @HttpCode(HttpStatus.OK)
  async getStoredSignals(@Query() query: EligibilityQueryDto) {
    this.logger.log(`Stored signals requested for phone number`);

    const signals = await this.eligibilityService.getStoredSignals(
      query.phoneNumber,
    );

    if (!signals) {
      this.logger.log('No stored signals found');
      return { message: 'No signals stored for this phone number' };
    }

    return signals;
  }
}
