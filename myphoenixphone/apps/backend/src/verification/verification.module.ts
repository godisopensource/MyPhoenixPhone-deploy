import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { NumberVerificationService } from './number-verification.service';
import { CaptchaGuard } from './captcha.guard';
import { OAuth2ClientService } from '../camara/oauth2-client.service';
import { ConsentModule } from '../consent/consent.module';

/**
 * Module for number verification with CAPTCHA protection
 * Implements BE-04: Number Verification + Captcha middleware
 */
@Module({
  imports: [ConsentModule],
  controllers: [VerificationController],
  providers: [
    NumberVerificationService,
    CaptchaGuard,
    OAuth2ClientService,
  ],
  exports: [NumberVerificationService, CaptchaGuard],
})
export class VerificationModule {}
