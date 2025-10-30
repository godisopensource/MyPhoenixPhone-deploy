import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { ConsentRepository } from '../consent/consent.repository';
import { createHash } from 'crypto';

/**
 * Consent guard - validates that user has given consent before accessing protected resources
 *
 * Current implementation (simplified):
 * - Checks for consent proof in database by hashed MSISDN
 * - Can be enhanced with JWT validation when BE-03 (Auth France) is implemented
 *
 * Future enhancements (when BE-03 is complete):
 * - Validate JWT token from Authentication France
 * - Check token scopes match required permissions
 * - Verify token signature and expiration
 */
@Injectable()
export class ConsentGuard implements CanActivate {
  private readonly logger = new Logger(ConsentGuard.name);

  constructor(private readonly consentRepository: ConsentRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract phone number from query parameters
    const phoneNumber = request.query.phoneNumber as string;

    if (!phoneNumber) {
      this.logger.warn(
        'Consent check failed: phoneNumber missing from request',
      );
      throw new UnauthorizedException('Phone number is required');
    }

    // Validate E.164 format
    if (!this.isValidE164(phoneNumber)) {
      this.logger.warn('Consent check failed: invalid phone number format');
      throw new UnauthorizedException(
        'Invalid phone number format (expected E.164)',
      );
    }

    // Hash MSISDN for lookup (SEC-01 requirement)
    const msisdnHash = this.hashMsisdn(phoneNumber);

    // Check for valid consent in database
    const consents = await this.consentRepository.findByMsisdnHash(msisdnHash);
    const validConsents = consents.filter((c) => !c.revoked_at);

    if (validConsents.length === 0) {
      this.logger.warn('Consent check failed: no valid consent found');
      throw new UnauthorizedException(
        'No valid consent found. Please complete the consent flow first.',
      );
    }

    this.logger.debug(
      `Consent check passed for hashed MSISDN: ${msisdnHash.substring(0, 12)}...`,
    );

    // Attach consent info to request for downstream use
    request['consent'] = validConsents[0];

    return true;
  }

  /**
   * Validate E.164 format (+[country code][number])
   */
  private isValidE164(phoneNumber: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
  }

  /**
   * Hash MSISDN using SHA-256 with salt
   * Must match the hashing in VerificationController
   */
  private hashMsisdn(msisdn: string): string {
    const salt = process.env.SALT_MSISDN_HASH || '';
    return createHash('sha256').update(salt + msisdn).digest('hex');
  }
}
