import { DeviceModelService } from './device-model.service';

describe('DeviceModelService', () => {
  let service: DeviceModelService;

  beforeEach(() => {
    service = new DeviceModelService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load eligible models', () => {
    const manufacturers = service.getManufacturers();
    expect(manufacturers.length).toBeGreaterThan(0);
    expect(manufacturers).toContain('Apple');
    expect(manufacturers).toContain('Samsung');
  });

  it('should validate eligible device', () => {
    const result = service.validateDeviceSelection({
      manufacturer: 'Apple',
      model: 'iPhone 14',
    });

    expect(result.eligible).toBe(true);
    expect(result.reason).toBe('DEVICE_MODEL_ELIGIBLE');
    expect(result.manufacturer).toBe('Apple');
    expect(result.model).toBe('iPhone 14');
  });

  it('should handle not_found selection', () => {
    const result = service.validateDeviceSelection({
      selection: 'not_found',
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('DEVICE_MODEL_NOT_FOUND');
    expect(result.action).toBe('donate');
  });

  it('should handle unknown_model with eligible brand', () => {
    const result = service.validateDeviceSelection({
      selection: 'unknown_model',
      manufacturer: 'Samsung',
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('DEVICE_MODEL_UNKNOWN');
    expect(result.action).toBe('visit_store');
    expect(result.manufacturer).toBe('Samsung');
  });

  it('should handle unknown_model with non-eligible brand', () => {
    const result = service.validateDeviceSelection({
      selection: 'unknown_model',
      manufacturer: 'UnknownBrand',
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('DEVICE_BRAND_NOT_ELIGIBLE');
    expect(result.action).toBe('donate');
  });

  it('should reject non-eligible model', () => {
    const result = service.validateDeviceSelection({
      manufacturer: 'Apple',
      model: 'iPhone 6', // Not in the list
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('DEVICE_MODEL_NOT_FOUND');
  });

  it('should reject non-eligible manufacturer', () => {
    const result = service.validateDeviceSelection({
      manufacturer: 'Nokia',
      model: 'Some Model',
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('DEVICE_BRAND_NOT_ELIGIBLE');
  });
});
