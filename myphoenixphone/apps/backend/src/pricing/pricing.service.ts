import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { DeviceConditionDto, PricingEstimateResponse } from './dto/pricing.dto';

/**
 * Phone model data structure from eligible-phone-models.json
 */
interface PhoneModel {
  id: string;
  brand: string;
  model: string;
  storage: string;
  keywords: string[];
  avg_price_tier: number; // 0-5
  release_year: number;
  image_url: string;
}

/**
 * Pricing tier structure from test-fixtures.ts
 */
const PRICING_TIERS = {
  0: { min: 0, max: 0, label: 'Non valorisable' },
  1: { min: 10, max: 30, label: 'Valeur faible' },
  2: { min: 30, max: 70, label: 'Valeur moyenne' },
  3: { min: 70, max: 150, label: 'Bonne valeur' },
  4: { min: 150, max: 300, label: 'Haute valeur' },
  5: { min: 300, max: 600, label: 'Très haute valeur' },
};

/**
 * Pricing Service - DD-07
 * Mock pricing estimation based on phone model tier and device condition.
 * Uses eligible-phone-models.json for model lookup and tiered valuation.
 */
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private phoneModels: PhoneModel[] = [];

  async onModuleInit() {
    await this.loadPhoneModels();
  }

  /**
   * Load phone models from public JSON file
   */
  private async loadPhoneModels(): Promise<void> {
    try {
      // Try local copy first (for tests), then web app's public directory
      let filePath = join(__dirname, './phone-models.json');
      try {
        await readFile(filePath, 'utf-8');
      } catch {
        // Fallback to web app public directory
        filePath = join(
          process.cwd(),
          '../web/public/eligible-phone-models.json',
        );
      }

      const data = await readFile(filePath, 'utf-8');
      this.phoneModels = JSON.parse(data);
      this.logger.log(`Loaded ${this.phoneModels.length} eligible phone models`);
    } catch (error) {
      this.logger.error('Failed to load phone models', error);
      throw error;
    }
  }

  /**
   * Find phone model by name/manufacturer/storage
   * Fuzzy matching on model name and brand
   */
  findPhoneModel(
    model: string,
    manufacturer?: string,
    storage?: string,
  ): PhoneModel | null {
    const searchTerms = model.toLowerCase().split(/\s+/);

    // Exact match first
    let match = this.phoneModels.find((phone) => {
      const matchesModel = phone.model.toLowerCase() === model.toLowerCase();
      const matchesBrand = !manufacturer ||
        phone.brand.toLowerCase() === manufacturer.toLowerCase();
      const matchesStorage = !storage || phone.storage === storage;
      return matchesModel && matchesBrand && matchesStorage;
    });

    if (match) return match;

    // Fuzzy match on keywords and model name
    match = this.phoneModels.find((phone) => {
      const matchesBrand = !manufacturer ||
        phone.brand.toLowerCase() === manufacturer.toLowerCase();
      const matchesKeywords = searchTerms.every((term) =>
        phone.keywords.some((kw) => kw.includes(term)),
      );
      const matchesStorage = !storage || phone.storage === storage;
      return matchesBrand && matchesKeywords && matchesStorage;
    });

    return match || null;
  }

  /**
   * Calculate pricing estimate based on tier and condition
   * Logic from test-fixtures.ts calculateMockEstimate()
   */
  estimateValue(
    model: string,
    manufacturer: string | undefined,
    storage: string | undefined,
    condition: DeviceConditionDto,
  ): PricingEstimateResponse {
    // Find matching phone
    const phone = this.findPhoneModel(model, manufacturer, storage);

    if (!phone) {
      this.logger.warn(`Phone model not found: ${model} (${manufacturer})`);
      throw new NotFoundException(
        `Phone model "${model}" not found in eligible list`,
      );
    }

    const tier = PRICING_TIERS[phone.avg_price_tier];
    if (!tier) {
      throw new Error(`Invalid pricing tier: ${phone.avg_price_tier}`);
    }

    // Base price = average of tier min/max
    const basePrice = (tier.min + tier.max) / 2;
    let multiplier = 1.0;
    const penalties: string[] = [];

    // Screen condition (critical factor)
    if (condition.screen === 'broken') {
      multiplier = 0.0; // No value if screen broken
      penalties.push('Écran cassé (0% de valeur)');
    } else if (condition.screen === 'scratches') {
      multiplier *= 0.85;
      penalties.push('Rayures écran (-15%)');
    }

    // Battery condition
    if (condition.battery === 'fair') {
      multiplier *= 0.9;
      penalties.push('Batterie usée (-10%)');
    } else if (condition.battery === 'good') {
      multiplier *= 0.95;
      penalties.push('Batterie normale (-5%)');
    }

    // Physical damage
    if (condition.damage?.includes('water')) {
      multiplier = 0.0; // No value if water damage
      penalties.push('Dégât des eaux (0% de valeur)');
    } else if (condition.damage?.length > 0) {
      multiplier *= 0.8;
      penalties.push(`Dégâts physiques (-20%): ${condition.damage.join(', ')}`);
    }

    // Carrier lock status
    if (!condition.unlocked) {
      multiplier *= 0.9; // 10% reduction if carrier-locked
      penalties.push('Verrouillé opérateur (-10%)');
    }

    const estimatedValue = Math.round(basePrice * multiplier);

    // Bonus for perfect condition in high tiers
    let bonus: number | undefined;
    if (
      phone.avg_price_tier >= 4 &&
      condition.screen === 'perfect' &&
      condition.battery === 'excellent' &&
      condition.damage.length === 0 &&
      condition.unlocked
    ) {
      bonus = Math.round(basePrice * 0.1); // 10% bonus
    }

    return {
      estimated_value: estimatedValue,
      tier: tier.label,
      tier_number: phone.avg_price_tier,
      currency: 'EUR',
      bonus,
      breakdown: {
        base_price: basePrice,
        multiplier: Math.round(multiplier * 100) / 100,
        condition_penalties: penalties,
      },
      matched_phone: {
        id: phone.id,
        brand: phone.brand,
        model: phone.model,
        storage: phone.storage,
      },
    };
  }
}
