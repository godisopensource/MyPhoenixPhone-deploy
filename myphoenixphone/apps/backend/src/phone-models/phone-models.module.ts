import { Module } from '@nestjs/common';
import { PhoneModelsService } from './phone-models.service';
import { PhoneModelsController } from './phone-models.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  providers: [PhoneModelsService, PrismaService],
  controllers: [PhoneModelsController],
  exports: [PhoneModelsService],
})
export class PhoneModelsModule {}
