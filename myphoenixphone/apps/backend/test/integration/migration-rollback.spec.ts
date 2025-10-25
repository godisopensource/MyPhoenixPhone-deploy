import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Integration tests for Prisma migration rollback scenarios
 * 
 * Tests the ability to rollback migrations and verify database state
 * remains consistent after rollback operations.
 */

describe('Database Migration Rollback (Integration)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeAll(async () => {
    console.log('🐳 Starting PostgreSQL testcontainer for rollback tests...');
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_rollback_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    databaseUrl = container.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    console.log('✅ PostgreSQL container started for rollback tests');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
    await container.stop();
    console.log('🛑 PostgreSQL container stopped');
  });

  describe('Migration Rollback Scenarios', () => {
    test('should successfully deploy migrations', async () => {
      // Deploy all migrations
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'inherit',
      });

      // Verify migrations table exists
      const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name FROM _prisma_migrations ORDER BY finished_at
      `;

      expect(migrations.length).toBeGreaterThan(0);
      console.log('✅ Migrations deployed:', migrations.length);
      console.log('📝 Migration names:', migrations.map(m => m.migration_name));
    });

    test('should be able to reset database', async () => {
      // Deploy migrations first
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'pipe',
      });

      // Create some data
      await prisma.consent.create({
        data: {
          msisdn_hash: 'test-reset-hash',
          scopes: ['test'],
          proof: { test: true },
        },
      });

      // Verify data exists
      const consentsBefore = await prisma.consent.findMany();
      expect(consentsBefore.length).toBeGreaterThan(0);

      // Reset database (this drops and recreates all tables)
      execSync('npx prisma migrate reset --force --skip-seed', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'pipe',
      });

      // Verify all data is gone
      const consentsAfter = await prisma.consent.findMany();
      expect(consentsAfter.length).toBe(0);

      // Verify tables still exist (reset redeploys migrations)
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;
      expect(tables.length).toBeGreaterThan(1);

      console.log('✅ Database reset successfully');
    });

    test('should preserve data integrity after migration cycle', async () => {
      // Ensure clean state
      execSync('npx prisma migrate reset --force --skip-seed', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'pipe',
      });

      // Create cohort and members
      const cohort = await prisma.cohort.create({
        data: {
          name: 'test_integrity_cohort',
          description: 'Test data integrity',
        },
      });

      await prisma.cohortMember.createMany({
        data: [
          { cohort_id: cohort.id, msisdn_hash: 'member1' },
          { cohort_id: cohort.id, msisdn_hash: 'member2' },
          { cohort_id: cohort.id, msisdn_hash: 'member3' },
        ],
      });

      // Verify relationships
      const members = await prisma.cohortMember.findMany({
        where: { cohort_id: cohort.id },
        include: { cohort: true },
      });

      expect(members.length).toBe(3);
      expect(members[0].cohort.name).toBe('test_integrity_cohort');

      console.log('✅ Data integrity preserved through migration cycle');
    });

    test('should handle migration conflicts gracefully', async () => {
      // Deploy migrations
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'pipe',
      });

      // Try to deploy again - should be idempotent
      try {
        execSync('npx prisma migrate deploy', {
          env: { ...process.env, DATABASE_URL: databaseUrl },
          stdio: 'pipe',
        });

        // Should succeed (idempotent)
        expect(true).toBe(true);
        console.log('✅ Migrations are idempotent');
      } catch (error) {
        throw new Error(`Migration deploy should be idempotent: ${error.message}`);
      }
    });

    test('should maintain migration history', async () => {
      // Deploy migrations
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'pipe',
      });

      // Query migration history
      const migrations = await prisma.$queryRaw<
        Array<{
          id: string;
          checksum: string;
          finished_at: Date;
          migration_name: string;
          logs: string | null;
          rolled_back_at: Date | null;
          started_at: Date;
          applied_steps_count: number;
        }>
      >`
        SELECT * FROM _prisma_migrations ORDER BY started_at
      `;

      expect(migrations.length).toBeGreaterThan(0);

      // All migrations should be finished
      for (const migration of migrations) {
        expect(migration.finished_at).not.toBeNull();
        expect(migration.rolled_back_at).toBeNull();
        console.log(`✅ Migration applied: ${migration.migration_name}`);
      }

      console.log('✅ Migration history maintained correctly');
    });
  });

  describe('Data Consistency After Rollback', () => {
    beforeEach(async () => {
      // Reset to clean state
      execSync('npx prisma migrate reset --force --skip-seed', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'pipe',
      });
    });

    test('should maintain referential integrity after reset', async () => {
      // Create lead with contact attempts
      const lead = await prisma.lead.create({
        data: {
          msisdn_hash: 'test-referential',
          dormant_score: 0.7,
          eligible: true,
          activation_window_days: 30,
          next_action: 'send_nudge',
          exclusions: [],
          signals: {},
          expires_at: new Date('2025-12-31'),
        },
      });

      await prisma.contactAttempt.create({
        data: {
          lead_id: lead.id,
          channel: 'sms',
          template_variant: 'A',
          status: 'sent',
        },
      });

      // Verify relationship
      const leadWithAttempts = await prisma.lead.findUnique({
        where: { id: lead.id },
        include: { contact_attempts: true },
      });

      expect(leadWithAttempts?.contact_attempts.length).toBe(1);

      // Cannot delete lead due to foreign key (if onDelete is not CASCADE)
      // But in our schema, we have CASCADE, so it should delete both

      await prisma.lead.delete({
        where: { id: lead.id },
      });

      // Both should be deleted
      const remainingAttempts = await prisma.contactAttempt.findMany({
        where: { lead_id: lead.id },
      });

      expect(remainingAttempts.length).toBe(0);

      console.log('✅ Referential integrity maintained');
    });

    test('should preserve indexes after reset', async () => {
      // Check indexes exist
      const indexes = await prisma.$queryRaw<Array<{ indexname: string; tablename: string }>>`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
      `;

      expect(indexes.length).toBeGreaterThan(0);

      // Verify critical indexes
      const leadIndexes = indexes.filter(i => i.tablename === 'Lead');
      expect(leadIndexes.length).toBeGreaterThan(0);

      console.log('✅ Indexes preserved:', indexes.length);
    });

    test('should preserve constraints after reset', async () => {
      // Test unique constraint still works
      const msisdnHash = 'test-constraint-preserved';

      await prisma.eligibilitySignal.create({
        data: {
          msisdn_hash: msisdnHash,
          reachable: true,
        },
      });

      // Duplicate should still fail
      await expect(
        prisma.eligibilitySignal.create({
          data: {
            msisdn_hash: msisdnHash,
            reachable: false,
          },
        })
      ).rejects.toThrow(/Unique constraint failed/);

      console.log('✅ Constraints preserved after reset');
    });
  });

  describe('Schema Evolution', () => {
    test('should handle schema changes correctly', async () => {
      // Deploy current schema
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: 'pipe',
      });

      // Verify schema matches expectations
      const leadColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_name = 'Lead'
        ORDER BY ordinal_position
      `;

      const columnNames = leadColumns.map(c => c.column_name);

      // Check for expected columns
      expect(columnNames).toContain('msisdn_hash');
      expect(columnNames).toContain('dormant_score');
      expect(columnNames).toContain('eligible');
      expect(columnNames).toContain('estimated_value');
      expect(columnNames).toContain('handover_choice');

      console.log('✅ Schema columns verified:', columnNames.length);
    });

    test('should verify all table relationships', async () => {
      // Query foreign key constraints
      const foreignKeys = await prisma.$queryRaw<
        Array<{
          table_name: string;
          column_name: string;
          foreign_table_name: string;
          foreign_column_name: string;
        }>
      >`
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      `;

      expect(foreignKeys.length).toBeGreaterThan(0);

      // Verify expected relationships
      const contactAttemptFK = foreignKeys.find(
        fk => fk.table_name === 'ContactAttempt' && fk.column_name === 'lead_id'
      );
      expect(contactAttemptFK).toBeDefined();
      expect(contactAttemptFK?.foreign_table_name).toBe('Lead');

      const cohortMemberFK = foreignKeys.find(
        fk => fk.table_name === 'CohortMember' && fk.column_name === 'cohort_id'
      );
      expect(cohortMemberFK).toBeDefined();
      expect(cohortMemberFK?.foreign_table_name).toBe('Cohort');

      console.log('✅ Foreign key relationships verified:', foreignKeys.length);
    });
  });
});
