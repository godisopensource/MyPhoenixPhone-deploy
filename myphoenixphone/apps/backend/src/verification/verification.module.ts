import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { NumberVerificationService } from './number-verification.service';
import { CaptchaGuard } from './captcha.guard';
import { OAuth2ClientService } from '../camara/oauth2-client.service';

/**
 * Module for number verification with CAPTCHA protection
 * Implements BE-04: Number Verification + Captcha middleware
 */
@Module({
  controllers: [VerificationController],
  providers: [
    NumberVerificationService,
    CaptchaGuard,
    OAuth2ClientService,
  ],
  exports: [NumberVerificationService, CaptchaGuard],
})
export class VerificationModule {}
