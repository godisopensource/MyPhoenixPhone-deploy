import { IsString, IsBoolean, IsArray, IsOptional, IsIn } from 'class-validator';

/**
 * Device condition assessment for pricing calculation
 * Based on LANDING_WIREFRAME.md 5-question condition form
 */
export class DeviceConditionDto {
  @IsString()
  @IsIn(['perfect', 'scratches', 'broken'])
  screen: 'perfect' | 'scratches' | 'broken';

  @IsString()
  @IsIn(['excellent', 'good', 'fair'])
  battery: 'excellent' | 'good' | 'fair';

  @IsArray()
  @IsString({ each: true })
  damage: string[]; // e.g., ['water', 'dents', 'cracks']

  @IsBoolean()
  unlocked: boolean;
}

/**
 * Pricing estimate request payload
 */
export class PricingEstimateDto {
  @IsString()
  model: string; // e.g., "iPhone 15 Pro Max"

  @IsString()
  @IsOptional()
  manufacturer?: string; // e.g., "Apple" - optional, helps with ambiguous model names

  @IsString()
  @IsOptional()
  storage?: string; // e.g., "256GB" - optional

  condition: DeviceConditionDto;
}

/**
 * Pricing estimate response
 */
export interface PricingEstimateResponse {
  estimated_value: number; // EUR
  tier: string; // e.g., "Haute valeur" (tier 4)
  tier_number: number; // 0-5
  currency: string; // "EUR"
  bonus?: number; // Optional bonus for perfect condition
  breakdown?: {
    base_price: number;
    multiplier: number;
    condition_penalties: string[];
  };
  matched_phone?: {
    id: string;
    brand: string;
    model: string;
    storage?: string;
  };
}
