import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { ConsentRepository } from '../consent/consent.repository';
import { EligibilitySignalRepository } from '../eligibility/eligibility.repository';

@Module({
  imports: [PrismaModule],
  providers: [ConsentRepository, EligibilitySignalRepository],
  exports: [ConsentRepository, EligibilitySignalRepository],
})
export class StorageModule {}
