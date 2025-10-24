import { Test, TestingModule } from '@nestjs/testing';
import { LeadTrackingService } from './lead-tracking.service';
import { PrismaService } from '../database/prisma.service';

describe('LeadTrackingService', () => {
  let service: LeadTrackingService;
  let prisma: PrismaService;

  const mockPrismaService = {
    lead: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadTrackingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LeadTrackingService>(LeadTrackingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateLeadId', () => {
    it('should generate a valid UUID v4', () => {
      const leadId = service.generateLeadId();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidV4Regex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(leadId).toMatch(uuidV4Regex);
    });

    it('should generate unique IDs', () => {
      const id1 = service.generateLeadId();
      const id2 = service.generateLeadId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('associateLeadWithCampaign', () => {
    it('should create a new lead if not exists', async () => {
      const leadId = 'test-lead-id';
      const msisdnHash = 'hash123';
      const campaignId = 'campaign-123';

      mockPrismaService.lead.findFirst.mockResolvedValue(null);
      mockPrismaService.lead.create.mockResolvedValue({
        id: 'new-lead-id',
        msisdn_hash: msisdnHash,
        signals: {
          lead_ids: [{ id: leadId, campaign_id: campaignId }],
          last_lead_id: leadId,
          last_campaign_id: campaignId,
        },
      });

      const result = await service.associateLeadWithCampaign(
        leadId,
        msisdnHash,
        campaignId,
      );

      expect(mockPrismaService.lead.findFirst).toHaveBeenCalledWith({
        where: { msisdn_hash: msisdnHash },
        orderBy: { created_at: 'desc' },
      });
      expect(mockPrismaService.lead.create).toHaveBeenCalled();
      expect(result.msisdn_hash).toBe(msisdnHash);
    });

    it('should update existing lead', async () => {
      const leadId = 'new-lead-id';
      const msisdnHash = 'hash123';
      const campaignId = 'campaign-456';

      const existingLead = {
        id: 'existing-lead-id',
        msisdn_hash: msisdnHash,
        signals: {
          lead_ids: [{ id: 'old-lead-id', campaign_id: 'old-campaign' }],
          last_lead_id: 'old-lead-id',
          last_campaign_id: 'old-campaign',
        },
      };

      mockPrismaService.lead.findFirst.mockResolvedValue(existingLead);
      mockPrismaService.lead.update.mockResolvedValue({
        ...existingLead,
        signals: {
          lead_ids: [
            ...existingLead.signals.lead_ids,
            { id: leadId, campaign_id: campaignId },
          ],
          last_lead_id: leadId,
          last_campaign_id: campaignId,
        },
      });

      const result = await service.associateLeadWithCampaign(
        leadId,
        msisdnHash,
        campaignId,
      );

      expect(mockPrismaService.lead.update).toHaveBeenCalledWith({
        where: { id: existingLead.id },
        data: expect.objectContaining({
          signals: expect.objectContaining({
            last_lead_id: leadId,
            last_campaign_id: campaignId,
          }),
        }),
      });
      expect(result.signals.last_lead_id).toBe(leadId);
    });
  });

  describe('getLeadByLeadId', () => {
    it('should find lead by last_lead_id', async () => {
      const leadId = 'test-lead-id';
      const mockLead = {
        id: 'lead-123',
        msisdn_hash: 'hash123',
        signals: {
          last_lead_id: leadId,
        },
      };

      mockPrismaService.lead.findMany.mockResolvedValue([mockLead]);

      const result = await service.getLeadByLeadId(leadId);

      expect(result).toEqual(mockLead);
      expect(mockPrismaService.lead.findMany).toHaveBeenCalledWith({
        where: {
          signals: {
            path: ['last_lead_id'],
            equals: leadId,
          },
        },
      });
    });

    it('should return null if lead not found', async () => {
      mockPrismaService.lead.findMany
        .mockResolvedValueOnce([]) // First query empty
        .mockResolvedValueOnce([]); // Fallback query empty

      const result = await service.getLeadByLeadId('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
