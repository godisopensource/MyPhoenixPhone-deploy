import { EligibilitySignalRepository } from './eligibility.repository';
import { PrismaService } from '../database/prisma.service';

describe('EligibilitySignalRepository', () => {
  it('delegates to prisma client methods (mocked)', async () => {
    type EligibilityModel = {
      upsert: jest.Mock;
      findFirst: jest.Mock;
    };

    const upsert = jest.fn().mockResolvedValue({ id: '1' });
    const findFirst = jest.fn().mockResolvedValue({ id: '1' });

    const prisma = { eligibilitySignal: { upsert, findFirst } } as {
      eligibilitySignal: EligibilityModel;
    };
    const repo = new EligibilitySignalRepository(
      prisma as unknown as PrismaService,
    );

    await repo.upsert('h', {
      eligibility: 'eligible',
      reason: 'ok',
      updated_at: new Date(),
    } as never);
    expect(upsert).toHaveBeenCalled();

    await repo.findByMsisdnHash('h');
    expect(findFirst).toHaveBeenCalledWith({ where: { msisdn_hash: 'h' } });
  });
});
