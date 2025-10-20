# CAMARA API Integration - Quick Start Guide

## Usage in an Application

### Step 1: Wire Services into a Module

Create a CAMARA module to provide these services:

```typescript
// src/camara/camara.module.ts
import { Module } from '@nestjs/common';
import { OAuth2ClientService } from './oauth2-client.service';
import { SimSwapService } from './sim-swap.service';
import { ReachabilityService } from './reachability.service';

@Module({
  providers: [OAuth2ClientService, SimSwapService, ReachabilityService],
  exports: [SimSwapService, ReachabilityService],
})
export class CamaraModule {}
```

### Step 2: Import in Your App Module

```typescript
// src/app.module.ts
import { CamaraModule } from './camara/camara.module';

@Module({
  imports: [
    // ... other modules
    CamaraModule,
  ],
  // ...
})
export class AppModule {}
```

### Step 3: Use in Controllers/Services

```typescript
import { Injectable } from '@nestjs/common';
import { SimSwapService, ReachabilityService } from './camara';

@Injectable()
export class EligibilityService {
  constructor(
    private readonly simSwapService: SimSwapService,
    private readonly reachabilityService: ReachabilityService,
  ) {}

  async checkEligibility(phoneNumber: string) {
    // Get SIM swap info
    const simSwap = await this.simSwapService.getSimSwapStatus(phoneNumber);
    
    // Get reachability
    const reachability = await this.reachabilityService.isReachable(phoneNumber);
    
    // Your eligibility logic
    const eligible = simSwap.swappedAt && reachability.reachable;
    
    return {
      eligible,
      reasons: [],
      snapshot: {
        simSwap,
        reachability,
      },
    };
  }
}
```

## API Behavior

### Automatic Mode Selection

Services automatically detect if CAMARA credentials are configured:
- **With credentials**: Makes real HTTP calls to Orange APIs
- **Without credentials**: Falls back to deterministic stubs for testing

### Error Handling

All CAMARA API errors are mapped to appropriate HTTP exceptions:
- `400` - Invalid request (bad phone number, invalid parameters)
- `401/403` - Authentication failed
- `404` - Phone number not found
- `429` - Rate limit exceeded
- `503` - Service unavailable
- `502` - Generic API error

### Logging

- **Debug level**: Request/response details, correlation IDs
- **Error level**: API failures, unexpected errors
- **Info level**: Service initialization mode (real API vs stub)

## Orange Sandbox Test Numbers

For testing in sandbox environment, use these test MSISDNs:
- `+33699901032`
- `+33699901033`
- etc.

Check [Orange Developer Portal](https://developer.orange.com/apis/camara-sandbox-simswap-orange-lab/) for the full list.

## Next Steps

1. ✅ **Done**: OAuth2 + HTTP implementation
2. **TODO**: Implement BE-07 (GET /eligibility endpoint)
3. **TODO**: Add retry logic with exponential backoff
4. **TODO**: Implement circuit breaker pattern
5. **TODO**: Add MSISDN hashing (SEC-01)
6. **TODO**: Add rate limiting
7. **TODO**: Implement 3-legged flow for user consent

## Troubleshooting

### OAuth2 Token Errors
- Verify credentials in `.env`
- Check if `CAMARA_TOKEN_URL` is correct
- Ensure network can reach `https://api.orange.com`

### API Call Failures
- Check if test phone number is in Orange Sandbox allowed list
- Verify CAMARA_BASE_URL is `https://api.orange.com` (no trailing slash)
- Review logs for detailed error messages

### Stub Mode Activated
If you see "using stub mode" in logs:
- Services are using deterministic stubs
- Add credentials to `.env` to enable real API calls
- Restart app after adding credentials

## Support

- [Orange Developer Portal](https://developer.orange.com/)
- [CAMARA Project GitHub](https://github.com/camaraproject)
- [Orange API Support](https://developer.orange.com/support/contact-us/)
