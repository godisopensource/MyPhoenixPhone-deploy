import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CaptchaGuard } from './captcha.guard';

// Mock global fetch
global.fetch = jest.fn();

describe('CaptchaGuard', () => {
  let guard: CaptchaGuard;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      CAPTCHA_SECRET_KEY: 'test-secret-key',
      CAPTCHA_VERIFY_URL:
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    };

    guard = new CaptchaGuard();

    // Mock request object
    mockRequest = {
      body: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };

    // Mock execution context
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('canActivate', () => {
    it('should throw UnauthorizedException if CAPTCHA token is missing', async () => {
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        'CAPTCHA token is required',
      );
    });

    it('should accept CAPTCHA token from request body', async () => {
      mockRequest.body.captchaToken = 'valid-token';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should accept CAPTCHA token from query parameters', async () => {
      mockRequest.query.captchaToken = 'valid-token';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should accept CAPTCHA token from header', async () => {
      mockRequest.headers['x-captcha-token'] = 'valid-token';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException for invalid CAPTCHA token', async () => {
      mockRequest.body.captchaToken = 'invalid-token';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          'error-codes': ['invalid-input-response'],
        }),
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        'Invalid or expired CAPTCHA token',
      );
    });

    it('should throw UnauthorizedException when CAPTCHA API returns error', async () => {
      mockRequest.body.captchaToken = 'some-token';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when CAPTCHA API throws error', async () => {
      mockRequest.body.captchaToken = 'some-token';

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should send client IP to CAPTCHA API', async () => {
      mockRequest.body.captchaToken = 'valid-token';
      mockRequest.headers['x-forwarded-for'] = '192.168.1.100';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await guard.canActivate(mockExecutionContext);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.stringContaining('secret=test-secret-key'),
        }),
      );

      const callBody = (global.fetch as jest.Mock).mock.calls[0][1].body;
      expect(callBody).toContain('response=valid-token');
      expect(callBody).toContain('remoteip=192.168.1.100');
    });

    it('should extract IP from X-Real-IP header if X-Forwarded-For is not present', async () => {
      mockRequest.body.captchaToken = 'valid-token';
      mockRequest.headers['x-real-ip'] = '10.0.0.5';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await guard.canActivate(mockExecutionContext);

      const callBody = (global.fetch as jest.Mock).mock.calls[0][1].body;
      expect(callBody).toContain('remoteip=10.0.0.5');
    });

    it('should use socket remote address as fallback', async () => {
      mockRequest.body.captchaToken = 'valid-token';
      mockRequest.socket.remoteAddress = '127.0.0.1';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await guard.canActivate(mockExecutionContext);

      const callBody = (global.fetch as jest.Mock).mock.calls[0][1].body;
      expect(callBody).toContain('remoteip=127.0.0.1');
    });
  });
});
