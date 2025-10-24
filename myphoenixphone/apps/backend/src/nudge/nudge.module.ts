import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { DormantModule } from '../dormant/dormant.module';
import { LeadTrackingService } from './lead-tracking.service';
import { OrangeSmsService } from './sms.service';

/**
 * Nudge Module
 * Gère la génération de leads traçables et l'envoi de SMS via Orange API
 */
@Module({
  imports: [PrismaModule, DormantModule],
  providers: [LeadTrackingService, OrangeSmsService],
  exports: [LeadTrackingService, OrangeSmsService],
})
export class NudgeModule {}
