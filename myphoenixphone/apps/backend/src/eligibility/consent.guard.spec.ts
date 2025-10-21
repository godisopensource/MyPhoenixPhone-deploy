import { ConsentGuard } from './consent.guard';
import { ConsentRepository } from '../consent/consent.repository';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('ConsentGuard', () => {
  let guard: ConsentGuard;
  let consentRepository: jest.Mocked<ConsentRepository>;

  beforeEach(() => {
    consentRepository = {
      findByMsisdnHash: jest.fn(),
    } as any;

    guard = new ConsentGuard(consentRepository);
  });

  const createMockContext = (query: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          query,
        }),
      }),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access when valid consent exists', async () => {
      const context = createMockContext({ phoneNumber: '+33612345678' });
      const validConsent = {
        id: 'consent-1',
        msisdn_hash: 'hash',
        scopes: ['sim-swap', 'reachability'],
        proof: { token: 'jwt-token' },
        created_at: new Date(),
        revoked_at: null,
      };

      consentRepository.findByMsisdnHash.mockResolvedValue([validConsent]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(consentRepository.findByMsisdnHash).toHaveBeenCalledWith(
        expect.any(String), // hashed MSISDN
      );
    });

    it('should deny access when phone number is missing', async () => {
      const context = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Phone number is required',
      );
    });

    it('should deny access when phone number format is invalid', async () => {
      const context = createMockContext({ phoneNumber: '0612345678' }); // Missing +

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Invalid phone number format (expected E.164)',
      );
    });

    it('should deny access when no consent exists', async () => {
      const context = createMockContext({ phoneNumber: '+33612345678' });

      consentRepository.findByMsisdnHash.mockResolvedValue([]);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'No valid consent found',
      );
    });

    it('should deny access when all consents are revoked', async () => {
      const context = createMockContext({ phoneNumber: '+33612345678' });
      const revokedConsent = {
        id: 'consent-1',
        msisdn_hash: 'hash',
        scopes: ['sim-swap'],
        proof: { token: 'jwt-token' },
        created_at: new Date(),
        revoked_at: new Date(), // Revoked
      };

      consentRepository.findByMsisdnHash.mockResolvedValue([revokedConsent]);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'No valid consent found',
      );
    });

    it('should allow access when at least one consent is valid (not revoked)', async () => {
      const context = createMockContext({ phoneNumber: '+33612345678' });
      const revokedConsent = {
        id: 'consent-1',
        msisdn_hash: 'hash',
        scopes: ['sim-swap'],
        proof: { token: 'old-token' },
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
        revoked_at: new Date(Date.now() - 1000 * 60 * 60 * 24), // Revoked yesterday
      };
      const validConsent = {
        id: 'consent-2',
        msisdn_hash: 'hash',
        scopes: ['sim-swap', 'reachability'],
        proof: { token: 'new-token' },
        created_at: new Date(),
        revoked_at: null,
      };

      consentRepository.findByMsisdnHash.mockResolvedValue([
        revokedConsent,
        validConsent,
      ]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('E.164 validation', () => {
    it.each(['+33612345678', '+1234567890', '+442071234567', '+819012345678'])(
      'should accept valid E.164 format: %s',
      async (phoneNumber) => {
        const context = createMockContext({ phoneNumber });
        consentRepository.findByMsisdnHash.mockResolvedValue([
          {
            id: 'consent-1',
            msisdn_hash: 'hash',
            scopes: [],
            proof: {},
            created_at: new Date(),
            revoked_at: null,
          },
        ]);

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      },
    );

    it.each([
      '0612345678', // Missing +
      '+0612345678', // Starts with 0
      '33612345678', // Missing +
      '+33 6 12 34 56 78', // Contains spaces
      '+33-6-12-34-56-78', // Contains dashes
    ])('should reject invalid E.164 format: %s', async (phoneNumber) => {
      const context = createMockContext({ phoneNumber });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
