import { Test, TestingModule } from '@nestjs/testing';
import { DormantDetectionService } from './dormant-detection.service';
import { PrismaService } from '../database/prisma.service';

describe('DormantDetectionService', () => {
  let service: DormantDetectionService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DormantDetectionService,
        {
          provide: PrismaService,
          useValue: {
            networkEvent: {
              findMany: jest.fn(),
              updateMany: jest.fn(),
            },
            lead: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DormantDetectionService>(DormantDetectionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectDormantDevices', () => {
    it('should process unprocessed network events', async () => {
      const mockEvents = [
        {
          id: '1',
          msisdn_hash: 'hash123',
          event_type: 'sim_swap',
          payload: { daysSinceLastSwap: 45 },
          processed: false,
          created_at: new Date('2024-01-01'),
        },
        {
          id: '2',
          msisdn_hash: 'hash123',
          event_type: 'reachability_check',
          payload: { connectivity: { roaming: false } },
          processed: false,
          created_at: new Date('2024-01-02'),
        },
      ];

      jest.spyOn(prisma.networkEvent, 'findMany').mockResolvedValue(mockEvents);
      jest.spyOn(prisma.lead, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.lead, 'create').mockResolvedValue({} as any);
      jest.spyOn(prisma.networkEvent, 'updateMany').mockResolvedValue({} as any);

      const result = await service.detectDormantDevices();

      expect(result.eventsProcessed).toBe(2);
      expect(result.leadsCreated).toBe(1);
      expect(result.leadsUpdated).toBe(0);
    });

    it('should update existing lead scores', async () => {
      const mockEvent = {
        id: '1',
        msisdn_hash: 'hash456',
        event_type: 'sim_swap',
        payload: { daysSinceLastSwap: 60 },
        processed: false,
        created_at: new Date(),
      };

      const existingLead = {
        id: 'lead1',
        msisdn_hash: 'hash456',
        dormant_score: 0.5,
        contact_count: 0,
        last_contact_at: null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      jest.spyOn(prisma.networkEvent, 'findMany').mockResolvedValue([mockEvent]);
      jest.spyOn(prisma.lead, 'findFirst').mockResolvedValue(existingLead as any);
      jest.spyOn(prisma.lead, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.networkEvent, 'updateMany').mockResolvedValue({} as any);

      const result = await service.detectDormantDevices();

      expect(result.leadsUpdated).toBe(1);
      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead1' },
          data: expect.objectContaining({
            dormant_score: expect.any(Number),
          }),
        }),
      );
    });

    it('should calculate correct dormant score', async () => {
      const mockEvents = [
        {
          id: '1',
          msisdn_hash: 'hash789',
          event_type: 'sim_swap',
          payload: { daysSinceLastSwap: 45 },
          processed: false,
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        },
      ];

      jest.spyOn(prisma.networkEvent, 'findMany').mockResolvedValue(mockEvents);
      jest.spyOn(prisma.lead, 'findFirst').mockResolvedValue(null);
      
      let capturedScore: number = 0;
      jest.spyOn(prisma.lead, 'create').mockImplementation(async (data: any) => {
        capturedScore = data.data.dormant_score;
        return {} as any;
      });
      
      jest.spyOn(prisma.networkEvent, 'updateMany').mockResolvedValue({} as any);

      await service.detectDormantDevices();

      // Score should be > 0 because daysSinceLastSwap > 30
      expect(capturedScore).toBeGreaterThan(0);
      expect(capturedScore).toBeLessThanOrEqual(1.0);
    });
  });

  describe('getDormantStats', () => {
    it('should return dormant statistics', async () => {
      jest.spyOn(prisma.lead, 'count')
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60)  // eligible
        .mockResolvedValueOnce(20); // pending nudges

      jest.spyOn(prisma.lead, 'aggregate').mockResolvedValue({
        _avg: { dormant_score: 0.7 },
      } as any);

      const stats = await service.getDormantStats();

      expect(stats.total_leads).toBe(100);
      expect(stats.eligible_leads).toBe(60);
      expect(stats.avg_dormant_score).toBe(0.7);
      expect(stats.pending_nudges).toBe(20);
    });
  });
});
