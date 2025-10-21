import { Module } from '@nestjs/common';
import { EligibilityController } from './eligibility.controller';
import { EligibilityService } from './eligibility.service';
import { EligibilityRulesService } from './eligibility-rules.service';
import { EligibilitySignalRepository } from './eligibility.repository';
import { ConsentGuard } from './consent.guard';
import { PrismaModule } from '../database/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { SimSwapService } from '../camara/sim-swap.service';
import { ReachabilityService } from '../camara/reachability.service';
import { OAuth2ClientService } from '../camara/oauth2-client.service';

/**
 * Eligibility module - orchestrates eligibility checks using network signals
 *
 * Provides:
 * - GET /eligibility endpoint (with consent guard)
 * - GET /eligibility/signals endpoint (for debugging)
 * - Eligibility evaluation logic (rules service)
 * - CAMARA adapters (SIM Swap, Reachability)
 * - Signal storage (repository)
 */
@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [EligibilityController],
  providers: [
    // Core services
    EligibilityService,
    EligibilityRulesService,

    // CAMARA adapters
    OAuth2ClientService,
    SimSwapService,
    ReachabilityService,

    // Guards
    ConsentGuard,
  ],
  exports: [EligibilityService, EligibilityRulesService],
})
export class EligibilityModule {}
