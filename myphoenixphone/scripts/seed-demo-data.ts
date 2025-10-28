#!/usr/bin/env tsx
/**
 * Demo Data Seed Script
 * 
 * This script generates a comprehensive set of test data for demonstrating
 * MyPhoenixPhone's functionality. It creates various scenarios to showcase
 * all major features.
 * 
 * Usage:
 *   npm run seed:demo
 * 
 * Or directly:
 *   npx tsx scripts/seed-demo-data.ts
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Utility to hash phone numbers (SHA-256)
function hashMsisdn(msisdn: string): string {
  return crypto.createHash('sha256').update(msisdn).digest('hex');
}

// Generate dates for various scenarios
const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

// Test phone numbers (French mobile format)
const TEST_NUMBERS = {
  // Scenario 1: High-value dormant device (PERFECT CANDIDATE)
  PERFECT_CANDIDATE: '+33699901001',
  
  // Scenario 2: Recent SIM swap (potentially abandoned device)
  RECENT_SIM_SWAP: '+33699901002',
  
  // Scenario 3: Old SIM swap but unreachable
  OLD_SWAP_UNREACHABLE: '+33699901003',
  
  // Scenario 4: Active user (not eligible)
  ACTIVE_USER: '+33699901004',
  
  // Scenario 5: User with consent already given
  WITH_CONSENT: '+33699901005',
  
  // Scenario 6: User who completed verification
  VERIFIED_USER: '+33699901006',
  
  // Scenario 7: User with pricing estimate
  WITH_PRICING: '+33699901007',
  
  // Scenario 8: User who chose handover method
  WITH_HANDOVER: '+33699901008',
  
  // Scenario 9: User who opted out
  OPTED_OUT: '+33699901009',
  
  // Scenario 10: Lead in campaign (received nudge)
  IN_CAMPAIGN: '+33699901010',
  
  // Scenario 11: Lead with multiple contact attempts
  MULTI_CONTACT: '+33699901011',
  
  // Scenario 12: High-value iPhone (premium device)
  PREMIUM_IPHONE: '+33699901012',
  
  // Scenario 13: Low-value old Android
  OLD_ANDROID: '+33699901013',
  
  // Scenario 14: User in high-value cohort
  HIGH_VALUE_COHORT: '+33699901014',
  
  // Scenario 15: Rate limit test user
  RATE_LIMIT_TEST: '+33699901015',
  
  // Scenario 16: Network error simulation
  NETWORK_ERROR: '+33699901016',
  
  // Scenario 17: SIM swap yesterday (fresh signal)
  SWAP_YESTERDAY: '+33699901017',
  
  // Scenario 18: Reachable but no SIM swap data
  REACHABLE_NO_SWAP: '+33699901018',
  
  // Scenario 19: Multiple interactions across channels
  MULTI_CHANNEL: '+33699901019',
  
  // Scenario 20: User about to expire (TTL test)
  EXPIRING_SOON: '+33699901020',
};

async function seedDemoData() {
  console.log('Seeding demo data for MyPhoenixPhone...\n');

  try {
    // Clean existing demo data
    console.log('Cleaning existing demo data...');
    await prisma.contactAttempt.deleteMany({
      where: { lead: { msisdn_hash: { in: Object.values(TEST_NUMBERS).map(hashMsisdn) } } }
    });
    await prisma.lead.deleteMany({
      where: { msisdn_hash: { in: Object.values(TEST_NUMBERS).map(hashMsisdn) } }
    });
    await prisma.cohortMember.deleteMany({
      where: { msisdn_hash: { in: Object.values(TEST_NUMBERS).map(hashMsisdn) } }
    });
    await prisma.optOut.deleteMany({
      where: { msisdn_hash: { in: Object.values(TEST_NUMBERS).map(hashMsisdn) } }
    });
    await prisma.eligibilitySignal.deleteMany({
      where: { msisdn_hash: { in: Object.values(TEST_NUMBERS).map(hashMsisdn) } }
    });
    await prisma.consent.deleteMany({
      where: { msisdn_hash: { in: Object.values(TEST_NUMBERS).map(hashMsisdn) } }
    });
    await prisma.interaction.deleteMany({
      where: { msisdn_hash: { in: Object.values(TEST_NUMBERS).map(hashMsisdn) } }
    });
    await prisma.networkEvent.deleteMany({
      where: { msisdn_hash: { in: Object.values(TEST_NUMBERS).map(hashMsisdn) } }
    });

    console.log('Cleanup complete\n');

    // Scenario 1: Perfect candidate - High-value dormant device
    console.log('Scenario 1: Perfect Candidate (High-value dormant)');
    const perfectHash = hashMsisdn(TEST_NUMBERS.PERFECT_CANDIDATE);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: perfectHash,
        sim_swapped_at: daysAgo(28), // SIM swap 28 days ago - within eligibility window
        reachable: false, // Device unreachable
      },
    });
    await prisma.lead.create({
      data: {
        msisdn_hash: perfectHash,
        dormant_score: 0.95,
        eligible: true,
        activation_window_days: 90,
        next_action: 'send_nudge',
        exclusions: [],
        signals: {
          simSwap: { detected: true, daysAgo: 28 },
          reachability: { status: 'unreachable' },
          dormantIndicators: ['no_network_activity', 'sim_swap_recent'],
        },
        device_model: 'iPhone 13 Pro Max',
        device_condition: { screen: 'excellent', battery: 'good', functionality: 'perfect' },
        estimated_value: 450.00,
        created_at: daysAgo(28),
        expires_at: daysFromNow(62),
      },
    });

    // Scenario 2: Recent SIM swap
    console.log('Scenario 2: Recent SIM Swap (Potential abandonment)');
    const recentSwapHash = hashMsisdn(TEST_NUMBERS.RECENT_SIM_SWAP);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: recentSwapHash,
        sim_swapped_at: daysAgo(7), // SIM swap 7 days ago
        reachable: false,
      },
    });
    await prisma.lead.create({
      data: {
        msisdn_hash: recentSwapHash,
        dormant_score: 0.75,
        eligible: true,
        activation_window_days: 60,
        next_action: 'hold', // Hold because swap is recent
        exclusions: [],
        signals: {
          simSwap: { detected: true, daysAgo: 7 },
          reachability: { status: 'unreachable' },
        },
        device_model: 'Samsung Galaxy S22',
        estimated_value: 320.00,
        created_at: daysAgo(7),
        expires_at: daysFromNow(53),
      },
    });

    // Scenario 3: Old swap but unreachable
    console.log('Scenario 3: Old SIM Swap + Unreachable');
    const oldSwapHash = hashMsisdn(TEST_NUMBERS.OLD_SWAP_UNREACHABLE);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: oldSwapHash,
        sim_swapped_at: daysAgo(120),
        reachable: false,
      },
    });
    await prisma.lead.create({
      data: {
        msisdn_hash: oldSwapHash,
        dormant_score: 0.88,
        eligible: true,
        activation_window_days: 90,
        next_action: 'send_nudge',
        exclusions: [],
        signals: {
          simSwap: { detected: true, daysAgo: 120 },
          reachability: { status: 'unreachable' },
        },
        device_model: 'iPhone 12',
        estimated_value: 380.00,
        created_at: daysAgo(120),
        expires_at: daysFromNow(0), // About to expire!
      },
    });

    // Scenario 4: Active user (NOT eligible)
    console.log('Scenario 4: Active User (Not eligible)');
    const activeHash = hashMsisdn(TEST_NUMBERS.ACTIVE_USER);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: activeHash,
        sim_swapped_at: null, // No SIM swap
        reachable: true, // Device reachable
      },
    });
    await prisma.lead.create({
      data: {
        msisdn_hash: activeHash,
        dormant_score: 0.15,
        eligible: false,
        activation_window_days: 0,
        next_action: 'exclude',
        exclusions: ['device_active', 'no_dormant_signals'],
        signals: {
          simSwap: { detected: false },
          reachability: { status: 'reachable', connectivity: ['4G'] },
        },
        created_at: daysAgo(1),
        expires_at: daysFromNow(29),
      },
    });

    // Scenario 5: User with consent
    console.log('Scenario 5: User with Consent Given');
    const consentHash = hashMsisdn(TEST_NUMBERS.WITH_CONSENT);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: consentHash,
        sim_swapped_at: daysAgo(30),
        reachable: false,
      },
    });
    await prisma.consent.create({
      data: {
        msisdn_hash: consentHash,
        scopes: ['sim-swap', 'device-location', 'device-status'],
        proof: {
          accessToken: 'demo_access_token_abc123',
          tokenType: 'Bearer',
          expiresIn: 3600,
          scope: 'sim-swap device-location device-status',
          consentedAt: hoursAgo(2).toISOString(),
        },
        created_at: hoursAgo(2),
      },
    });
    await prisma.lead.create({
      data: {
        msisdn_hash: consentHash,
        dormant_score: 0.82,
        eligible: true,
        activation_window_days: 90,
        next_action: 'send_nudge',
        exclusions: [],
        signals: {
          simSwap: { detected: true, daysAgo: 30 },
          reachability: { status: 'unreachable' },
          consent: { given: true, scopes: ['sim-swap', 'device-location', 'device-status'] },
        },
        device_model: 'Google Pixel 7',
        estimated_value: 340.00,
        created_at: daysAgo(30),
        expires_at: daysFromNow(60),
      },
    });

    // Scenario 6: Verified user (SMS code verified)
    console.log('Scenario 6: Verified User (SMS completed)');
    const verifiedHash = hashMsisdn(TEST_NUMBERS.VERIFIED_USER);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: verifiedHash,
        sim_swapped_at: daysAgo(25),
        reachable: false,
      },
    });
    await prisma.interaction.create({
      data: {
        msisdn_hash: verifiedHash,
        channel: 'sms',
        template_id: 'verification_code',
        meta: { code: '123456', verified: true, verifiedAt: hoursAgo(1).toISOString() },
      },
    });
    await prisma.lead.create({
      data: {
        msisdn_hash: verifiedHash,
        dormant_score: 0.79,
        eligible: true,
        activation_window_days: 90,
        next_action: 'send_nudge',
        exclusions: [],
        signals: {
          simSwap: { detected: true, daysAgo: 25 },
          reachability: { status: 'unreachable' },
          verification: { completed: true },
        },
        device_model: 'OnePlus 9 Pro',
        estimated_value: 290.00,
        contact_count: 1,
        last_contact_at: hoursAgo(1),
        created_at: daysAgo(25),
        expires_at: daysFromNow(65),
      },
    });

    // Scenario 7: User with pricing estimate
    console.log('Scenario 7: User with Pricing Estimate');
    const pricingHash = hashMsisdn(TEST_NUMBERS.WITH_PRICING);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: pricingHash,
        sim_swapped_at: daysAgo(50),
        reachable: false,
      },
    });
    const pricingLead = await prisma.lead.create({
      data: {
        msisdn_hash: pricingHash,
        dormant_score: 0.91,
        eligible: true,
        activation_window_days: 90,
        next_action: 'send_nudge',
        exclusions: [],
        signals: {
          simSwap: { detected: true, daysAgo: 50 },
          reachability: { status: 'unreachable' },
        },
        device_model: 'iPhone 14 Pro',
        device_imei: null, // Cleared after estimation
        device_condition: { 
          screen: 'excellent', 
          battery: 'good', 
          functionality: 'perfect',
          cosmetic: 'minor_scratches'
        },
        imei_consent_at: hoursAgo(3),
        estimated_value: 680.00,
        contact_count: 2,
        last_contact_at: hoursAgo(3),
        created_at: daysAgo(50),
        expires_at: daysFromNow(40),
      },
    });

    // Scenario 8: User who chose handover method
    console.log('Scenario 8: User with Handover Choice');
    const handoverHash = hashMsisdn(TEST_NUMBERS.WITH_HANDOVER);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: handoverHash,
        sim_swapped_at: daysAgo(60),
        reachable: false,
      },
    });
    await prisma.lead.create({
      data: {
        msisdn_hash: handoverHash,
        dormant_score: 0.93,
        eligible: true,
        activation_window_days: 90,
        next_action: 'hold', // Waiting for handover completion
        exclusions: [],
        signals: {
          simSwap: { detected: true, daysAgo: 60 },
          reachability: { status: 'unreachable' },
        },
        device_model: 'Samsung Galaxy S23 Ultra',
        device_condition: { screen: 'excellent', battery: 'excellent', functionality: 'perfect' },
        estimated_value: 750.00,
        handover_choice: 'ship',
        converted_at: hoursAgo(12), // Converted 12 hours ago
        contact_count: 3,
        last_contact_at: hoursAgo(12),
        created_at: daysAgo(60),
        expires_at: daysFromNow(30),
      },
    });

    // Scenario 9: Opted-out user
    console.log('Scenario 9: Opted-Out User');
    const optedOutHash = hashMsisdn(TEST_NUMBERS.OPTED_OUT);
    await prisma.optOut.create({
      data: {
        msisdn_hash: optedOutHash,
        reason: 'not_interested',
        created_at: daysAgo(5),
      },
    });
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: optedOutHash,
        sim_swapped_at: daysAgo(40),
        reachable: false,
      },
    });

    // Scenario 10: Lead in campaign
    console.log('Scenario 10: Lead in Active Campaign');
    const campaignHash = hashMsisdn(TEST_NUMBERS.IN_CAMPAIGN);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: campaignHash,
        sim_swapped_at: daysAgo(35),
        reachable: false,
      },
    });
    const campaignLead = await prisma.lead.create({
      data: {
        msisdn_hash: campaignHash,
        dormant_score: 0.86,
        eligible: true,
        activation_window_days: 90,
        next_action: 'send_nudge',
        exclusions: [],
        signals: {
          simSwap: { detected: true, daysAgo: 35 },
          reachability: { status: 'unreachable' },
        },
        device_model: 'iPhone 11',
        estimated_value: 280.00,
        contact_count: 1,
        last_contact_at: daysAgo(2),
        created_at: daysAgo(35),
        expires_at: daysFromNow(55),
      },
    });
    await prisma.contactAttempt.create({
      data: {
        lead_id: campaignLead.id,
        channel: 'sms',
        template_variant: 'A',
        status: 'delivered',
        created_at: daysAgo(2),
      },
    });

    // Scenario 11: Multiple contact attempts
    console.log('Scenario 11: Lead with Multiple Contacts');
    const multiContactHash = hashMsisdn(TEST_NUMBERS.MULTI_CONTACT);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: multiContactHash,
        sim_swapped_at: daysAgo(55),
        reachable: false,
      },
    });
    const multiContactLead = await prisma.lead.create({
      data: {
        msisdn_hash: multiContactHash,
        dormant_score: 0.89,
        eligible: true,
        activation_window_days: 90,
        next_action: 'send_nudge',
        exclusions: [],
        signals: {
          simSwap: { detected: true, daysAgo: 55 },
          reachability: { status: 'unreachable' },
        },
        device_model: 'Xiaomi Mi 11',
        estimated_value: 260.00,
        contact_count: 4,
        last_contact_at: daysAgo(1),
        created_at: daysAgo(55),
        expires_at: daysFromNow(35),
      },
    });
    await prisma.contactAttempt.createMany({
      data: [
        {
          lead_id: multiContactLead.id,
          channel: 'sms',
          template_variant: 'A',
          status: 'delivered',
          created_at: daysAgo(10),
        },
        {
          lead_id: multiContactLead.id,
          channel: 'sms',
          template_variant: 'B',
          status: 'delivered',
          created_at: daysAgo(5),
        },
        {
          lead_id: multiContactLead.id,
          channel: 'email',
          template_variant: 'C',
          status: 'delivered',
          created_at: daysAgo(3),
        },
        {
          lead_id: multiContactLead.id,
          channel: 'sms',
          template_variant: 'A',
          status: 'clicked',
          clicked_at: daysAgo(1),
          created_at: daysAgo(1),
        },
      ],
    });

    // Scenario 12: Premium iPhone
    console.log('Scenario 12: Premium iPhone (High Value)');
    const premiumHash = hashMsisdn(TEST_NUMBERS.PREMIUM_IPHONE);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: premiumHash,
        sim_swapped_at: daysAgo(20),
        reachable: false,
      },
    });
    await prisma.lead.create({
      data: {
        msisdn_hash: premiumHash,
        dormant_score: 0.84,
        eligible: true,
        activation_window_days: 90,
        next_action: 'send_nudge',
        exclusions: [],
        signals: {
          simSwap: { detected: true, daysAgo: 20 },
          reachability: { status: 'unreachable' },
          deviceValue: 'premium',
        },
        device_model: 'iPhone 15 Pro Max',
        device_condition: { screen: 'excellent', battery: 'excellent', functionality: 'perfect' },
        estimated_value: 950.00,
        created_at: daysAgo(20),
        expires_at: daysFromNow(70),
      },
    });

    // Scenario 13: Old low-value Android
    console.log('Scenario 13: Old Android (Low Value)');
    const oldAndroidHash = hashMsisdn(TEST_NUMBERS.OLD_ANDROID);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: oldAndroidHash,
        sim_swapped_at: daysAgo(180),
        reachable: false,
      },
    });
    await prisma.lead.create({
      data: {
        msisdn_hash: oldAndroidHash,
        dormant_score: 0.96,
        eligible: true,
        activation_window_days: 90,
        next_action: 'send_nudge',
        exclusions: [],
        signals: {
          simSwap: { detected: true, daysAgo: 180 },
          reachability: { status: 'unreachable' },
          deviceValue: 'low',
        },
        device_model: 'Samsung Galaxy A51',
        device_condition: { screen: 'good', battery: 'poor', functionality: 'functional' },
        estimated_value: 85.00,
        created_at: daysAgo(180),
        expires_at: daysFromNow(0), // Expired!
      },
    });

    // Scenario 14: High-value cohort member
    console.log('Scenario 14: High-Value Cohort Member');
    const cohortHash = hashMsisdn(TEST_NUMBERS.HIGH_VALUE_COHORT);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: cohortHash,
        sim_swapped_at: daysAgo(42),
        reachable: false,
      },
    });
    const cohortLead = await prisma.lead.create({
      data: {
        msisdn_hash: cohortHash,
        dormant_score: 0.92,
        eligible: true,
        activation_window_days: 90,
        next_action: 'send_nudge',
        exclusions: [],
        signals: {
          simSwap: { detected: true, daysAgo: 42 },
          reachability: { status: 'unreachable' },
          cohort: 'high_value',
        },
        device_model: 'iPhone 13',
        estimated_value: 520.00,
        created_at: daysAgo(42),
        expires_at: daysFromNow(48),
      },
    });

    // Create high-value cohort
    const highValueCohort = await prisma.cohort.upsert({
      where: { name: 'high_value' },
      update: {},
      create: {
        name: 'high_value',
        description: 'High-value devices (>400€ estimated value)',
        monetary_min: 400.00,
        dormant_score_min: 0.7,
        eligible_only: true,
        member_count: 1,
        avg_dormant_score: 0.92,
        avg_estimated_value: 520.00,
        last_refresh_at: now,
      },
    });

    await prisma.cohortMember.create({
      data: {
        cohort_id: highValueCohort.id,
        msisdn_hash: cohortHash,
        lead_id: cohortLead.id,
        recency: 42,
        frequency: 0,
        monetary: 520.00,
        dormant_score: 0.92,
      },
    });

    // Scenario 15-20: Quick scenarios for edge cases
    console.log('Scenarios 15-20: Edge Cases & Test Data');
    
    // Swap yesterday
    const swapYesterdayHash = hashMsisdn(TEST_NUMBERS.SWAP_YESTERDAY);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: swapYesterdayHash,
        sim_swapped_at: daysAgo(1),
        reachable: false,
      },
    });

    // Reachable but no swap data
    const reachableNoSwapHash = hashMsisdn(TEST_NUMBERS.REACHABLE_NO_SWAP);
    await prisma.eligibilitySignal.create({
      data: {
        msisdn_hash: reachableNoSwapHash,
        sim_swapped_at: null,
        reachable: true,
      },
    });

    // Multi-channel interactions
    const multiChannelHash = hashMsisdn(TEST_NUMBERS.MULTI_CHANNEL);
    await prisma.interaction.createMany({
      data: [
        { msisdn_hash: multiChannelHash, channel: 'sms', template_id: 'nudge_A', created_at: daysAgo(5) },
        { msisdn_hash: multiChannelHash, channel: 'email', template_id: 'nudge_B', created_at: daysAgo(3) },
        { msisdn_hash: multiChannelHash, channel: 'push', template_id: 'nudge_C', created_at: daysAgo(1) },
      ],
    });

    // Expiring soon
    const expiringSoonHash = hashMsisdn(TEST_NUMBERS.EXPIRING_SOON);
    await prisma.lead.create({
      data: {
        msisdn_hash: expiringSoonHash,
        dormant_score: 0.77,
        eligible: true,
        activation_window_days: 90,
        next_action: 'send_nudge',
        exclusions: [],
        signals: { simSwap: { detected: true, daysAgo: 89 } },
        device_model: 'Huawei P30',
        estimated_value: 180.00,
        created_at: daysAgo(89),
        expires_at: daysFromNow(1), // Expires in 1 day
      },
    });

    // Create demo campaigns
    console.log('\nCreating Demo Campaigns...');
    await prisma.campaign.createMany({
      data: [
        {
          name: 'High-Value Dormant Q4 2025',
          description: 'Target high-value devices for end-of-year campaign',
          target_filters: { dormant_score_min: 0.8, estimated_value_min: 400 },
          estimated_reach: 150,
          template_id: 'high_value_nudge',
          template_variant: 'A',
          channel: 'sms',
          status: 'completed',
          scheduled_at: daysAgo(10),
          sent_at: daysAgo(10),
          completed_at: daysAgo(9),
          total_sent: 145,
          total_delivered: 142,
          total_clicked: 38,
          total_converted: 12,
        },
        {
          name: 'Re-engagement Campaign',
          description: 'Re-engage users who clicked but did not convert',
          target_filters: { contact_count_min: 1, converted: false },
          estimated_reach: 200,
          template_id: 'reengagement_offer',
          template_variant: 'B',
          channel: 'email',
          status: 'sending',
          scheduled_at: daysAgo(1),
          sent_at: daysAgo(1),
          total_sent: 85,
          total_delivered: 82,
          total_clicked: 14,
          total_converted: 3,
        },
        {
          name: 'Premium iPhone Buyback',
          description: 'Special pricing for iPhone 13 and newer',
          target_filters: { device_model_like: 'iPhone%', estimated_value_min: 500 },
          estimated_reach: 50,
          template_id: 'premium_offer',
          channel: 'sms',
          status: 'scheduled',
          scheduled_at: daysFromNow(2),
        },
      ],
    });

    // Create worker runs
    console.log('Creating Worker Run History...');
    await prisma.workerRun.createMany({
      data: [
        {
          worker_type: 'daily_refresh',
          status: 'completed',
          started_at: daysAgo(1),
          completed_at: daysAgo(1),
          duration_ms: 45000,
          records_processed: 500,
          records_updated: 485,
          records_failed: 15,
          trigger: 'cron',
        },
        {
          worker_type: 'dormant_detection',
          status: 'completed',
          started_at: hoursAgo(6),
          completed_at: hoursAgo(6),
          duration_ms: 120000,
          records_processed: 1500,
          records_created: 85,
          records_updated: 420,
          records_failed: 3,
          trigger: 'cron',
        },
        {
          worker_type: 'cohort_builder',
          status: 'completed',
          started_at: hoursAgo(2),
          completed_at: hoursAgo(2),
          duration_ms: 8000,
          records_processed: 200,
          records_created: 45,
          trigger: 'manual',
          triggered_by: 'admin@myphoenixphone.com',
        },
      ],
    });

    console.log('\nDemo data seeding complete!\n');
    console.log('Summary:');
    console.log(`   - ${Object.keys(TEST_NUMBERS).length} test phone numbers created`);
    console.log('   - Eligibility signals for various scenarios');
    console.log('   - Leads in different lifecycle stages');
    console.log('   - Consent, verification, and pricing examples');
    console.log('   - Campaign and cohort data');
    console.log('   - Worker run history');
    console.log('See the output above for specific scenarios.\n');

  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed script
seedDemoData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
