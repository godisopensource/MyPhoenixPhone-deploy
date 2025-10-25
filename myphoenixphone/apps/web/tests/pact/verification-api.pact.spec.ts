import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import { describe, it, expect } from '@jest/globals';

const { like, string, boolean } = MatchersV3;

/**
 * Consumer contract test for Verification API
 * 
 * Tests SMS verification code sending and validation.
 */
describe('Verification API Consumer Contract', () => {
  const provider = new PactV3({
    consumer: 'MyPhoenixPhone-Web',
    provider: 'MyPhoenixPhone-Backend',
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  describe('POST /verify/number', () => {
    it('sends verification code successfully', async () => {
      await provider
        .given('user has valid consent and phone number is reachable')
        .uponReceiving('a request to send verification code')
        .withRequest({
          method: 'POST',
          path: '/verify/number',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: like('connect.sid=s%3Asession-id-here'),
          },
          body: {
            phoneNumber: '+33612345678',
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            success: boolean(true),
            message: string('Verification code sent'),
            verificationId: string('verify_123abc'),
            expiresAt: like('2025-10-25T12:10:00.000Z'),
            attemptsRemaining: like(3),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/verify/number`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: 'connect.sid=s%3Asession-id-here',
          },
          body: JSON.stringify({
            phoneNumber: '+33612345678',
          }),
        });

        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.verificationId).toBeDefined();
        expect(data.expiresAt).toBeDefined();
        expect(data.attemptsRemaining).toBeGreaterThan(0);
      });
    });

    it('returns 429 when rate limit is exceeded', async () => {
      await provider
        .given('user has exceeded SMS rate limit')
        .uponReceiving('a request that exceeds rate limit')
        .withRequest({
          method: 'POST',
          path: '/verify/number',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: like('connect.sid=s%3Asession-id-here'),
          },
          body: {
            phoneNumber: '+33612345678',
          },
        })
        .willRespondWith({
          status: 429,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Retry-After': '3600',
          },
          body: {
            statusCode: 429,
            message: string('Too many verification attempts'),
            error: string('Too Many Requests'),
            retryAfter: like(3600),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/verify/number`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: 'connect.sid=s%3Asession-id-here',
          },
          body: JSON.stringify({
            phoneNumber: '+33612345678',
          }),
        });

        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.statusCode).toBe(429);
        expect(data.retryAfter).toBeDefined();
      });
    });

    it('returns 401 when user has no consent', async () => {
      await provider
        .given('user has no valid consent')
        .uponReceiving('a verification request without consent')
        .withRequest({
          method: 'POST',
          path: '/verify/number',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: {
            phoneNumber: '+33612345678',
          },
        })
        .willRespondWith({
          status: 401,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            statusCode: 401,
            message: string('Unauthorized'),
            error: string('User consent required'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/verify/number`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: '+33612345678',
          }),
        });

        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.statusCode).toBe(401);
      });
    });
  });

  describe('POST /verify/number (verify code)', () => {
    it('validates correct verification code', async () => {
      await provider
        .given('valid verification code exists')
        .uponReceiving('a request to verify correct code')
        .withRequest({
          method: 'POST',
          path: '/verify/number',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: like('connect.sid=s%3Asession-id-here'),
          },
          body: {
            verificationId: 'verify_123abc',
            code: '123456',
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            success: boolean(true),
            verified: boolean(true),
            phoneNumber: string('+33612345678'),
            verifiedAt: like('2025-10-25T12:05:00.000Z'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/verify/number`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: 'connect.sid=s%3Asession-id-here',
          },
          body: JSON.stringify({
            verificationId: 'verify_123abc',
            code: '123456',
          }),
        });

        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.verified).toBe(true);
        expect(data.phoneNumber).toBeDefined();
      });
    });

    it('rejects incorrect verification code', async () => {
      await provider
        .given('verification code exists but code is incorrect')
        .uponReceiving('a request with incorrect code')
        .withRequest({
          method: 'POST',
          path: '/verify/number',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: like('connect.sid=s%3Asession-id-here'),
          },
          body: {
            verificationId: 'verify_123abc',
            code: '999999',
          },
        })
        .willRespondWith({
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            statusCode: 400,
            message: string('Invalid verification code'),
            error: string('Bad Request'),
            verified: boolean(false),
            attemptsRemaining: like(2),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/verify/number`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: 'connect.sid=s%3Asession-id-here',
          },
          body: JSON.stringify({
            verificationId: 'verify_123abc',
            code: '999999',
          }),
        });

        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.verified).toBe(false);
        expect(data.attemptsRemaining).toBeDefined();
      });
    });

    it('returns 404 when verification ID does not exist', async () => {
      await provider
        .given('verification ID does not exist')
        .uponReceiving('a request with non-existent verification ID')
        .withRequest({
          method: 'POST',
          path: '/verify/number',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: like('connect.sid=s%3Asession-id-here'),
          },
          body: {
            verificationId: 'verify_nonexistent',
            code: '123456',
          },
        })
        .willRespondWith({
          status: 404,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            statusCode: 404,
            message: string('Verification not found'),
            error: string('Not Found'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/verify/number`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: 'connect.sid=s%3Asession-id-here',
          },
          body: JSON.stringify({
            verificationId: 'verify_nonexistent',
            code: '123456',
          }),
        });

        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.statusCode).toBe(404);
      });
    });

    it('returns 400 when verification code has expired', async () => {
      await provider
        .given('verification code has expired')
        .uponReceiving('a request with expired verification code')
        .withRequest({
          method: 'POST',
          path: '/verify/number',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: like('connect.sid=s%3Asession-id-here'),
          },
          body: {
            verificationId: 'verify_expired',
            code: '123456',
          },
        })
        .willRespondWith({
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            statusCode: 400,
            message: string('Verification code has expired'),
            error: string('Bad Request'),
            verified: boolean(false),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/verify/number`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: 'connect.sid=s%3Asession-id-here',
          },
          body: JSON.stringify({
            verificationId: 'verify_expired',
            code: '123456',
          }),
        });

        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.verified).toBe(false);
        expect(data.message).toContain('expired');
      });
    });
  });
});
