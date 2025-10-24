import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsMiddleware } from './metrics/metrics.middleware';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';
import { PrismaModule } from './database/prisma.module';
import { StorageModule } from './storage/storage.module';
import { EligibilityModule } from './eligibility/eligibility.module';
import { VerificationModule } from './verification/verification.module';
import { ConsentModule } from './consent/consent.module';
import { DormantModule } from './dormant/dormant.module';
import { PricingModule } from './pricing/pricing.module';
import { CampaignModule } from './campaign/campaign.module';
import { NudgeModule } from './nudge/nudge.module';
import { HandoverModule } from './handover/handover.module';
import { PhoneModelsModule } from './phone-models/phone-models.module';

@Module({
  imports: [
    HealthModule,
    PrismaModule,
    StorageModule,
    EligibilityModule,
    VerificationModule,
    ConsentModule,
    DormantModule,
    PricingModule,
    CampaignModule,
    NudgeModule,
    HandoverModule,
    PhoneModelsModule,
  ],
  controllers: [AppController, MetricsController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware, MetricsMiddleware).forRoutes('*');
  }
}
