import { Injectable } from '@nestjs/common';
import { OAuth2ClientService } from '../camara/oauth2-client.service';

/**
 * Result of number verification with code
 */
export interface NumberVerificationResult {
  /** Whether the device phone number matches the provided phone number */
  devicePhoneNumberVerified: boolean;
}

/**
 * Service for CAMARA Number Verification API
 * Verifies that a phone number matches the device's phone number
 * using SMS code verification flow
 */
@Injectable()
export class NumberVerificationService {
  private readonly baseUrl: string;

  constructor(private readonly oauth2Client: OAuth2ClientService) {
    const env = process.env.CAMARA_ENV || 'playground';
    this.baseUrl =
      env === 'playground'
        ? 'https://api.orange.com/camara/playground/api/number-verification/v0.3'
        : process.env.CAMARA_BASE_URL + '/number-verification/v0.3';
  }

  /**
   * Verify a phone number by sending a verification code via SMS
   * This initiates the verification flow
   *
   * @param phoneNumber - Phone number in E.164 format (e.g., +33612345678)
   * @returns Promise that resolves when code is sent
   */
  async sendVerificationCode(phoneNumber: string): Promise<void> {
    const accessToken = await this.oauth2Client.getAccessToken();

    const request = {
      phoneNumber,
    };

    const response = await fetch(`${this.baseUrl}/verify-with-code/send-code`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        status: response.status,
        code: 'UNKNOWN_ERROR',
        message: response.statusText,
      }));

      throw new Error(
        `Number Verification send-code failed: ${errorData.status} ${errorData.code} - ${errorData.message}`,
      );
    }

    // Successfully sent code (204 No Content expected)
  }

  /**
   * Verify a phone number using the code received via SMS
   *
   * @param phoneNumber - Phone number in E.164 format (e.g., +33612345678)
   * @param code - Verification code received via SMS
   * @returns Promise with verification result
   */
  async verifyCode(
    phoneNumber: string,
    code: string,
  ): Promise<NumberVerificationResult> {
    const accessToken = await this.oauth2Client.getAccessToken();

    const request = {
      phoneNumber,
      code,
    };

    const response = await fetch(`${this.baseUrl}/verify-with-code/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        status: response.status,
        code: 'UNKNOWN_ERROR',
        message: response.statusText,
      }));

      throw new Error(
        `Number Verification verify-code failed: ${errorData.status} ${errorData.code} - ${errorData.message}`,
      );
    }

    const result = await response.json();
    return result as NumberVerificationResult;
  }

  /**
   * Combined method to send code and verify in one call
   * This is a convenience method for the common flow
   *
   * @param phoneNumber - Phone number in E.164 format (e.g., +33612345678)
   * @param code - Verification code (if already sent, otherwise will send first)
   * @returns Promise with verification result
   */
  async verifyNumber(
    phoneNumber: string,
    code?: string,
  ): Promise<{ codeSent: boolean; verified?: boolean }> {
    if (!code) {
      // Only send code
      await this.sendVerificationCode(phoneNumber);
      return { codeSent: true };
    }

    // Verify with provided code
    const result = await this.verifyCode(phoneNumber, code);
    return {
      codeSent: false,
      verified: result.devicePhoneNumberVerified,
    };
  }
}
