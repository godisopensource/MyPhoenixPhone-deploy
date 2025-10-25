# Pact Contract Testing

This directory contains Pact contract tests that ensure the frontend and backend APIs stay in sync.

## What is Pact?

Pact is a contract testing framework that allows:
- **Consumer** (frontend) to define expectations about the API
- **Provider** (backend) to verify it meets those expectations
- Catch breaking changes before deployment

## Directory Structure

```
apps/
├── web/
│   └── tests/pact/          # Consumer tests (frontend expectations)
│       ├── eligibility-api.pact.spec.ts
│       ├── consent-api.pact.spec.ts
│       └── verification-api.pact.spec.ts
└── backend/
    └── test/pact/           # Provider verification (backend validation)
        └── provider.pact.spec.ts
```

## Running Consumer Tests (Frontend)

Consumer tests define what the frontend expects from the backend API.

```bash
# Navigate to web app
cd apps/web

# Run consumer tests to generate pact files
npm test -- tests/pact/eligibility-api.pact.spec.ts
npm test -- tests/pact/consent-api.pact.spec.ts
npm test -- tests/pact/verification-api.pact.spec.ts

# Or run all pact tests
npm test -- tests/pact/
```

This generates pact JSON files in `apps/web/pacts/`:
```
apps/web/pacts/
└── myphoenixphone-web-myphoenixphone-backend.json
```

## Running Provider Verification (Backend)

Provider verification ensures the backend satisfies all consumer expectations.

```bash
# Navigate to backend
cd apps/backend

# Make sure the backend is running on port 3003
npm run dev

# In another terminal, run provider verification
npm test -- test/pact/provider.pact.spec.ts
```

## Test Coverage

### Eligibility API (`/eligibility`)
- ✅ Returns eligible device with valid phone number
- ✅ Returns ineligible device when no SIM swap detected
- ✅ Returns 401 when user has no consent
- ✅ Returns 400 when phone number is missing
- ✅ Returns stored signals for a phone number

### Consent API (`/consents/*`)
- ✅ Initiates OAuth consent flow (POST /start)
- ✅ Returns 400 for invalid phone number format
- ✅ Handles successful OAuth callback (GET /callback)
- ✅ Returns 400 when state parameter is missing
- ✅ Revokes active consent (POST /revoke)
- ✅ Returns 404 when consent does not exist

### Verification API (`/verify/number`)
- ✅ Sends verification code successfully
- ✅ Returns 429 when rate limit is exceeded
- ✅ Returns 401 when user has no consent
- ✅ Validates correct verification code
- ✅ Rejects incorrect verification code
- ✅ Returns 404 when verification ID does not exist
- ✅ Returns 400 when verification code has expired

## State Handlers

Provider verification uses state handlers to set up test data for each interaction:

| State | Description |
|-------|-------------|
| `user has valid consent and eligible device` | User with active consent, SIM swap within 30 days |
| `user has no valid consent` | Session without valid consent token |
| `Orange OAuth provider is available` | OAuth provider is reachable |
| `valid verification code exists` | Verification ID with matching code |
| `user has exceeded SMS rate limit` | User sent too many SMS codes |

## Adding New Contract Tests

### 1. Add Consumer Test (Frontend)

```typescript
// apps/web/tests/pact/my-new-api.pact.spec.ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

describe('My New API Consumer Contract', () => {
  const provider = new PactV3({
    consumer: 'MyPhoenixPhone-Web',
    provider: 'MyPhoenixPhone-Backend',
    dir: path.resolve(process.cwd(), 'pacts'),
  });

  it('returns expected response', async () => {
    await provider
      .given('some state')
      .uponReceiving('a request')
      .withRequest({
        method: 'GET',
        path: '/my-endpoint',
      })
      .willRespondWith({
        status: 200,
        body: { /* expected response */ },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/my-endpoint`);
      expect(response.status).toBe(200);
    });
  });
});
```

### 2. Add State Handler (Backend)

```typescript
// apps/backend/test/pact/provider.pact.spec.ts
stateHandlers: {
  'some state': async () => {
    // Set up test data for this state
    return Promise.resolve({ description: 'State description' });
  },
}
```

## Troubleshooting

### Consumer tests fail
- Check that mock expectations match actual API behavior
- Verify request/response structure in consumer test

### Provider verification fails
- Ensure backend is running on port 3003
- Check state handler implementation
- Verify pact JSON file exists in `apps/web/pacts/`
- Review provider verification logs for specific failures

### Pact file not generated
- Run consumer tests first: `npm test -- tests/pact/`
- Check for errors in consumer test output
- Verify `pacts/` directory exists

## CI/CD Integration

Add these steps to your CI pipeline:

```yaml
# 1. Run consumer tests (frontend)
- name: Run Pact Consumer Tests
  run: |
    cd apps/web
    npm test -- tests/pact/

# 2. Start backend
- name: Start Backend
  run: |
    cd apps/backend
    npm run build
    npm run start &
    sleep 5

# 3. Run provider verification
- name: Verify Pact Contracts
  run: |
    cd apps/backend
    npm test -- test/pact/provider.pact.spec.ts
```

## Best Practices

1. **Run consumer tests first** - Generate pact files before verification
2. **Keep contracts focused** - Test one API interaction per test case
3. **Use matchers** - Use `like()`, `string()`, `boolean()` for flexible matching
4. **Document states** - Add clear descriptions to state handlers
5. **Version your contracts** - Track breaking changes in API versions
6. **Automate in CI** - Run contract tests on every PR

## Resources

- [Pact Documentation](https://docs.pact.io/)
- [Pact TypeScript Guide](https://github.com/pact-foundation/pact-js)
- [API Contracts Documentation](../docs/API-CONTRACTS.md)
