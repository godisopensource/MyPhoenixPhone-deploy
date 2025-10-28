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

@Injectable()
export class PhoneModelsService {
  private readonly logger = new Logger(PhoneModelsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<PhoneModel[]> {
    try {
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
      return [];
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
