import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';

/**
 * Pricing Module - DD-07
 * Mock pricing service for device trade-in valuation
 */
@Module({
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService], // Export for use in other modules if needed
})
export class PricingModule {}
