# Day 1 Deliverables - Dormant Device Detection Project

**Date**: 22 octobre 2025  
**Status**: ✅ Complete

---

## What Was Delivered

### 1. DD-01: Dormant Signal Policy & Schema ✅

**Location**: `myphoenixphone/apps/backend/src/dormant/`

#### Files Created:
- **`schemas/dormant-event.schema.json`**: JSON Schema for network input events
  - Defines structure for SIM swap + reachability signals
  - Includes validation rules and examples
  - Used by backend to normalize incoming network data

- **`schemas/lead-output.schema.json`**: JSON Schema for lead output
  - Defines lead structure with scoring, eligibility, and exclusions
  - Includes activation window and next action logic
  - Used by detector service and API responses

- **`RULES.md`**: Complete policy documentation
  - Activation rules (72h delay, line type, fraud filters)
  - Exclusion logic (9 different reasons)
  - Scoring algorithm with weights
  - Feature flags and configuration
  - Privacy/GDPR compliance notes
  - Metrics and KPIs definitions

**Key Decisions**:
- Minimum 72h delay after SIM swap to reduce false positives
- Dormant score formula: 40% swap signal + 35% unreachability + 15% time window + 10% history
- 30-day TTL for leads (GDPR minimization)
- Optimal activation window: Days 3–14 post-swap
- Maximum 2 SIM swaps in 30 days threshold (fraud protection)

---

### 2. Message Templates (Multi-Channel) ✅

**Location**: `myphoenixphone/apps/backend/src/nudge/templates/MESSAGE_TEMPLATES.md`

#### Content Created:
- **SMS Templates** (4 variants):
  - Variant A: Value-focused (with price)
  - Variant B: Environmental + value
  - Variant C: Donation-first (no price)
  - Variant D: Bonus urgency (time-limited)

- **RCS Rich Card Templates** (3 variants):
  - Value-focused with hero image and CTA
  - Environmental focus with green branding
  - Bonus time-limited with urgency badge

- **Push Notification Templates** (3 variants):
  - Value-focused with price highlight
  - Eco-friendly angle
  - Bonus urgency with high priority

- **Email HTML Template**:
  - Responsive design (mobile + desktop)
  - Orange brand colors (#ff7900)
  - Two-column value proposition (Rachat vs Don)
  - Clear CTA and benefits list

**A/B Testing Strategy**:
- Control (40%): Variant A standard
- Treatment 1 (30%): Variant B eco-friendly
- Treatment 2 (30%): Variant D bonus urgency
- Success metric: CTR (click-through rate)

**Compliance**:
- All templates include opt-out mechanism
- Character limits respected (SMS 160, push 178)
- GDPR-compliant consent references
- Frequency capping rules documented

---

### 3. Landing Page Wireframe & UX Flow ✅

**Location**: `myphoenixphone/apps/web/LANDING_WIREFRAME.md`

#### Sections Defined:

**User Flow (3 Steps + Confirmation)**:
1. **Model Selection (Step 1/3)**:
   - Smart detection via User-Agent
   - Search with autocomplete from model list
   - "I don't know my model" → donation path
   - IMEI helper modal (optional)

2. **Device Condition (Step 2/3)**:
   - 5 questions: Screen, battery, damage, accessories, carrier lock
   - Visual progress indicator
   - Radio buttons + checkboxes for easy input

3. **Consent & Privacy (Step 2.5/3)**:
   - Required checkbox for device info processing
   - Optional marketing contact consent
   - GDPR-compliant with clear privacy notice

4. **Instant Estimate (Step 3/3)**:
   - Scenario A: Device has value → Ship or Store options
   - Scenario B: No value → Donation/Recycling options
   - Bonus badge display (feature flag)
   - Always show donation fallback

5. **Handover Confirmation**:
   - Shipping: PDF label download + email
   - Store: Pickup code + nearby locations
   - Donation: Confirmation + impact metrics

**Key UX Principles**:
- Mobile-first, responsive design
- 2-minute completion target
- Accessible (WCAG 2.1 AA compliant)
- Clear error states and fallbacks
- Performance targets: TTI < 3s, LCP < 2.5s

**Analytics Events**:
- 9 tracked events from page_view to completed
- Track drop-off points (consent rejection, errors)
- A/B variant assignment per lead_id

---

## Technical Specifications

### Backend Integration Points
- `POST /pricing/estimate`: Called after Step 2 with model + condition
- `GET /leads/:id`: Track lead status
- `POST /leads/:id/update`: Update with user choices
- `POST /logistics/label`: Generate PDF shipping label
- `POST /handover`: Record final user choice

### Frontend Stack
- Next.js (apps/web)
- React components from packages/ui
- JSON model data: `eligible-phone-models.json`
- i18n support: French (default), English

### Data Privacy
- No raw MSISDN on frontend
- IMEI ephemeral (not stored after estimate)
- Lead ID in URL params for tracking
- Consent required before showing estimate

---

## Assets & Dependencies Needed (Next Steps)

### Design Assets (for DD-06 implementation)
- [ ] Hero image: Phone with Orange gradient
- [ ] RCS images: `rcs-hero-value.jpg`, `rcs-hero-eco.jpg`, `rcs-hero-bonus.jpg` (1200×628px)
- [ ] Push icons: 192×192px PNGs for value/eco/bonus variants
- [ ] IMEI helper screenshots: iOS + Android annotated guides
- [ ] Orange logo SVG

### Data Files
- [ ] `eligible-phone-models.json`: List of popular models with metadata (brand, model, storage, avg price tier)
  - Suggested structure:
    ```json
    [
      {
        "id": "iphone-13-pro-128",
        "brand": "Apple",
        "model": "iPhone 13 Pro",
        "storage": "128GB",
        "keywords": ["iphone", "13", "pro", "apple"],
        "avg_price_tier": 3,
        "image_url": "/images/phones/iphone-13-pro.jpg"
      }
    ]
    ```

### External Services
- [ ] SMS provider credentials: `SMS_API_KEY`, `SMS_SENDER_ID`
- [ ] RCS/Push setup (if applicable)
- [ ] Email SMTP: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
- [ ] PDF generation library: `puppeteer` or `pdfkit`

---

## Validation Checklist

### Schema Validation ✅
- [x] Input event schema has all required fields
- [x] Lead output schema matches RULES.md logic
- [x] Examples provided for both schemas
- [x] JSON Schema $schema version declared

### Message Templates ✅
- [x] SMS variants within 160 characters
- [x] Personalization placeholders documented
- [x] A/B testing variants defined
- [x] Opt-out mechanism included
- [x] Multi-channel coverage (SMS/RCS/Push/Email)

### Landing Wireframe ✅
- [x] All user paths documented (value/no-value/donation)
- [x] Consent flow integrated
- [x] Error states defined
- [x] Accessibility requirements noted
- [x] Analytics events specified
- [x] Mobile-first approach
- [x] Performance targets set

---

## Next Day Preview: Day 2-3 Tasks

### DD-02: Event Ingestion
- Create `NetworkEventService` to collect SIM swap + reachability data
- Reuse existing `camara/reachability.service.ts`
- Add SIM swap adapter (CAMARA or mock)
- Store events in `network_events` table

### DD-03: DormantDetector Service
- Implement rule engine from RULES.md
- Calculate dormant_score using formula
- Create leads with idempotency
- Add TTL purge job
- Expose internal API: `process(event): Lead`

### DD-06: Landing POC (Parallel)
- Build Next.js pages in `apps/web/app/lead/[id]/`
- Create model autocomplete component
- Implement condition questionnaire
- Add consent checkbox
- Wire up `/pricing/estimate` API call

**Dependencies for Day 2-3**:
- Prisma schema updates (Lead, NetworkEvent tables)
- Environment variables (SALT_MSISDN_HASH, TTL_LEAD_DAYS)
- CAMARA credentials or mock adapters

---

## Files Summary

| File | Purpose | Size | Status |
|------|---------|------|--------|
| `dormant-event.schema.json` | Input event validation | ~2KB | ✅ |
| `lead-output.schema.json` | Lead output validation | ~2KB | ✅ |
| `RULES.md` | Policy & rules doc | ~8KB | ✅ |
| `MESSAGE_TEMPLATES.md` | Multi-channel templates | ~12KB | ✅ |
| `LANDING_WIREFRAME.md` | UX flow & wireframe | ~15KB | ✅ |
| **Total** | Day 1 deliverables | **~39KB** | **✅** |

---

## Review & Approval

**Technical Review**: Ready for backend team (schemas + rules)  
**Content Review**: Ready for Marketing/Legal (message templates)  
**Design Review**: Ready for UX/UI (wireframe → high-fi mockups)

**Sign-off**: ✅ Day 1 tasks complete

---

## Contact & References

- **Project Lead**: Paul Lardet
- **Issue Tracker**: GitLab `paul-lardet/myphoenixphone`
- **Workspace**: `/Users/paul/MyPhoenixPhone`
- **Documentation**: All files in monorepo under `myphoenixphone/apps/`

For questions or clarifications, refer to:
- Rules: `apps/backend/src/dormant/RULES.md`
- Schemas: `apps/backend/src/dormant/schemas/`
- Templates: `apps/backend/src/nudge/templates/MESSAGE_TEMPLATES.md`
- Wireframe: `apps/web/LANDING_WIREFRAME.md`
