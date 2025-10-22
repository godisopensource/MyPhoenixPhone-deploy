import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

/**
 * OIDC token response from Authentication France
 */
interface OIDCTokenResponse {
  access_token: string;
  token_type: string;
  id_token: string;
  expires_in: number;
  scope?: string;
}

/**
 * Decoded OIDC ID Token claims (partial)
 */
interface IDTokenClaims {
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  nonce?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  [key: string]: any;
}

/**
 * Auth France OIDC Authorization Code flow handler
 * Manages authentication start, callback handling, and state/nonce validation
 */
@Injectable()
export class AuthFranceService {
  private readonly logger = new Logger(AuthFranceService.name);

  constructor() {
    this.validateConfig();
  }

  /**
   * Validate required environment variables at service initialization
   */
  private validateConfig(): void {
    const required = [
      'AUTH_FR_CLIENT_ID',
      'AUTH_FR_CLIENT_SECRET',
      'AUTH_FR_ISSUER',
      'AUTH_FR_REDIRECT_URI',
    ];

    for (const key of required) {
      if (!process.env[key]) {
        this.logger.warn(
          `Missing environment variable: ${key}. Auth France integration may not work.`,
        );
      }
    }
  }

  /**
   * Generate a random state parameter for CSRF protection
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a random nonce parameter for ID Token validation
   */
  private generateNonce(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Build the authorization URL to redirect the user to Auth France
   * Returns { authUrl, state, nonce } for client to store in session
   *
   * Orange Authentication France uses standard OIDC endpoints:
   * - Production: https://login.orange.fr/oauth/authorize and /oauth/token
   * - Sandbox: https://login.sandbox.orange.fr/oauth/authorize and /oauth/token
   */
  startAuth(): { authUrl: string; state: string; nonce: string } {
    const clientId = process.env.AUTH_FR_CLIENT_ID || '';
    const issuer = process.env.AUTH_FR_ISSUER || '';
    const redirectUri = process.env.AUTH_FR_REDIRECT_URI || '';

    if (!clientId || !issuer || !redirectUri) {
      throw new Error(
        'Missing Auth France configuration: CLIENT_ID, ISSUER, or REDIRECT_URI',
      );
    }

    const state = this.generateState();
    const nonce = this.generateNonce();

    // Orange Authentication France authorization endpoint
    // issuer should be: https://login.orange.fr (production) or https://login.sandbox.orange.fr (sandbox)
    const authEndpoint = `${issuer}/oauth/authorize`;

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('redirect_uri', redirectUri);
    params.append('response_type', 'code');
    params.append('scope', 'openid profile phone email');
    params.append('state', state);
    params.append('nonce', nonce);

    const authUrl = `${authEndpoint}?${params.toString()}`;

    this.logger.debug(`Generated auth URL for state=${state}, nonce=${nonce}`);

    return { authUrl, state, nonce };
  }

  /**
   * Handle the authorization callback
   * Exchange code for tokens, validate ID token, and extract claims
   *
   * Orange Authentication France token endpoint: {issuer}/oauth/token
   * issuer should be: https://login.orange.fr (production) or https://login.sandbox.orange.fr (sandbox)
   *
   * @param code Authorization code from Auth France
   * @param state State parameter (must match what was stored in session)
   * @param storedState Stored state from session
   * @param storedNonce Stored nonce from session
   * @returns Proof object containing id_token, claims, and scopes
   */
  async handleCallback(
    code: string,
    state: string,
    storedState: string,
    storedNonce: string,
  ): Promise<{
    idToken: string;
    claims: IDTokenClaims;
    scopes: string[];
  }> {
    // Validate state parameter (CSRF protection)
    if (state !== storedState) {
      this.logger.warn(
        `State mismatch: received ${state}, expected ${storedState}`,
      );
      throw new BadRequestException('Invalid state parameter');
    }

    const clientId = process.env.AUTH_FR_CLIENT_ID || '';
    const clientSecret = process.env.AUTH_FR_CLIENT_SECRET || '';
    const issuer = process.env.AUTH_FR_ISSUER || '';
    const redirectUri = process.env.AUTH_FR_REDIRECT_URI || '';

    if (!clientId || !clientSecret || !issuer || !redirectUri) {
      throw new Error('Missing Auth France configuration');
    }

    try {
      // Orange Authentication France token endpoint
      const tokenEndpoint = `${issuer}/oauth/token`;
      const tokenResponse = await axios.post<OIDCTokenResponse>(
        tokenEndpoint,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        },
      );

      const { access_token, id_token, scope } = tokenResponse.data;

      // Decode ID token and validate nonce
      // NOTE: In production, verify the JWT signature using the issuer's public key
      const claims = this.decodeIDToken(id_token);

      if (claims.nonce !== storedNonce) {
        this.logger.warn(
          `Nonce mismatch: received ${claims.nonce}, expected ${storedNonce}`,
        );
        throw new BadRequestException('Invalid nonce parameter');
      }

      this.logger.debug(
        `Callback successful for user ${claims.sub}, scopes: ${scope || 'none'}`,
      );

      return {
        idToken: id_token,
        claims,
        scopes: (scope || '').split(' ').filter(Boolean),
      };
    } catch (error) {
      this.logger.error(
        `Token exchange failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      );
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `Token endpoint response: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new BadRequestException('Failed to exchange authorization code');
    }
  }

  /**
   * Decode an ID token (WITHOUT verifying signature for now)
   * In production, verify the JWT signature against the issuer's public key
   *
   * @param idToken JWT ID token
   * @returns Decoded token claims
   */
  private decodeIDToken(idToken: string): IDTokenClaims {
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      // Decode payload (second part)
      const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
      const claims = JSON.parse(payload);

      return claims;
    } catch (error) {
      this.logger.error(
        `Failed to decode ID token: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      );
      throw new BadRequestException('Invalid ID token');
    }
  }
}
