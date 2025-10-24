import { Test, TestingModule } from '@nestjs/testing';
import { AuthFranceService } from './auth-france.service';
import { BadRequestException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthFranceService', () => {
  let service: AuthFranceService;

  // Set up environment variables for tests
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      AUTH_FR_CLIENT_ID: 'test-client-id',
      AUTH_FR_CLIENT_SECRET: 'test-client-secret',
      AUTH_FR_ISSUER: 'https://login.sandbox.orange.fr',
      AUTH_FR_REDIRECT_URI: 'https://callbacks.example.com/consents/callback',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthFranceService],
    }).compile();

    service = module.get<AuthFranceService>(AuthFranceService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('startAuth', () => {
    it('should generate authorization URL with state and nonce', () => {
      const result = service.startAuth();

      expect(result).toHaveProperty('authUrl');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('nonce');

      expect(result.authUrl).toContain(
        'https://login.sandbox.orange.fr/oauth/authorize',
      );
      expect(result.authUrl).toContain('client_id=test-client-id');
      expect(result.authUrl).toContain('response_type=code');
      expect(result.authUrl).toContain('scope=openid+profile+phone+email');
      expect(result.authUrl).toContain(`state=${result.state}`);
      expect(result.authUrl).toContain(`nonce=${result.nonce}`);
    });

    it('should generate unique state and nonce on each call', () => {
      const result1 = service.startAuth();
      const result2 = service.startAuth();

      expect(result1.state).not.toBe(result2.state);
      expect(result1.nonce).not.toBe(result2.nonce);
    });

    it('should throw error if configuration is missing', () => {
      delete process.env.AUTH_FR_CLIENT_ID;

      expect(() => service.startAuth()).toThrow();
    });
  });

  describe('handleCallback', () => {
    const mockIdToken = (() => {
      // Create a mock JWT: header.payload.signature
      const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString(
        'base64',
      );
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'user-12345',
          iss: 'https://login.sandbox.orange.fr',
          aud: 'test-client-id',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          nonce: 'test-nonce',
          phone_number: '+33612345678',
          phone_number_verified: true,
        }),
      ).toString('base64');
      const signature = 'fake-signature';

      return `${header}.${payload}.${signature}`;
    })();

    it('should successfully exchange code for tokens and validate nonce', async () => {
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        id_token: mockIdToken,
        expires_in: 3600,
        scope: 'openid profile phone',
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockTokenResponse });

      const result = await service.handleCallback(
        'auth-code-12345',
        'test-state',
        'test-state',
        'test-nonce',
      );

      expect(result).toHaveProperty('idToken');
      expect(result).toHaveProperty('claims');
      expect(result).toHaveProperty('scopes');

      expect(result.claims.sub).toBe('user-12345');
      expect(result.claims.nonce).toBe('test-nonce');
      expect(result.scopes).toEqual(['openid', 'profile', 'phone']);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://login.sandbox.orange.fr/oauth/token',
        expect.stringContaining('grant_type=authorization_code'),
        expect.any(Object),
      );
    });

    it('should reject if state does not match', async () => {
      await expect(
        service.handleCallback(
          'auth-code',
          'wrong-state',
          'test-state',
          'test-nonce',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should reject if nonce does not match in ID token', async () => {
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        id_token: mockIdToken,
        expires_in: 3600,
        scope: 'openid profile phone',
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockTokenResponse });

      await expect(
        service.handleCallback(
          'auth-code-12345',
          'test-state',
          'test-state',
          'wrong-nonce',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle token exchange errors gracefully', async () => {
      const mockError = new Error('Token endpoint error');
      mockedAxios.post.mockRejectedValueOnce(mockError);

      await expect(
        service.handleCallback(
          'auth-code-12345',
          'test-state',
          'test-state',
          'test-nonce',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
