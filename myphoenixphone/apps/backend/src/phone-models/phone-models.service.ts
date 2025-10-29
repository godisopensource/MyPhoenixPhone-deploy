import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

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

// Minimal fallback catalog to enable demo when DATABASE_URL is not configured
const FALLBACK_MODELS: PhoneModel[] = [
  {
    id: 'apple-iphone-14-pro-128',
    brand: 'Apple',
    model: 'iPhone 14 Pro',
    storage: '128GB',
    keywords: ['apple', 'iphone', '14', 'pro', '128'],
    avg_price_tier: 5,
  },
  {
    id: 'apple-iphone-13-pro-max-256',
    brand: 'Apple',
    model: 'iPhone 13 Pro Max',
    storage: '256GB',
    keywords: ['apple', 'iphone', '13', 'pro', 'max', '256'],
    avg_price_tier: 4,
  },
  {
    id: 'samsung-galaxy-s22-128',
    brand: 'Samsung',
    model: 'Galaxy S22',
    storage: '128GB',
    keywords: ['samsung', 'galaxy', 's22', '128'],
    avg_price_tier: 4,
  },
  {
    id: 'samsung-galaxy-s21-128',
    brand: 'Samsung',
    model: 'Galaxy S21',
    storage: '128GB',
    keywords: ['samsung', 'galaxy', 's21', '128'],
    avg_price_tier: 3,
  },
  {
    id: 'google-pixel-7-128',
    brand: 'Google',
    model: 'Pixel 7',
    storage: '128GB',
    keywords: ['google', 'pixel', '7', '128'],
    avg_price_tier: 3,
  },
  {
    id: 'oneplus-9-pro-256',
    brand: 'OnePlus',
    model: '9 Pro',
    storage: '256GB',
    keywords: ['oneplus', '9', 'pro', '256'],
    avg_price_tier: 3,
  },
  {
    id: 'xiaomi-mi-11-128',
    brand: 'Xiaomi',
    model: 'Mi 11',
    storage: '128GB',
    keywords: ['xiaomi', 'mi', '11', '128'],
    avg_price_tier: 2,
  },
  {
    id: 'huawei-p30-128',
    brand: 'Huawei',
    model: 'P30',
    storage: '128GB',
    keywords: ['huawei', 'p30', '128'],
    avg_price_tier: 2,
  },
  {
    id: 'apple-iphone-11-64',
    brand: 'Apple',
    model: 'iPhone 11',
    storage: '64GB',
    keywords: ['apple', 'iphone', '11', '64'],
    avg_price_tier: 2,
  },
];

@Injectable()
export class PhoneModelsService {
  private readonly logger = new Logger(PhoneModelsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<PhoneModel[]> {
    try {
      // Fallback to in-memory catalog when DB is not configured
      if (!process.env.DATABASE_URL) {
        this.logger.warn(
          'DATABASE_URL is not set. Returning fallback phone models catalog for demo.',
        );
        return FALLBACK_MODELS;
      }

      const models = await this.prisma.phoneModel.findMany({
        orderBy: [
          { avg_price_tier: 'desc' },
          { brand: 'asc' },
          { model: 'asc' },
        ],
      });

      this.logger.log(`Loaded ${models.length} phone models from database`);

      return models.map((m) => ({
        id: m.id,
        brand: m.brand,
        model: m.model,
        storage: m.storage,
        keywords: m.keywords,
        avg_price_tier: m.avg_price_tier,
        release_year: m.release_year ?? undefined,
        image_url: m.image_url ?? undefined,
      }));
    } catch (err) {
      this.logger.error('Failed to load phone models from database', err);
      // Graceful fallback for demo if DB is unreachable
      return FALLBACK_MODELS;
    }
  }

  async findById(id: string): Promise<PhoneModel | null> {
    try {
      const model = await this.prisma.phoneModel.findUnique({
        where: { id },
      });

      if (!model) return null;

      return {
        id: model.id,
        brand: model.brand,
        model: model.model,
        storage: model.storage,
        keywords: model.keywords,
        avg_price_tier: model.avg_price_tier,
        release_year: model.release_year ?? undefined,
        image_url: model.image_url ?? undefined,
      };
    } catch (err) {
      this.logger.error(`Failed to find phone model by id: ${id}`, err);
      return null;
    }
  }

  async search(query: string): Promise<PhoneModel[]> {
    try {
      const lowerQuery = query.toLowerCase();

      const models = await this.prisma.phoneModel.findMany({
        where: {
          OR: [
            { brand: { contains: lowerQuery, mode: 'insensitive' } },
            { model: { contains: lowerQuery, mode: 'insensitive' } },
            { keywords: { has: lowerQuery } },
          ],
        },
        orderBy: [{ avg_price_tier: 'desc' }, { brand: 'asc' }],
        take: 20, // Limit results
      });

      return models.map((m) => ({
        id: m.id,
        brand: m.brand,
        model: m.model,
        storage: m.storage,
        keywords: m.keywords,
        avg_price_tier: m.avg_price_tier,
        release_year: m.release_year ?? undefined,
        image_url: m.image_url ?? undefined,
      }));
    } catch (err) {
      this.logger.error(
        `Failed to search phone models with query: ${query}`,
        err,
      );
      return [];
    }
  }
}
