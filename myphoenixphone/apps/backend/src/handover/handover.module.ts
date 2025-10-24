import { Module } from '@nestjs/common';
import { HandoverService } from './handover.service';
import { HandoverController } from './handover.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [HandoverService],
  controllers: [HandoverController],
  exports: [HandoverService],
})
export class HandoverModule {}
