import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { NumberVerificationService } from './number-verification.service';

describe('VerificationController', () => {
  let controller: VerificationController;
  let numberVerificationService: NumberVerificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationController],
      providers: [
        {
          provide: NumberVerificationService,
          useValue: {
            verifyNumber: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VerificationController>(VerificationController);
    numberVerificationService = module.get<NumberVerificationService>(
      NumberVerificationService,
    );
  });

  describe('verifyNumber', () => {
    it('should throw BadRequestException for invalid phone number format', async () => {
      const dto = {
        phoneNumber: 'invalid',
        captchaToken: 'token',
      };

      await expect(controller.verifyNumber(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.verifyNumber(dto)).rejects.toThrow(
        'Invalid phone number format',
      );
    });

    it('should send verification code when no code is provided', async () => {
      const dto = {
        phoneNumber: '+33612345678',
        captchaToken: 'valid-token',
      };

      jest
        .spyOn(numberVerificationService, 'verifyNumber')
        .mockResolvedValue({ codeSent: true });

      const result = await controller.verifyNumber(dto);

      expect(result).toEqual({
        ok: true,
        codeSent: true,
        message: 'Verification code sent successfully',
      });
      expect(numberVerificationService.verifyNumber).toHaveBeenCalledWith(
        '+33612345678',
        undefined,
      );
    });

    it('should verify number successfully with code', async () => {
      const dto = {
        phoneNumber: '+33612345678',
        captchaToken: 'valid-token',
        code: '123456',
      };

      jest
        .spyOn(numberVerificationService, 'verifyNumber')
        .mockResolvedValue({ codeSent: false, verified: true });

      const result = await controller.verifyNumber(dto);

      expect(result).toEqual({
        ok: true,
        codeSent: false,
        message: 'Phone number verified successfully',
      });
      expect(numberVerificationService.verifyNumber).toHaveBeenCalledWith(
        '+33612345678',
        '123456',
      );
    });

    it('should return failure when verification fails', async () => {
      const dto = {
        phoneNumber: '+33612345678',
        captchaToken: 'valid-token',
        code: 'wrong-code',
      };

      jest
        .spyOn(numberVerificationService, 'verifyNumber')
        .mockResolvedValue({ codeSent: false, verified: false });

      const result = await controller.verifyNumber(dto);

      expect(result).toEqual({
        ok: false,
        codeSent: false,
        message: 'Phone number verification failed',
      });
    });

    it('should throw BadRequestException when service throws error', async () => {
      const dto = {
        phoneNumber: '+33612345678',
        captchaToken: 'valid-token',
        code: '123456',
      };

      jest
        .spyOn(numberVerificationService, 'verifyNumber')
        .mockRejectedValue(new Error('API Error'));

      await expect(controller.verifyNumber(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.verifyNumber(dto)).rejects.toThrow(
        'Failed to verify phone number',
      );
    });

    it('should accept valid E.164 phone numbers from different countries', async () => {
      const validNumbers = [
        '+33612345678', // France
        '+447700900123', // UK
        '+12025551234', // USA
        '+818012345678', // Japan
        '+861234567890', // China
      ];

      jest
        .spyOn(numberVerificationService, 'verifyNumber')
        .mockResolvedValue({ codeSent: true });

      for (const phoneNumber of validNumbers) {
        const dto = {
          phoneNumber,
          captchaToken: 'valid-token',
        };

        const result = await controller.verifyNumber(dto);
        expect(result.ok).toBe(true);
      }
    });

    it('should reject invalid E.164 phone numbers', async () => {
      const invalidNumbers = [
        '0612345678', // Missing +
        '+0612345678', // Starts with 0
        '+33 6 12 34 56 78', // Contains spaces
        '+33-6-12-34-56-78', // Contains dashes
        '33612345678', // Missing +
        '+', // Just +
        '+123456789012345678', // Too long (>15 digits)
      ];

      for (const phoneNumber of invalidNumbers) {
        const dto = {
          phoneNumber,
          captchaToken: 'valid-token',
        };

        await expect(controller.verifyNumber(dto)).rejects.toThrow(
          BadRequestException,
        );
      }
    });
  });
});
