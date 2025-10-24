import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DormantModule } from './dormant.module';
import { PrismaService } from '../database/prisma.service';
import { ReachabilityService } from '../camara/reachability.service';

describe('Dormant System Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let reachabilityService: ReachabilityService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DormantModule],
    })
      .overrideProvider(ReachabilityService)
      .useValue({
        getReachabilityStatus: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    reachabilityService =
      moduleFixture.get<ReachabilityService>(ReachabilityService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.$executeRaw`DELETE FROM "ContactAttempt"`;
    await prisma.$executeRaw`DELETE FROM "Lead"`;
    await prisma.$executeRaw`DELETE FROM "NetworkEvent"`;
    await prisma.$executeRaw`DELETE FROM "OptOut"`;
  });

  describe('POST /dormant/process - Direct event processing', () => {
    it('should process a valid dormant event', async () => {
      const event = {
        msisdn_hash: 'test_hash_12345',
        sim_swap: {
          occurred: true,
          ts: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        },
        old_device_reachability: {
          reachable: false,
          checked_ts: new Date().toISOString(),
          last_activity_ts: new Date(
            Date.now() - 4 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        line_type: 'consumer' as const,
        fraud_flag: false,
        metadata: {
          swap_count_30d: 1,
          opt_out: false,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/dormant/process')
        .send(event)
        .expect(200);

      expect(response.body.eligible).toBe(true);
      expect(response.body.next_action).toBe('send_nudge');
      expect(response.body.dormant_score).toBeGreaterThan(0);
    });

    it('should exclude device with fraud flag', async () => {
      const event = {
        msisdn_hash: 'test_hash_fraud',
        sim_swap: {
          occurred: true,
          ts: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        },
        old_device_reachability: {
          reachable: false,
          checked_ts: new Date().toISOString(),
          last_activity_ts: new Date(
            Date.now() - 4 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        line_type: 'consumer' as const,
        fraud_flag: true, // FRAUD FLAG
        metadata: {
          swap_count_30d: 1,
          opt_out: false,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/dormant/process')
        .send(event)
        .expect(200);

      expect(response.body.eligible).toBe(false);
      expect(response.body.exclusions).toContain('fraud_flag');
    });

    it('should exclude device swapped too recently', async () => {
      const event = {
        msisdn_hash: 'test_hash_recent',
        sim_swap: {
          occurred: true,
          ts: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago - TOO SOON
        },
        old_device_reachability: {
          reachable: false,
          checked_ts: new Date().toISOString(),
          last_activity_ts: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        line_type: 'consumer' as const,
        fraud_flag: false,
        metadata: {
          swap_count_30d: 1,
          opt_out: false,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/dormant/process')
        .send(event)
        .expect(200);

      expect(response.body.eligible).toBe(false);
      expect(response.body.next_action).toBe('exclude'); // too_soon is an exclusion reason
      expect(response.body.exclusions).toContain('too_soon_after_swap');
    });

    it('should exclude device with multiple swaps', async () => {
      const event = {
        msisdn_hash: 'test_hash_multiple',
        sim_swap: {
          occurred: true,
          ts: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        old_device_reachability: {
          reachable: false,
          checked_ts: new Date().toISOString(),
          last_activity_ts: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        line_type: 'consumer' as const,
        fraud_flag: false,
        metadata: {
          swap_count_30d: 4, // EXCEEDS THRESHOLD
          opt_out: false,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/dormant/process')
        .send(event)
        .expect(200);

      expect(response.body.eligible).toBe(false);
      expect(response.body.exclusions).toContain('multiple_swaps_detected');
    });

    it('should exclude business lines', async () => {
      const event = {
        msisdn_hash: 'test_hash_business',
        sim_swap: {
          occurred: true,
          ts: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        old_device_reachability: {
          reachable: false,
          checked_ts: new Date().toISOString(),
          last_activity_ts: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        line_type: 'business' as const, // BUSINESS LINE
        fraud_flag: false,
        metadata: {
          swap_count_30d: 1,
          opt_out: false,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/dormant/process')
        .send(event)
        .expect(200);

      expect(response.body.eligible).toBe(false);
      expect(response.body.exclusions).toContain('business_line');
    });
  });

  describe('POST /dormant/maintenance/purge - Cleanup', () => {
    it('should respond successfully to purge request', async () => {
      const response = await request(app.getHttpServer())
        .post('/dormant/maintenance/purge')
        .expect(200);

      expect(response.body).toHaveProperty('leads_purged');
      expect(response.body).toHaveProperty('events_cleaned');
      expect(typeof response.body.leads_purged).toBe('number');
      expect(typeof response.body.events_cleaned).toBe('number');
    });
  });
});
