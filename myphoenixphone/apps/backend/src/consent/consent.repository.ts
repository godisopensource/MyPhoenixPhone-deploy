import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { Consent } from '@prisma/client';
import { Counter } from 'prom-client';
import { metricsRegistry } from '../metrics/metrics.middleware';

const consentOps = new Counter({
  name: 'consent_operations_total',
  help: 'Consent repository operations',
  labelNames: ['op', 'result'] as const,
  registers: [metricsRegistry],
});

@Injectable()
export class ConsentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      msisdn_hash: string;
      scopes: string[];
      proof: any;
      revoked_at?: Date | null;
    },
  ) {
    try {
      const created = await this.prisma.consent.create({ data });
      consentOps.inc({ op: 'create', result: 'ok' });
      return created;
    } catch (e) {
      consentOps.inc({ op: 'create', result: 'err' });
      throw e;
    }
  }

  async findById(id: string) {
    return this.prisma.consent.findUnique({ where: { id } });
  }

  async findByMsisdnHash(msisdn_hash: string) {
    return this.prisma.consent.findMany({ where: { msisdn_hash } });
  }

  async revoke(id: string, revoked_at: Date = new Date()) {
    try {
      const updated = await this.prisma.consent.update({
        where: { id },
        data: { revoked_at },
      });
      consentOps.inc({ op: 'revoke', result: 'ok' });
      return updated;
    } catch (e) {
      consentOps.inc({ op: 'revoke', result: 'err' });
      throw e;
    }
  }
}
