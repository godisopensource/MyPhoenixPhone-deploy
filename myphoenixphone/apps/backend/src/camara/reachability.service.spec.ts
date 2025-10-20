import { Test, TestingModule } from '@nestjs/testing'
import { ReachabilityService } from './reachability.service'
import { OAuth2ClientService } from './oauth2-client.service'

describe('ReachabilityService', () => {
  let service: ReachabilityService
  let oauth2Client: OAuth2ClientService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReachabilityService,
        {
          provide: OAuth2ClientService,
          useValue: {
            getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
          },
        },
      ],
    }).compile()

    service = module.get<ReachabilityService>(ReachabilityService)
    oauth2Client = module.get<OAuth2ClientService>(OAuth2ClientService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getReachabilityStatus', () => {
    it('returns reachable true with DATA connectivity when phone contains up', async () => {
      const res = await service.getReachabilityStatus('+33600up123')
      expect(res.reachable).toBe(true)
      expect(res.connectivity).toContain('DATA')
      expect(res.lastStatusTime).toBeTruthy()
    })

    it('returns reachable true with DATA connectivity when phone contains data', async () => {
      const res = await service.getReachabilityStatus('+33600data456')
      expect(res.reachable).toBe(true)
      expect(res.connectivity).toContain('DATA')
    })

    it('returns reachable true with SMS connectivity when phone contains sms', async () => {
      const res = await service.getReachabilityStatus('+33600sms789')
      expect(res.reachable).toBe(true)
      expect(res.connectivity).toContain('SMS')
      expect(res.connectivity).not.toContain('DATA')
    })

    it('returns reachable false for normal numbers', async () => {
      const res = await service.getReachabilityStatus('+33600123456')
      expect(res.reachable).toBe(false)
    })

    it('throws error when phone number is empty', async () => {
      await expect(service.getReachabilityStatus('')).rejects.toThrow('Phone number is required')
    })
  })

  describe('isReachable', () => {
    it('returns reachable true when phone contains up', async () => {
      const res = await service.isReachable('+33600up1')
      expect(res.reachable).toBe(true)
    })

    it('returns reachable false otherwise', async () => {
      const res = await service.isReachable('+33600down1')
      expect(res.reachable).toBe(false)
    })
  })
})
