import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common'
import axios, { AxiosInstance, AxiosError } from 'axios'
import { OAuth2ClientService } from './oauth2-client.service'

/**
 * Connectivity types from CAMARA spec
 */
export type ConnectivityType = 'DATA' | 'SMS'

/**
 * Result from CAMARA Device Reachability Status retrieve endpoint
 */
export type ReachabilityStatusResponse = {
  reachable: boolean
  connectivity?: ConnectivityType[]
  lastStatusTime?: string
}

/**
 * Normalized result for eligibility checks
 */
export type ReachabilityResult = { 
  reachable: boolean
  connectivity?: ConnectivityType[]
  lastStatusTime?: string
}

/**
 * CAMARA Device Reachability Status API adapter
 * Implements POST /device-reachability-status/v1/retrieve
 * 
 * Spec: https://github.com/camaraproject/DeviceStatus/blob/main/code/API_definitions/device-reachability-status.yaml
 * Orange Sandbox: https://developer.orange.com/apis/device-reachability-status-camara-sandbox-orange-lab/
 */
@Injectable()
export class ReachabilityService {
  private readonly logger = new Logger(ReachabilityService.name)
  private readonly baseUrl: string
  private readonly isPlayground: boolean
  private readonly httpClient: AxiosInstance
  private readonly useRealApi: boolean

  constructor(private readonly oauth2Client: OAuth2ClientService) {
    this.baseUrl = process.env.CAMARA_BASE_URL || 'http://localhost:9091'
  const camaraEnv = process.env.CAMARA_ENV
  this.isPlayground = camaraEnv === 'playground' || this.baseUrl.includes('playground')
  this.useRealApi = !!process.env.CAMARA_CLIENT_ID && !!process.env.CAMARA_CLIENT_SECRET
    
    this.httpClient = axios.create({
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (this.useRealApi) {
      this.logger.log('ReachabilityService initialized with real API calls')
    } else {
      this.logger.warn('ReachabilityService using stub mode (missing CAMARA credentials)')
    }
  }

  /**
   * Query device reachability status
   * Uses CAMARA POST /retrieve endpoint
   * 
   * @param phoneNumber - E.164 format phone number (e.g., +33612345678)
   * @returns ReachabilityStatusResponse with reachable boolean and connectivity types
   */
  async getReachabilityStatus(phoneNumber: string): Promise<ReachabilityStatusResponse> {
    this.logger.debug(`getReachabilityStatus for phone number`)

    if (!phoneNumber) {
      throw new HttpException('Phone number is required', HttpStatus.BAD_REQUEST)
    }

    // Use real API if credentials are configured
    if (this.useRealApi) {
      return this.getReachabilityStatusFromApi(phoneNumber)
    }

    // Fallback to stub for tests/local dev without credentials
    return this.getReachabilityStatusStub(phoneNumber)
  }

  /**
   * Real API call to CAMARA Device Reachability endpoint
   */
  private async getReachabilityStatusFromApi(phoneNumber: string): Promise<ReachabilityStatusResponse> {
    try {
      const accessToken = await this.oauth2Client.getAccessToken()
      // Playground sandbox uses a different API path (includes /api and v0.6)
      const url = this.isPlayground
        ? `${this.baseUrl}/api/device-reachability-status/v0.6/retrieve`
        : `${this.baseUrl}/device-reachability-status/v1/retrieve`

      this.logger.debug(`Calling CAMARA Reachability API: ${url}`)

      const response = await this.httpClient.post<ReachabilityStatusResponse>(
        url,
        { device: { phoneNumber } },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-correlator': this.generateCorrelationId(),
          },
        },
      )

      this.logger.debug(`Reachability API response: ${JSON.stringify(response.data)}`)
      return response.data
    } catch (error) {
      return this.handleApiError(error)
    }
  }

  /**
   * Stub implementation for tests/local dev
   */
  private async getReachabilityStatusStub(phoneNumber: string): Promise<ReachabilityStatusResponse> {
    // Deterministic stub: if contains 'up' or 'data' -> reachable true with DATA
    if (phoneNumber.includes('up') || phoneNumber.includes('data')) {
      return {
        reachable: true,
        connectivity: ['DATA'],
        lastStatusTime: new Date().toISOString()
      }
    }

    // If contains 'sms' -> reachable true with SMS only
    if (phoneNumber.includes('sms')) {
      return {
        reachable: true,
        connectivity: ['SMS'],
        lastStatusTime: new Date().toISOString()
      }
    }

    // Not reachable
    return {
      reachable: false,
      lastStatusTime: new Date().toISOString()
    }
  }

  /**
   * Convenience method for eligibility checks
   * Returns simplified boolean result
   * 
   * @param phoneNumber - E.164 format phone number
   * @returns ReachabilityResult with reachable boolean
   */
  async isReachable(phoneNumber: string): Promise<ReachabilityResult> {
    this.logger.debug(`isReachable for phone number`)

    try {
      const result = await this.getReachabilityStatus(phoneNumber)
      return result
    } catch (error) {
      this.logger.error(`Failed to get reachability status: ${error.message}`)
      throw error
    }
  }

  /**
   * Generate a correlation ID for request tracing
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Handle API errors and convert to appropriate HTTP exceptions
   */
  private handleApiError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError
      this.logger.error(`CAMARA Reachability API error: ${axiosError.message}`)
      
      if (axiosError.response) {
        const status = axiosError.response.status
        const data = axiosError.response.data
        this.logger.error(`API response: ${JSON.stringify(data)}`)
        
        // Map CAMARA error codes to HTTP status
        if (status === 400) {
          throw new HttpException(`Invalid request: ${JSON.stringify(data)}`, HttpStatus.BAD_REQUEST)
        } else if (status === 401 || status === 403) {
          throw new HttpException('Authentication failed', HttpStatus.UNAUTHORIZED)
        } else if (status === 404) {
          throw new HttpException('Phone number not found', HttpStatus.NOT_FOUND)
        } else if (status === 429) {
          throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS)
        } else if (status === 503) {
          throw new HttpException('Service temporarily unavailable', HttpStatus.SERVICE_UNAVAILABLE)
        }
      }
      
      throw new HttpException(
        `CAMARA API call failed: ${axiosError.message}`,
        HttpStatus.BAD_GATEWAY
      )
    }
    
    this.logger.error(`Unexpected error in reachability check: ${error}`)
    throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
