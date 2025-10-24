import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { randomUUID } from 'crypto';

/**
 * Lead Tracking Service
 * Génère des lead IDs uniques et gère la relation lead_id <-> msisdn + campaign_id
 */
@Injectable()
export class LeadTrackingService {
  private readonly logger = new Logger(LeadTrackingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Génère un lead ID unique (UUID v4)
   */
  generateLeadId(): string {
    return randomUUID();
  }

  /**
   * Associe un lead_id avec un msisdn et une campagne
   * Crée un Lead dans la DB si inexistant, sinon update
   * 
   * @param leadId - UUID généré pour le lead
   * @param msisdnHash - Hash du numéro de téléphone
   * @param campaignId - ID de la campagne qui génère ce lead
   * @returns Lead créé ou mis à jour
   */
  async associateLeadWithCampaign(
    leadId: string,
    msisdnHash: string,
    campaignId: string,
  ) {
    this.logger.log(
      `Associating lead ${leadId} with msisdn ${msisdnHash} for campaign ${campaignId}`,
    );

    // Chercher un lead existant pour ce msisdn
    const existingLead = await this.prisma.lead.findFirst({
      where: { msisdn_hash: msisdnHash },
      orderBy: { created_at: 'desc' },
    });

    if (existingLead) {
      // Update: ajouter le nouveau lead_id (pour traçabilité multi-campagnes)
      // On stocke le lead_id dans les signals JSON pour garder l'historique
      const signals = (existingLead.signals as any) || {};
      const leadIds = signals.lead_ids || [];
      leadIds.push({ id: leadId, campaign_id: campaignId, created_at: new Date() });

      return this.prisma.lead.update({
        where: { id: existingLead.id }, // Use unique ID field
        data: {
          signals: {
            ...signals,
            lead_ids: leadIds,
            last_lead_id: leadId, // dernier lead_id généré
            last_campaign_id: campaignId,
          } as any, // Cast to any for Prisma Json type
        },
      });
    } else {
      // Créer un nouveau lead avec tous les champs obligatoires
      return this.prisma.lead.create({
        data: {
          msisdn_hash: msisdnHash,
          dormant_score: 0.5, // Default score
          eligible: true,
          activation_window_days: 30,
          next_action: 'send_nudge',
          exclusions: [],
          signals: {
            lead_ids: [{ id: leadId, campaign_id: campaignId, created_at: new Date() }],
            last_lead_id: leadId,
            last_campaign_id: campaignId,
          } as any, // Cast to any for Prisma Json type
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      });
    }
  }

  /**
   * Récupère le msisdn_hash et campaign_id à partir d'un lead_id
   * @param leadId - UUID du lead
   * @returns Lead trouvé ou null
   */
  async getLeadByLeadId(leadId: string) {
    const leads = await this.prisma.lead.findMany({
      where: {
        signals: {
          path: ['last_lead_id'],
          equals: leadId,
        },
      },
    });

    if (leads.length > 0) {
      return leads[0];
    }

    // Fallback: recherche dans l'historique lead_ids
    const allLeads = await this.prisma.lead.findMany();
    for (const lead of allLeads) {
      const signals = (lead.signals as any) || {};
      const leadIds = signals.lead_ids || [];
      if (leadIds.some((item: any) => item.id === leadId)) {
        return lead;
      }
    }

    return null;
  }
}
