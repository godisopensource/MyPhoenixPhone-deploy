import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Guard to validate CAPTCHA token from Cloudflare Turnstile
 * Extracts CAPTCHA token from request and validates it against Cloudflare API
 */
@Injectable()
export class CaptchaGuard implements CanActivate {
  private readonly captchaVerifyUrl: string;
  private readonly captchaSecretKey: string;

  constructor() {
    this.captchaVerifyUrl =
      process.env.CAPTCHA_VERIFY_URL ||
      'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    this.captchaSecretKey = process.env.CAPTCHA_SECRET_KEY || '';

    if (!this.captchaSecretKey) {
      console.warn(
        '[CaptchaGuard] CAPTCHA_SECRET_KEY not configured - validation will fail',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract CAPTCHA token from request (body, query, or header)
    const token =
      request.body?.captchaToken ||
      request.query?.captchaToken ||
      request.headers['x-captcha-token'];

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('CAPTCHA token is required');
    }

    // Validate CAPTCHA token with Orange Live Identity API
    const isValid = await this.validateCaptchaToken(token, request);

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired CAPTCHA token');
    }

    return true;
  }

  /**
   * Validate CAPTCHA token against Cloudflare Turnstile API
   */
  private async validateCaptchaToken(
    token: string,
    request: Request,
  ): Promise<boolean> {
    try {
      // Prepare form data for Cloudflare Turnstile verification
      const formData = new URLSearchParams();
      formData.append('secret', this.captchaSecretKey);
      formData.append('response', token);
      
      const clientIp = this.getClientIp(request);
      if (clientIp) {
        formData.append('remoteip', clientIp);
      }

      const response = await fetch(this.captchaVerifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        console.error(
          `[CaptchaGuard] CAPTCHA validation failed: ${response.status} ${response.statusText}`,
        );
        return false;
      }

      const result = await response.json();

      // Check validation result
      // Expected response: { success: boolean, challenge_ts?: string, hostname?: string, error-codes?: string[], action?: string, cdata?: string }
      if (!result.success) {
        console.error(
          `[CaptchaGuard] CAPTCHA validation failed: ${JSON.stringify(result['error-codes'] || [])}`,
        );
        return false;
      }

      console.log('[CaptchaGuard] CAPTCHA validation successful');
      return true;
    } catch (error) {
      console.error('[CaptchaGuard] Error validating CAPTCHA:', error);
      return false;
    }
  }

  /**
   * Extract client IP address from request
   */
  private getClientIp(request: Request): string | undefined {
    // Try X-Forwarded-For first (common with proxies/load balancers)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor;
      return ips.split(',')[0].trim();
    }

    // Try X-Real-IP (nginx)
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fall back to connection remote address
    return request.socket?.remoteAddress;
  }
}
