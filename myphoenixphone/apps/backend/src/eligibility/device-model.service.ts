import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Device model entry from eligible-phone-models.json
 */
export interface DeviceModelEntry {
  model: string;
  variants: string[];
}

/**
 * Eligible phone models grouped by manufacturer
 */
export interface EligiblePhoneModels {
  [manufacturer: string]: DeviceModelEntry[];
}

/**
 * Device selection from user
 */
export interface DeviceSelection {
  manufacturer?: string;
  model?: string;
  variant?: string;
  /** Special selections: 'not_found' | 'unknown_brand' | 'unknown_model' */
  selection?: 'not_found' | 'unknown_brand' | 'unknown_model';
}

/**
 * Device model validation result
 */
export interface DeviceModelValidation {
  eligible: boolean;
  manufacturer?: string;
  model?: string;
  variant?: string;
  reason:
    | 'DEVICE_MODEL_ELIGIBLE'
    | 'DEVICE_MODEL_NOT_FOUND'
    | 'DEVICE_MODEL_UNKNOWN'
    | 'DEVICE_BRAND_NOT_ELIGIBLE';
  action?: 'donate' | 'visit_store';
}

/**
 * Device Model Service
 * Loads eligible phone models from JSON and validates user selections
 */
@Injectable()
export class DeviceModelService {
  private readonly logger = new Logger(DeviceModelService.name);
  private eligibleModels: EligiblePhoneModels = {};

  constructor() {
    this.loadEligibleModels();
  }

  /**
   * Load eligible phone models from JSON file
   */
  private loadEligibleModels(): void {
    try {
      const filePath = path.join(__dirname, 'eligible-phone-models.json');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      this.eligibleModels = JSON.parse(fileContent);

      const manufacturerCount = Object.keys(this.eligibleModels).length;
      const modelCount = Object.values(this.eligibleModels).reduce(
        (sum, models) => sum + models.length,
        0,
      );

      this.logger.log(
        `Loaded ${modelCount} eligible models from ${manufacturerCount} manufacturers`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to load eligible phone models: ${error.message}`,
      );
      // In production, this should probably throw or use a fallback
      this.eligibleModels = {};
    }
  }

  /**
   * Get all eligible manufacturers
   */
  getManufacturers(): string[] {
    return Object.keys(this.eligibleModels);
  }

  /**
   * Get models for a specific manufacturer
   */
  getModelsForManufacturer(manufacturer: string): DeviceModelEntry[] {
    return this.eligibleModels[manufacturer] || [];
  }

  /**
   * Get all eligible models (for frontend consumption)
   */
  getAllEligibleModels(): EligiblePhoneModels {
    return this.eligibleModels;
  }

  /**
   * Validate device selection from user
   *
   * Business rules:
   * - If model found in list → eligible
   * - If "not_found" → not eligible, suggest donation
   * - If "unknown_model" + brand in list → suggest visit store
   * - If "unknown_model" + brand not in list → not eligible, suggest donation
   */
  validateDeviceSelection(selection: DeviceSelection): DeviceModelValidation {
    this.logger.debug(
      `Validating device selection: ${JSON.stringify(selection)}`,
    );

    // Handle special selections
    if (selection.selection === 'not_found') {
      return {
        eligible: false,
        reason: 'DEVICE_MODEL_NOT_FOUND',
        action: 'donate',
      };
    }

    if (selection.selection === 'unknown_model') {
      // Check if manufacturer exists in list
      const manufacturer = selection.manufacturer;
      if (manufacturer && this.eligibleModels[manufacturer]) {
        return {
          eligible: false,
          manufacturer,
          reason: 'DEVICE_MODEL_UNKNOWN',
          action: 'visit_store',
        };
      } else {
        return {
          eligible: false,
          manufacturer,
          reason: 'DEVICE_BRAND_NOT_ELIGIBLE',
          action: 'donate',
        };
      }
    }

    // Normal selection: check if model exists in eligible list
    const { manufacturer, model, variant } = selection;

    if (!manufacturer || !model) {
      this.logger.warn('Missing manufacturer or model in selection');
      return {
        eligible: false,
        reason: 'DEVICE_MODEL_NOT_FOUND',
        action: 'donate',
      };
    }

    // Check manufacturer exists
    const manufacturerModels = this.eligibleModels[manufacturer];
    if (!manufacturerModels) {
      return {
        eligible: false,
        manufacturer,
        model,
        reason: 'DEVICE_BRAND_NOT_ELIGIBLE',
        action: 'donate',
      };
    }

    // Check model exists
    const modelEntry = manufacturerModels.find((m) => m.model === model);
    if (!modelEntry) {
      return {
        eligible: false,
        manufacturer,
        model,
        reason: 'DEVICE_MODEL_NOT_FOUND',
        action: 'donate',
      };
    }

    // Model found - eligible!
    return {
      eligible: true,
      manufacturer,
      model,
      variant,
      reason: 'DEVICE_MODEL_ELIGIBLE',
    };
  }
}
