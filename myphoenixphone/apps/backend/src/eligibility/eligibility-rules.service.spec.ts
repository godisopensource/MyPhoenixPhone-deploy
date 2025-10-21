import {
  EligibilityRulesService,
  EligibilityReason,
} from './eligibility-rules.service';
import type { SimSwapResult } from '../camara/sim-swap.service';
import type { ReachabilityResult } from '../camara/reachability.service';

describe('EligibilityRulesService', () => {
  let service: EligibilityRulesService;

  beforeEach(() => {
    // Reset environment variables
    delete process.env.ELIGIBILITY_SIM_SWAP_MAX_DAYS;
    delete process.env.ELIGIBILITY_REQUIRE_REACHABLE;
    delete process.env.ELIGIBILITY_REQUIRE_UNREACHABLE;

    service = new EligibilityRulesService();
  });

  describe('evaluateEligibility', () => {
    it('should mark as eligible when SIM swap is recent (within 30 days)', () => {
      const simSwap: SimSwapResult = {
        swappedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      };
      const reachability: ReachabilityResult = {
        reachable: true,
        connectivity: ['DATA'],
      };

      const result = service.evaluateEligibility(simSwap, reachability);

      expect(result.eligible).toBe(true);
      expect(result.reasons).toContain(EligibilityReason.SIM_SWAP_RECENT);
      expect(result.reasons).toContain(EligibilityReason.DEVICE_REACHABLE);
      expect(result.reasons).toContain(EligibilityReason.MEETS_CRITERIA);
      expect(result.snapshot.simSwap?.daysAgo).toBe(5);
    });

    it('should mark as ineligible when SIM swap is old (beyond 30 days)', () => {
      const simSwap: SimSwapResult = {
        swappedAt: new Date(
          Date.now() - 60 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 60 days ago
      };
      const reachability: ReachabilityResult = {
        reachable: true,
      };

      const result = service.evaluateEligibility(simSwap, reachability);

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain(EligibilityReason.SIM_SWAP_OLD);
      expect(result.reasons).toContain(
        EligibilityReason.DOES_NOT_MEET_CRITERIA,
      );
      expect(result.snapshot.simSwap?.daysAgo).toBe(60);
    });

    it('should mark as ineligible when no SIM swap detected', () => {
      const simSwap: SimSwapResult = {};
      const reachability: ReachabilityResult = {
        reachable: true,
      };

      const result = service.evaluateEligibility(simSwap, reachability);

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain(EligibilityReason.SIM_SWAP_UNKNOWN);
      expect(result.reasons).toContain(
        EligibilityReason.DOES_NOT_MEET_CRITERIA,
      );
    });

    it('should detect device reachability status', () => {
      const simSwap: SimSwapResult = {
        swappedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const reachability: ReachabilityResult = {
        reachable: false,
      };

      const result = service.evaluateEligibility(simSwap, reachability);

      expect(result.reasons).toContain(EligibilityReason.DEVICE_UNREACHABLE);
      expect(result.snapshot.reachability?.reachable).toBe(false);
    });

    it('should handle unknown reachability status', () => {
      const simSwap: SimSwapResult = {
        swappedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const reachability: ReachabilityResult = {
        reachable: undefined as any,
      };

      const result = service.evaluateEligibility(simSwap, reachability);

      expect(result.reasons).toContain(
        EligibilityReason.DEVICE_REACHABILITY_UNKNOWN,
      );
    });
  });

  describe('configuration', () => {
    it('should use custom SIM swap threshold from environment', () => {
      process.env.ELIGIBILITY_SIM_SWAP_MAX_DAYS = '7';
      const customService = new EligibilityRulesService();

      const config = customService.getConfig();
      expect(config.simSwapMaxDays).toBe(7);

      // 10 days ago should be ineligible with 7-day threshold
      const simSwap: SimSwapResult = {
        swappedAt: new Date(
          Date.now() - 10 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      const reachability: ReachabilityResult = { reachable: true };

      const result = customService.evaluateEligibility(simSwap, reachability);
      expect(result.eligible).toBe(false);
    });

    it('should require reachable when configured', () => {
      process.env.ELIGIBILITY_REQUIRE_REACHABLE = 'true';
      const customService = new EligibilityRulesService();

      // Recent swap but unreachable
      const simSwap: SimSwapResult = {
        swappedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const reachability: ReachabilityResult = { reachable: false };

      const result = customService.evaluateEligibility(simSwap, reachability);
      expect(result.eligible).toBe(false); // Should fail due to unreachable requirement
    });

    it('should require unreachable when configured', () => {
      process.env.ELIGIBILITY_REQUIRE_UNREACHABLE = 'true';
      const customService = new EligibilityRulesService();

      // Recent swap and reachable
      const simSwap: SimSwapResult = {
        swappedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const reachability: ReachabilityResult = { reachable: true };

      const result = customService.evaluateEligibility(simSwap, reachability);
      expect(result.eligible).toBe(false); // Should fail due to reachable (but we need unreachable)
    });
  });

  describe('edge cases', () => {
    it('should handle SIM swap today (0 days ago)', () => {
      const simSwap: SimSwapResult = {
        swappedAt: new Date().toISOString(),
      };
      const reachability: ReachabilityResult = { reachable: true };

      const result = service.evaluateEligibility(simSwap, reachability);
      expect(result.eligible).toBe(true);
      expect(result.snapshot.simSwap?.daysAgo).toBe(0);
    });

    it('should include connectivity types in snapshot', () => {
      const simSwap: SimSwapResult = {
        swappedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const reachability: ReachabilityResult = {
        reachable: true,
        connectivity: ['DATA', 'SMS'],
      };

      const result = service.evaluateEligibility(simSwap, reachability);
      expect(result.snapshot.reachability?.connectivity).toEqual([
        'DATA',
        'SMS',
      ]);
    });
  });
});
