import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface PhoneModelSeed {
  id: string;
  brand: string;
  model: string;
  storage: string;
  keywords: string[];
  avg_price_tier: number;
  release_year?: number;
  image_url?: string;
}

async function main() {
  console.log('🌱 Seeding phone models...');

  const filePath = path.join(__dirname, '..', 'src', 'pricing', 'phone-models.json');
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const phoneModels: PhoneModelSeed[] = JSON.parse(rawData);

  console.log(`📱 Found ${phoneModels.length} phone models to seed`);

  // Clear existing data
  console.log('🗑️  Clearing existing phone models...');
  await prisma.phoneModel.deleteMany();

  // Insert phone models
  let created = 0;
  for (const model of phoneModels) {
    await prisma.phoneModel.create({
      data: {
        brand: model.brand,
        model: model.model,
        storage: model.storage,
        keywords: model.keywords,
        avg_price_tier: model.avg_price_tier,
        release_year: model.release_year,
        image_url: model.image_url,
      },
    });
    created++;
    if (created % 10 === 0) {
      console.log(`   ✓ Created ${created}/${phoneModels.length} models`);
    }
  }

  console.log(`✅ Successfully seeded ${created} phone models!`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding phone models:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
