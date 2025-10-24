# Security & GDPR Compliance - MyPhoenixPhone

## RGPD (GDPR) Compliance Checklist

### ✅ Legal Basis for Processing

- [x] **Consent Management**
  - Explicit consent collected before processing personal data
  - Granular consent options (marketing, analytics, etc.)
  - Easy withdrawal mechanism
  - Consent records stored with timestamp and IP hash

- [x] **Legitimate Interest**
  - Documented legitimate interest assessment for lead processing
  - Balance test performed (user rights vs. business needs)
  - Users informed of processing basis

### ✅ User Rights (GDPR Chapter 3)

- [x] **Right to Access (Art. 15)**
  - Users can request copy of their data
  - Response within 1 month
  - Machine-readable format (JSON)

- [x] **Right to Rectification (Art. 16)**
  - Users can correct inaccurate data
  - Update endpoints available

- [x] **Right to Erasure (Art. 17)**
  - "Right to be forgotten" implementation
  - Cascading deletion of related data
  - Retention of legally required data only

- [x] **Right to Data Portability (Art. 20)**
  - Export data in JSON format
  - Includes all user-provided data

- [x] **Right to Object (Art. 21)**
  - Opt-out from marketing communications
  - Opt-out from profiling/automated decisions

### ✅ Data Minimization

- [ ] Only collect necessary data
  - Phone model, condition: ✓ (required for estimation)
  - Full name, address: ✓ (required for shipping)
  - Email, phone number: ✓ (required for communication)
  - Location: ⚠️ (optional, only for geofencing store deposits)
  - Device fingerprinting: ❌ (not collected)

- [x] **Purpose Limitation**
  - Data used only for stated purposes
  - No secondary uses without additional consent
  - Clear privacy policy

### ✅ Data Security (Art. 32)

- [x] **Encryption**
  - HTTPS only (TLS 1.3)
  - Sensitive data encrypted at rest (database fields)
  - PII hashed where possible (phone numbers, emails)

- [x] **Access Controls**
  - Role-based access control (RBAC)
  - Principle of least privilege
  - Audit logs for data access

- [x] **Pseudonymization**
  - Lead IDs used instead of direct identifiers
  - Phone numbers hashed for analytics
  - IP addresses anonymized (last octet removed)

### ✅ Data Retention

- [x] **Retention Periods**
  - Active leads: 60 days
  - Completed transactions: 3 years (accounting requirement)
  - Marketing consent: Until withdrawn
  - Analytics (anonymized): 25 months (CNIL recommendation)

- [x] **Automated Deletion**
  - Scheduled jobs delete expired data
  - Soft delete with grace period
  - Logs kept for 12 months

### ✅ Third-Party Processors (Art. 28)

- [x] **Data Processing Agreements (DPA)**
  - Orange Network APIs: ✓ (internal Orange services)
  - Colissimo: ✓ (La Poste, DPA in place)
  - Cloudflare Turnstile: ✓ (Cloudflare DPA)
  - Database provider: ✓ (SOC 2 compliant)

- [x] **Subprocessor Management**
  - List of subprocessors maintained
  - Users notified of changes
  - GDPR clauses in contracts

### ✅ Privacy by Design & Default

- [x] **Privacy Settings**
  - Opt-in for marketing (not pre-checked)
  - Analytics anonymized by default
  - Minimal data collection

- [x] **Cookie Management**
  - Cookie banner with clear choices
  - Functional cookies only (no tracking)
  - No cookies set before consent

## Security Measures

### Authentication & Authorization

```typescript
// No user accounts in MVP, but prepare for future
// - Lead ID access via secure URL (unguessable)
// - Rate limiting on all endpoints
// - CSRF protection
```

### Input Validation

```typescript
// All user inputs validated server-side
// - Phone model selection: enum validation
// - Email: RFC 5322 format
// - Phone number: E.164 international format
// - Condition scores: 1-10 range
// - SQL injection prevention (Prisma parameterized queries)
```

### Rate Limiting

```typescript
// Implemented in backend
export const RATE_LIMITS = {
  // IP-based limits
  global: { max: 100, windowMs: 15 * 60 * 1000 }, // 100 req/15min
  lead_creation: { max: 5, windowMs: 60 * 60 * 1000 }, // 5/hour
  messaging: { max: 1, windowMs: 24 * 60 * 60 * 1000 }, // 1/day per user
  
  // Prevent abuse
  captcha_bypass_attempts: { max: 3, windowMs: 5 * 60 * 1000 }, // 3/5min
};
```

### Data Sanitization

```typescript
// HTML/XSS prevention
import sanitizeHtml from 'sanitize-html';

// Remove all HTML tags from user input
const clean = sanitizeHtml(userInput, { allowedTags: [] });

// Database queries use parameterized statements (Prisma ORM)
```

### Secrets Management

```bash
# Never commit secrets to git
# Use environment variables

# .env (NOT in git)
DATABASE_URL="postgresql://..."
CAPTCHA_SECRET_KEY="..."
ORANGE_API_KEY="..."

# Production: Use managed secrets service
# - AWS Secrets Manager
# - Azure Key Vault
# - HashiCorp Vault
```

### Logging & Monitoring

```typescript
// No PII in logs
logger.info('Lead created', {
  lead_id: lead.id, // ✓ OK
  phone_model: 'iPhone 12', // ✓ OK
  email: user.email, // ❌ Never log PII
  ip_address: req.ip, // ❌ Use anonymized IP
  ip_prefix: anonymizeIP(req.ip), // ✓ OK (xxx.xxx.xxx.0)
});

// Audit trail for GDPR requests
logger.audit('GDPR_ACCESS_REQUEST', {
  lead_id: lead.id,
  timestamp: new Date(),
  ip_hash: hashIP(req.ip),
});
```

## Vulnerability Prevention

### OWASP Top 10 Coverage

1. **Broken Access Control** ✓
   - Lead IDs are UUIDs (unguessable)
   - No enumeration possible
   - Rate limiting prevents brute force

2. **Cryptographic Failures** ✓
   - HTTPS everywhere
   - No sensitive data in URLs
   - Encrypted database fields

3. **Injection** ✓
   - Prisma ORM (parameterized queries)
   - Input validation
   - Output sanitization

4. **Insecure Design** ✓
   - Threat modeling performed
   - Security requirements documented
   - Privacy by design

5. **Security Misconfiguration** ✓
   - Production environment hardened
   - Default passwords changed
   - Error messages don't leak info

6. **Vulnerable Components** ✓
   - Dependency scanning (npm audit)
   - Automatic security updates
   - Minimal dependencies

7. **Identification & Auth Failures** ✓
   - No passwords (no user accounts yet)
   - Cloudflare Turnstile prevents bots
   - Rate limiting

8. **Software & Data Integrity** ✓
   - Subresource Integrity (SRI) for CDN
   - Package lock files committed
   - Code signing in CI/CD

9. **Security Logging & Monitoring** ✓
   - Centralized logging
   - Anomaly detection
   - Incident response plan

10. **Server-Side Request Forgery (SSRF)** ✓
    - No user-controlled URLs
    - Orange API calls validated
    - Network segmentation

## Incident Response Plan

### Data Breach Procedure

1. **Detection & Containment** (within 1 hour)
   - Identify scope of breach
   - Isolate affected systems
   - Preserve evidence

2. **Assessment** (within 24 hours)
   - How many users affected?
   - What data was exposed?
   - Risk level determination

3. **Notification** (within 72 hours of detection)
   - CNIL notification if high risk
   - Affected users notified
   - Document all actions

4. **Remediation**
   - Fix vulnerability
   - Reset credentials if needed
   - Review and update security measures

### Contact Points

- **DPO (Data Protection Officer)**: dpo@orange.com
- **Security Team**: security@orange.com
- **CNIL**: cnil.fr

## Regular Audits

- [ ] Quarterly: Dependency security scan
- [ ] Quarterly: Access log review
- [ ] Annually: Full security audit
- [ ] Annually: GDPR compliance review
- [ ] Annually: Penetration testing

## Code Review Checklist

```markdown
- [ ] No hardcoded secrets
- [ ] Input validation on all user data
- [ ] Sensitive data encrypted
- [ ] HTTPS only
- [ ] CSRF protection
- [ ] XSS prevention
- [ ] SQL injection prevention
- [ ] Rate limiting applied
- [ ] Error messages don't leak info
- [ ] Logs don't contain PII
- [ ] Dependencies up to date
- [ ] Security headers set
```

## Security Headers

```typescript
// Set in Next.js config
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY', // Prevent clickjacking
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff', // Prevent MIME sniffing
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)', // Minimal permissions
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://boosted.orange.com",
      "img-src 'self' data: https:",
      "font-src 'self' https://boosted.orange.com",
      "connect-src 'self' http://localhost:3003 https://api.orange.fr",
    ].join('; '),
  },
];
```
