import { Test, TestingModule } from '@nestjs/testing';
import { ConsentController } from './consent.controller';
import { AuthFranceService } from '../auth-france/auth-france.service';
import { ConsentRepository } from './consent.repository';
import { BadRequestException } from '@nestjs/common';

describe('ConsentController', () => {
  let controller: ConsentController;
  let authFranceService: jest.Mocked<AuthFranceService>;
  let consentRepository: jest.Mocked<ConsentRepository>;

  beforeEach(async () => {
    authFranceService = {
      startAuth: jest.fn(),
      handleCallback: jest.fn(),
    } as any;

    consentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByMsisdnHash: jest.fn(),
      revoke: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsentController],
      providers: [
        { provide: AuthFranceService, useValue: authFranceService },
        { provide: ConsentRepository, useValue: consentRepository },
      ],
    }).compile();

    controller = module.get<ConsentController>(ConsentController);
  });

  describe('startConsent', () => {
    it('should redirect to auth URL with state and nonce in session', () => {
      const mockAuthUrl = 'https://auth.example.com/authorize?...';
      const mockState = 'state-value';
      const mockNonce = 'nonce-value';

      authFranceService.startAuth.mockReturnValueOnce({
        authUrl: mockAuthUrl,
        state: mockState,
        nonce: mockNonce,
      });

      const session: any = {};
      const result = controller.startConsent({}, session);

      expect(result).toEqual({
        url: mockAuthUrl,
        statusCode: 302,
      });

      expect(session.authState).toBe(mockState);
      expect(session.authNonce).toBe(mockNonce);

      expect(authFranceService.startAuth).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if auth start fails', () => {
      authFranceService.startAuth.mockImplementationOnce(() => {
        throw new Error('Auth service error');
      });

      const session: any = {};

      expect(() => controller.startConsent({}, session)).toThrow(
        'Failed to start consent flow',
      );
    });
  });

  describe('handleCallback', () => {
    const mockSession: any = {
      authState: 'stored-state',
      authNonce: 'stored-nonce',
    };

    const mockClaims = {
      sub: 'user-id',
      iss: 'https://login.sandbox.orange.fr',
      aud: 'client-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      phone_number: '+33612345678',
      phone_number_verified: true,
      nonce: 'stored-nonce',
    };

    it('should store consent and return success on valid callback', async () => {
      authFranceService.handleCallback.mockResolvedValueOnce({
        idToken: 'mock-id-token',
        claims: mockClaims,
        scopes: ['openid', 'profile', 'phone'],
      });

      const mockConsent = {
        id: 'consent-id-123',
        msisdn_hash: 'hashed-msisdn',
        scopes: ['openid', 'profile', 'phone'],
        proof: expect.any(Object),
        created_at: new Date(),
        revoked_at: null,
      };

      consentRepository.create.mockResolvedValueOnce(mockConsent as any);

      const result = await controller.handleCallback(
        mockSession,
        'auth-code-123',
        'stored-state',
        undefined,
        undefined,
      );

      expect(result).toHaveProperty('ok', true);
      expect(result).toHaveProperty('consentId', 'consent-id-123');
      expect(result).toHaveProperty('scopes');

      expect(consentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          msisdn_hash: expect.any(String),
          scopes: ['openid', 'profile', 'phone'],
          proof: expect.any(Object),
        }),
      );

      expect(mockSession.authState).toBeUndefined();
      expect(mockSession.authNonce).toBeUndefined();
    });

    it('should reject if code is missing', async () => {
      await expect(
        controller.handleCallback(
          mockSession,
          undefined,
          'stored-state',
          undefined,
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(consentRepository.create).not.toHaveBeenCalled();
    });

    it('should reject if state does not match', async () => {
      await expect(
        controller.handleCallback(
          mockSession,
          'auth-code-123',
          'wrong-state',
          undefined,
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);

      // handleCallback should not be called because state validation happens first
      expect(authFranceService.handleCallback).not.toHaveBeenCalled();
    });

    it('should reject if no phone_number in claims', async () => {
      const claimsWithoutPhone = {
        sub: 'user-id',
        iss: 'https://login.sandbox.orange.fr',
        aud: 'client-id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        phone_number_verified: true,
        nonce: 'stored-nonce',
      };

      authFranceService.handleCallback.mockResolvedValueOnce({
        idToken: 'mock-id-token',
        claims: claimsWithoutPhone as any,
        scopes: ['openid', 'profile'],
      });

      await expect(
        controller.handleCallback(
          mockSession,
          'auth-code-123',
          'stored-state',
          undefined,
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle error response from Auth France', async () => {
      await expect(
        controller.handleCallback(
          mockSession,
          undefined,
          'stored-state',
          'access_denied',
          'User declined consent',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(consentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('revokeConsent', () => {
    it('should revoke consent and return success', async () => {
      const mockRevoked = {
        id: 'consent-id-123',
        msisdn_hash: 'hashed-msisdn',
        scopes: ['openid', 'profile', 'phone'],
        proof: {},
        created_at: new Date(),
        revoked_at: new Date(),
      };

      consentRepository.findById.mockResolvedValueOnce(mockRevoked as any);
      consentRepository.revoke.mockResolvedValueOnce(mockRevoked as any);

      const result = await controller.revokeConsent({
        consentId: 'consent-id-123',
      });

      expect(result).toHaveProperty('ok', true);
      expect(result).toHaveProperty('revokedAt');

      expect(consentRepository.findById).toHaveBeenCalledWith('consent-id-123');
      expect(consentRepository.revoke).toHaveBeenCalledWith(
        'consent-id-123',
        expect.any(Date),
      );
    });

    it('should reject if consentId is missing', async () => {
      await expect(controller.revokeConsent({ consentId: '' })).rejects.toThrow(
        BadRequestException,
      );

      expect(consentRepository.findById).not.toHaveBeenCalled();
    });

    it('should reject if consent not found', async () => {
      consentRepository.findById.mockResolvedValueOnce(null);

      await expect(
        controller.revokeConsent({ consentId: 'non-existent' }),
      ).rejects.toThrow(BadRequestException);

      expect(consentRepository.revoke).not.toHaveBeenCalled();
    });
  });
});
