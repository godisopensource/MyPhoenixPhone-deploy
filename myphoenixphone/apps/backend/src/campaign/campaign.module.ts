import { Module } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { PrismaModule } from '../database/prisma.module';
import { DormantModule } from '../dormant/dormant.module';
import { NudgeModule } from '../nudge/nudge.module';

@Module({
  imports: [PrismaModule, DormantModule, NudgeModule],
  providers: [CampaignService],
  controllers: [CampaignController],
  exports: [CampaignService],
})
export class CampaignModule {}
