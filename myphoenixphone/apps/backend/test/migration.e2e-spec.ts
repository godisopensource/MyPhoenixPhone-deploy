/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ConsentRepository } from '../src/consent/consent.repository';
import { EligibilitySignalRepository } from '../src/eligibility/eligibility.repository';
import type { Prisma } from '@prisma/client';

jest.setTimeout(120_000);

const RUN_DB_TESTS = process.env.RUN_DB_TESTS === 'true';

(RUN_DB_TESTS ? describe : describe.skip)(
  'DB migrations and CRUD (integration)',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let consentRepo: ConsentRepository;
    let signalRepo: EligibilitySignalRepository;
    let container: any;

    const runPrisma = (args: string[]) => {
      const schemaPath = path.resolve(process.cwd(), 'prisma', 'schema.prisma');
      execFileSync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['prisma', ...args, '--schema', schemaPath],
        { stdio: 'inherit', env: process.env },
      );
    };

    beforeAll(async () => {
      const mod: any = await import('testcontainers');
      const PostgreSqlContainer =
        mod.PostgreSqlContainer ?? mod['PostgreSqlContainer'];
      container = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('testdb')
        .withUsername('test')
        .withPassword('test')
        .start();

      process.env.DATABASE_URL = container.getConnectionUri();
      runPrisma(['generate']);
      runPrisma(['db', 'push']);

      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication();
      prisma = app.get(PrismaService);
      await app.init();

      consentRepo = app.get(ConsentRepository);
      signalRepo = app.get(EligibilitySignalRepository);
    });

    afterAll(async () => {
      if (app) await app.close();
      if (container) await container.stop();
    });

    it('applies migrations', async () => {
      // Ensure we can query the DB via Prisma
      const rows =
        await prisma.$queryRawUnsafe<{ ok: number }[]>('SELECT 1 as ok');
      expect(rows[0]?.ok).toBe(1);
    });

    it('CRUD on Consent and EligibilitySignal', async () => {
      const msisdn_hash = 'hash_123';

      const proof: Prisma.JsonObject = { channel: 'web', ts: Date.now() };
      const created = await consentRepo.create({
        msisdn_hash,
        scopes: ['scope:a', 'scope:b'],
        proof,
        revoked_at: null,
      });

      expect(created.id).toBeDefined();

      expect(created.msisdn_hash).toBe(msisdn_hash);

      const fetched = await consentRepo.findById(created.id);
      expect(fetched?.id).toBe(created.id);

      const list = await consentRepo.findByMsisdnHash(msisdn_hash);
      expect(list.length).toBeGreaterThan(0);

      const revoked = await consentRepo.revoke(created.id);
      expect(revoked.revoked_at).toBeTruthy();

      const signal = await signalRepo.upsert(msisdn_hash, {
        reachable: true,
        sim_swapped_at: null,
      });
      expect(signal.msisdn_hash).toBe(msisdn_hash);

      const fetchedSignal = await signalRepo.findByMsisdnHash(msisdn_hash);
      expect(fetchedSignal?.reachable).toBe(true);
    });
  },
);
