import { EligibilityService } from './eligibility.service';
import { SimSwapService } from '../camara/sim-swap.service';
import { ReachabilityService } from '../camara/reachability.service';
import { EligibilitySignalRepository } from './eligibility.repository';
import {
  EligibilityRulesService,
  EligibilityReason,
} from './eligibility-rules.service';
import type { SimSwapResult } from '../camara/sim-swap.service';
import type { ReachabilityResult } from '../camara/reachability.service';

describe('EligibilityService', () => {
  let service: EligibilityService;
  let simSwapService: jest.Mocked<SimSwapService>;
  let reachabilityService: jest.Mocked<ReachabilityService>;
  let signalRepository: jest.Mocked<EligibilitySignalRepository>;
  let rulesService: EligibilityRulesService;

  beforeEach(() => {
    // Create mocks
    simSwapService = {
      getSimSwapStatus: jest.fn(),
    } as any;

    reachabilityService = {
      isReachable: jest.fn(),
    } as any;

    signalRepository = {
      upsert: jest.fn(),
      findByMsisdnHash: jest.fn(),
    } as any;

    rulesService = new EligibilityRulesService();

    service = new EligibilityService(
      simSwapService,
      reachabilityService,
      signalRepository,
      rulesService,
    );
  });

  describe('checkEligibility', () => {
    it('should fetch signals, store them, and evaluate eligibility', async () => {
      const phoneNumber = '+33612345678';
      const simSwapResult: SimSwapResult = {
        swappedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const reachabilityResult: ReachabilityResult = {
        reachable: true,
        connectivity: ['DATA'],
      };

      simSwapService.getSimSwapStatus.mockResolvedValue(simSwapResult);
      reachabilityService.isReachable.mockResolvedValue(reachabilityResult);
      signalRepository.upsert.mockResolvedValue({
        id: 'test-id',
        msisdn_hash: 'hash',
        sim_swapped_at: new Date(simSwapResult.swappedAt!),
        reachable: true,
        updated_at: new Date(),
      });

      const result = await service.checkEligibility(phoneNumber);

      expect(result.eligible).toBe(true);
      expect(result.reasons).toContain(EligibilityReason.SIM_SWAP_RECENT);
      expect(result.reasons).toContain(EligibilityReason.DEVICE_REACHABLE);
      expect(result.snapshot.simSwap?.daysAgo).toBe(5);
      expect(result.snapshot.reachability?.reachable).toBe(true);

      // Verify services were called
      expect(simSwapService.getSimSwapStatus).toHaveBeenCalledWith(phoneNumber);
      expect(reachabilityService.isReachable).toHaveBeenCalledWith(phoneNumber);

      // Verify signals were stored
      expect(signalRepository.upsert).toHaveBeenCalledWith(
        expect.any(String), // hashed MSISDN
        expect.objectContaining({
          sim_swapped_at: expect.any(Date),
          reachable: true,
        }),
      );
    });

    it('should handle case with no SIM swap detected', async () => {
      const phoneNumber = '+33612345678';
      const simSwapResult: SimSwapResult = {}; // No swap
      const reachabilityResult: ReachabilityResult = { reachable: true };

      simSwapService.getSimSwapStatus.mockResolvedValue(simSwapResult);
      reachabilityService.isReachable.mockResolvedValue(reachabilityResult);
      signalRepository.upsert.mockResolvedValue({
        id: 'test-id',
        msisdn_hash: 'hash',
        sim_swapped_at: null,
        reachable: true,
        updated_at: new Date(),
      });

      const result = await service.checkEligibility(phoneNumber);

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain(EligibilityReason.SIM_SWAP_UNKNOWN);
      expect(result.reasons).toContain(
        EligibilityReason.DOES_NOT_MEET_CRITERIA,
      );
    });

    it('should handle unreachable devices', async () => {
      const phoneNumber = '+33612345678';
      const simSwapResult: SimSwapResult = {
        swappedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const reachabilityResult: ReachabilityResult = { reachable: false };

      simSwapService.getSimSwapStatus.mockResolvedValue(simSwapResult);
      reachabilityService.isReachable.mockResolvedValue(reachabilityResult);
      signalRepository.upsert.mockResolvedValue({
        id: 'test-id',
        msisdn_hash: 'hash',
        sim_swapped_at: new Date(simSwapResult.swappedAt!),
        reachable: false,
        updated_at: new Date(),
      });

      const result = await service.checkEligibility(phoneNumber);

      expect(result.reasons).toContain(EligibilityReason.DEVICE_UNREACHABLE);
      expect(result.snapshot.reachability?.reachable).toBe(false);
    });

    it('should throw HttpException when signal fetch fails', async () => {
      const phoneNumber = '+33612345678';

      simSwapService.getSimSwapStatus.mockRejectedValue(
        new Error('CAMARA API unavailable'),
      );

      await expect(service.checkEligibility(phoneNumber)).rejects.toThrow(
        'Failed to check eligibility',
      );
    });

    it('should fetch signals in parallel for performance', async () => {
      const phoneNumber = '+33612345678';
      let simSwapCallTime: number;
      let reachabilityCallTime: number;

      simSwapService.getSimSwapStatus.mockImplementation(async () => {
        simSwapCallTime = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { swappedAt: new Date().toISOString() };
      });

      reachabilityService.isReachable.mockImplementation(async () => {
        reachabilityCallTime = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { reachable: true };
      });

      signalRepository.upsert.mockResolvedValue({
        id: 'test-id',
        msisdn_hash: 'hash',
        sim_swapped_at: new Date(),
        reachable: true,
        updated_at: new Date(),
      });

      await service.checkEligibility(phoneNumber);

      // Both services should be called at roughly the same time (parallel)
      expect(Math.abs(simSwapCallTime! - reachabilityCallTime!)).toBeLessThan(
        5,
      );
    });
  });

  describe('getStoredSignals', () => {
    it('should retrieve stored signals by hashed MSISDN', async () => {
      const phoneNumber = '+33612345678';
      const storedSignal = {
        id: 'test-id',
        msisdn_hash: 'hash',
        sim_swapped_at: new Date(),
        reachable: true,
        updated_at: new Date(),
      };

      signalRepository.findByMsisdnHash.mockResolvedValue(storedSignal);

      const result = await service.getStoredSignals(phoneNumber);

      expect(result).toEqual(storedSignal);
      expect(signalRepository.findByMsisdnHash).toHaveBeenCalledWith(
        expect.any(String), // hashed MSISDN
      );
    });

    it('should return null when no signals are stored', async () => {
      const phoneNumber = '+33612345678';
      signalRepository.findByMsisdnHash.mockResolvedValue(null);

      const result = await service.getStoredSignals(phoneNumber);

      expect(result).toBeNull();
    });
  });

  describe('MSISDN hashing', () => {
    it('should produce consistent hashes for the same number', async () => {
      const phoneNumber = '+33612345678';
      const simSwapResult: SimSwapResult = {
        swappedAt: new Date().toISOString(),
      };
      const reachabilityResult: ReachabilityResult = { reachable: true };

      simSwapService.getSimSwapStatus.mockResolvedValue(simSwapResult);
      reachabilityService.isReachable.mockResolvedValue(reachabilityResult);
      signalRepository.upsert.mockResolvedValue({
        id: 'test-id',
        msisdn_hash: 'hash',
        sim_swapped_at: new Date(),
        reachable: true,
        updated_at: new Date(),
      });

      await service.checkEligibility(phoneNumber);
      const firstHash = signalRepository.upsert.mock.calls[0][0];

      await service.checkEligibility(phoneNumber);
      const secondHash = signalRepository.upsert.mock.calls[1][0];

      expect(firstHash).toBe(secondHash);
    });
  });
});
