import { Test, TestingModule } from '@nestjs/testing'
import { SimSwapService } from './sim-swap.service'
import { OAuth2ClientService } from './oauth2-client.service'

describe('SimSwapService', () => {
  let service: SimSwapService
  let oauth2Client: OAuth2ClientService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimSwapService,
        {
          provide: OAuth2ClientService,
          useValue: {
            getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
          },
        },
      ],
    }).compile()

    service = module.get<SimSwapService>(SimSwapService)
    oauth2Client = module.get<OAuth2ClientService>(OAuth2ClientService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('retrieveSimSwapDate', () => {
    it('returns latestSimChange when phone number contains swapped', async () => {
      const res = await service.retrieveSimSwapDate('+33600swapped')
      expect(res).toHaveProperty('latestSimChange')
      expect(res.latestSimChange).not.toBeNull()
      expect(new Date(res.latestSimChange!).toString()).not.toBe('Invalid Date')
      expect(res.monitoredPeriod).toBe(120)
    })

    it('returns null latestSimChange when no swap detected', async () => {
      const res = await service.retrieveSimSwapDate('+33600123456')
      expect(res.latestSimChange).toBeNull()
    })

    it('throws error when phone number is empty', async () => {
      await expect(service.retrieveSimSwapDate('')).rejects.toThrow('Phone number is required')
    })
  })

  describe('checkSimSwap', () => {
    it('returns swapped true when phone number contains swapped', async () => {
      const res = await service.checkSimSwap('+33600swapped', 240)
      expect(res).toEqual({ swapped: true })
    })

    it('returns swapped false when no swap detected', async () => {
      const res = await service.checkSimSwap('+33600123456', 240)
      expect(res).toEqual({ swapped: false })
    })

    it('throws error when maxAge is out of range', async () => {
      await expect(service.checkSimSwap('+33600123456', 0)).rejects.toThrow('maxAge must be between 1 and 2400 hours')
      await expect(service.checkSimSwap('+33600123456', 2401)).rejects.toThrow('maxAge must be between 1 and 2400 hours')
    })
  })

  describe('getSimSwapStatus', () => {
    it('returns swappedAt when swap detected', async () => {
      const res = await service.getSimSwapStatus('+33600swapped')
      expect(res).toHaveProperty('swappedAt')
      expect(res.swappedAt).toBeTruthy()
      expect(res.monitoredPeriod).toBe(120)
    })

    it('returns empty swappedAt when no swap', async () => {
      const res = await service.getSimSwapStatus('+33600123456')
      expect(res.swappedAt).toBeUndefined()
    })
  })
})
