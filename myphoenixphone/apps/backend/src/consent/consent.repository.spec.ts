import { ConsentRepository } from './consent.repository';
import { PrismaService } from '../database/prisma.service';

describe('ConsentRepository', () => {
  it('delegates to prisma client methods (mocked)', async () => {
    type ConsentModel = {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };

    const create = jest.fn();
    create.mockResolvedValue({
      id: '1',
      msisdn_hash: 'h',
      scopes: [],
      proof: {},
      created_at: new Date(),
      revoked_at: null,
    });
    const findUnique = jest.fn();
    findUnique.mockResolvedValue({ id: '1' });
    const findMany = jest.fn();
    findMany.mockResolvedValue([{ id: '1' }]);
    const update = jest.fn();
    update.mockResolvedValue({ id: '1', revoked_at: new Date() });

    const prisma = { consent: { create, findUnique, findMany, update } } as {
      consent: ConsentModel;
    };
    const repo = new ConsentRepository(prisma as unknown as PrismaService);

    await repo.create({
      msisdn_hash: 'h',
      scopes: [],
      proof: {},
      revoked_at: null,
    } as never);
    expect(create).toHaveBeenCalled();

    await repo.findById('1');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: '1' } });

    await repo.findByMsisdnHash('h');
    expect(findMany).toHaveBeenCalledWith({ where: { msisdn_hash: 'h' } });

    await repo.revoke('1');
    expect(update).toHaveBeenCalled();
  });
});
