import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import { describe, it, expect } from '@jest/globals';

const { like, string, boolean, eachLike } = MatchersV3;

/**
 * Consumer contract test for Eligibility API
 * 
 * This test defines the expected behavior of the backend API from the 
 * frontend's perspective. It generates a Pact contract file that the 
 * backend must satisfy.
 */
describe('Eligibility API Consumer Contract', () => {
  const provider = new PactV3({
    consumer: 'MyPhoenixPhone-Web',
    provider: 'MyPhoenixPhone-Backend',
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  describe('GET /eligibility', () => {
    it('returns eligible device with valid phone number', async () => {
      // Arrange: Define the expected interaction
      await provider
        .given('user has valid consent and eligible device')
        .uponReceiving('a request to check eligibility for an eligible device')
        .withRequest({
          method: 'GET',
          path: '/eligibility',
          query: { phoneNumber: '+33612345678' },
          headers: {
            Accept: 'application/json',
            Cookie: like('connect.sid=s%3Asession-id-here'),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            eligible: boolean(true),
            reasons: eachLike(string('SIM swap detected within 30 days')),
            signals: {
              simSwap: {
                detected: boolean(true),
                date: like('2025-10-15T10:30:00.000Z'),
                daysAgo: like(10),
              },
              reachability: {
                status: string('CONNECTED_SMS'),
                canReceiveSMS: boolean(true),
              },
              roaming: {
                isRoaming: boolean(false),
              },
            },
            estimatedValue: like(150),
            phoneNumber: string('+33612345678'),
            checkedAt: like('2025-10-25T12:00:00.000Z'),
          },
        });

      // Act & Assert: Execute the test
      await provider.executeTest(async (mockServer) => {
        // Simulate frontend API call
        const response = await fetch(
          `${mockServer.url}/eligibility?phoneNumber=%2B33612345678`,
          {
            headers: {
              Accept: 'application/json',
              Cookie: 'connect.sid=s%3Asession-id-here',
            },
          }
        );

        const data = await response.json();

        // Verify response structure matches expectations
        expect(response.status).toBe(200);
        expect(data.eligible).toBe(true);
        expect(Array.isArray(data.reasons)).toBe(true);
        expect(data.signals.simSwap.detected).toBeDefined();
        expect(data.phoneNumber).toBe('+33612345678');
      });
    });

    it('returns ineligible device when no SIM swap detected', async () => {
      await provider
        .given('user has valid consent and ineligible device')
        .uponReceiving('a request to check eligibility for ineligible device')
        .withRequest({
          method: 'GET',
          path: '/eligibility',
          query: { phoneNumber: '+33698765432' },
          headers: {
            Accept: 'application/json',
            Cookie: like('connect.sid=s%3Asession-id-here'),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            eligible: boolean(false),
            reasons: eachLike(string('No recent SIM swap detected')),
            signals: {
              simSwap: {
                detected: boolean(false),
              },
              reachability: {
                status: string('CONNECTED_SMS'),
                canReceiveSMS: boolean(true),
              },
              roaming: {
                isRoaming: boolean(false),
              },
            },
            estimatedValue: like(0),
            phoneNumber: string('+33698765432'),
            checkedAt: like('2025-10-25T12:00:00.000Z'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/eligibility?phoneNumber=%2B33698765432`,
          {
            headers: {
              Accept: 'application/json',
              Cookie: 'connect.sid=s%3Asession-id-here',
            },
          }
        );

        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.eligible).toBe(false);
        expect(data.reasons).toContain('No recent SIM swap detected');
      });
    });

    it('returns 401 when user has no consent', async () => {
      await provider
        .given('user has no valid consent')
        .uponReceiving('a request without valid consent')
        .withRequest({
          method: 'GET',
          path: '/eligibility',
          query: { phoneNumber: '+33612345678' },
          headers: {
            Accept: 'application/json',
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
        const response = await fetch(
          `${mockServer.url}/eligibility?phoneNumber=%2B33612345678`,
          {
            headers: {
              Accept: 'application/json',
            },
          }
        );

        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.statusCode).toBe(401);
        expect(data.message).toBeDefined();
      });
    });

    it('returns 400 when phone number is missing', async () => {
      await provider
        .given('request has valid consent')
        .uponReceiving('a request without phone number')
        .withRequest({
          method: 'GET',
          path: '/eligibility',
          headers: {
            Accept: 'application/json',
            Cookie: like('connect.sid=s%3Asession-id-here'),
          },
        })
        .willRespondWith({
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            statusCode: 400,
            message: string('Phone number is required'),
            error: string('Bad Request'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/eligibility`, {
          headers: {
            Accept: 'application/json',
            Cookie: 'connect.sid=s%3Asession-id-here',
          },
        });

        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.statusCode).toBe(400);
      });
    });
  });

  describe('GET /eligibility/signals', () => {
    it('returns stored signals for a phone number', async () => {
      await provider
        .given('user has valid consent and stored signals exist')
        .uponReceiving('a request to get stored signals')
        .withRequest({
          method: 'GET',
          path: '/eligibility/signals',
          query: { phoneNumber: '+33612345678' },
          headers: {
            Accept: 'application/json',
            Cookie: like('connect.sid=s%3Asession-id-here'),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            phoneNumber: string('+33612345678'),
            signals: {
              simSwap: {
                detected: boolean(true),
                date: like('2025-10-15T10:30:00.000Z'),
                daysAgo: like(10),
              },
              reachability: {
                status: string('CONNECTED_SMS'),
                canReceiveSMS: boolean(true),
              },
              roaming: {
                isRoaming: boolean(false),
              },
            },
            lastChecked: like('2025-10-25T11:00:00.000Z'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/eligibility/signals?phoneNumber=%2B33612345678`,
          {
            headers: {
              Accept: 'application/json',
              Cookie: 'connect.sid=s%3Asession-id-here',
            },
          }
        );

        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.phoneNumber).toBe('+33612345678');
        expect(data.signals).toBeDefined();
        expect(data.lastChecked).toBeDefined();
      });
    });
  });
});
