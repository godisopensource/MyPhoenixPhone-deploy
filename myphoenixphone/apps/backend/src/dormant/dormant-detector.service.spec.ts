import { Test, TestingModule } from '@nestjs/testing';
import { DormantDetectorService } from './dormant-detector.service';
import { PrismaService } from '../database/prisma.service';
import { validDormantEvents } from './test-fixtures';

describe('DormantDetectorService', () => {
  let service: DormantDetectorService;
  let prisma: PrismaService;

  const mockPrismaService = {
    lead: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DormantDetectorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DormantDetectorService>(DormantDetectorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Fixture: Eligible dormant device - recent swap', () => {
    const fixture = validDormantEvents[0];

    it('should create an eligible lead with high score', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(null);
      mockPrismaService.lead.create.mockResolvedValue({
        id: 'test-lead-id',
        msisdn_hash: fixture.event.msisdn_hash,
        dormant_score: 0.85,
        eligible: true,
        activation_window_days: 11,
        next_action: 'send_nudge',
        exclusions: [],
        signals: {
          days_since_swap: 3.5,
          days_unreachable: 3.2,
          swap_count_30d: 1,
        },
        contact_count: 0,
        last_contact_at: null,
        device_model: null,
        device_imei: null,
        device_condition: null,
        imei_consent_at: null,
        estimated_value: null,
        handover_choice: null,
        handover_completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await service.process(fixture.event as any);

      expect(result.eligible).toBe(true);
      expect(result.dormant_score).toBeGreaterThanOrEqual(
        fixture.expected.dormant_score?.min ?? 0.75,
      );
      expect(result.dormant_score).toBeLessThanOrEqual(
        fixture.expected.dormant_score?.max ?? 1.0,
      );
      expect(result.next_action).toBe(fixture.expected.next_action);
      expect(result.exclusions).toEqual(fixture.expected.exclusions);
    });
  });

  describe('Fixture: Excluded - too soon after swap', () => {
    const fixture = validDormantEvents[1];

    it('should create an ineligible lead with "hold" action', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(null);
      mockPrismaService.lead.create.mockResolvedValue({
        id: 'test-lead-id-2',
        msisdn_hash: fixture.event.msisdn_hash,
        dormant_score: 0,
        eligible: false,
        activation_window_days: 1,
        next_action: 'hold',
        exclusions: ['too_soon_after_swap'],
        signals: {
          days_since_swap: 1.2,
          days_unreachable: 1.0,
          swap_count_30d: 1,
        },
        contact_count: 0,
        last_contact_at: null,
        device_model: null,
        device_imei: null,
        device_condition: null,
        imei_consent_at: null,
        estimated_value: null,
        handover_choice: null,
        handover_completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await service.process(fixture.event as any);

      expect(result.eligible).toBe(false);
      expect(result.next_action).toBe('hold');
      expect(result.exclusions).toContain('too_soon_after_swap');
      expect(result.dormant_score).toBe(0);
    });
  });

  describe('Fixture: Excluded - business line', () => {
    const fixture = validDormantEvents[2];

    it('should exclude business lines', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(null);
      mockPrismaService.lead.create.mockResolvedValue({
        id: 'test-lead-id-3',
        msisdn_hash: fixture.event.msisdn_hash,
        dormant_score: 0,
        eligible: false,
        activation_window_days: 1,
        next_action: 'exclude',
        exclusions: ['business_line'],
        signals: { days_since_swap: 7, days_unreachable: 7, swap_count_30d: 1 },
        contact_count: 0,
        last_contact_at: null,
        device_model: null,
        device_imei: null,
        device_condition: null,
        imei_consent_at: null,
        estimated_value: null,
        handover_choice: null,
        handover_completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await service.process(fixture.event as any);

      expect(result.eligible).toBe(false);
      expect(result.next_action).toBe('exclude');
      expect(result.exclusions).toContain('business_line');
    });
  });

  describe('Fixture: Excluded - fraud flag', () => {
    const fixture = validDormantEvents[3];

    it('should exclude lines with fraud flags', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(null);
      mockPrismaService.lead.create.mockResolvedValue({
        id: 'test-lead-id-4',
        msisdn_hash: fixture.event.msisdn_hash,
        dormant_score: 0,
        eligible: false,
        activation_window_days: 1,
        next_action: 'exclude',
        exclusions: ['fraud_flag'],
        signals: { days_since_swap: 3, days_unreachable: 3, swap_count_30d: 1 },
        contact_count: 0,
        last_contact_at: null,
        device_model: null,
        device_imei: null,
        device_condition: null,
        imei_consent_at: null,
        estimated_value: null,
        handover_choice: null,
        handover_completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await service.process(fixture.event as any);

      expect(result.eligible).toBe(false);
      expect(result.exclusions).toContain('fraud_flag');
    });
  });

  describe('Fixture: Excluded - multiple swaps', () => {
    const fixture = validDormantEvents[4];

    it('should exclude users with too many swaps', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(null);
      mockPrismaService.lead.create.mockResolvedValue({
        id: 'test-lead-id-5',
        msisdn_hash: fixture.event.msisdn_hash,
        dormant_score: 0,
        eligible: false,
        activation_window_days: 1,
        next_action: 'exclude',
        exclusions: ['multiple_swaps_detected'],
        signals: { days_since_swap: 3, days_unreachable: 3, swap_count_30d: 4 },
        contact_count: 0,
        last_contact_at: null,
        device_model: null,
        device_imei: null,
        device_condition: null,
        imei_consent_at: null,
        estimated_value: null,
        handover_choice: null,
        handover_completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await service.process(fixture.event as any);

      expect(result.eligible).toBe(false);
      expect(result.exclusions).toContain('multiple_swaps_detected');
    });
  });

  describe('Fixture: Excluded - user opted out', () => {
    const fixture = validDormantEvents[5];

    it('should respect user opt-out', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(null);
      mockPrismaService.lead.create.mockResolvedValue({
        id: 'test-lead-id-6',
        msisdn_hash: fixture.event.msisdn_hash,
        dormant_score: 0,
        eligible: false,
        activation_window_days: 1,
        next_action: 'exclude',
        exclusions: ['opt_out'],
        signals: { days_since_swap: 4, days_unreachable: 4, swap_count_30d: 1 },
        contact_count: 0,
        last_contact_at: null,
        device_model: null,
        device_imei: null,
        device_condition: null,
        imei_consent_at: null,
        estimated_value: null,
        handover_choice: null,
        handover_completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await service.process(fixture.event as any);

      expect(result.eligible).toBe(false);
      expect(result.exclusions).toContain('opt_out');
    });
  });

  describe('Idempotency', () => {
    it('should update existing lead for same day', async () => {
      const existingLead = {
        id: 'existing-lead-id',
        msisdn_hash: validDormantEvents[0].event.msisdn_hash,
        dormant_score: 0.7,
        eligible: true,
        activation_window_days: 10,
        next_action: 'send_nudge',
        exclusions: [],
        signals: {},
        contact_count: 0,
        last_contact_at: null,
        device_model: null,
        device_imei: null,
        device_condition: null,
        imei_consent_at: null,
        estimated_value: null,
        handover_choice: null,
        handover_completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      mockPrismaService.lead.findFirst.mockResolvedValue(existingLead);
      mockPrismaService.lead.update.mockResolvedValue({
        ...existingLead,
        dormant_score: 0.85,
      });

      const result = await service.process(validDormantEvents[0].event as any);

      expect(mockPrismaService.lead.update).toHaveBeenCalled();
      expect(mockPrismaService.lead.create).not.toHaveBeenCalled();
      expect(result.lead_id).toBe('existing-lead-id');
    });
  });

  describe('TTL enforcement', () => {
    it('should purge expired leads', async () => {
      mockPrismaService.lead.deleteMany.mockResolvedValue({ count: 5 });

      const count = await service.purgeExpiredLeads();

      expect(count).toBe(5);
      expect(mockPrismaService.lead.deleteMany).toHaveBeenCalledWith({
        where: {
          expires_at: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });

  describe('getEligibleLeads', () => {
    it('should return eligible leads sorted by score', async () => {
      const mockLeads = [
        {
          id: 'lead-1',
          dormant_score: 0.9,
          eligible: true,
          next_action: 'send_nudge',
        },
        {
          id: 'lead-2',
          dormant_score: 0.8,
          eligible: true,
          next_action: 'send_nudge',
        },
      ];

      mockPrismaService.lead.findMany.mockResolvedValue(mockLeads);

      const results = await service.getEligibleLeads(10);

      expect(results).toHaveLength(2);
      expect(mockPrismaService.lead.findMany).toHaveBeenCalledWith({
        where: {
          eligible: true,
          next_action: 'send_nudge',
          contact_count: {
            lt: 2,
          },
          expires_at: {
            gt: expect.any(Date),
          },
        },
        orderBy: { dormant_score: 'desc' },
        take: 10,
      });
    });
  });
});
