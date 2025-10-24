import { Injectable } from '@nestjs/common';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  variants?: Record<string, number>; // key: weight (0-100)
  description?: string;
}

@Injectable()
export class FeatureFlagsService {
  private flags: Map<string, FeatureFlag> = new Map();

  constructor() {
    // Initialize default flags
    this.initializeDefaultFlags();
  }

  private initializeDefaultFlags() {
    this.flags.set('ab_copy_variant', {
      key: 'ab_copy_variant',
      enabled: true,
      variants: {
        control: 50, // Version actuelle
        variant_a: 25, // Ton + direct
        variant_b: 25, // Ton + empathique
      },
      description: 'A/B test des copies de messages',
    });

    this.flags.set('geofencing_enabled', {
      key: 'geofencing_enabled',
      enabled: true,
      description: 'Activer la vérification de géolocalisation pour dépôt boutique',
    });

    this.flags.set('sms_throttling', {
      key: 'sms_throttling',
      enabled: true,
      description: 'Throttling des envois SMS (max 1/utilisateur/jour)',
    });

    this.flags.set('email_notifications', {
      key: 'email_notifications',
      enabled: false,
      description: 'Envoi de confirmations par email',
    });

    this.flags.set('pricing_v2', {
      key: 'pricing_v2',
      enabled: false,
      variants: {
        current: 80,
        new_algo: 20,
      },
      description: 'Nouvel algorithme de pricing',
    });
  }

  isEnabled(key: string): boolean {
    const flag = this.flags.get(key);
    return flag?.enabled ?? false;
  }

  getVariant(key: string, userId?: string): string | null {
    const flag = this.flags.get(key);
    if (!flag || !flag.enabled || !flag.variants) {
      return null;
    }

    // Deterministic variant assignment based on userId
    if (userId) {
      const hash = this.simpleHash(userId);
      let cumulative = 0;
      const variants = Object.entries(flag.variants);
      
      for (const [variant, weight] of variants) {
        cumulative += weight;
        if (hash < cumulative) {
          return variant;
        }
      }
    }

    // Fallback: return first variant
    return Object.keys(flag.variants)[0] || null;
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  updateFlag(key: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(key);
    if (!flag) {
      return false;
    }

    this.flags.set(key, { ...flag, ...updates });
    return true;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 100;
  }
}
