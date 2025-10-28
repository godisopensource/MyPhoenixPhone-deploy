import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Counter } from 'prom-client';
import { metricsRegistry } from '../metrics/metrics.middleware';

const signalOps = new Counter({
  name: 'eligibility_operations_total',
  help: 'EligibilitySignal repository operations',
  labelNames: ['op', 'result'] as const,
  registers: [metricsRegistry],
});

@Injectable()
export class EligibilitySignalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    msisdn_hash: string,
    data: {
      sim_swapped_at?: Date | null;
      reachable?: boolean | null;
    },
  ) {
    try {
      const updated = await this.prisma.eligibilitySignal.upsert({
        where: { msisdn_hash },
        update: data,
        create: { msisdn_hash, ...data },
      });
      signalOps.inc({ op: 'upsert', result: 'ok' });
      return updated;
    } catch (e) {
      signalOps.inc({ op: 'upsert', result: 'err' });
      throw e;
    }
  }

  async findByMsisdnHash(msisdn_hash: string) {
    return this.prisma.eligibilitySignal.findFirst({ where: { msisdn_hash } });
  }
}
