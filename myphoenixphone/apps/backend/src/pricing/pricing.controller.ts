import { Controller, Post, Body, Logger } from '@nestjs/common';
import { PricingService } from './pricing.service';
import type {
  PricingEstimateDto,
  PricingEstimateResponse,
} from './dto/pricing.dto';

/**
 * Pricing Controller - DD-07
 * Provides REST API for device valuation estimation
 */
@Controller('pricing')
export class PricingController {
  private readonly logger = new Logger(PricingController.name);

  constructor(private readonly pricingService: PricingService) {}

  /**
   * POST /pricing/estimate
   * Calculate device trade-in value based on model and condition
   *
   * @param dto - Model and condition data
   * @returns Price estimate with breakdown
   */
  @Post('estimate')
  estimateValue(@Body() dto: PricingEstimateDto): PricingEstimateResponse {
    this.logger.log(
      `Estimating value for ${dto.model} (${dto.manufacturer || 'unknown brand'})`,
    );

    return this.pricingService.estimateValue(
      dto.model,
      dto.manufacturer,
      dto.storage,
      dto.condition,
    );
  }
}
