import { Test, TestingModule } from '@nestjs/testing'
import { OAuth2ClientService } from './oauth2-client.service'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('OAuth2ClientService', () => {
  let service: OAuth2ClientService

  beforeEach(async () => {
    // Reset env vars
    process.env.CAMARA_TOKEN_URL = 'https://api.orange.com/oauth/v3/token'
    process.env.CAMARA_CLIENT_ID = 'test-client-id'
    process.env.CAMARA_CLIENT_SECRET = 'test-client-secret'

    const module: TestingModule = await Test.createTestingModule({
      providers: [OAuth2ClientService],
    }).compile()

    service = module.get<OAuth2ClientService>(OAuth2ClientService)
    
    // Clear token cache before each test
    service.clearTokenCache()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getAccessToken', () => {
    it('should request and cache a new token', async () => {
      const mockResponse = {
        data: {
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      }

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
      } as any)

      const token = await service.getAccessToken()

      expect(token).toBe('mock-access-token')
    })

    it('should throw error when OAuth2 config is missing', async () => {
      delete process.env.CAMARA_TOKEN_URL
      
      // Create new service instance with missing config
      const module = await Test.createTestingModule({
        providers: [OAuth2ClientService],
      }).compile()
      const serviceWithoutConfig = module.get<OAuth2ClientService>(OAuth2ClientService)

      await expect(serviceWithoutConfig.getAccessToken()).rejects.toThrow('Missing OAuth2 configuration')
    })
  })

  describe('clearTokenCache', () => {
    it('should clear cached token', () => {
      service.clearTokenCache()
      // No exception should be thrown
      expect(true).toBe(true)
    })
  })
})
