import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('App bootstrap', () => {
  it('should create the application module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();
    await app.close();
  });
});
