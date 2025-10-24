import { Module } from '@nestjs/common';
import { CopyService } from './copy.service';

@Module({
  providers: [CopyService],
  exports: [CopyService],
})
export class CopyModule {}
