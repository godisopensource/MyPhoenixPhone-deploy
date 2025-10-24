import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type PhoneModel = {
  id: string;
  brand: string;
  model: string;
  storage: string;
  keywords: string[];
  avg_price_tier: number;
  release_year?: number;
  image_url?: string;
};

@Injectable()
export class PhoneModelsService {
  private readonly logger = new Logger(PhoneModelsService.name);
  private cache: PhoneModel[] | null = null;

  getAll(): PhoneModel[] {
    if (this.cache) return this.cache;

    try {
      // Try multiple paths to find the phone models JSON file
      const possiblePaths = [
        // From backend working directory to web public folder (monorepo structure)
        path.resolve(process.cwd(), '..', 'web', 'public', 'eligible-phone-models.json'),
        // From repo root
        path.resolve(process.cwd(), 'apps', 'web', 'public', 'eligible-phone-models.json'),
        // If running from apps/backend
        path.resolve(process.cwd(), '..', '..', 'apps', 'web', 'public', 'eligible-phone-models.json'),
      ];

      let filePath: string | null = null;
      for (const tryPath of possiblePaths) {
        if (fs.existsSync(tryPath)) {
          filePath = tryPath;
          this.logger.log(`Found phone models file at: ${tryPath}`);
          break;
        }
      }

      if (!filePath) {
        this.logger.error(`Phone models file not found. Tried: ${possiblePaths.join(', ')}`);
        this.logger.error(`Current working directory: ${process.cwd()}`);
        return [];
      }

      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as PhoneModel[];
      this.cache = parsed;
      this.logger.log(`Loaded ${parsed.length} phone models from ${filePath}`);
      return parsed;
    } catch (err) {
      this.logger.error('Failed to load phone models file', err as any);
      return [];
    }
  }
}
