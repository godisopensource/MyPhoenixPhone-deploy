# DD-09B: Admin Pages - Leads & Templates

## Overview

Created two comprehensive admin dashboard pages for managing SMS campaign data and message templates.

**Date Completed:** 22 octobre 2025  
**Status:** ✅ COMPLETE

---

## Pages Created

### 1. Leads Management Page
**File:** `apps/web/app/admin/leads/page.tsx` (430 lines)

#### Features

**Filtering & Search:**
- Full-text search by phone number (msisdn_masked)
- Status filter: All / Dormant / Contacted / Converted
- Device tier filter: All / Premium / Mid-range / Budget
- Sort options: Score (desc/asc) / Recent / Oldest
- Real-time filtering with pagination reset

**Display Components:**
- **Stat Cards:** Total leads, average dormancy score, contacted count, conversion count
  - Orange branding (#ff7900) for conversion metrics
- **Leads Table:**
  - Phone number (masked format)
  - Dormancy score with visual progress bar (0-100%)
  - Device tier badge (flagship/mid-range/budget)
  - Status badge (Dormant/Contacted/Converted/Inactive)
  - Contact count (number)
  - Last contact date
  - Conversion date (if converted)
  - Lead creation date

**Scoring System:**
- Color-coded dormancy badges:
  - 🔴 **Très chaud:** 80-100% (danger)
  - 🟠 **Chaud:** 60-79% (warning)
  - 🔵 **Tiède:** 40-59% (info)
  - ⚪ **Froid:** 0-39% (secondary)

**Pagination:**
- 50 leads per page
- Smart pagination UI (first/last/previous/next)
- Ellipsis for large page ranges

**API Integration:**
- GET `/dormant/leads?filters=...`
- Query params: `eligible`, `converted`, `device_tier`, `search`, `page`, `limit`, `sort`

---

### 2. Templates Management Page
**File:** `apps/web/app/admin/templates/page.tsx` (380 lines)

#### Features

**Pre-loaded Templates:**
3 default SMS/Email templates included for testing:

1. **Offre Estimation Gratuite** (SMS)
   - 4 variants (A/B/C/D) for A/B testing
   - 1,250 uses (example data)

2. **Relance Client** (SMS)
   - 4 variants with conditional text
   - 350 uses (example data)

3. **Bienvenue Client** (Email)
   - Subject: "Bienvenue chez Orange - Estimation de votre téléphone"
   - HTML template with placeholders
   - 580 uses (example data)

**Template Creation & Editing:**
- Modal form for new/existing templates
- Fields:
  - Template name (required)
  - Channel selector: SMS / Email / RCS / Push
  - Subject field (Email only)
  - Main content (Variante A)
  - Optional variants B, C, D for A/B testing
  - Placeholder validation: {url}, {prenom}, {price}

**Template Grid Display:**
- Channel icon + label
- Usage count badge
- Content preview (first 100 chars)
- A/B/C/D indicator if variants exist
- Last update date
- Edit button in card footer
- Delete button with confirmation

**Channel Icons:**
- SMS icon
- Email icon
- RCS icon
- Push notification icon

**Filtering:**
- By channel: All / SMS / Email / RCS / Push
- Real-time filter update

**Storage:**
- Currently client-side state (localStorage in browser)
- Ready for backend API integration
- Template ID format: `tpl_{channel}_{timestamp}`

---

## UI/UX Design

### Styling
- **Orange Branding:**
  - Primary button color: #ff7900
  - Logo: Orange official SVG
  - Consistent with Boosted design system v5.3.7

- **Cards & Components:**
  - Shadow: `shadow-sm`
  - Border: `border-0`
  - Rounded: Bootstrap defaults
  - Responsive: Full Bootstrap grid system

### Navigation
Both pages accessible via sidebar in admin layout:
- `/admin/leads` → Leads icon
- `/admin/templates` → Document icon

---

## Data Models

### Lead Interface
```typescript
interface Lead {
  id: string;
  msisdn_masked: string;        // E.164 format, partially masked
  dormant_score: number;        // 0.0 to 1.0
  eligible: boolean;            // Can receive campaigns
  device_tier?: string;         // 'flagship', 'mid-range', 'budget'
  last_contact_at?: string;     // ISO 8601 timestamp
  contact_count: number;        // Total contacts sent
  converted: boolean;           // Completed purchase
  converted_at?: string;        // ISO 8601 timestamp
  created_at: string;           // ISO 8601 timestamp
}
```

### Template Interface
```typescript
interface Template {
  id: string;
  name: string;
  channel: 'sms' | 'email' | 'rcs' | 'push';
  subject?: string;             // Email only
  content: string;              // Base content
  variants: {
    a: string;                  // Required
    b?: string;                 // A/B test variant
    c?: string;                 // A/B test variant
    d?: string;                 // A/B test variant
  };
  placeholders: string[];       // Available: {url}, {prenom}, {price}
  usage_count: number;          // Campaign usage count
  created_at: string;           // ISO 8601
  updated_at: string;           // ISO 8601
}
```

---

## API Endpoints Required

### For Leads Page
```
GET /dormant/leads
  Query params:
    - eligible: boolean (optional, for status filter)
    - converted: boolean (optional)
    - device_tier: string (optional, 'flagship' | 'mid-range' | 'budget')
    - search: string (optional, phone number substring)
    - page: number (default 1)
    - limit: number (default 50)
    - sort: string ('score-desc' | 'score-asc' | 'recent' | 'oldest')
  
  Response:
    {
      leads: Lead[],
      total: number,
      page: number,
      limit: number
    }
```

### For Templates Page
```
(Currently client-side only)

Future endpoints needed:
- GET /templates?channel=sms
- POST /templates
- PUT /templates/:id
- DELETE /templates/:id
```

---

## Integration with Existing Admin Layout

Both pages automatically inherit:
- Dark sidebar with Orange logo
- Navigation menu with active state
- Top header bar with notifications and "View Site" button
- Responsive layout (sidebar + main content area)
- User info section at bottom of sidebar

Sidebar navigation automatically updated in `apps/web/app/admin/layout.tsx`:
- Added `/admin/leads` link with people icon
- Added `/admin/templates` link with document icon

---

## Features & Capabilities

### Leads Page
✅ Search by phone number  
✅ Multi-level filtering (status, tier)  
✅ Sorting by dormancy score  
✅ Dormancy score visualization  
✅ Lead status badges  
✅ Contact history tracking  
✅ Conversion tracking  
✅ Pagination (50 per page)  
✅ Stats dashboard cards  
✅ Empty state handling  

### Templates Page
✅ CRUD operations (Create, Read, Update, Delete)  
✅ Pre-loaded with 3 templates  
✅ Multi-channel support (SMS, Email, RCS, Push)  
✅ A/B/C/D variant support  
✅ Template preview  
✅ Usage counting  
✅ Placeholder validation  
✅ Filter by channel  
✅ Modal form UI  
✅ Empty state handling  

---

## Code Quality

- **TypeScript:** Fully typed interfaces
- **React:** Client-side hooks (useState, useEffect)
- **Performance:** Memoized calculations, efficient re-renders
- **Accessibility:** Bootstrap accessibility classes
- **Responsive:** Mobile-friendly grid layouts
- **Styling:** Orange Design System (Boosted)

---

## Next Steps

### Backend Integration
1. Create `/dormant/leads` endpoint with filters
2. Create `/templates` CRUD endpoints
3. Connect front-end API calls to backend

### Enhancement Ideas
1. **Export functionality:** CSV download of leads
2. **Bulk actions:** Select multiple leads for campaigns
3. **Template versioning:** Track template change history
4. **Usage analytics:** Show which templates perform best
5. **Lead details modal:** Click lead → view full history, campaign interactions
6. **Template duplicator:** Clone templates quickly
7. **Real-time search:** Debounced API calls
8. **Saved filters:** Store frequently-used filter combinations

### Testing
- [ ] Manual testing in dev mode
- [ ] Verify pagination works with 1000+ leads
- [ ] Test filtering combinations
- [ ] Test template CRUD operations
- [ ] Mobile responsive testing

---

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| `apps/web/app/admin/leads/page.tsx` | 430 | Lead listing, filtering, search, pagination |
| `apps/web/app/admin/templates/page.tsx` | 380 | Template CRUD, variant management |
| Updated: `apps/web/app/admin/layout.tsx` | - | Added sidebar navigation links |

**Total Lines:** 810+

---

## Testing Checklist

### Manual Testing
- [ ] Navigate to `/admin/leads` → List displays
- [ ] Navigate to `/admin/templates` → 3 default templates show
- [ ] Search leads by phone
- [ ] Filter leads by status
- [ ] Filter leads by device tier
- [ ] Sort leads by score
- [ ] Paginate through leads
- [ ] Create new template
- [ ] Edit existing template
- [ ] Delete template with confirmation
- [ ] Filter templates by channel
- [ ] Check responsive on mobile

### Browser DevTools
- [ ] No console errors
- [ ] No console warnings
- [ ] CSS loads correctly
- [ ] Images load correctly
- [ ] Icons render properly

---

## Related Tasks

- **DD-09:** Nudge SMS Service Implementation ✅ COMPLETE
- **DD-08:** Campaign Management Backend & Frontend ✅ COMPLETE
- **DD-10:** Handover Options (Colissimo & QR Code) ⏳ PENDING

---

## Status

**Created:** 22 octobre 2025  
**Component Status:** ✅ COMPLETE  
**TypeScript Check:** ✅ PASS  
**ESLint Check:** ✅ PASS  
**Integration:** ✅ READY  

Ready for user testing and backend API integration.
