import { CopyService } from './copy.service';

describe('CopyService', () => {
  let service: CopyService;

  beforeEach(() => {
    service = new CopyService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCopy', () => {
    it('should return copy for control variant in French', () => {
      const copy = service.getCopy({
        variant: 'control',
        channel: 'sms',
        language: 'fr',
      });

      expect(copy.body).toContain('Bonjour');
      expect(copy.body).toContain('Orange');
    });

    it('should return copy for control variant in English', () => {
      const copy = service.getCopy({
        variant: 'control',
        channel: 'sms',
        language: 'en',
      });

      expect(copy.body).toContain('Hello');
      expect(copy.body).toContain('Orange');
    });

    it('should return copy for variant_a', () => {
      const copy = service.getCopy({
        variant: 'variant_a',
        channel: 'sms',
        language: 'fr',
      });

      expect(copy.body).toContain('MAINTENANT');
    });

    it('should return copy for variant_b', () => {
      const copy = service.getCopy({
        variant: 'variant_b',
        channel: 'sms',
        language: 'fr',
      });

      expect(copy.body).toContain('économie circulaire');
    });

    it('should include subject and CTA for RCS', () => {
      const copy = service.getCopy({
        variant: 'control',
        channel: 'rcs',
        language: 'fr',
      });

      expect(copy.subject).toBeDefined();
      expect(copy.cta).toBeDefined();
    });

    it('should fallback to control/french for invalid config', () => {
      const copy = service.getCopy({
        variant: 'invalid' as any,
        channel: 'sms',
        language: 'fr',
      });

      expect(copy.body).toBeDefined();
      expect(copy.body).not.toBe('');
    });
  });

  describe('interpolate', () => {
    it('should replace variables in text', () => {
      const text = 'Hello {name}, your code is {code}';
      const result = service.interpolate(text, {
        name: 'John',
        code: '12345',
      });

      expect(result).toBe('Hello John, your code is 12345');
    });

    it('should handle missing variables', () => {
      const text = 'Hello {name}';
      const result = service.interpolate(text, {});

      expect(result).toBe('Hello ');
    });

    it('should handle multiple occurrences of same variable', () => {
      const text = '{name} - {name} - {name}';
      const result = service.interpolate(text, { name: 'Test' });

      expect(result).toBe('Test - Test - Test');
    });
  });

  describe('formatMessage', () => {
    it('should interpolate variables in body', () => {
      const message = service.formatMessage(
        {
          variant: 'control',
          channel: 'sms',
          language: 'fr',
        },
        {
          url: 'https://example.com/lead/123',
        },
      );

      expect(message.body).toContain('https://example.com/lead/123');
    });

    it('should interpolate variables in subject and CTA', () => {
      const message = service.formatMessage(
        {
          variant: 'control',
          channel: 'email',
          language: 'fr',
        },
        {
          url: 'https://example.com/lead/123',
        },
      );

      expect(message.subject).toBeDefined();
      expect(message.body).toContain('https://example.com/lead/123');
      expect(message.cta).toBeDefined();
    });

    it('should work without variables', () => {
      const message = service.formatMessage({
        variant: 'control',
        channel: 'rcs',
        language: 'fr',
      });

      expect(message.subject).toBeDefined();
      expect(message.body).toBeDefined();
      expect(message.cta).toBeDefined();
    });
  });

  describe('all variants and channels', () => {
    const variants: Array<'control' | 'variant_a' | 'variant_b'> = [
      'control',
      'variant_a',
      'variant_b',
    ];
    const channels: Array<'sms' | 'rcs' | 'push' | 'email'> = [
      'sms',
      'rcs',
      'push',
      'email',
    ];
    const languages: Array<'fr' | 'en'> = ['fr', 'en'];

    variants.forEach((variant) => {
      channels.forEach((channel) => {
        languages.forEach((language) => {
          it(`should have copy for ${variant}/${channel}/${language}`, () => {
            const copy = service.getCopy({ variant, channel, language });
            expect(copy.body).toBeDefined();
            expect(copy.body.length).toBeGreaterThan(0);
          });
        });
      });
    });
  });

  describe('copy consistency', () => {
    it('should have consistent messaging across variants', () => {
      const control = service.getCopy({
        variant: 'control',
        channel: 'sms',
        language: 'fr',
      });
      const variantA = service.getCopy({
        variant: 'variant_a',
        channel: 'sms',
        language: 'fr',
      });
      const variantB = service.getCopy({
        variant: 'variant_b',
        channel: 'sms',
        language: 'fr',
      });

      // All should mention Orange
      expect(control.body.toLowerCase()).toContain('orange');
      expect(variantA.body.toLowerCase()).toContain('orange');
      expect(variantB.body.toLowerCase()).toContain('orange');

      // All should have placeholders for URLs
      expect(control.body).toContain('{url}');
      expect(variantA.body).toContain('{url}');
      expect(variantB.body).toContain('{url}');
    });

    it('should maintain appropriate tone for each variant', () => {
      const control = service.getCopy({
        variant: 'control',
        channel: 'sms',
        language: 'fr',
      });
      const variantA = service.getCopy({
        variant: 'variant_a',
        channel: 'sms',
        language: 'fr',
      });
      const variantB = service.getCopy({
        variant: 'variant_b',
        channel: 'sms',
        language: 'fr',
      });

      // Variant A should be more direct/urgent
      expect(variantA.body.toLowerCase()).toMatch(
        /maintenant|immédiate|transformez/,
      );

      // Variant B should be more empathetic/environmental
      expect(variantB.body.toLowerCase()).toMatch(
        /économie circulaire|planète|2e vie/,
      );
    });
  });
});
