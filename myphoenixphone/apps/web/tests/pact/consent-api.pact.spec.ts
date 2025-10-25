import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import { describe, it, expect } from '@jest/globals';

const { like, string } = MatchersV3;

/**
 * Consumer contract test for Consent API
 * 
 * Tests the OAuth consent flow interactions between frontend and backend.
 */
describe('Consent API Consumer Contract', () => {
  const provider = new PactV3({
    consumer: 'MyPhoenixPhone-Web',
    provider: 'MyPhoenixPhone-Backend',
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  describe('POST /consents/start', () => {
    it('initiates OAuth consent flow and returns authorization URL', async () => {
      await provider
        .given('Orange OAuth provider is available')
        .uponReceiving('a request to start consent flow')
        .withRequest({
          method: 'POST',
          path: '/consents/start',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: {
            phoneNumber: '+33612345678',
            purpose: 'eligibility_check',
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            authorizationUrl: like('https://api.orange.com/oauth2/authorize?client_id=xyz&state=abc123'),
            state: string('abc123'),
            expiresAt: like('2025-10-25T12:10:00.000Z'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/consents/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: '+33612345678',
            purpose: 'eligibility_check',
          }),
        });

        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.authorizationUrl).toContain('oauth2/authorize');
        expect(data.state).toBeDefined();
        expect(data.expiresAt).toBeDefined();
      });
    });

    it('returns 400 when phone number is invalid', async () => {
      await provider
        .given('request has invalid phone number format')
        .uponReceiving('a request with invalid phone number')
        .withRequest({
          method: 'POST',
          path: '/consents/start',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: {
            phoneNumber: 'invalid',
            purpose: 'eligibility_check',
          },
        })
        .willRespondWith({
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            statusCode: 400,
            message: string('Invalid phone number format'),
            error: string('Bad Request'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/consents/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: 'invalid',
            purpose: 'eligibility_check',
          }),
        });

        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.statusCode).toBe(400);
      });
    });
  });

  describe('GET /consents/callback', () => {
    it('handles successful OAuth callback', async () => {
      await provider
        .given('valid OAuth callback with authorization code')
        .uponReceiving('an OAuth callback request')
        .withRequest({
          method: 'GET',
          path: '/consents/callback',
          query: {
            code: 'auth_code_123',
            state: 'state_abc123',
          },
          headers: {
            Accept: 'application/json',
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            success: like(true),
            consentId: string('consent_123'),
            phoneNumber: string('+33612345678'),
            expiresAt: like('2025-10-25T13:00:00.000Z'),
            scopes: like(['eligibility:read', 'device:read']),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/consents/callback?code=auth_code_123&state=state_abc123`,
          {
            headers: {
              Accept: 'application/json',
            },
          }
        );

        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.consentId).toBeDefined();
        expect(data.phoneNumber).toBeDefined();
      });
    });

    it('returns 400 when state parameter is missing', async () => {
      await provider
        .given('OAuth callback without state parameter')
        .uponReceiving('a callback request without state')
        .withRequest({
          method: 'GET',
          path: '/consents/callback',
          query: {
            code: 'auth_code_123',
          },
          headers: {
            Accept: 'application/json',
          },
        })
        .willRespondWith({
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            statusCode: 400,
            message: string('Missing state parameter'),
            error: string('Bad Request'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/consents/callback?code=auth_code_123`,
          {
            headers: {
              Accept: 'application/json',
            },
          }
        );

        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.statusCode).toBe(400);
      });
    });
  });

  describe('POST /consents/revoke', () => {
    it('revokes an active consent', async () => {
      await provider
        .given('user has active consent')
        .uponReceiving('a request to revoke consent')
        .withRequest({
          method: 'POST',
          path: '/consents/revoke',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: like('connect.sid=s%3Asession-id-here'),
          },
          body: {
            consentId: 'consent_123',
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            success: like(true),
            message: string('Consent revoked successfully'),
            revokedAt: like('2025-10-25T12:30:00.000Z'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/consents/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: 'connect.sid=s%3Asession-id-here',
          },
          body: JSON.stringify({
            consentId: 'consent_123',
          }),
        });

        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBeDefined();
      });
    });

    it('returns 404 when consent does not exist', async () => {
      await provider
        .given('consent does not exist')
        .uponReceiving('a request to revoke non-existent consent')
        .withRequest({
          method: 'POST',
          path: '/consents/revoke',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: like('connect.sid=s%3Asession-id-here'),
          },
          body: {
            consentId: 'consent_nonexistent',
          },
        })
        .willRespondWith({
          status: 404,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            statusCode: 404,
            message: string('Consent not found'),
            error: string('Not Found'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/consents/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Cookie: 'connect.sid=s%3Asession-id-here',
          },
          body: JSON.stringify({
            consentId: 'consent_nonexistent',
          }),
        });

        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.statusCode).toBe(404);
      });
    });
  });
});
