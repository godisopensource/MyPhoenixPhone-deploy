import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PricingService } from './pricing.service';
import type { DeviceConditionDto } from './dto/pricing.dto';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingService],
    }).compile();

    service = module.get<PricingService>(PricingService);
    await service.onModuleInit(); // Load phone models
  });

  describe('findPhoneModel', () => {
    it('should find phone by exact model name', () => {
      const phone = service.findPhoneModel('iPhone 15 Pro Max');
      expect(phone).toBeDefined();
      expect(phone?.model).toBe('iPhone 15 Pro Max');
      expect(phone?.brand).toBe('Apple');
    });

    it('should find phone by model name and manufacturer', () => {
      const phone = service.findPhoneModel('Galaxy S23', 'Samsung');
      expect(phone).toBeDefined();
      expect(phone?.model).toBe('Galaxy S23');
      expect(phone?.brand).toBe('Samsung');
    });

    it('should find phone by model name, manufacturer, and storage', () => {
      const phone = service.findPhoneModel('iPhone 15 Pro', 'Apple', '128GB');
      expect(phone).toBeDefined();
      expect(phone?.id).toBe('iphone-15-pro-128');
      expect(phone?.storage).toBe('128GB');
    });

    it('should perform fuzzy match on keywords', () => {
      const phone = service.findPhoneModel('pixel 8 pro');
      expect(phone).toBeDefined();
      expect(phone?.model).toBe('Pixel 8 Pro');
      expect(phone?.brand).toBe('Google');
    });

    it('should return null for unknown model', () => {
      const phone = service.findPhoneModel('Nokia 3310');
      expect(phone).toBeNull();
    });
  });

  describe('estimateValue - Perfect Condition', () => {
    const perfectCondition: DeviceConditionDto = {
      screen: 'perfect',
      battery: 'excellent',
      damage: [],
      unlocked: true,
    };

    it('should calculate tier 5 device (iPhone 15 Pro Max)', () => {
      const estimate = service.estimateValue(
        'iPhone 15 Pro Max',
        'Apple',
        '256GB',
        perfectCondition,
      );

      expect(estimate.tier_number).toBe(5);
      expect(estimate.tier).toBe('Très haute valeur');
      expect(estimate.estimated_value).toBeGreaterThanOrEqual(300);
      expect(estimate.estimated_value).toBeLessThanOrEqual(600);
      expect(estimate.currency).toBe('EUR');
      expect(estimate.breakdown?.multiplier).toBe(1.0);
      expect(estimate.breakdown?.condition_penalties).toHaveLength(0);
      expect(estimate.bonus).toBeDefined(); // 10% bonus for perfect high-tier
      expect(estimate.matched_phone?.id).toBe('iphone-15-pro-max-256');
    });

    it('should calculate tier 4 device (Galaxy S23)', () => {
      const estimate = service.estimateValue(
        'Galaxy S23',
        'Samsung',
        '128GB',
        perfectCondition,
      );

      expect(estimate.tier_number).toBe(4);
      expect(estimate.tier).toBe('Haute valeur');
      expect(estimate.estimated_value).toBeGreaterThanOrEqual(150);
      expect(estimate.estimated_value).toBeLessThanOrEqual(300);
      expect(estimate.bonus).toBeDefined(); // Tier 4 also gets bonus
    });

    it('should calculate tier 3 device (iPhone 13 Pro)', () => {
      const estimate = service.estimateValue(
        'iPhone 13 Pro',
        'Apple',
        '128GB',
        perfectCondition,
      );

      expect(estimate.tier_number).toBe(3);
      expect(estimate.tier).toBe('Bonne valeur');
      expect(estimate.estimated_value).toBeGreaterThanOrEqual(70);
      expect(estimate.estimated_value).toBeLessThanOrEqual(150);
      expect(estimate.bonus).toBeUndefined(); // Tier 3 does not get bonus
    });

    it('should calculate tier 2 device (Galaxy A54)', () => {
      const estimate = service.estimateValue(
        'Galaxy A54 5G',
        'Samsung',
        undefined,
        perfectCondition,
      );

      expect(estimate.tier_number).toBe(2);
      expect(estimate.tier).toBe('Valeur moyenne');
      expect(estimate.estimated_value).toBeGreaterThanOrEqual(30);
      expect(estimate.estimated_value).toBeLessThanOrEqual(70);
    });

    it('should calculate tier 1 device (Redmi Note 12)', () => {
      const estimate = service.estimateValue(
        'Redmi Note 12',
        'Xiaomi',
        undefined,
        perfectCondition,
      );

      expect(estimate.tier_number).toBe(1);
      expect(estimate.tier).toBe('Valeur faible');
      expect(estimate.estimated_value).toBeGreaterThanOrEqual(10);
      expect(estimate.estimated_value).toBeLessThanOrEqual(30);
    });
  });

  describe('estimateValue - Condition Penalties', () => {
    it('should apply screen scratches penalty (-15%)', () => {
      const condition: DeviceConditionDto = {
        screen: 'scratches',
        battery: 'excellent',
        damage: [],
        unlocked: true,
      };

      const estimate = service.estimateValue(
        'iPhone 15 Pro Max',
        'Apple',
        '256GB',
        condition,
      );

      expect(estimate.breakdown?.multiplier).toBeCloseTo(0.85, 2);
      expect(estimate.breakdown?.condition_penalties).toContain(
        'Rayures écran (-15%)',
      );
      expect(estimate.estimated_value).toBeLessThan(450); // Base ~450, reduced by 15%
    });

    it('should return zero value for broken screen', () => {
      const condition: DeviceConditionDto = {
        screen: 'broken',
        battery: 'excellent',
        damage: [],
        unlocked: true,
      };

      const estimate = service.estimateValue(
        'iPhone 15 Pro Max',
        'Apple',
        '256GB',
        condition,
      );

      expect(estimate.estimated_value).toBe(0);
      expect(estimate.breakdown?.multiplier).toBe(0);
      expect(estimate.breakdown?.condition_penalties).toContain(
        'Écran cassé (0% de valeur)',
      );
    });

    it('should apply battery fair penalty (-10%)', () => {
      const condition: DeviceConditionDto = {
        screen: 'perfect',
        battery: 'fair',
        damage: [],
        unlocked: true,
      };

      const estimate = service.estimateValue(
        'Galaxy S23',
        'Samsung',
        undefined,
        condition,
      );

      expect(estimate.breakdown?.multiplier).toBeCloseTo(0.9, 2);
      expect(estimate.breakdown?.condition_penalties).toContain(
        'Batterie usée (-10%)',
      );
    });

    it('should apply battery good penalty (-5%)', () => {
      const condition: DeviceConditionDto = {
        screen: 'perfect',
        battery: 'good',
        damage: [],
        unlocked: true,
      };

      const estimate = service.estimateValue(
        'Galaxy S23',
        'Samsung',
        undefined,
        condition,
      );

      expect(estimate.breakdown?.multiplier).toBeCloseTo(0.95, 2);
      expect(estimate.breakdown?.condition_penalties).toContain(
        'Batterie normale (-5%)',
      );
    });

    it('should return zero value for water damage', () => {
      const condition: DeviceConditionDto = {
        screen: 'perfect',
        battery: 'excellent',
        damage: ['water'],
        unlocked: true,
      };

      const estimate = service.estimateValue(
        'iPhone 15 Pro Max',
        'Apple',
        '256GB',
        condition,
      );

      expect(estimate.estimated_value).toBe(0);
      expect(estimate.breakdown?.multiplier).toBe(0);
      expect(estimate.breakdown?.condition_penalties).toContain(
        'Dégât des eaux (0% de valeur)',
      );
    });

    it('should apply physical damage penalty (-20%)', () => {
      const condition: DeviceConditionDto = {
        screen: 'perfect',
        battery: 'excellent',
        damage: ['dents', 'scratches'],
        unlocked: true,
      };

      const estimate = service.estimateValue(
        'Pixel 8 Pro',
        'Google',
        undefined,
        condition,
      );

      expect(estimate.breakdown?.multiplier).toBeCloseTo(0.8, 2);
      expect(estimate.breakdown?.condition_penalties).toContain(
        'Dégâts physiques (-20%): dents, scratches',
      );
    });

    it('should apply carrier lock penalty (-10%)', () => {
      const condition: DeviceConditionDto = {
        screen: 'perfect',
        battery: 'excellent',
        damage: [],
        unlocked: false, // Carrier-locked
      };

      const estimate = service.estimateValue(
        'OnePlus 11',
        'OnePlus',
        undefined,
        condition,
      );

      expect(estimate.breakdown?.multiplier).toBeCloseTo(0.9, 2);
      expect(estimate.breakdown?.condition_penalties).toContain(
        'Verrouillé opérateur (-10%)',
      );
    });
  });

  describe('estimateValue - Combined Penalties', () => {
    it('should stack multiple penalties correctly', () => {
      const condition: DeviceConditionDto = {
        screen: 'scratches', // -15%
        battery: 'fair', // -10%
        damage: ['dents'], // -20%
        unlocked: false, // -10%
      };

      const estimate = service.estimateValue(
        'iPhone 14 Pro',
        'Apple',
        '128GB',
        condition,
      );

      // Expected multiplier: 0.85 * 0.9 * 0.8 * 0.9 = 0.5508
      expect(estimate.breakdown?.multiplier).toBeCloseTo(0.55, 1);
      expect(estimate.breakdown?.condition_penalties).toHaveLength(4);
      expect(estimate.estimated_value).toBeGreaterThan(0);
      expect(estimate.estimated_value).toBeLessThan(225); // Tier 4 base ~225
    });

    it('should handle worst-case non-zero scenario', () => {
      const condition: DeviceConditionDto = {
        screen: 'scratches',
        battery: 'fair',
        damage: ['dents', 'scratches'],
        unlocked: false,
      };

      const estimate = service.estimateValue(
        'Redmi Note 11',
        'Xiaomi',
        undefined,
        condition,
      );

      // Tier 1 device with all penalties stacked
      expect(estimate.estimated_value).toBeGreaterThan(0);
      expect(estimate.estimated_value).toBeLessThan(20); // Tier 1 base ~20
      expect(
        estimate.breakdown?.condition_penalties.length,
      ).toBeGreaterThanOrEqual(3);
    });
  });

  describe('estimateValue - Edge Cases', () => {
    it('should throw NotFoundException for unknown model', () => {
      const condition: DeviceConditionDto = {
        screen: 'perfect',
        battery: 'excellent',
        damage: [],
        unlocked: true,
      };

      expect(() => {
        service.estimateValue('Nokia 3310', undefined, undefined, condition);
      }).toThrow(NotFoundException);

      expect(() => {
        service.estimateValue('Nokia 3310', undefined, undefined, condition);
      }).toThrow('Phone model "Nokia 3310" not found in eligible list');
    });

    it('should handle model search without manufacturer', () => {
      const condition: DeviceConditionDto = {
        screen: 'perfect',
        battery: 'excellent',
        damage: [],
        unlocked: true,
      };

      const estimate = service.estimateValue(
        'Pixel 8',
        undefined,
        undefined,
        condition,
      );

      expect(estimate.matched_phone?.brand).toBe('Google');
      expect(estimate.matched_phone?.model).toBe('Pixel 8');
    });

    it('should match case-insensitively', () => {
      const condition: DeviceConditionDto = {
        screen: 'perfect',
        battery: 'excellent',
        damage: [],
        unlocked: true,
      };

      const estimate = service.estimateValue(
        'iphone 13 pro',
        'apple',
        undefined,
        condition,
      );

      expect(estimate.matched_phone?.brand).toBe('Apple');
      expect(estimate.matched_phone?.model).toBe('iPhone 13 Pro');
    });
  });

  describe('estimateValue - Bonus Calculation', () => {
    it('should give 10% bonus for perfect tier 5 device', () => {
      const condition: DeviceConditionDto = {
        screen: 'perfect',
        battery: 'excellent',
        damage: [],
        unlocked: true,
      };

      const estimate = service.estimateValue(
        'Galaxy S23 Ultra',
        'Samsung',
        '256GB',
        condition,
      );

      expect(estimate.tier_number).toBe(5);
      expect(estimate.bonus).toBeDefined();
      expect(estimate.bonus).toBeGreaterThan(0);
      // Bonus should be ~10% of base price (tier 5 avg = 450)
      expect(estimate.bonus).toBeCloseTo(45, -1); // Within 10 EUR
    });

    it('should not give bonus for tier 5 with any penalty', () => {
      const condition: DeviceConditionDto = {
        screen: 'scratches', // Any penalty disqualifies bonus
        battery: 'excellent',
        damage: [],
        unlocked: true,
      };

      const estimate = service.estimateValue(
        'iPhone 15 Pro Max',
        'Apple',
        '256GB',
        condition,
      );

      expect(estimate.tier_number).toBe(5);
      expect(estimate.bonus).toBeUndefined();
    });

    it('should not give bonus for perfect tier 3 device', () => {
      const condition: DeviceConditionDto = {
        screen: 'perfect',
        battery: 'excellent',
        damage: [],
        unlocked: true,
      };

      const estimate = service.estimateValue(
        'Pixel 8',
        'Google',
        undefined,
        condition,
      );

      expect(estimate.tier_number).toBe(3);
      expect(estimate.bonus).toBeUndefined(); // Only tier 4+ gets bonus
    });
  });
});
