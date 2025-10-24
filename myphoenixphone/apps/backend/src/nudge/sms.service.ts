import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LeadTrackingService } from './lead-tracking.service';
import axios from 'axios';

/**
 * Orange SMS Service
 * Intègre l'API Orange Contact Everyone pour l'envoi de SMS
 * https://developer.orange.com/apis/contact-everyone
 * 
 * En mode DEV: simulation (mock) de l'envoi
 * En mode PROD: utilise les credentials Orange Contact Everyone
 */
@Injectable()
export class OrangeSmsService {
  private readonly logger = new Logger(OrangeSmsService.name);
  
  // Configuration Orange Contact Everyone API
  private readonly orangeApiUrl = process.env.ORANGE_SMS_API_URL || 'https://api.orange.com/smsmessaging/v1';
  private readonly orangeApiKey = process.env.ORANGE_SMS_API_KEY;
  private readonly orangeSenderName = process.env.ORANGE_SMS_SENDER_NAME || 'Orange';
  private readonly frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
  private readonly isDev = process.env.NODE_ENV !== 'production';

  constructor(
    private prisma: PrismaService,
    private leadTracking: LeadTrackingService,
  ) {}

  /**
   * Envoie une campagne SMS à une liste de leads
   * 
   * @param campaignId - ID de la campagne
   * @returns Statistiques d'envoi
   */
  async sendCampaign(campaignId: string) {
    this.logger.log(`Starting SMS campaign ${campaignId}`);

    // 1. Récupérer la campagne
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    if (campaign.status !== 'scheduled' && campaign.status !== 'draft') {
      throw new Error(`Campaign ${campaignId} cannot be sent (status: ${campaign.status})`);
    }

    // 2. Récupérer les leads ciblés via les filtres
    const targetFilters = campaign.target_filters as any;
    const leads = await this.getTargetedLeads(targetFilters);

    this.logger.log(`Found ${leads.length} leads for campaign ${campaignId}`);

    if (leads.length === 0) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'completed',
          sent_at: new Date(),
          completed_at: new Date(),
        },
      });
      return { total_sent: 0, total_delivered: 0, message: 'No leads to send' };
    }

    // 3. Marquer la campagne comme "sending"
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'sending',
        sent_at: new Date(),
      },
    });

    // 4. Envoyer les SMS avec throttling
    const maxPerHour = campaign.max_per_hour || 100;
    const batchSize = campaign.batch_size || 10;
    const delayBetweenBatches = (3600 * 1000) / (maxPerHour / batchSize); // ms

    let totalSent = 0;
    let totalDelivered = 0;

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(lead => this.sendSmsToLead(lead, campaign)),
      );

      totalSent += results.length;
      totalDelivered += results.filter(r => r.delivered).length;

      // Throttling: attendre entre les batches
      if (i + batchSize < leads.length) {
        await this.sleep(delayBetweenBatches);
      }
    }

    // 5. Mettre à jour les stats de la campagne
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'completed',
        completed_at: new Date(),
        total_sent: totalSent,
        total_delivered: totalDelivered,
      },
    });

    this.logger.log(
      `Campaign ${campaignId} completed: ${totalSent} sent, ${totalDelivered} delivered`,
    );

    return { total_sent: totalSent, total_delivered: totalDelivered };
  }

  /**
   * Envoie un SMS à un lead spécifique
   */
  private async sendSmsToLead(lead: any, campaign: any) {
    const leadId = this.leadTracking.generateLeadId();
    const msisdnHash = lead.msisdn_hash;

    // 1. Associer le lead_id avec le msisdn et la campagne
    await this.leadTracking.associateLeadWithCampaign(
      leadId,
      msisdnHash,
      campaign.id,
    );

    // 2. Générer l'URL personnalisée
    const personalizedUrl = `${this.frontendBaseUrl}/lead/${leadId}`;

    // 3. Construire le message SMS
    const message = this.buildMessage(
      campaign.template_id || 'default',
      campaign.template_variant || 'A',
      personalizedUrl,
    );

    // 4. Envoyer le SMS (mock en dev, real en prod)
    let delivered = false;
    let status = 'sent';

    if (this.isDev) {
      // Mode DEV: simulation
      this.logger.log(
        `[MOCK SMS] To: ${msisdnHash.substring(0, 6)}... | Message: ${message.substring(0, 50)}... | URL: ${personalizedUrl}`,
      );
      delivered = Math.random() > 0.1; // 90% success rate en simulation
      status = delivered ? 'delivered' : 'failed';
    } else {
      // Mode PROD: appel réel à Orange Contact Everyone API
      try {
        await this.sendViaOrangeApi(msisdnHash, message);
        delivered = true;
        status = 'delivered';
      } catch (error) {
        this.logger.error(`Failed to send SMS to ${msisdnHash}`, error);
        status = 'failed';
      }
    }

    // 5. Créer un ContactAttempt dans la DB
    await this.prisma.contactAttempt.create({
      data: {
        lead_id: lead.id,
        channel: 'sms',
        template_variant: campaign.template_variant || 'A',
        status,
      },
    });

    // 6. Incrémenter le contact_count du lead
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        contact_count: { increment: 1 },
        last_contact_at: new Date(),
      },
    });

    return { delivered, leadId, url: personalizedUrl };
  }

  /**
   * Envoi réel via Orange Contact Everyone API
   * Documentation: https://contact-everyone.orange-business.com/api/docs/
   */
  private async sendViaOrangeApi(msisdnHash: string, message: string) {
    if (!this.orangeApiKey) {
      throw new Error('ORANGE_SMS_API_KEY not configured');
    }

    // Note: msisdnHash doit être déchiffré en vrai numéro E.164 avant envoi
    // Pour l'instant, on suppose que msisdnHash est le vrai numéro (à adapter)
    const phoneNumber = msisdnHash; // TODO: decrypt msisdnHash to real phone number

    const payload = {
      outboundSMSMessageRequest: {
        address: [`tel:${phoneNumber}`],
        senderAddress: `tel:${this.orangeSenderName}`,
        outboundSMSTextMessage: {
          message,
        },
      },
    };

    const response = await axios.post(
      `${this.orangeApiUrl}/outbound/${encodeURIComponent(this.orangeSenderName)}/requests`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.orangeApiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    this.logger.log(`SMS sent via Orange API: ${response.data.resourceURL}`);
    return response.data;
  }

  /**
   * Construit le message SMS à partir du template
   */
  private buildMessage(templateId: string, variant: string, url: string): string {
    // Templates prédéfinis (DD-01)
    const templates: Record<string, Record<string, string>> = {
      default: {
        A: `Bonjour ! Orange vous propose une offre pour votre ancien téléphone. Estimation gratuite : ${url}`,
        B: `Votre téléphone vaut de l'argent ! Découvrez combien avec Orange : ${url}`,
        C: `Ne jetez pas votre ancien mobile ! Orange vous le reprend. Cliquez ici : ${url}`,
        D: `Offre spéciale Orange : faites estimer votre téléphone gratuitement ${url}`,
      },
    };

    const template = templates[templateId] || templates.default;
    return template[variant] || template.A;
  }

  /**
   * Récupère les leads ciblés par les filtres de la campagne
   */
  private async getTargetedLeads(filters: any) {
    const where: any = {};

    if (filters.status === 'eligible') {
      where.eligible = true;
      where.contact_count = { lt: 2 };
    } else if (filters.status === 'contacted') {
      where.contact_count = { gte: 1 };
      where.converted_at = null;
    } else if (filters.status === 'converted') {
      where.converted_at = { not: null };
    }

    if (filters.tier !== undefined) {
      where.signals = {
        path: ['device_tier'],
        gte: filters.tier,
      };
    }

    if (filters.lastActiveBefore) {
      where.updated_at = { lte: new Date(filters.lastActiveBefore) };
    }

    if (filters.lastActiveAfter) {
      where.updated_at = { gte: new Date(filters.lastActiveAfter) };
    }

    return this.prisma.lead.findMany({
      where,
      orderBy: { dormant_score: 'desc' },
      take: 1000, // Limite de sécurité
    });
  }

  /**
   * Utilitaire: sleep pour throttling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
