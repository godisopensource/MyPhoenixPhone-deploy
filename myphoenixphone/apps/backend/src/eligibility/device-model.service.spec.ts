import { DeviceModelService } from './device-model.service';
import { PhoneModelsService } from '../phone-models/phone-models.service';

describe('DeviceModelService', () => {
  let service: DeviceModelService;
  let phoneModelsService: PhoneModelsService;

  const mockPhoneModels = [
    {
      id: '1',
      brand: 'Apple',
      model: 'iPhone 14',
      storage: '128GB',
      keywords: ['iphone', '14'],
      avg_price_tier: 4,
      release_year: 2022,
    },
    {
      id: '2',
      brand: 'Apple',
      model: 'iPhone 14',
      storage: '256GB',
      keywords: ['iphone', '14'],
      avg_price_tier: 4,
      release_year: 2022,
    },
    {
      id: '3',
      brand: 'Samsung',
      model: 'Galaxy S23',
      storage: '128GB',
      keywords: ['samsung', 'galaxy', 's23'],
      avg_price_tier: 4,
      release_year: 2023,
    },
  ];

  beforeEach(() => {
    phoneModelsService = {
      getAll: jest.fn().mockResolvedValue(mockPhoneModels),
    } as any;
    service = new DeviceModelService(phoneModelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load eligible models', async () => {
    const manufacturers = await service.getManufacturers();
    expect(manufacturers.length).toBeGreaterThan(0);
    expect(manufacturers).toContain('Apple');
    expect(manufacturers).toContain('Samsung');
  });

  it('should validate eligible device', async () => {
    const result = await service.validateDeviceSelection({
      manufacturer: 'Apple',
      model: 'iPhone 14',
    });

    expect(result.eligible).toBe(true);
    expect(result.reason).toBe('DEVICE_MODEL_ELIGIBLE');
    expect(result.manufacturer).toBe('Apple');
    expect(result.model).toBe('iPhone 14');
  });

  it('should handle not_found selection', async () => {
    const result = await service.validateDeviceSelection({
      selection: 'not_found',
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('DEVICE_MODEL_NOT_FOUND');
    expect(result.action).toBe('donate');
  });

  it('should handle unknown_model with eligible brand', async () => {
    const result = await service.validateDeviceSelection({
      selection: 'unknown_model',
      manufacturer: 'Samsung',
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('DEVICE_MODEL_UNKNOWN');
    expect(result.action).toBe('visit_store');
    expect(result.manufacturer).toBe('Samsung');
  });

  it('should handle unknown_model with non-eligible brand', async () => {
    const result = await service.validateDeviceSelection({
      selection: 'unknown_model',
      manufacturer: 'UnknownBrand',
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('DEVICE_BRAND_NOT_ELIGIBLE');
    expect(result.action).toBe('donate');
  });

  it('should reject non-eligible model', async () => {
    const result = await service.validateDeviceSelection({
      manufacturer: 'Apple',
      model: 'iPhone 6', // Not in the list
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('DEVICE_MODEL_NOT_FOUND');
  });

  it('should reject non-eligible manufacturer', async () => {
    const result = await service.validateDeviceSelection({
      manufacturer: 'Nokia',
      model: 'Some Model',
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('DEVICE_BRAND_NOT_ELIGIBLE');
  });
});
