import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CaptchaGuard } from './captcha.guard';
import { NumberVerificationService } from './number-verification.service';
import * as crypto from 'crypto';

/**
 * DTO for number verification request
 */
export class VerifyNumberDto {
  /** Phone number in E.164 format (e.g., +33612345678) */
  phoneNumber: string;

  /** CAPTCHA token from frontend */
  captchaToken: string;

  /** Verification code received via SMS (optional - if not provided, code will be sent) */
  code?: string;
}

/**
 * Response for number verification
 */
export interface VerifyNumberResponse {
  /** Whether the verification was successful */
  ok: boolean;

  /** Whether a code was sent (true if code not provided in request) */
  codeSent?: boolean;

  /** Message describing the result */
  message: string;
}

/**
 * Controller for number verification with CAPTCHA protection
 * Implements BE-04: Number Verification + Captcha middleware
 */
@Controller('verify')
export class VerificationController {
  constructor(
    private readonly numberVerificationService: NumberVerificationService,
  ) {}

  /**
   * POST /verify/number
   * Verify a phone number with CAPTCHA protection
   * Can be called in two ways:
   * 1. Without code: sends verification code via SMS
   * 2. With code: verifies the code
   *
   * @param dto - Phone number, CAPTCHA token, and optional verification code
   * @returns Verification result
   */
  @Post('number')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CaptchaGuard)
  async verifyNumber(
    @Body() dto: VerifyNumberDto,
  ): Promise<VerifyNumberResponse> {
    // Validate phone number format (E.164)
    if (!this.isValidE164(dto.phoneNumber)) {
      throw new BadRequestException(
        'Invalid phone number format (expected E.164, e.g., +33612345678)',
      );
    }

    // Hash MSISDN for logging (SEC-01)
    const msisdnHash = this.hashMsisdn(dto.phoneNumber);
    console.log(`[VerificationController] Processing verification for MSISDN hash: ${msisdnHash}`);

    try {
      const result = await this.numberVerificationService.verifyNumber(
        dto.phoneNumber,
        dto.code,
      );

      if (result.codeSent) {
        console.log(`[VerificationController] Verification code sent to MSISDN hash: ${msisdnHash}`);
        return {
          ok: true,
          codeSent: true,
          message: 'Verification code sent successfully',
        };
      }

      if (result.verified) {
        console.log(`[VerificationController] Number verified successfully for MSISDN hash: ${msisdnHash}`);
        return {
          ok: true,
          codeSent: false,
          message: 'Phone number verified successfully',
        };
      }

      console.log(`[VerificationController] Number verification failed for MSISDN hash: ${msisdnHash}`);
      return {
        ok: false,
        codeSent: false,
        message: 'Phone number verification failed',
      };
    } catch (error) {
      console.error(
        `[VerificationController] Error verifying number for MSISDN hash ${msisdnHash}:`,
        error instanceof Error ? error.message : error,
      );
      throw new BadRequestException(
        'Failed to verify phone number. Please check your phone number and code.',
      );
    }
  }

  /**
   * Validate phone number format (E.164: +[country code][subscriber number])
   */
  private isValidE164(phoneNumber: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
  }

  /**
   * Hash MSISDN using SHA-256 with salt (SEC-01)
   * Never log or store raw MSISDN
   */
  private hashMsisdn(msisdn: string): string {
    const salt = process.env.SALT_MSISDN_HASH || '';
    return crypto
      .createHash('sha256')
      .update(salt + msisdn)
      .digest('hex');
  }
}
