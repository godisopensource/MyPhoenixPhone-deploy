import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DormantDetectorService } from '../dormant/dormant-detector.service';
import { OrangeSmsService } from '../nudge/sms.service';
import { CreateCampaignDto, UpdateCampaignDto, CampaignResponse, CampaignStatus } from './dto/campaign.dto';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dormantService: DormantDetectorService,
    private readonly smsService: OrangeSmsService,
  ) {}

  /**
   * Create a new campaign
   */
  async create(createDto: CreateCampaignDto): Promise<CampaignResponse> {
    this.logger.log(`Creating campaign: ${createDto.name}`);

    // Calculate estimated reach by querying leads with target filters
    const { total } = await this.dormantService.queryLeads({
      ...createDto.target_filters,
      limit: 1, // Just count
    });

    // Create campaign
    const campaign = await this.prisma.campaign.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        target_filters: createDto.target_filters as any, // Cast to any for Prisma Json type
        estimated_reach: total,
        template_id: createDto.template_id,
        template_variant: createDto.template_variant,
        channel: createDto.channel || 'sms',
        scheduled_at: createDto.scheduled_at ? new Date(createDto.scheduled_at) : null,
        max_per_hour: createDto.max_per_hour || 100,
        batch_size: createDto.batch_size || 10,
        created_by: createDto.created_by,
        status: createDto.scheduled_at ? 'scheduled' : 'draft',
      },
    });

    return this.formatCampaignResponse(campaign);
  }

  /**
   * Get campaign by ID
   */
  async findOne(id: string): Promise<CampaignResponse> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    return this.formatCampaignResponse(campaign);
  }

  /**
   * List all campaigns
   */
  async findAll(filters?: { status?: string; limit?: number; offset?: number }) {
    const { status, limit = 50, offset = 0 } = filters || {};

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      campaigns: campaigns.map((c) => this.formatCampaignResponse(c)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Update campaign
   */
  async update(id: string, updateDto: UpdateCampaignDto): Promise<CampaignResponse> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    // Validate status transitions
    if (updateDto.status) {
      this.validateStatusTransition(campaign.status, updateDto.status);
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.description !== undefined && { description: updateDto.description }),
        ...(updateDto.status && { status: updateDto.status }),
        ...(updateDto.scheduled_at && { scheduled_at: new Date(updateDto.scheduled_at) }),
      },
    });

    return this.formatCampaignResponse(updated);
  }

  /**
   * Delete/Cancel campaign
   */
  async delete(id: string): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    if (campaign.status === 'sending') {
      throw new BadRequestException('Cannot delete a campaign that is currently sending');
    }

    if (campaign.status === 'completed') {
      // Just mark as cancelled for historical record
      await this.prisma.campaign.update({
        where: { id },
        data: { status: 'cancelled' },
      });
    } else {
      // Hard delete draft/scheduled campaigns
      await this.prisma.campaign.delete({ where: { id } });
    }
  }

  /**
   * Get campaign statistics
   */
  async getStats(id: string) {
    const campaign = await this.findOne(id);

    // Get detailed click/conversion data from ContactAttempts
    const attempts = await this.prisma.contactAttempt.findMany({
      where: {
        // Note: We'll need to add campaign_id to ContactAttempt model later
        // For now, use created_at window as proxy
        created_at: {
          gte: campaign.created_at,
          lte: campaign.completed_at || new Date(),
        },
      },
    });

    const clicked = attempts.filter((a) => a.clicked_at !== null).length;
    const delivered = attempts.filter((a) => a.status === 'delivered').length;

    return {
      ...campaign.stats,
      total_attempts: attempts.length,
      delivered_rate: delivered > 0 ? (delivered / attempts.length) * 100 : 0,
      click_rate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      conversion_rate: clicked > 0 ? (campaign.stats.total_converted / clicked) * 100 : 0,
    };
  }

  /**
   * Start sending campaign (trigger nudge service)
   */
  async startSending(id: string): Promise<CampaignResponse> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    if (campaign.status !== 'scheduled' && campaign.status !== 'draft') {
      throw new BadRequestException(`Campaign must be draft or scheduled to start sending`);
    }

    // Update status to sending
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'sending',
        sent_at: new Date(),
      },
    });

    this.logger.log(`Started sending campaign ${id}: ${updated.name}`);
    
    // Trigger actual nudge service (DD-09)
    // Run async to avoid blocking the response
    this.smsService.sendCampaign(id).catch(error => {
      this.logger.error(`Failed to send campaign ${id}`, error);
    });

    return this.formatCampaignResponse(updated);
  }

  /**
   * Format campaign response with calculated stats
   */
  private formatCampaignResponse(campaign: any): CampaignResponse {
    const stats = {
      total_sent: campaign.total_sent,
      total_delivered: campaign.total_delivered,
      total_clicked: campaign.total_clicked,
      total_converted: campaign.total_converted,
      click_rate: campaign.total_delivered > 0
        ? Math.round((campaign.total_clicked / campaign.total_delivered) * 100 * 100) / 100
        : 0,
      conversion_rate: campaign.total_clicked > 0
        ? Math.round((campaign.total_converted / campaign.total_clicked) * 100 * 100) / 100
        : 0,
    };

    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      target_filters: campaign.target_filters,
      estimated_reach: campaign.estimated_reach,
      template_id: campaign.template_id,
      template_variant: campaign.template_variant,
      channel: campaign.channel,
      scheduled_at: campaign.scheduled_at,
      sent_at: campaign.sent_at,
      completed_at: campaign.completed_at,
      max_per_hour: campaign.max_per_hour,
      batch_size: campaign.batch_size,
      status: campaign.status,
      stats,
      created_by: campaign.created_by,
      created_at: campaign.created_at,
      updated_at: campaign.updated_at,
    };
  }

  /**
   * Validate campaign status transitions
   */
  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      draft: ['scheduled', 'sending', 'cancelled'],
      scheduled: ['sending', 'cancelled'],
      sending: ['completed', 'cancelled'],
      completed: [], // Cannot transition from completed
      cancelled: [], // Cannot transition from cancelled
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
