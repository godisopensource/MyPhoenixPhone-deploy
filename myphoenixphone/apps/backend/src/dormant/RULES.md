# Dormant Device Detection Rules

## Product Context

The dormant device detection system identifies phones that are likely unused after a SIM swap, triggering contextual nudges for trade-in, donation, or recycling. This shifts from a "user-initiated eligibility test" to a "network-driven lead generation" approach.

## Core Signal: "Dormant Probable"

A device is considered **dormant probable** when:

1. **SIM swap confirmed**: A SIM swap event has occurred on the line
2. **Old device unreachable**: The previous device shows no network connectivity (voice/data/SMS)
3. **Sufficient time elapsed**: At least 72 hours have passed since the swap (to avoid false positives during migration/backup periods)
4. **Consumer line**: Line type is "consumer" (not business or M2M)
5. **No fraud flags**: Line is not flagged for suspicious SIM-swap activity

## Activation Rules

### Eligibility Criteria (ALL must be true)

- `sim_swap.occurred = true`
- `old_device_reachability.reachable = false` for ≥ 72 hours
- `line_type = "consumer"`
- `fraud_flag = false`
- `metadata.opt_out = false` (or not set)
- Days since `metadata.last_contact_ts` ≥ 14 (if present)
- `metadata.swap_count_30d ≤ 2` (prevent abuse/churners)

### Activation Window

- **Optimal window**: Days 3–14 after SIM swap
- **Rationale**: 
  - Before day 3: User may still be migrating data, backing up, or testing new device
  - After day 14: Context fades; user has settled into new device routine
  - This window maximizes relevance and conversion rates

### Lead Expiration

- **TTL**: 30 days from lead creation
- **Rationale**: GDPR minimization; reduces storage; forces timely action

## Exclusion Rules

A lead is **excluded** (not eligible for nudge) if ANY of the following apply:

| Exclusion Reason | Condition | Rationale |
|-----------------|-----------|-----------|
| `too_soon_after_swap` | Days since swap < 3 | Avoid interrupting migration/backup window |
| `business_line` | `line_type = "business"` | Different decision-makers; separate program |
| `m2m_line` | `line_type = "m2m"` | Not consumer devices |
| `fraud_flag` | `fraud_flag = true` | Protect against SIM-swap fraud victims |
| `opt_out` | `metadata.opt_out = true` | Legal requirement; user preference |
| `recently_contacted` | Days since last contact < 14 | Prevent fatigue; respect cooldown |
| `multiple_swaps_detected` | `swap_count_30d > 2` | Anomaly; potential abuse or reseller |
| `device_still_reachable` | `old_device_reachability.reachable = true` | No evidence of dormancy |
| `no_swap_detected` | `sim_swap.occurred = false` | Core signal missing |

## Scoring Algorithm

The `dormant_score` (0–1) is calculated as a weighted combination:

```
dormant_score = 
  0.40 × swap_signal +
  0.35 × unreachability_signal +
  0.15 × time_window_signal +
  0.10 × history_signal

Where:
- swap_signal = 1 if swap occurred, else 0
- unreachability_signal = min(days_unreachable / 7, 1.0)
- time_window_signal = 1 if 3 ≤ days_since_swap ≤ 14, else max(0, 1 - abs(days_since_swap - 8.5) / 5.5)
- history_signal = max(0, 1 - swap_count_30d / 3)
```

**Score interpretation**:
- ≥ 0.75: High confidence dormant → priority nudge
- 0.50–0.74: Medium confidence → standard nudge
- < 0.50: Low confidence → hold or exclude

## Next Action Logic

```
IF eligible = false:
  next_action = "exclude"
ELSE IF days_since_swap < 3:
  next_action = "hold"
ELSE IF days_since_swap > 14:
  next_action = "expired"
ELSE:
  next_action = "send_nudge"
```

## Contact Cadence

- **Initial nudge**: As soon as eligible (day 3+)
- **Follow-up**: One reminder at day 7 if no click/response
- **Maximum contacts**: 2 per lead lifecycle
- **Cooldown between campaigns**: 14 days minimum

## Fraud Protection

To avoid targeting SIM-swap fraud victims:

1. **External fraud flag**: Respect `fraud_flag` from upstream systems
2. **Multiple swaps**: Exclude if >2 swaps in 30 days (anomaly detection)
3. **Delay activation**: 72-hour minimum delay reduces false positives
4. **Manual review queue**: Leads with `swap_count_30d = 2` flagged for optional human review

## Privacy & GDPR Compliance

- **No raw MSISDN**: Only hashed identifiers stored in network events and leads
- **Retention**: Leads expire after 30 days; purge job runs daily
- **Consent**: Explicit consent captured on landing before IMEI/model submission
- **Opt-out**: Honored immediately; propagated to exclusion checks
- **Data minimization**: Only essential fields stored; no browsing/location history

## Feature Flags

The following flags control behavior:

- `ENABLE_DORMANT_DETECTION`: Master switch (default: `false` until pilot)
- `MIN_DAYS_AFTER_SWAP`: Minimum days to wait (default: `3`)
- `MAX_ACTIVATION_WINDOW_DAYS`: Maximum activation window (default: `14`)
- `LEAD_TTL_DAYS`: Lead expiration in days (default: `30`)
- `MAX_SWAPS_30D_THRESHOLD`: Max swaps before exclusion (default: `2`)
- `ENABLE_FOLLOWUP_NUDGE`: Allow day-7 follow-up (default: `true`)
- `FRAUD_DETECTION_STRICT`: Use stricter fraud heuristics (default: `false`)

## Validation & Testing

**Unit tests must verify**:
- Rule evaluation for all combinations of signals
- Score calculation matches formula
- Exclusion logic correctly filters ineligible leads
- Idempotency: same event → same lead_id (within TTL)

**Integration tests must verify**:
- Event ingestion → lead creation pipeline
- TTL purge job removes expired leads
- Opt-out propagation blocks nudge sending

**E2E tests must verify**:
- Mock event → stored lead → nudge sent → landing accessed → estimate requested
- Exclusion scenarios (fraud, opt-out, business line) prevent nudge

## Metrics & KPIs

**Lead generation metrics**:
- `leads_created_total` (by eligibility status)
- `dormant_score_histogram` (distribution)
- `exclusion_reasons_total` (by reason)

**Conversion metrics** (tracked in analytics module):
- Click-through rate (CTR): nudge sent → landing accessed
- Estimation rate: landing → estimate requested
- Handover rate: estimate → trade-in/donation initiated
- Donation fallback rate: users choosing donate over sell

## References

- Event schema: `dormant-event.schema.json`
- Lead schema: `lead-output.schema.json`
- Implementation: `dormant-detector.service.ts` (to be created in DD-03)
