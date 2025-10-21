import {
  INestApplication,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // In unit tests, we may not have DATABASE_URL set; skip connecting to DB in that case
    if (!process.env.DATABASE_URL) {
      return;
    }
    await this.$connect();
  }

  enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit' as never, () => {
      void app.close();
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
