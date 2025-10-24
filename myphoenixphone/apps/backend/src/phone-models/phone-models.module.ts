import { Module } from '@nestjs/common';
import { PhoneModelsService } from './phone-models.service';
import { PhoneModelsController } from './phone-models.controller';

@Module({
  providers: [PhoneModelsService],
  controllers: [PhoneModelsController],
  exports: [PhoneModelsService],
})
export class PhoneModelsModule {}
