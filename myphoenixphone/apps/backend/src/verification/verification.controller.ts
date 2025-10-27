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
import { ConsentRepository } from '../consent/consent.repository';
import * as crypto from 'crypto';

/**
 * Device selection from user
 */
export interface DeviceSelection {
  manufacturer?: string;
  model?: string;
  variant?: string;
  /** Special selections: 'not_found' | 'unknown_brand' | 'unknown_model' */
  selection?: 'not_found' | 'unknown_brand' | 'unknown_model';
}

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

  /** Device selection from user (optional - collected during verification flow) */
  deviceSelection?: DeviceSelection;
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

  /** Verification code (only in demo/playground mode for testing) */
  code?: string;
}

/**
 * Controller for number verification with CAPTCHA protection
 * Implements BE-04: Number Verification + Captcha middleware
 */
@Controller('verify')
export class VerificationController {
  constructor(
    private readonly numberVerificationService: NumberVerificationService,
    private readonly consentRepository: ConsentRepository,
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
    console.log(
      `[VerificationController] Processing verification for MSISDN hash: ${msisdnHash}`,
    );

    try {
      const result = await this.numberVerificationService.verifyNumber(
        dto.phoneNumber,
        dto.code,
      );

      if (result.codeSent) {
        console.log(
          `[VerificationController] Verification code sent to MSISDN hash: ${msisdnHash}`,
        );
        
        // In demo/playground mode, include the code in the response for easy testing
        const isDemoMode = process.env.CAMARA_ENV === 'playground' || 
                          process.env.USE_MCP_PROXY === 'true' ||
                          !!process.env.MCP_PROXY_URL;
        
        console.log(`[VerificationController] Demo mode check: isDemoMode=${isDemoMode}, CAMARA_ENV=${process.env.CAMARA_ENV}, USE_MCP_PROXY=${process.env.USE_MCP_PROXY}, MCP_PROXY_URL=${process.env.MCP_PROXY_URL}, result.code=${result.code}`);
        
        const response: VerifyNumberResponse = {
          ok: true,
          codeSent: true,
          message: 'Verification code sent successfully',
        };
        
        if (isDemoMode && result.code) {
          response.code = result.code;
          console.log(`[VerificationController] 🔐 DEMO CODE: ${result.code}`);
        } else if (isDemoMode && !result.code) {
          console.log(`[VerificationController] ⚠️ Demo mode active but no code returned from service`);
        }
        
        return response;
      }

      if (result.verified) {
        console.log(
          `[VerificationController] Number verified successfully for MSISDN hash: ${msisdnHash}`,
        );

        // Create a consent record after successful verification
        // This allows the user to access /eligibility without going through Auth France flow
        try {
          await this.consentRepository.create({
            msisdn_hash: msisdnHash,
            scopes: ['number_verification'],
            proof: {
              verification_method: 'sms_code',
              verified_at: new Date().toISOString(),
              channel: 'web',
              device_selection: dto.deviceSelection || null,
            },
          });
          console.log(
            `[VerificationController] Consent created for MSISDN hash: ${msisdnHash}`,
          );
        } catch (consentError) {
          console.error(
            `[VerificationController] Failed to create consent:`,
            consentError,
          );
          // Don't fail the verification if consent creation fails
        }

        return {
          ok: true,
          codeSent: false,
          message: 'Phone number verified successfully',
        };
      }

      console.log(
        `[VerificationController] Number verification failed for MSISDN hash: ${msisdnHash}`,
      );
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
   * Temporary debug endpoint that performs number verification without CAPTCHA.
   * Useful for local testing to isolate CAMARA / network issues from CAPTCHA failures.
   * NOTE: This endpoint should not be exposed in production.
   */
  @Post('debug-number')
  @HttpCode(HttpStatus.OK)
  async debugVerifyNumber(
    @Body() dto: VerifyNumberDto,
  ): Promise<VerifyNumberResponse> {
    if (!this.isValidE164(dto.phoneNumber)) {
      throw new BadRequestException(
        'Invalid phone number format (expected E.164, e.g., +33612345678)',
      );
    }

    const msisdnHash = this.hashMsisdn(dto.phoneNumber);
    console.log(
      `[VerificationController][DEBUG] Processing verification for MSISDN hash: ${msisdnHash}`,
    );

    try {
      const result = await this.numberVerificationService.verifyNumber(
        dto.phoneNumber,
        dto.code,
      );

      if (result.codeSent) {
        console.log(
          `[VerificationController][DEBUG] Verification code sent to MSISDN hash: ${msisdnHash}`,
        );
        return {
          ok: true,
          codeSent: true,
          message: 'Verification code sent successfully (debug)',
        };
      }

      if (result.verified) {
        console.log(
          `[VerificationController][DEBUG] Number verified successfully for MSISDN hash: ${msisdnHash}`,
        );

        // Create a consent record after successful verification
        try {
          await this.consentRepository.create({
            msisdn_hash: msisdnHash,
            scopes: ['number_verification'],
            proof: {
              verification_method: 'sms_code_debug',
              verified_at: new Date().toISOString(),
              channel: 'web',
              device_selection: dto.deviceSelection || null,
            },
          });
          console.log(
            `[VerificationController][DEBUG] Consent created for MSISDN hash: ${msisdnHash}`,
          );
        } catch (consentError) {
          console.error(
            `[VerificationController][DEBUG] Failed to create consent:`,
            consentError,
          );
        }

        return {
          ok: true,
          codeSent: false,
          message: 'Phone number verified successfully (debug)',
        };
      }

      console.log(
        `[VerificationController][DEBUG] Number verification failed for MSISDN hash: ${msisdnHash}`,
      );
      return {
        ok: false,
        codeSent: false,
        message: 'Phone number verification failed (debug)',
      };
    } catch (error) {
      console.error(
        `[VerificationController][DEBUG] Error verifying number for MSISDN hash ${msisdnHash}:`,
        error instanceof Error ? error.message : error,
      );
      throw new BadRequestException(
        `Failed to verify phone number (debug): ${error instanceof Error ? error.message : String(error)}`,
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
