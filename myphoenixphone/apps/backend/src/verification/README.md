# Number Verification with CAPTCHA (BE-04)

This module implements phone number verification with CAPTCHA protection using Orange CAMARA Network APIs and Live Identity - Captcha.

## Features

- **CAPTCHA Protection**: Guard against automated abuse using Orange Live Identity - Captcha
- **Number Verification**: Verify phone numbers via SMS code using CAMARA Number Verification API
- **E.164 Format Validation**: Strict phone number format validation
- **MSISDN Hashing**: Privacy-by-design with SEC-01 compliance (no raw phone numbers in logs)
- **Two-Step Flow**: Separate code sending and verification for better UX

## API Endpoints

### POST /verify/number

Verify a phone number with CAPTCHA protection.

**Request Body:**

```json
{
  "phoneNumber": "+33612345678",
  "captchaToken": "captcha-token-from-frontend",
  "code": "123456"  // Optional: omit to send code first
}
```

**Response (Code Sent):**

```json
{
  "ok": true,
  "codeSent": true,
  "message": "Verification code sent successfully"
}
```

**Response (Verification Success):**

```json
{
  "ok": true,
  "codeSent": false,
  "message": "Phone number verified successfully"
}
```

**Response (Verification Failed):**

```json
{
  "ok": false,
  "codeSent": false,
  "message": "Phone number verification failed"
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid or missing CAPTCHA token
- `400 Bad Request`: Invalid phone number format or verification failed

## Usage Flow

### 1. Frontend Loads CAPTCHA

```javascript
// Load CAPTCHA widget with your CAPTCHA_SITE_KEY
const captchaToken = await loadCaptchaWidget(CAPTCHA_SITE_KEY);
```

### 2. Request Verification Code

```javascript
const response = await fetch('http://localhost:3003/verify/number', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '+33612345678',
    captchaToken: captchaToken,
  }),
});

const result = await response.json();
// { ok: true, codeSent: true, message: "Verification code sent successfully" }
```

### 3. User Receives SMS Code

The user receives a verification code via SMS on their phone.

### 4. Verify Code

```javascript
const response = await fetch('http://localhost:3003/verify/number', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '+33612345678',
    captchaToken: captchaToken, // New CAPTCHA token for this request
    code: '123456', // Code received via SMS
  }),
});

const result = await response.json();
// { ok: true, codeSent: false, message: "Phone number verified successfully" }
```

## Testing with cURL

### Send Verification Code

```bash
# Note: Replace captcha-token-here with actual CAPTCHA token
curl -X POST http://localhost:3003/verify/number \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+33612345678",
    "captchaToken": "captcha-token-here"
  }'
```

### Verify Code

```bash
curl -X POST http://localhost:3003/verify/number \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+33612345678",
    "captchaToken": "captcha-token-here",
    "code": "123456"
  }'
```

## Configuration

Add these environment variables to `.env`:

```properties
# CAPTCHA (Cloudflare Turnstile)
# Get your keys from https://dash.cloudflare.com/?to=/:account/turnstile
CAPTCHA_SITE_KEY=your-turnstile-site-key-here
CAPTCHA_SECRET_KEY=your-turnstile-secret-key-here
CAPTCHA_VERIFY_URL=https://challenges.cloudflare.com/turnstile/v0/siteverify

# CAMARA (already configured for Number Verification)
CAMARA_BASE_URL=https://api.orange.com/camara/playground
CAMARA_CLIENT_ID=your-client-id
CAMARA_CLIENT_SECRET=your-client-secret
CAMARA_TOKEN_URL=https://api.orange.com/openidconnect/playground/v1.0/token
CAMARA_ENV=playground

# Security (already configured)
SALT_MSISDN_HASH=change-me-in-production-use-a-secure-random-string
```

## Getting CAPTCHA Credentials (Cloudflare Turnstile)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Click **"Add Site"**
3. Enter your domain (use `localhost` for development)
4. Choose **Widget Mode**:
   - **Managed**: Automatic challenge difficulty (recommended)
   - **Non-Interactive**: No challenge for most users
   - **Invisible**: Completely invisible
5. Copy your **Site Key** and **Secret Key**
6. Update your `.env` file with these credentials

**Why Cloudflare Turnstile?**
- ✅ **100% Free** and unlimited
- ✅ **Privacy-Friendly**: No tracking or data collection
- ✅ **Modern**: Lighter and faster than reCAPTCHA
- ✅ **Open**: Works without Google dependencies

## Testing with Playground

The CAMARA Number Verification API uses the **Playground** environment by default, which allows testing without real SMS:

1. Use the Network APIs Playground to create test phone numbers
2. The Playground will simulate SMS code delivery
3. Check the Playground console for the verification code
4. Use that code in your verification request

## Security Features

### CAPTCHA Validation

- **Token Extraction**: Accepts CAPTCHA token from body, query, or header (`X-Captcha-Token`)
- **Client IP Detection**: Extracts client IP from `X-Forwarded-For`, `X-Real-IP`, or socket
- **API Validation**: Validates token against Orange Live Identity API
- **Error Handling**: Returns clear error messages for debugging

### Privacy Protection (SEC-01)

- **MSISDN Hashing**: All phone numbers are hashed with SHA-256 + salt before logging
- **No Raw Numbers in Logs**: Only hashed values appear in logs and storage
- **Deterministic Hashing**: Same phone number always produces same hash (for lookups)

## Architecture

```
┌─────────────┐
│  Frontend   │
│             │
│ ┌─────────┐ │
│ │ CAPTCHA │ │
│ │ Widget  │ │
│ └─────────┘ │
└──────┬──────┘
       │ POST /verify/number
       │ { phoneNumber, captchaToken, code? }
       ▼
┌─────────────────────────────────┐
│  VerificationController         │
│  ┌───────────────────────────┐  │
│  │  @UseGuards(CaptchaGuard) │  │
│  └───────────────────────────┘  │
│  - E.164 validation             │
│  - MSISDN hashing (SEC-01)      │
└──────────┬──────────────────────┘
           │
           ├──────────────────┐
           ▼                  ▼
    ┌─────────────┐   ┌────────────────────┐
    │CaptchaGuard │   │NumberVerification  │
    │             │   │Service             │
    │ - Extract   │   │                    │
    │   token     │   │ - sendCode()       │
    │ - Validate  │   │ - verifyCode()     │
    │   with API  │   │                    │
    └──────┬──────┘   └─────────┬──────────┘
           │                    │
           ▼                    ▼
    Cloudflare           OAuth2ClientService
    Turnstile API             │
    /siteverify              ▼
                         CAMARA Number
                         Verification API
                         /verify-with-code
```

## Implementation Details

### Files Created

- `verification/captcha.guard.ts` - CAPTCHA validation guard
- `verification/captcha.guard.spec.ts` - 11 unit tests
- `verification/number-verification.service.ts` - CAMARA adapter
- `verification/number-verification.service.spec.ts` - 10 unit tests
- `verification/verification.controller.ts` - REST endpoint
- `verification/verification.controller.spec.ts` - 11 unit tests
- `verification/verification.module.ts` - Module definition

### Test Coverage

- **32 unit tests** covering all verification functionality
- **100% coverage** of happy paths and error scenarios
- **Mocked external APIs** for fast, reliable tests

### Integration with Other Modules

- Uses `OAuth2ClientService` from `camara/` for CAMARA authentication
- Follows same hashing pattern as `eligibility/` for SEC-01 compliance
- Registered in `AppModule` alongside other feature modules

## Next Steps

### Frontend Integration (FE-01)

To complete the user flow, implement:

1. CAPTCHA widget integration on number verification page
2. Phone number input with E.164 format validation
3. Two-step form: (a) send code, (b) verify code
4. Loading states and error handling
5. Success redirect to eligibility check

### Production Deployment

Before going to production:

1. **Subscribe to Production APIs**:
   - Orange Live Identity - Captcha (Production)
   - CAMARA Number Verification (Production)

2. **Update Environment Variables**:
   ```properties
   CAMARA_ENV=production
   CAMARA_BASE_URL=https://api.orange.com/camara
   # Update client ID/secret for production
   ```

3. **Security Hardening**:
   - Use strong random string for `SALT_MSISDN_HASH`
   - Enable rate limiting on `/verify/number` endpoint
   - Add request timeouts and circuit breakers
   - Monitor CAPTCHA and Number Verification API quotas

4. **Monitoring**:
   - Add Prometheus metrics for verification attempts/successes
   - Set up alerts for high failure rates
   - Log verification errors for debugging (without raw phone numbers)

## Troubleshooting

### CAPTCHA Validation Fails

- Verify `CAPTCHA_SECRET_KEY` is correct
- Check CAPTCHA token is fresh (tokens expire after ~5 minutes)
- Ensure client IP is correctly extracted
- Test with Cloudflare Turnstile test keys (see below)

### Number Verification Fails

- Verify phone number is in E.164 format (+[country][number])
- Check CAMARA credentials are valid
- Ensure phone number is registered in Playground (for testing)
- Check CAMARA API status on Orange Developer Portal

### Build/Test Failures

- Run `npm install` to ensure dependencies are installed
- Run `npm test` to verify all tests pass
- Check `.env` file has all required variables
- Verify Prisma schema is up to date (`npm run prisma:generate`)

## Testing with Cloudflare Turnstile Test Keys

For development and testing, Cloudflare provides test keys that always pass or fail:

**Always Passes:**
```properties
CAPTCHA_SITE_KEY=1x00000000000000000000AA
CAPTCHA_SECRET_KEY=1x0000000000000000000000000000000AA
```

**Always Fails:**
```properties
CAPTCHA_SITE_KEY=2x00000000000000000000AB
CAPTCHA_SECRET_KEY=2x0000000000000000000000000000000AA
```

**Always Blocks (Interactive Challenge):**
```properties
CAPTCHA_SITE_KEY=3x00000000000000000000FF
CAPTCHA_SECRET_KEY=1x0000000000000000000000000000000AA
```

## References

- [CAMARA Number Verification API](https://developer.orange.com/apis/camara-number-verification)
- [Cloudflare Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [Cloudflare Turnstile Dashboard](https://dash.cloudflare.com/?to=/:account/turnstile)
- [E.164 Phone Number Format](https://en.wikipedia.org/wiki/E.164)
- [NestJS Guards](https://docs.nestjs.com/guards)
