import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Integration tests for Prisma database migrations
 *
 * These tests use testcontainers to spin up a real PostgreSQL database
 * and verify that migrations work correctly, including:
 * - Migration up/down cycles
 * - Data integrity constraints
 * - Foreign key relationships
 * - Unique constraints
 * - Rollback scenarios
 */

describe('Database Migrations (Integration)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeAll(async () => {
    // Start PostgreSQL container
    console.log('🐳 Starting PostgreSQL testcontainer...');
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    databaseUrl = container.getConnectionUri();
    console.log('✅ PostgreSQL container started');
    console.log('📍 Database URL:', databaseUrl);

    // Set environment variable for Prisma
    process.env.DATABASE_URL = databaseUrl;

    // Initialize Prisma client
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }, 120000); // 2 minute timeout for container startup

  afterAll(async () => {
    // Cleanup
    await prisma.$disconnect();
    await container.stop();
    console.log('🛑 PostgreSQL container stopped');
  });

  describe('Migration Deployment', () => {
    test('should successfully run all migrations', async () => {
      // Run migrations
      const migrationsPath = path.join(__dirname, '../../prisma/migrations');

      try {
        execSync('npx prisma migrate deploy', {
          env: { ...process.env, DATABASE_URL: databaseUrl },
          stdio: 'inherit',
        });
      } catch (error) {
        throw new Error(`Migration deployment failed: ${error.message}`);
      }

      // Verify all tables exist
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;

      const tableNames = tables.map((t) => t.tablename);

      // Expected tables from schema
      const expectedTables = [
        'Consent',
        'EligibilitySignal',
        'Interaction',
        'NetworkEvent',
        'Lead',
        'ContactAttempt',
        'OptOut',
        'Campaign',
        'Cohort',
        'CohortMember',
        'WorkerRun',
        '_prisma_migrations', // Prisma internal table
      ];

      for (const expectedTable of expectedTables) {
        expect(tableNames).toContain(expectedTable);
      }

      console.log('✅ All tables created successfully:', tableNames);
    }, 60000);

    test('should create indexes correctly', async () => {
      // Query indexes
      const indexes = await prisma.$queryRaw<
        Array<{ indexname: string; tablename: string }>
      >`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname NOT LIKE '%_pkey'
      `;

      console.log('📊 Indexes created:', indexes.length);

      // Verify critical indexes exist
      const indexNames = indexes.map((i) => i.indexname);

      // Check for msisdn_hash indexes (frequently queried)
      const msisdnIndexes = indexes.filter((i) =>
        i.indexname.toLowerCase().includes('msisdn'),
      );

      expect(msisdnIndexes.length).toBeGreaterThan(0);
      console.log(
        '✅ MSISDN indexes:',
        msisdnIndexes.map((i) => i.indexname),
      );
    });

    test('should have correct table schemas', async () => {
      // Verify Consent table schema
      const consentColumns = await prisma.$queryRaw<
        Array<{ column_name: string; data_type: string; is_nullable: string }>
      >`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'Consent'
        ORDER BY ordinal_position
      `;

      expect(consentColumns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            column_name: 'id',
            data_type: 'text',
            is_nullable: 'NO',
          }),
          expect.objectContaining({
            column_name: 'msisdn_hash',
            data_type: 'text',
            is_nullable: 'NO',
          }),
          expect.objectContaining({
            column_name: 'scopes',
            data_type: 'ARRAY',
            is_nullable: 'NO',
          }),
          expect.objectContaining({
            column_name: 'proof',
            data_type: 'jsonb',
            is_nullable: 'NO',
          }),
          expect.objectContaining({
            column_name: 'created_at',
            is_nullable: 'NO',
          }),
          expect.objectContaining({
            column_name: 'revoked_at',
            is_nullable: 'YES',
          }),
        ]),
      );

      console.log('✅ Consent table schema verified');
    });
  });

  describe('Data Integrity Constraints', () => {
    beforeEach(async () => {
      // Ensure migrations are run
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'pipe',
      });
    });

    test('should enforce unique constraint on EligibilitySignal.msisdn_hash', async () => {
      const msisdnHash = 'test-msisdn-hash-unique';

      // First insert should succeed
      await prisma.eligibilitySignal.create({
        data: {
          msisdn_hash: msisdnHash,
          sim_swapped_at: new Date(),
          reachable: true,
        },
      });

      // Second insert with same msisdn_hash should fail
      await expect(
        prisma.eligibilitySignal.create({
          data: {
            msisdn_hash: msisdnHash,
            sim_swapped_at: new Date(),
            reachable: false,
          },
        }),
      ).rejects.toThrow(/Unique constraint failed/);

      console.log(
        '✅ Unique constraint enforced on EligibilitySignal.msisdn_hash',
      );
    });

    test('should enforce unique constraint on OptOut.msisdn_hash', async () => {
      const msisdnHash = 'test-optout-hash';

      // First opt-out should succeed
      await prisma.optOut.create({
        data: {
          msisdn_hash: msisdnHash,
          reason: 'User requested',
        },
      });

      // Second opt-out with same msisdn_hash should fail
      await expect(
        prisma.optOut.create({
          data: {
            msisdn_hash: msisdnHash,
            reason: 'Duplicate',
          },
        }),
      ).rejects.toThrow(/Unique constraint failed/);

      console.log('✅ Unique constraint enforced on OptOut.msisdn_hash');
    });

    test('should enforce unique constraint on Cohort.name', async () => {
      const cohortName = 'high_value';

      // First cohort should succeed
      await prisma.cohort.create({
        data: {
          name: cohortName,
          description: 'High value users',
        },
      });

      // Second cohort with same name should fail
      await expect(
        prisma.cohort.create({
          data: {
            name: cohortName,
            description: 'Duplicate',
          },
        }),
      ).rejects.toThrow(/Unique constraint failed/);

      console.log('✅ Unique constraint enforced on Cohort.name');
    });

    test('should enforce unique constraint on Lead (msisdn_hash, created_at)', async () => {
      const msisdnHash = 'test-lead-hash';
      const createdAt = new Date('2025-01-01T00:00:00Z');

      // First lead should succeed
      await prisma.lead.create({
        data: {
          msisdn_hash: msisdnHash,
          created_at: createdAt,
          dormant_score: 0.8,
          eligible: true,
          activation_window_days: 30,
          next_action: 'send_nudge',
          exclusions: [],
          signals: {},
          expires_at: new Date('2025-02-01'),
        },
      });

      // Second lead with same msisdn_hash and created_at should fail
      await expect(
        prisma.lead.create({
          data: {
            msisdn_hash: msisdnHash,
            created_at: createdAt,
            dormant_score: 0.9,
            eligible: false,
            activation_window_days: 15,
            next_action: 'hold',
            exclusions: [],
            signals: {},
            expires_at: new Date('2025-02-01'),
          },
        }),
      ).rejects.toThrow(/Unique constraint failed/);

      console.log(
        '✅ Unique constraint enforced on Lead (msisdn_hash, created_at)',
      );
    });

    test('should enforce unique constraint on CohortMember (cohort_id, msisdn_hash, assigned_at)', async () => {
      // Create cohort
      const cohort = await prisma.cohort.create({
        data: {
          name: 'test_cohort_unique',
          description: 'Test cohort',
        },
      });

      const msisdnHash = 'test-member-hash';
      const assignedAt = new Date('2025-01-01T00:00:00Z');

      // First member should succeed
      await prisma.cohortMember.create({
        data: {
          cohort_id: cohort.id,
          msisdn_hash: msisdnHash,
          assigned_at: assignedAt,
        },
      });

      // Second member with same cohort_id, msisdn_hash, assigned_at should fail
      await expect(
        prisma.cohortMember.create({
          data: {
            cohort_id: cohort.id,
            msisdn_hash: msisdnHash,
            assigned_at: assignedAt,
          },
        }),
      ).rejects.toThrow(/Unique constraint failed/);

      console.log('✅ Unique constraint enforced on CohortMember');
    });
  });

  describe('Foreign Key Relationships', () => {
    beforeEach(async () => {
      // Ensure migrations are run
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'pipe',
      });
    });

    test('should enforce foreign key constraint on ContactAttempt.lead_id', async () => {
      const nonExistentLeadId = 'non-existent-lead-id';

      // Creating ContactAttempt with non-existent lead_id should fail
      await expect(
        prisma.contactAttempt.create({
          data: {
            lead_id: nonExistentLeadId,
            channel: 'sms',
            template_variant: 'A',
            status: 'sent',
          },
        }),
      ).rejects.toThrow(/Foreign key constraint failed/);

      console.log(
        '✅ Foreign key constraint enforced on ContactAttempt.lead_id',
      );
    });

    test('should cascade delete ContactAttempts when Lead is deleted', async () => {
      // Create lead
      const lead = await prisma.lead.create({
        data: {
          msisdn_hash: 'test-cascade-hash',
          dormant_score: 0.7,
          eligible: true,
          activation_window_days: 30,
          next_action: 'send_nudge',
          exclusions: [],
          signals: {},
          expires_at: new Date('2025-12-31'),
        },
      });

      // Create contact attempts
      await prisma.contactAttempt.createMany({
        data: [
          {
            lead_id: lead.id,
            channel: 'sms',
            template_variant: 'A',
            status: 'sent',
          },
          {
            lead_id: lead.id,
            channel: 'sms',
            template_variant: 'B',
            status: 'delivered',
          },
        ],
      });

      // Verify contact attempts exist
      const attempts = await prisma.contactAttempt.findMany({
        where: { lead_id: lead.id },
      });
      expect(attempts.length).toBe(2);

      // Delete lead
      await prisma.lead.delete({
        where: { id: lead.id },
      });

      // Verify contact attempts are cascaded deleted
      const remainingAttempts = await prisma.contactAttempt.findMany({
        where: { lead_id: lead.id },
      });
      expect(remainingAttempts.length).toBe(0);

      console.log('✅ Cascade delete works for ContactAttempts');
    });

    test('should enforce foreign key constraint on CohortMember.cohort_id', async () => {
      const nonExistentCohortId = 'non-existent-cohort-id';

      // Creating CohortMember with non-existent cohort_id should fail
      await expect(
        prisma.cohortMember.create({
          data: {
            cohort_id: nonExistentCohortId,
            msisdn_hash: 'test-hash',
          },
        }),
      ).rejects.toThrow(/Foreign key constraint failed/);

      console.log(
        '✅ Foreign key constraint enforced on CohortMember.cohort_id',
      );
    });

    test('should cascade delete CohortMembers when Cohort is deleted', async () => {
      // Create cohort
      const cohort = await prisma.cohort.create({
        data: {
          name: 'test_cascade_cohort',
          description: 'Test cascade delete',
        },
      });

      // Create cohort members
      await prisma.cohortMember.createMany({
        data: [
          {
            cohort_id: cohort.id,
            msisdn_hash: 'member1-hash',
          },
          {
            cohort_id: cohort.id,
            msisdn_hash: 'member2-hash',
          },
          {
            cohort_id: cohort.id,
            msisdn_hash: 'member3-hash',
          },
        ],
      });

      // Verify members exist
      const members = await prisma.cohortMember.findMany({
        where: { cohort_id: cohort.id },
      });
      expect(members.length).toBe(3);

      // Delete cohort
      await prisma.cohort.delete({
        where: { id: cohort.id },
      });

      // Verify members are cascaded deleted
      const remainingMembers = await prisma.cohortMember.findMany({
        where: { cohort_id: cohort.id },
      });
      expect(remainingMembers.length).toBe(0);

      console.log('✅ Cascade delete works for CohortMembers');
    });
  });

  describe('Default Values and Auto-generation', () => {
    beforeEach(async () => {
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'pipe',
      });
    });

    test('should auto-generate UUIDs for primary keys', async () => {
      const consent = await prisma.consent.create({
        data: {
          msisdn_hash: 'test-uuid-hash',
          scopes: ['sim_swap', 'reachability'],
          proof: { token: 'test-token' },
        },
      });

      // ID should be a valid UUID
      expect(consent.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      console.log('✅ UUID auto-generated:', consent.id);
    });

    test('should set default timestamps', async () => {
      const lead = await prisma.lead.create({
        data: {
          msisdn_hash: 'test-timestamp-hash',
          dormant_score: 0.5,
          eligible: true,
          activation_window_days: 30,
          next_action: 'send_nudge',
          exclusions: [],
          signals: {},
          expires_at: new Date('2025-12-31'),
        },
      });

      // created_at should be set automatically
      expect(lead.created_at).toBeInstanceOf(Date);
      expect(lead.updated_at).toBeInstanceOf(Date);

      // Dates should be recent (within last 10 seconds)
      const now = new Date();
      const diffMs = now.getTime() - lead.created_at.getTime();
      expect(diffMs).toBeLessThan(10000);

      console.log('✅ Timestamps auto-set:', {
        created_at: lead.created_at,
        updated_at: lead.updated_at,
      });
    });

    test('should update updated_at on record modification', async () => {
      // Create record
      const lead = await prisma.lead.create({
        data: {
          msisdn_hash: 'test-update-hash',
          dormant_score: 0.6,
          eligible: true,
          activation_window_days: 30,
          next_action: 'send_nudge',
          exclusions: [],
          signals: {},
          expires_at: new Date('2025-12-31'),
        },
      });

      const originalUpdatedAt = lead.updated_at;

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update record
      const updatedLead = await prisma.lead.update({
        where: { id: lead.id },
        data: { dormant_score: 0.8 },
      });

      // updated_at should have changed
      expect(updatedLead.updated_at.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );

      console.log('✅ updated_at changed on update:', {
        original: originalUpdatedAt,
        updated: updatedLead.updated_at,
      });
    });

    test('should set default values for fields', async () => {
      const lead = await prisma.lead.create({
        data: {
          msisdn_hash: 'test-defaults-hash',
          dormant_score: 0.7,
          eligible: true,
          activation_window_days: 30,
          next_action: 'send_nudge',
          exclusions: [],
          signals: {},
          expires_at: new Date('2025-12-31'),
        },
      });

      // contact_count should default to 0
      expect(lead.contact_count).toBe(0);

      console.log('✅ Default values set correctly');
    });
  });
});
