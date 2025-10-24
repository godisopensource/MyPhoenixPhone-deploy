import {
  Controller,
  Post,
  Get,
  Query,
  Redirect,
  BadRequestException,
  InternalServerErrorException,
  Session,
  Body,
  HttpCode,
  Logger as NestLogger,
} from '@nestjs/common';
import { AuthFranceService } from '../auth-france/auth-france.service';
import { ConsentRepository } from './consent.repository';
import * as crypto from 'crypto';

/**
 * DTO for POST /consents/start
 */
export class StartConsentDto {
  msisdn?: string; // Optional: if provided, can validate phone number early
}

/**
 * DTO for POST /consents/revoke
 */
export class RevokeConsentDto {
  consentId: string;
}

/**
 * Session object shape (used with @Session() decorator)
 */
interface AuthSession {
  authState?: string;
  authNonce?: string;
  msisdn_hash?: string;
}

/**
 * Consent Controller
 * Handles authentication flow via Authentication France OIDC
 */
@Controller('consents')
export class ConsentController {
  private readonly logger = new NestLogger(ConsentController.name);

  constructor(
    private readonly authFranceService: AuthFranceService,
    private readonly consentRepository: ConsentRepository,
  ) {}

  /**
   * POST /consents/start
   * Initiates the consent flow by redirecting to Authentication France
   *
   * @returns Redirect to Auth France authorization endpoint
   */
  @Post('start')
  @Redirect()
  startConsent(@Body() _dto: StartConsentDto, @Session() session: AuthSession) {
    try {
      const { authUrl, state, nonce } = this.authFranceService.startAuth();

      // Store state and nonce in session for callback validation
      session.authState = state;
      session.authNonce = nonce;

      this.logger.debug(`Initiated consent flow with state=${state}`);

      return {
        url: authUrl,
        statusCode: 302,
      };
    } catch (error) {
      this.logger.error(
        `Failed to start consent flow: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      );
      throw new InternalServerErrorException('Failed to start consent flow');
    }
  }

  /**
   * GET /consents/callback
   * Handles the authorization callback from Authentication France
   * Exchanges code for tokens, validates nonce/state, stores consent proof
   *
   * @param code Authorization code from Auth France
   * @param state State parameter for CSRF validation
   * @param error Error from Auth France (if auth failed)
   * @param errorDescription Error description from Auth France
   * @param session Express session (or similar)
   * @returns Consent stored message or error
   */
  @Get('callback')
  @HttpCode(200)
  async handleCallback(
    @Session() session: AuthSession,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string,
  ) {
    // Handle explicit error from Auth France
    if (error) {
      this.logger.warn(
        `Auth France returned error: ${error}. Description: ${errorDescription || 'none'}`,
      );
      throw new BadRequestException(
        `Authentication failed: ${errorDescription || error}`,
      );
    }

    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }

    if (!state) {
      throw new BadRequestException('Missing state parameter');
    }

    const storedState = session.authState;
    const storedNonce = session.authNonce;

    if (!storedState || !storedNonce) {
      this.logger.warn('Session state/nonce missing for callback');
      throw new BadRequestException(
        'Invalid session state. Please restart the consent flow.',
      );
    }

    try {
      // Exchange code for tokens and validate
      const { idToken, claims, scopes } =
        await this.authFranceService.handleCallback(
          code,
          state,
          storedState,
          storedNonce,
        );

      // Hash MSISDN if present in claims
      const msisdnHash = claims.phone_number
        ? this.hashMsisdn(claims.phone_number)
        : undefined;

      if (!msisdnHash) {
        this.logger.warn('No phone_number in ID token claims');
        throw new BadRequestException(
          'No phone number in authorization response',
        );
      }

      // Store consent proof in database
      const consent = await this.consentRepository.create({
        msisdn_hash: msisdnHash,
        scopes,
        proof: {
          id_token: idToken,
          user_id: claims.sub,
          iss: claims.iss,
          aud: claims.aud,
          phone_number_verified: claims.phone_number_verified || false,
          issued_at: new Date().toISOString(),
        },
      });

      // Clear auth state from session
      delete session.authState;
      delete session.authNonce;
      session.msisdn_hash = msisdnHash;

      this.logger.debug(
        `Consent stored for msisdn_hash=${msisdnHash}, consentId=${consent.id}`,
      );

      return {
        ok: true,
        consentId: consent.id,
        msisdn_hash: msisdnHash,
        scopes,
        message: 'Consent stored successfully',
      };
    } catch (error) {
      this.logger.error(
        `Callback handling failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      );
      throw error instanceof BadRequestException
        ? error
        : new InternalServerErrorException('Failed to process callback');
    }
  }

  /**
   * POST /consents/revoke
   * Revoke a stored consent
   *
   * @param dto Contains consentId
   * @returns Revocation confirmation
   */
  @Post('revoke')
  @HttpCode(200)
  async revokeConsent(@Body() dto: RevokeConsentDto) {
    if (!dto.consentId) {
      throw new BadRequestException('Missing consentId');
    }

    try {
      const consent = await this.consentRepository.findById(dto.consentId);

      if (!consent) {
        throw new BadRequestException('Consent not found');
      }

      const revoked = await this.consentRepository.revoke(
        dto.consentId,
        new Date(),
      );

      this.logger.debug(`Consent revoked: consentId=${dto.consentId}`);

      return {
        ok: true,
        revokedAt: revoked.revoked_at,
        message: 'Consent revoked successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to revoke consent: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      );
      throw error instanceof BadRequestException
        ? error
        : new InternalServerErrorException('Failed to revoke consent');
    }
  }

  /**
   * Hash MSISDN using salted SHA-256
   * Uses SALT_MSISDN_HASH from environment
   *
   * @param msisdn Phone number (E.164 format)
   * @returns Hashed MSISDN
   */
  private hashMsisdn(msisdn: string): string {
    const salt = process.env.SALT_MSISDN_HASH || 'default-salt';
    return crypto.createHash('sha256').update(`${salt}${msisdn}`).digest('hex');
  }
}
