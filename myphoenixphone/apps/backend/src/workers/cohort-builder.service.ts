import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Cohort Builder Service
 * 
 * Implements RFM (Recency, Frequency, Monetary) analysis to segment users
 * into cohorts for targeted campaigns.
 * 
 * Cohorts:
 * - high_value: Recent activity, high frequency, high estimated value
 * - medium_value: Moderate on all dimensions
 * - low_value: Low frequency or low value
 * - at_risk: Previously high value but declining recency
 * - dormant: High dormant score, no recent activity
 * - churned: Expired leads with no conversion
 */
@Injectable()
export class CohortBuilderService {
  private readonly logger = new Logger(CohortBuilderService.name);

  constructor(private readonly db: PrismaService) {}

  /**
   * Rebuild all cohorts from scratch
   */
  async rebuildCohorts(): Promise<{
    cohortsCreated: number;
    membersAssigned: number;
    duration: number;
  }> {
    this.logger.log('Starting cohort rebuild...');
    const startTime = Date.now();

    try {
      // 1. Ensure cohort definitions exist
      await this.ensureCohortDefinitions();

      // 2. Clear existing cohort memberships
      await this.db.cohortMember.deleteMany({
        where: { removed_at: null },
      });

      // 3. Calculate RFM scores for all leads
      const leads = await this.db.lead.findMany({
        where: {
          expires_at: { gt: new Date() }, // Only active leads
        },
        include: {
          contact_attempts: {
            orderBy: { created_at: 'desc' },
          },
        },
      });

      this.logger.log(`Analyzing ${leads.length} active leads for cohort assignment`);

      let membersAssigned = 0;

      // 4. Assign each lead to appropriate cohorts
      for (const lead of leads) {
        const rfmScores = this.calculateRFMScores(lead);
        const cohortName = this.assignCohort(rfmScores, lead);

        const cohort = await this.db.cohort.findFirst({
          where: { name: cohortName, is_active: true },
        });

        if (cohort) {
          await this.db.cohortMember.create({
            data: {
              cohort_id: cohort.id,
              msisdn_hash: lead.msisdn_hash,
              lead_id: lead.id,
              recency: rfmScores.recency,
              frequency: rfmScores.frequency,
              monetary: rfmScores.monetary,
              dormant_score: lead.dormant_score,
            },
          });
          membersAssigned++;
        }
      }

      // 5. Update cohort statistics
      await this.updateCohortStats();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Cohort rebuild completed in ${duration}ms: ${membersAssigned} members assigned`,
      );

      return {
        cohortsCreated: 6, // Number of predefined cohorts
        membersAssigned,
        duration,
      };
    } catch (error) {
      this.logger.error(`Cohort rebuild failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ensure default cohort definitions exist
   */
  private async ensureCohortDefinitions(): Promise<void> {
    const cohortDefs = [
      {
        name: 'high_value',
        description: 'Recent activity, high frequency, high estimated value (>€150)',
        recency_max: 14,
        frequency_min: 3,
        monetary_min: 150,
      },
      {
        name: 'medium_value',
        description: 'Moderate activity and value (€50-€150)',
        recency_max: 30,
        frequency_min: 2,
        monetary_min: 50,
        monetary_max: 150,
      },
      {
        name: 'low_value',
        description: 'Low frequency or low value (<€50)',
        monetary_max: 50,
      },
      {
        name: 'at_risk',
        description: 'Previously high value but declining recency (>30 days)',
        recency_min: 30,
        monetary_min: 100,
      },
      {
        name: 'dormant',
        description: 'High dormant score (>0.6), no recent activity',
        dormant_score_min: 0.6,
        recency_min: 60,
      },
      {
        name: 'churned',
        description: 'Expired leads with no conversion',
        eligible_only: false,
      },
    ];

    for (const def of cohortDefs) {
      await this.db.cohort.upsert({
        where: { name: def.name },
        create: def,
        update: {
          description: def.description,
          is_active: true,
        },
      });
    }
  }

  /**
   * Calculate RFM scores for a lead
   */
  private calculateRFMScores(lead: {
    created_at: Date;
    contact_attempts: Array<{ created_at: Date; status: string }>;
    estimated_value: number | null;
  }): {
    recency: number;
    frequency: number;
    monetary: number;
  } {
    // Recency: days since last contact or creation
    const lastContact =
      lead.contact_attempts[0]?.created_at || lead.created_at;
    const recency =
      (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24);

    // Frequency: number of contact attempts
    const frequency = lead.contact_attempts.length;

    // Monetary: estimated device value
    const monetary = lead.estimated_value || 0;

    return { recency, frequency, monetary };
  }

  /**
   * Assign a lead to a cohort based on RFM scores
   */
  private assignCohort(
    rfm: { recency: number; frequency: number; monetary: number },
    lead: { dormant_score: number; expires_at: Date },
  ): string {
    // Churned: expired
    if (lead.expires_at < new Date()) {
      return 'churned';
    }

    // Dormant: high score + old
    if (lead.dormant_score >= 0.6 && rfm.recency > 60) {
      return 'dormant';
    }

    // At risk: previously valuable but inactive
    if (rfm.monetary >= 100 && rfm.recency > 30) {
      return 'at_risk';
    }

    // High value: recent, frequent, valuable
    if (rfm.recency <= 14 && rfm.frequency >= 3 && rfm.monetary >= 150) {
      return 'high_value';
    }

    // Medium value: moderate on all dimensions
    if (
      rfm.recency <= 30 &&
      rfm.frequency >= 2 &&
      rfm.monetary >= 50 &&
      rfm.monetary < 150
    ) {
      return 'medium_value';
    }

    // Low value: default
    return 'low_value';
  }

  /**
   * Update cohort statistics (member_count, avg_dormant_score, etc.)
   */
  private async updateCohortStats(): Promise<void> {
    const cohorts = await this.db.cohort.findMany({
      where: { is_active: true },
    });

    for (const cohort of cohorts) {
      const members = await this.db.cohortMember.findMany({
        where: { cohort_id: cohort.id, removed_at: null },
      });

      const avgDormantScore =
        members.reduce((sum, m) => sum + (m.dormant_score || 0), 0) /
          members.length || 0;

      const avgEstimatedValue =
        members.reduce((sum, m) => sum + (m.monetary || 0), 0) /
          members.length || 0;

      await this.db.cohort.update({
        where: { id: cohort.id },
        data: {
          member_count: members.length,
          avg_dormant_score: avgDormantScore,
          avg_estimated_value: avgEstimatedValue,
          last_refresh_at: new Date(),
        },
      });
    }
  }

  /**
   * Get cohort statistics for monitoring
   */
  async getCohortStats(): Promise<
    Array<{
      name: string;
      description: string | null;
      member_count: number;
      avg_dormant_score: number | null;
      avg_estimated_value: number | null;
      last_refresh_at: Date | null;
    }>
  > {
    return this.db.cohort.findMany({
      where: { is_active: true },
      select: {
        name: true,
        description: true,
        member_count: true,
        avg_dormant_score: true,
        avg_estimated_value: true,
        last_refresh_at: true,
      },
      orderBy: { member_count: 'desc' },
    });
  }

  /**
   * Get members of a specific cohort
   */
  async getCohortMembers(
    cohortName: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    members: Array<{
      msisdn_hash: string;
      recency: number | null;
      frequency: number | null;
      monetary: number | null;
      dormant_score: number | null;
      assigned_at: Date;
    }>;
    total: number;
    page: number;
    pages: number;
  }> {
    const cohort = await this.db.cohort.findFirst({
      where: { name: cohortName, is_active: true },
    });

    if (!cohort) {
      throw new Error(`Cohort not found: ${cohortName}`);
    }

    const [members, total] = await Promise.all([
      this.db.cohortMember.findMany({
        where: { cohort_id: cohort.id, removed_at: null },
        select: {
          msisdn_hash: true,
          recency: true,
          frequency: true,
          monetary: true,
          dormant_score: true,
          assigned_at: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { assigned_at: 'desc' },
      }),
      this.db.cohortMember.count({
        where: { cohort_id: cohort.id, removed_at: null },
      }),
    ]);

    return {
      members,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }
}
