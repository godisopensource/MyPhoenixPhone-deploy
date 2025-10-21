import { Test, TestingModule } from '@nestjs/testing';
import { NumberVerificationService } from './number-verification.service';
import { OAuth2ClientService } from '../camara/oauth2-client.service';

// Mock global fetch
global.fetch = jest.fn();

describe('NumberVerificationService', () => {
  let service: NumberVerificationService;
  let oauth2Client: OAuth2ClientService;

  const mockAccessToken = 'mock-access-token';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NumberVerificationService,
        {
          provide: OAuth2ClientService,
          useValue: {
            getAccessToken: jest.fn().mockResolvedValue(mockAccessToken),
          },
        },
      ],
    }).compile();

    service = module.get<NumberVerificationService>(NumberVerificationService);
    oauth2Client = module.get<OAuth2ClientService>(OAuth2ClientService);

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  describe('sendVerificationCode', () => {
    it('should send verification code successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 204,
      });

      await service.sendVerificationCode('+33612345678');

      expect(oauth2Client.getAccessToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/verify-with-code/send-code'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ phoneNumber: '+33612345678' }),
        }),
      );
    });

    it('should throw error when API returns error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          status: 400,
          code: 'INVALID_ARGUMENT',
          message: 'Invalid phone number format',
        }),
      });

      await expect(
        service.sendVerificationCode('invalid'),
      ).rejects.toThrow();
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      await expect(
        service.sendVerificationCode('+33612345678'),
      ).rejects.toThrow();
    });
  });

  describe('verifyCode', () => {
    it('should verify code successfully and return true', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ devicePhoneNumberVerified: true }),
      });

      const result = await service.verifyCode('+33612345678', '123456');

      expect(result).toEqual({ devicePhoneNumberVerified: true });
      expect(oauth2Client.getAccessToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/verify-with-code/verify'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: '+33612345678',
            code: '123456',
          }),
        }),
      );
    });

    it('should verify code successfully and return false', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ devicePhoneNumberVerified: false }),
      });

      const result = await service.verifyCode('+33612345678', '123456');

      expect(result).toEqual({ devicePhoneNumberVerified: false });
    });

    it('should throw error when API returns error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          status: 400,
          code: 'INVALID_CODE',
          message: 'Invalid verification code',
        }),
      });

      await expect(
        service.verifyCode('+33612345678', 'wrong-code'),
      ).rejects.toThrow();
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );

      await expect(
        service.verifyCode('+33612345678', '123456'),
      ).rejects.toThrow();
    });
  });

  describe('verifyNumber', () => {
    it('should send code when no code is provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await service.verifyNumber('+33612345678');

      expect(result).toEqual({ codeSent: true });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/verify-with-code/send-code'),
        expect.any(Object),
      );
    });

    it('should verify code when code is provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ devicePhoneNumberVerified: true }),
      });

      const result = await service.verifyNumber('+33612345678', '123456');

      expect(result).toEqual({ codeSent: false, verified: true });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/verify-with-code/verify'),
        expect.any(Object),
      );
    });

    it('should return verified false when verification fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ devicePhoneNumberVerified: false }),
      });

      const result = await service.verifyNumber('+33612345678', '123456');

      expect(result).toEqual({ codeSent: false, verified: false });
    });
  });
});
