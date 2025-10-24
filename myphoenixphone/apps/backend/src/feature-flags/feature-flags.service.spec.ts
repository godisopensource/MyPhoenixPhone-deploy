import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagsService } from './feature-flags.service';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeatureFlagsService],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isEnabled', () => {
    it('should return true for enabled flags', () => {
      expect(service.isEnabled('ab_copy_variant')).toBe(true);
      expect(service.isEnabled('geofencing_enabled')).toBe(true);
    });

    it('should return false for disabled flags', () => {
      expect(service.isEnabled('email_notifications')).toBe(false);
    });

    it('should return false for non-existent flags', () => {
      expect(service.isEnabled('non_existent_flag')).toBe(false);
    });
  });

  describe('getVariant', () => {
    it('should return null for flags without variants', () => {
      expect(service.getVariant('geofencing_enabled')).toBe(null);
    });

    it('should return consistent variant for same userId', () => {
      const userId = 'test-user-123';
      const variant1 = service.getVariant('ab_copy_variant', userId);
      const variant2 = service.getVariant('ab_copy_variant', userId);
      expect(variant1).toBe(variant2);
    });

    it('should return one of the defined variants', () => {
      const userId = 'test-user-456';
      const variant = service.getVariant('ab_copy_variant', userId);
      expect(['control', 'variant_a', 'variant_b']).toContain(variant);
    });

    it('should distribute variants based on weights', () => {
      // Test with 100 different users
      const variants: string[] = [];
      for (let i = 0; i < 100; i++) {
        const variant = service.getVariant('ab_copy_variant', `user-${i}`);
        if (variant) variants.push(variant);
      }

      // Should have at least some of each variant (probabilistic test)
      const controlCount = variants.filter((v) => v === 'control').length;
      const variantACount = variants.filter((v) => v === 'variant_a').length;
      const variantBCount = variants.filter((v) => v === 'variant_b').length;

      // With 50/25/25 split, expect roughly:
      // control: ~50, variant_a: ~25, variant_b: ~25
      // Allow for some variance (±15)
      expect(controlCount).toBeGreaterThan(35);
      expect(controlCount).toBeLessThan(65);
      expect(variantACount).toBeGreaterThan(10);
      expect(variantBCount).toBeGreaterThan(10);
    });
  });

  describe('getAllFlags', () => {
    it('should return all flags', () => {
      const flags = service.getAllFlags();
      expect(flags.length).toBeGreaterThan(0);
      expect(flags.find((f) => f.key === 'ab_copy_variant')).toBeDefined();
    });
  });

  describe('updateFlag', () => {
    it('should update existing flag', () => {
      const updated = service.updateFlag('email_notifications', {
        enabled: true,
      });
      expect(updated).toBe(true);
      expect(service.isEnabled('email_notifications')).toBe(true);
    });

    it('should return false for non-existent flag', () => {
      const updated = service.updateFlag('non_existent', { enabled: true });
      expect(updated).toBe(false);
    });

    it('should update variants', () => {
      const updated = service.updateFlag('ab_copy_variant', {
        variants: {
          control: 100,
          variant_a: 0,
          variant_b: 0,
        },
      });
      expect(updated).toBe(true);

      // Now all users should get 'control'
      const variant = service.getVariant('ab_copy_variant', 'any-user');
      expect(variant).toBe('control');
    });
  });
});
