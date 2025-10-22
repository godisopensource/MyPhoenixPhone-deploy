import { Module } from '@nestjs/common';
import { ConsentController } from './consent.controller';
import { ConsentRepository } from './consent.repository';
import { AuthFranceService } from '../auth-france/auth-france.service';
import { PrismaModule } from '../database/prisma.module';

/**
 * Consent Module
 * Handles authentication via Authentication France and consent storage
 *
 * Exports: none (internal use only)
 * Provides: ConsentController, ConsentRepository, AuthFranceService
 */
@Module({
  imports: [PrismaModule],
  controllers: [ConsentController],
  providers: [AuthFranceService, ConsentRepository],
  exports: [ConsentRepository],
})
export class ConsentModule {}
