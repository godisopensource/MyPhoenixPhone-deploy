import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * OAuth2 token response from CAMARA token endpoint
 */
interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

/**
 * Cached token with expiration
 */
interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * OAuth2 Client Credentials flow handler for CAMARA APIs
 * Manages token caching and automatic refresh
 */
@Injectable()
export class OAuth2ClientService {
  private readonly logger = new Logger(OAuth2ClientService.name);
  private readonly httpClient: AxiosInstance;
  private tokenCache: CachedToken | null = null;

  constructor() {
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * Get a valid access token (from cache or by requesting a new one)
   * Uses OAuth2 Client Credentials flow
   *
   * @returns Access token string
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a cached valid token
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60000) {
      this.logger.debug('Using cached access token');
      return this.tokenCache.accessToken;
    }

    // Request new token
    this.logger.debug('Requesting new access token');
    const token = await this.requestAccessToken();

    // Cache with expiration (subtract 60s for safety margin)
    this.tokenCache = {
      accessToken: token.access_token,
      expiresAt: Date.now() + (token.expires_in - 60) * 1000,
    };

    return token.access_token;
  }

  /**
   * Request a new access token using client credentials
   */
  private async requestAccessToken(): Promise<OAuth2TokenResponse> {
    // Choose token endpoint. If CAMARA_TOKEN_URL is provided, prefer it.
    // For the Orange CAMARA playground the API expects the OpenID Connect playground token endpoint.
    const clientId = process.env.CAMARA_CLIENT_ID;
    const clientSecret = process.env.CAMARA_CLIENT_SECRET;
    const explicitTokenUrl = process.env.CAMARA_TOKEN_URL;
    const camaraBase = process.env.CAMARA_BASE_URL || '';
    const camaraEnv = process.env.CAMARA_ENV;

    const tokenUrl =
      explicitTokenUrl ||
      (camaraEnv === 'playground' || camaraBase.includes('playground')
        ? 'https://api.orange.com/openidconnect/playground/v1.0/token'
        : 'https://api.orange.com/oauth/v3/token');

    if (!tokenUrl || !clientId || !clientSecret) {
      throw new Error(
        'Missing OAuth2 configuration: CAMARA_TOKEN_URL (or CAMARA_BASE_URL), CAMARA_CLIENT_ID, or CAMARA_CLIENT_SECRET',
      );
    }

    try {
      // Some Orange token endpoints accept Basic auth; use Basic auth to be compatible.
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');

      const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

      const response = await this.httpClient.post<OAuth2TokenResponse>(
        tokenUrl,
        params.toString(),
        { headers: { Authorization: authHeader } },
      );

      this.logger.debug(
        `Access token obtained, expires in ${response.data.expires_in}s`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to obtain access token: ${error.message}`);
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `Token endpoint response: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new Error(`OAuth2 token request failed: ${error.message}`);
    }
  }

  /**
   * Clear cached token (useful for testing or forced refresh)
   */
  clearTokenCache(): void {
    this.tokenCache = null;
    this.logger.debug('Token cache cleared');
  }
}
