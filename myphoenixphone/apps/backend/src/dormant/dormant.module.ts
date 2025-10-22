import { Module } from '@nestjs/common';
import { DormantDetectorService } from './dormant-detector.service';
import { NetworkEventService } from './network-event.service';
import { DormantController } from './dormant.controller';
import { PrismaModule } from '../database/prisma.module';
import { ReachabilityService } from '../camara/reachability.service';
import { OAuth2ClientService } from '../camara/oauth2-client.service';

@Module({
  imports: [PrismaModule],
  providers: [
    DormantDetectorService,
    NetworkEventService,
    ReachabilityService,
    OAuth2ClientService,
  ],
  controllers: [DormantController],
  exports: [DormantDetectorService, NetworkEventService],
})
export class DormantModule {}
