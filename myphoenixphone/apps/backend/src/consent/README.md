# BE-03: Authentication France Integration

This module implements the OIDC Authorization Code flow with Orange Authentication France, enabling users to provide explicit consent before network/location checks.

## Overview

- **Service**: `AuthFranceService` — OIDC Authorization Code flow handler for Orange Authentication France
- **Controller**: `ConsentController` — endpoints `/consents/start`, `/consents/callback`, `/consents/revoke`
- **Repository**: `ConsentRepository` — stores and retrieves consent proofs in the database
- **Module**: `ConsentModule` — wires dependencies

## Orange Authentication France

Orange Authentication France is a free OIDC-compliant authentication service for Orange customers in France and Europe.

**API Documentation**: https://developer.orange.com/apis/authentication-fr/

**Endpoints**:
- **Sandbox**: 
  - Authorization: `https://login.sandbox.orange.fr/oauth/authorize`
  - Token: `https://login.sandbox.orange.fr/oauth/token`
- **Production**:
  - Authorization: `https://login.orange.fr/oauth/authorize`
  - Token: `https://login.orange.fr/oauth/token`

## Environment Variables

```bash
# Orange Authentication France Sandbox (default)
AUTH_FR_CLIENT_ID=<your-sandbox-client-id>
AUTH_FR_CLIENT_SECRET=<your-sandbox-client-secret>
AUTH_FR_ISSUER=https://login.sandbox.orange.fr
AUTH_FR_REDIRECT_URI=https://callbacks.godisopensource.fr/consents/callback

# OR Production
AUTH_FR_CLIENT_ID=<your-production-client-id>
AUTH_FR_CLIENT_SECRET=<your-production-client-secret>
AUTH_FR_ISSUER=https://login.orange.fr
AUTH_FR_REDIRECT_URI=https://callbacks.godisopensource.fr/consents/callback
```

Obtain credentials from the [Orange Developer Portal](https://developer.orange.com/myapps/).

## API Endpoints

### 1. POST /consents/start

**Purpose**: Initiate the authentication flow

**Request**:
```json
{}
```

**Response** (HTTP 302 Redirect):
Redirects to Authentication France authorization endpoint with `state` and `nonce` stored in session.

**Example**:
```bash
curl -X POST http://localhost:3003/consents/start \
  -H "Content-Type: application/json" \
  -b "session_id=abc123"
```

### 2. GET /consents/callback

**Purpose**: Handle the callback from Authentication France

**Query Parameters**:
- `code` (string, required): Authorization code from Auth FR
- `state` (string, required): State parameter for CSRF protection
- `error` (string, optional): Error code if auth failed
- `error_description` (string, optional): Error description

**Response** (HTTP 200):
```json
{
  "ok": true,
  "consentId": "uuid-consent-id",
  "msisdn_hash": "sha256-hash-of-msisdn",
  "scopes": ["openid", "profile", "phone"],
  "message": "Consent stored successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid `code`, `state`, missing session, or token exchange failed
- `500 Internal Server Error`: Unexpected server error

**Example**:
```bash
# Simulated callback (normally Auth FR redirects here)
curl -X GET "http://localhost:3003/consents/callback?code=auth-code-xyz&state=state-value" \
  -b "session_id=abc123"
```

**Behind the Scenes**:
1. Validates CSRF using `state` parameter
2. Exchanges `code` for ID token with Auth FR token endpoint
3. Decodes and validates ID token `nonce`
4. Extracts phone number and computes `msisdn_hash` using salted SHA-256
5. Stores proof (ID token, user ID, issuer, scopes) in `Consent` table
6. Clears session auth state

### 3. POST /consents/revoke

**Purpose**: Revoke a previously granted consent

**Request**:
```json
{
  "consentId": "uuid-consent-id"
}
```

**Response** (HTTP 200):
```json
{
  "ok": true,
  "revokedAt": "2025-10-22T09:30:00.000Z",
  "message": "Consent revoked successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid or missing `consentId`, or consent not found
- `500 Internal Server Error`: Unexpected server error

**Example**:
```bash
curl -X POST http://localhost:3003/consents/revoke \
  -H "Content-Type: application/json" \
  -d '{"consentId": "consent-uuid-here"}'
```

## Database Schema

### Consent Table

```sql
CREATE TABLE "Consent" (
  id             TEXT PRIMARY KEY DEFAULT uuid(),
  msisdn_hash    TEXT NOT NULL,
  scopes         TEXT[] NOT NULL,
  proof          JSONB NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT now(),
  revoked_at     TIMESTAMP,
  
  INDEX(msisdn_hash)
);
```

**Fields**:
- `id`: Unique consent identifier
- `msisdn_hash`: Salted SHA-256 hash of the phone number (never store raw MSISDN)
- `scopes`: Array of granted OIDC scopes (e.g., `["openid", "profile", "phone"]`)
- `proof`: JSONB object containing:
  - `id_token`: The OIDC ID token (JWT)
  - `user_id`: Subject (sub) claim from the ID token
  - `iss`: Issuer claim
  - `aud`: Audience claim
  - `phone_number_verified`: Whether phone number is verified by Auth FR
  - `issued_at`: ISO timestamp when consent was granted
- `created_at`: When the record was created
- `revoked_at`: When the consent was revoked (NULL if active)

## Security & Privacy

1. **MSISDN Hashing**: Phone numbers are salted and hashed using SHA-256 before storage
   - Salt: `SALT_MSISDN_HASH` environment variable
   - No raw phone numbers appear in logs or database

2. **CSRF Protection**: State parameter validated on callback
   - Generated cryptographically secure random value
   - Stored in session for comparison

3. **Nonce Validation**: ID token nonce must match session nonce
   - Prevents token replay attacks

4. **JWT Signature**: In production, verify JWT signature against Auth FR's public key
   - Currently only decoding (for development/testing)
   - Add signature verification before production deployment

5. **TTL Configuration**: Consent can be revoked at any time

## Metrics & Observability

The `ConsentRepository` emits metrics via `prom-client`:

```
consent_operations_total{op="create|revoke", result="ok|err"}
```

Logs are written via NestJS Logger:
- `DEBUG`: Auth flow initiation, state/nonce generation, token exchange
- `WARN`: State/nonce mismatches, missing session
- `ERROR`: Token exchange failures, database errors

Example logs:
```
[ConsentController] Initiated consent flow with state=abc...
[ConsentController] Consent stored for msisdn_hash=def..., consentId=123...
[ConsentController] Consent revoked: consentId=123...
```

## Integration with Other Modules

### Eligibility Module
- After consent is stored, the `EligibilityModule` (BE-05, BE-06) reads the `Consent` record
- Uses `msisdn_hash` to query CAMARA APIs (SIM Swap, Reachability)

### Verification Module
- Independent of Consent; Number Verification can be performed before or after consent
- Both modules can operate on the same MSISDN hash

## Testing

### Unit Tests

```bash
npm test -- src/auth-france/auth-france.service.spec.ts
npm test -- src/consent/consent.controller.spec.ts
```

### Integration Tests (with mocked OIDC provider)

```bash
npm test -- src/consent/
```

### E2E Test

```bash
npm run test:e2e
```

Manual flow:
1. Start backend: `PORT=3003 npm run start:dev`
2. POST `/consents/start` → note the redirect URL
3. Visit redirect URL (or mock Auth FR callback) → should hit `/consents/callback?code=...&state=...`
4. Verify DB has `Consent` entry with hashed phone number and proof

## Development vs Production

### Development
- Use **Sandbox** credentials from Orange Developer Portal
- ID token JWT signature verification is skipped
- Redirect URI: `http://localhost:3003/consents/callback` or `https://callbacks.godisopensource.fr/consents/callback` (via tunnel)
- Set `AUTH_FR_ISSUER=https://login.sandbox.orange.fr`

### Production
- Use **Production** credentials from Orange
- **CRITICAL**: Add JWT signature verification before deploying
- Set `AUTH_FR_ISSUER=https://login.orange.fr`
- Ensure `AUTH_FR_REDIRECT_URI` is the public HTTPS endpoint
- Implement rate limiting on `/consents/start` and `/consents/callback`
- Add logging/alerting for callback failures

## Troubleshooting

### "Missing authorization code"
- Orange is not redirecting back with a `code` parameter
- Check client ID, redirect URI, and scope in Orange Developer Portal
- Verify `AUTH_FR_ISSUER` points to correct endpoint (sandbox vs production)

### "Invalid state parameter"
- Session was lost or state doesn't match
- Ensure cookies/sessions are enabled in your browser
- Load balancer or proxy may be interfering with session persistence

### "No phone number in authorization response"
- Orange did not grant the `phone` scope or user declined
- Verify `scope=openid+profile+phone+email` is sent to Orange
- User may need to update their Orange account settings

### "Invalid ID token"
- Token decoding failed (malformed JWT)
- Check Orange token endpoint response in server logs
- Enable debug logging: `LOG_LEVEL=debug`
- Verify ID token signature if signature verification is enabled

### 401/403 Unauthorized from Orange
- Client ID or client secret is incorrect
- Credentials may be expired or revoked in Orange Developer Portal
- Verify credentials are for the correct environment (sandbox vs production)

## Future Enhancements

1. **JWT Signature Verification**: Fetch Auth FR public keys and validate signatures
2. **Refresh Tokens**: If Auth FR supports, store and refresh expired ID tokens
3. **Scope Consent UI**: Let users grant/deny specific scopes
4. **Rate Limiting**: Limit consent/callback requests per IP or user
5. **Audit Logging**: Track all consent grants/revokes with user context
