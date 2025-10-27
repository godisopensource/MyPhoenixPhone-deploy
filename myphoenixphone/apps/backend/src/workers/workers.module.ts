import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../database/prisma.module';
import { DormantDetectionService } from './dormant-detection.service';
import { CohortBuilderService } from './cohort-builder.service';
import { DailyRefreshService } from './daily-refresh.service';
import { WorkersScheduler } from './workers.scheduler';
import { WorkersController } from './workers.controller';

// Import Camara services directly since there's no CamaraModule
import { OAuth2ClientService } from '../camara/oauth2-client.service';
import { ReachabilityService } from '../camara/reachability.service';
import { SimSwapService } from '../camara/sim-swap.service';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable cron scheduling
    PrismaModule,
  ],
  providers: [
    // Camara services
    OAuth2ClientService,
    ReachabilityService,
    SimSwapService,
    // Worker services
    DormantDetectionService,
    CohortBuilderService,
    DailyRefreshService,
    WorkersScheduler,
  ],
  controllers: [WorkersController],
  exports: [DormantDetectionService, CohortBuilderService, DailyRefreshService],
})
export class WorkersModule {}
