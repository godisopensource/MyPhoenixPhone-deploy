import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { OAuth2ClientService } from './oauth2-client.service';

/**
 * Result from CAMARA SIM Swap retrieve-date endpoint
 */
export type SimSwapRetrieveDateResult = {
  latestSimChange: string | null;
  monitoredPeriod?: number;
};

/**
 * Result from CAMARA SIM Swap check endpoint
 */
export type SimSwapCheckResult = {
  swapped: boolean;
};

/**
 * Normalized result for eligibility checks
 */
export type SimSwapResult = {
  swappedAt?: string;
  swapped?: boolean;
  monitoredPeriod?: number;
};

/**
 * CAMARA SIM Swap API adapter
 * Implements POST /sim-swap/v2/retrieve-date and POST /sim-swap/v2/check
 *
 * Spec: https://github.com/camaraproject/SimSwap/blob/main/code/API_definitions/sim-swap.yaml
 * Orange Sandbox: https://developer.orange.com/apis/camara-sandbox-simswap-orange-lab/
 */
@Injectable()
export class SimSwapService {
  private readonly logger = new Logger(SimSwapService.name);
  private readonly baseUrl: string;
  private readonly isPlayground: boolean;
  private readonly httpClient: AxiosInstance;
  private readonly useRealApi: boolean;

  constructor(private readonly oauth2Client: OAuth2ClientService) {
    let configuredBase = process.env.CAMARA_BASE_URL || 'http://localhost:9091';
    // Detect playground explicitly via CAMARA_ENV or fallback to baseUrl heuristic
    const camaraEnv = process.env.CAMARA_ENV;
    // If running against the Orange public host in playground mode, ensure we use the
    // orange-lab playground prefix which hosts the CAMARA sandbox APIs. This prevents
    // requests to https://api.orange.com/api/... which return 404 for playground routes.
    if (
      (camaraEnv === 'playground' || configuredBase.includes('playground')) &&
      configuredBase.includes('api.orange.com') &&
      !configuredBase.includes('orange-lab')
    ) {
      configuredBase = configuredBase.replace(/\/+$/,'') + '/orange-lab/camara/playground';
    }
    this.baseUrl = configuredBase;
    this.isPlayground = camaraEnv === 'playground' || this.baseUrl.includes('playground');
    this.useRealApi =
      !!process.env.CAMARA_CLIENT_ID && !!process.env.CAMARA_CLIENT_SECRET;

    this.httpClient = axios.create({
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (this.useRealApi) {
      this.logger.log('SimSwapService initialized with real API calls');
      this.logger.log(`SimSwapService CAMARA base URL: ${this.baseUrl}`);
    } else {
      this.logger.warn(
        'SimSwapService using stub mode (missing CAMARA credentials)',
      );
    }
  }

  /**
   * Retrieve the latest SIM swap date for a phone number
   * Uses CAMARA POST /retrieve-date endpoint
   *
   * @param phoneNumber - E.164 format phone number (e.g., +33612345678)
   * @returns SimSwapRetrieveDateResult with latestSimChange timestamp or null
   */
  async retrieveSimSwapDate(
    phoneNumber: string,
  ): Promise<SimSwapRetrieveDateResult> {
    this.logger.debug(`retrieveSimSwapDate for phone number`);

    if (!phoneNumber) {
      throw new HttpException(
        'Phone number is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Force stub mode for playground demos when explicitly enabled
    if (process.env.ELIGIBILITY_USE_PLAYGROUND_STUB === 'true') {
      this.logger.log('SimSwapService using PLAYGROUND stub (forced)');
      return {
        latestSimChange: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(), // 45 days ago
        monitoredPeriod: 120,
      };
    }

    // Use real API if credentials are configured
    if (this.useRealApi) {
      return this.retrieveSimSwapDateFromApi(phoneNumber);
    }

    // Fallback to stub for tests/local dev without credentials
    return this.retrieveSimSwapDateStub(phoneNumber);
  }

  /**
   * Real API call to CAMARA SIM Swap retrieve-date endpoint
   */
  private async retrieveSimSwapDateFromApi(
    phoneNumber: string,
  ): Promise<SimSwapRetrieveDateResult> {
    try {
      const accessToken = await this.oauth2Client.getAccessToken();
      // Playground sandbox uses a different path (includes /api and different versioning)
      const url = this.isPlayground
        ? `${this.baseUrl}/api/sim-swap/v1/retrieve-date`
        : `${this.baseUrl}/sim-swap/v2/retrieve-date`;

      this.logger.debug(`Calling CAMARA SIM Swap API: ${url}`);

      const response = await this.httpClient.post<SimSwapRetrieveDateResult>(
        url,
        { phoneNumber },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-correlator': this.generateCorrelationId(),
          },
        },
      );

      this.logger.debug(
        `SIM Swap API response: ${JSON.stringify(response.data)}`,
      );
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'retrieve-date');
    }
  }

  /**
   * Stub implementation for tests/local dev
   */
  private async retrieveSimSwapDateStub(
    phoneNumber: string,
  ): Promise<SimSwapRetrieveDateResult> {
    // Deterministic stub: if contains 'swapped' return a recent date
    if (phoneNumber.includes('swapped')) {
      return {
        latestSimChange: new Date(
          Date.now() - 1000 * 60 * 60 * 24,
        ).toISOString(),
        monitoredPeriod: 120,
      };
    }

    // No swap detected
    return { latestSimChange: null };
  }

  /**
   * Check if SIM swap occurred within maxAge hours
   * Uses CAMARA POST /check endpoint
   *
   * @param phoneNumber - E.164 format phone number
   * @param maxAge - Period in hours to check (1-2400, default 240)
   * @returns SimSwapCheckResult with swapped boolean
   */
  async checkSimSwap(
    phoneNumber: string,
    maxAge: number = 240,
  ): Promise<SimSwapCheckResult> {
    this.logger.debug(`checkSimSwap for phone number, maxAge=${maxAge}`);

    if (!phoneNumber) {
      throw new HttpException(
        'Phone number is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (maxAge < 1 || maxAge > 2400) {
      throw new HttpException(
        'maxAge must be between 1 and 2400 hours',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Use real API if credentials are configured
    if (this.useRealApi) {
      return this.checkSimSwapFromApi(phoneNumber, maxAge);
    }

    // Fallback to stub
    return this.checkSimSwapStub(phoneNumber);
  }

  /**
   * Real API call to CAMARA SIM Swap check endpoint
   */
  private async checkSimSwapFromApi(
    phoneNumber: string,
    maxAge: number,
  ): Promise<SimSwapCheckResult> {
    try {
      const accessToken = await this.oauth2Client.getAccessToken();
      // Use sandbox path when testing against playground
      const url = this.isPlayground
        ? `${this.baseUrl}/api/sim-swap/v1/check`
        : `${this.baseUrl}/sim-swap/v2/check`;

      this.logger.debug(`Calling CAMARA SIM Swap check API: ${url}`);

      const response = await this.httpClient.post<SimSwapCheckResult>(
        url,
        { phoneNumber, maxAge },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-correlator': this.generateCorrelationId(),
          },
        },
      );

      this.logger.debug(
        `SIM Swap check API response: ${JSON.stringify(response.data)}`,
      );
      return response.data;
    } catch (error) {
      return this.handleApiError(error, 'check');
    }
  }

  /**
   * Stub implementation for check
   */
  private async checkSimSwapStub(
    phoneNumber: string,
  ): Promise<SimSwapCheckResult> {
    if (phoneNumber.includes('swapped')) {
      return { swapped: true };
    }
    return { swapped: false };
  }

  /**
   * Convenience method for eligibility checks
   * Returns normalized result with swappedAt timestamp
   *
   * @param phoneNumber - E.164 format phone number
   * @returns SimSwapResult for eligibility logic
   */
  async getSimSwapStatus(phoneNumber: string): Promise<SimSwapResult> {
    this.logger.debug(`getSimSwapStatus for phone number`);

    try {
      const result = await this.retrieveSimSwapDate(phoneNumber);

      return {
        swappedAt: result.latestSimChange || undefined,
        monitoredPeriod: result.monitoredPeriod,
      };
    } catch (error) {
      this.logger.error(`Failed to get SIM swap status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a correlation ID for request tracing
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Handle API errors and convert to appropriate HTTP exceptions
   */
  private handleApiError(error: unknown, endpoint: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      this.logger.error(`CAMARA ${endpoint} API error: ${axiosError.message}`);

      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data;
        this.logger.error(`API response: ${JSON.stringify(data)}`);

        // Map CAMARA error codes to HTTP status
        if (status === 400) {
          throw new HttpException(
            `Invalid request: ${JSON.stringify(data)}`,
            HttpStatus.BAD_REQUEST,
          );
        } else if (status === 401 || status === 403) {
          throw new HttpException(
            'Authentication failed',
            HttpStatus.UNAUTHORIZED,
          );
        } else if (status === 404) {
          throw new HttpException(
            'Phone number not found',
            HttpStatus.NOT_FOUND,
          );
        } else if (status === 429) {
          throw new HttpException(
            'Rate limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      throw new HttpException(
        `CAMARA API call failed: ${axiosError.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    this.logger.error(`Unexpected error in ${endpoint}: ${error}`);
    throw new HttpException(
      'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
