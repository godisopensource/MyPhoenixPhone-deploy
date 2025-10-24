// Test fixtures for dormant device detection schemas
// Use these for unit tests and integration tests

export const validDormantEvents = [
  {
    name: 'Eligible dormant device - recent swap',
    event: {
      msisdn_hash:
        '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      sim_swap: {
        occurred: true,
        ts: '2025-10-19T10:15:00Z',
      },
      old_device_reachability: {
        reachable: false,
        checked_ts: '2025-10-22T11:00:00Z',
        last_activity_ts: '2025-10-19T09:30:00Z',
      },
      line_type: 'consumer',
      fraud_flag: false,
      metadata: {
        swap_count_30d: 1,
        opt_out: false,
        last_contact_ts: '2025-09-01T12:00:00Z',
      },
    },
    expected: {
      eligible: true,
      dormant_score: { min: 0.75, max: 1.0 },
      next_action: 'send_nudge',
      exclusions: [],
    },
  },
  {
    name: 'Excluded - too soon after swap',
    event: {
      msisdn_hash:
        '6f995909eb39158262e1f67a9ed7382884714e1e7dbccd73c22fg832e2653e9',
      sim_swap: {
        occurred: true,
        ts: '2025-10-21T18:00:00Z', // Only ~1 day ago
      },
      old_device_reachability: {
        reachable: false,
        checked_ts: '2025-10-22T11:00:00Z',
      },
      line_type: 'consumer',
      fraud_flag: false,
      metadata: {
        swap_count_30d: 1,
        opt_out: false,
      },
    },
    expected: {
      eligible: false,
      next_action: 'hold',
      exclusions: ['too_soon_after_swap'],
    },
  },
  {
    name: 'Excluded - business line',
    event: {
      msisdn_hash:
        'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd',
      sim_swap: {
        occurred: true,
        ts: '2025-10-15T10:00:00Z',
      },
      old_device_reachability: {
        reachable: false,
        checked_ts: '2025-10-22T11:00:00Z',
      },
      line_type: 'business',
      fraud_flag: false,
    },
    expected: {
      eligible: false,
      next_action: 'exclude',
      exclusions: ['business_line'],
    },
  },
  {
    name: 'Excluded - fraud flag',
    event: {
      msisdn_hash:
        'b2c3d4e5f67890123456789012345678901234567890123456789012345bcde',
      sim_swap: {
        occurred: true,
        ts: '2025-10-19T10:00:00Z',
      },
      old_device_reachability: {
        reachable: false,
        checked_ts: '2025-10-22T11:00:00Z',
      },
      line_type: 'consumer',
      fraud_flag: true, // Fraud detected
    },
    expected: {
      eligible: false,
      next_action: 'exclude',
      exclusions: ['fraud_flag'],
    },
  },
  {
    name: 'Excluded - multiple swaps (potential abuse)',
    event: {
      msisdn_hash:
        'c3d4e5f678901234567890123456789012345678901234567890123456cdef',
      sim_swap: {
        occurred: true,
        ts: '2025-10-19T10:00:00Z',
      },
      old_device_reachability: {
        reachable: false,
        checked_ts: '2025-10-22T11:00:00Z',
      },
      line_type: 'consumer',
      fraud_flag: false,
      metadata: {
        swap_count_30d: 4, // Too many swaps
        opt_out: false,
      },
    },
    expected: {
      eligible: false,
      next_action: 'exclude',
      exclusions: ['multiple_swaps_detected'],
    },
  },
  {
    name: 'Excluded - user opted out',
    event: {
      msisdn_hash:
        'd4e5f6789012345678901234567890123456789012345678901234567def0',
      sim_swap: {
        occurred: true,
        ts: '2025-10-18T10:00:00Z',
      },
      old_device_reachability: {
        reachable: false,
        checked_ts: '2025-10-22T11:00:00Z',
      },
      line_type: 'consumer',
      fraud_flag: false,
      metadata: {
        swap_count_30d: 1,
        opt_out: true, // User explicitly opted out
      },
    },
    expected: {
      eligible: false,
      next_action: 'exclude',
      exclusions: ['opt_out'],
    },
  },
  {
    name: 'Excluded - device still reachable',
    event: {
      msisdn_hash:
        'e5f67890123456789012345678901234567890123456789012345678ef01',
      sim_swap: {
        occurred: true,
        ts: '2025-10-18T10:00:00Z',
      },
      old_device_reachability: {
        reachable: true, // Device is still active
        checked_ts: '2025-10-22T11:00:00Z',
      },
      line_type: 'consumer',
      fraud_flag: false,
    },
    expected: {
      eligible: false,
      next_action: 'exclude',
      exclusions: ['device_still_reachable'],
    },
  },
  {
    name: 'Excluded - recently contacted',
    event: {
      msisdn_hash:
        'f6789012345678901234567890123456789012345678901234567890f012',
      sim_swap: {
        occurred: true,
        ts: '2025-10-18T10:00:00Z',
      },
      old_device_reachability: {
        reachable: false,
        checked_ts: '2025-10-22T11:00:00Z',
      },
      line_type: 'consumer',
      fraud_flag: false,
      metadata: {
        swap_count_30d: 1,
        opt_out: false,
        last_contact_ts: '2025-10-15T10:00:00Z', // Only 7 days ago
      },
    },
    expected: {
      eligible: false,
      next_action: 'exclude',
      exclusions: ['recently_contacted'],
    },
  },
  {
    name: 'Edge case - optimal window end (day 14)',
    event: {
      msisdn_hash:
        '789012345678901234567890123456789012345678901234567890120123',
      sim_swap: {
        occurred: true,
        ts: '2025-10-08T10:00:00Z', // 14 days ago
      },
      old_device_reachability: {
        reachable: false,
        checked_ts: '2025-10-22T11:00:00Z',
      },
      line_type: 'consumer',
      fraud_flag: false,
      metadata: {
        swap_count_30d: 1,
        opt_out: false,
      },
    },
    expected: {
      eligible: true,
      dormant_score: { min: 0.7, max: 0.9 },
      next_action: 'send_nudge',
      exclusions: [],
    },
  },
  {
    name: 'Edge case - just past optimal window (day 15)',
    event: {
      msisdn_hash:
        '890123456789012345678901234567890123456789012345678901201234',
      sim_swap: {
        occurred: true,
        ts: '2025-10-07T10:00:00Z', // 15 days ago
      },
      old_device_reachability: {
        reachable: false,
        checked_ts: '2025-10-22T11:00:00Z',
      },
      line_type: 'consumer',
      fraud_flag: false,
      metadata: {
        swap_count_30d: 1,
        opt_out: false,
      },
    },
    expected: {
      eligible: true,
      dormant_score: { min: 0.5, max: 0.75 },
      next_action: 'expired', // Or send_nudge with lower priority
      exclusions: [],
    },
  },
];

export const validLeadOutputs = [
  {
    name: 'High confidence eligible lead',
    lead: {
      lead_id: '550e8400-e29b-41d4-a716-446655440000',
      msisdn_hash:
        '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      dormant_score: 0.82,
      eligible: true,
      activation_window_days: 11,
      next_action: 'send_nudge',
      exclusions: [],
      signals: {
        days_since_swap: 3.5,
        days_unreachable: 3.2,
        swap_count_30d: 1,
      },
      created_at: '2025-10-22T12:00:00Z',
      expires_at: '2025-11-21T12:00:00Z',
    },
  },
  {
    name: 'Medium confidence eligible lead',
    lead: {
      lead_id: '660e9511-f39c-52e5-b827-557766551111',
      msisdn_hash:
        '6f995909eb39158262e1f67a9ed7382884714e1e7dbccd73c22fg832e2653e9',
      dormant_score: 0.65,
      eligible: true,
      activation_window_days: 7,
      next_action: 'send_nudge',
      exclusions: [],
      signals: {
        days_since_swap: 7.0,
        days_unreachable: 6.8,
        swap_count_30d: 1,
      },
      created_at: '2025-10-22T12:00:00Z',
      expires_at: '2025-11-21T12:00:00Z',
    },
  },
  {
    name: 'Excluded lead - fraud flag',
    lead: {
      lead_id: '770f0622-g49d-63f6-c938-668877662222',
      msisdn_hash:
        'b2c3d4e5f67890123456789012345678901234567890123456789012345bcde',
      dormant_score: 0.0,
      eligible: false,
      activation_window_days: 0,
      next_action: 'exclude',
      exclusions: ['fraud_flag'],
      signals: {
        days_since_swap: 3.0,
        days_unreachable: 3.0,
        swap_count_30d: 1,
      },
      created_at: '2025-10-22T12:00:00Z',
      expires_at: '2025-11-21T12:00:00Z',
    },
  },
  {
    name: 'Hold state - too soon',
    lead: {
      lead_id: '880g1733-h50e-74g7-d049-779988773333',
      msisdn_hash:
        '6f995909eb39158262e1f67a9ed7382884714e1e7dbccd73c22fg832e2653e9',
      dormant_score: 0.45,
      eligible: false,
      activation_window_days: 0,
      next_action: 'hold',
      exclusions: ['too_soon_after_swap'],
      signals: {
        days_since_swap: 1.2,
        days_unreachable: 1.0,
        swap_count_30d: 1,
      },
      created_at: '2025-10-22T12:00:00Z',
      expires_at: '2025-11-21T12:00:00Z',
    },
  },
];

export const invalidDormantEvents = [
  {
    name: 'Missing required field - msisdn_hash',
    event: {
      // msisdn_hash is missing
      sim_swap: {
        occurred: true,
        ts: '2025-10-19T10:15:00Z',
      },
      old_device_reachability: {
        reachable: false,
        checked_ts: '2025-10-22T11:00:00Z',
      },
      line_type: 'consumer',
      fraud_flag: false,
    },
    expectedError: 'msisdn_hash is required',
  },
  {
    name: 'Invalid msisdn_hash format',
    event: {
      msisdn_hash: 'not-a-valid-hash', // Should be 64 hex chars
      sim_swap: {
        occurred: true,
        ts: '2025-10-19T10:15:00Z',
      },
      old_device_reachability: {
        reachable: false,
        checked_ts: '2025-10-22T11:00:00Z',
      },
      line_type: 'consumer',
      fraud_flag: false,
    },
    expectedError: 'msisdn_hash must match pattern',
  },
  {
    name: 'Invalid line_type',
    event: {
      msisdn_hash:
        '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      sim_swap: {
        occurred: true,
        ts: '2025-10-19T10:15:00Z',
      },
      old_device_reachability: {
        reachable: false,
        checked_ts: '2025-10-22T11:00:00Z',
      },
      line_type: 'invalid_type', // Must be consumer|business|m2m
      fraud_flag: false,
    },
    expectedError: 'line_type must be one of [consumer, business, m2m]',
  },
  {
    name: 'Invalid date format',
    event: {
      msisdn_hash:
        '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      sim_swap: {
        occurred: true,
        ts: '2025-10-19', // Missing time component
      },
      old_device_reachability: {
        reachable: false,
        checked_ts: '2025-10-22T11:00:00Z',
      },
      line_type: 'consumer',
      fraud_flag: false,
    },
    expectedError: 'ts must be ISO 8601 date-time',
  },
];

export const invalidLeadOutputs = [
  {
    name: 'dormant_score out of range',
    lead: {
      lead_id: '550e8400-e29b-41d4-a716-446655440000',
      msisdn_hash:
        '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      dormant_score: 1.5, // Must be 0-1
      eligible: true,
      activation_window_days: 14,
      next_action: 'send_nudge',
    },
    expectedError: 'dormant_score must be between 0 and 1',
  },
  {
    name: 'Invalid next_action',
    lead: {
      lead_id: '550e8400-e29b-41d4-a716-446655440000',
      msisdn_hash:
        '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      dormant_score: 0.8,
      eligible: true,
      activation_window_days: 14,
      next_action: 'invalid_action', // Must be enum value
    },
    expectedError:
      'next_action must be one of [send_nudge, hold, exclude, expired]',
  },
];

// Pricing mock fixtures for DD-07
export const pricingTiers = {
  0: { min: 0, max: 0, label: 'Non valorisable' },
  1: { min: 10, max: 30, label: 'Valeur faible' },
  2: { min: 30, max: 70, label: 'Valeur moyenne' },
  3: { min: 70, max: 150, label: 'Bonne valeur' },
  4: { min: 150, max: 300, label: 'Haute valeur' },
  5: { min: 300, max: 600, label: 'Très haute valeur' },
};

export const conditionMultipliers = {
  perfect: 1.0, // Like new, no damage
  good: 0.75, // Minor scratches, works perfectly
  fair: 0.5, // Visible wear, all functions work
  poor: 0.25, // Screen/battery issues, but powers on
  broken: 0.0, // Does not power on or major damage
};

// Mock estimate calculation
export function calculateMockEstimate(
  phone: { avg_price_tier: number },
  condition: {
    screen: 'perfect' | 'scratches' | 'broken';
    battery: 'excellent' | 'good' | 'fair';
    damage: string[];
    unlocked: boolean;
  },
): number {
  const tier = pricingTiers[phone.avg_price_tier];
  if (!tier) return 0;

  const basePrice = (tier.min + tier.max) / 2;

  // Apply condition multipliers
  let multiplier = 1.0;

  if (condition.screen === 'broken') {
    multiplier = 0.0; // No value if screen broken
  } else if (condition.screen === 'scratches') {
    multiplier *= 0.85;
  }

  if (condition.battery === 'fair') {
    multiplier *= 0.9;
  } else if (condition.battery === 'good') {
    multiplier *= 0.95;
  }

  if (condition.damage?.includes('water')) {
    multiplier = 0.0; // No value if water damage
  } else if (condition.damage?.length > 0) {
    multiplier *= 0.8;
  }

  if (!condition.unlocked) {
    multiplier *= 0.9; // 10% reduction if carrier-locked
  }

  return Math.round(basePrice * multiplier);
}
