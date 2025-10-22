#!/usr/bin/env node
/**
 * Schema Validation Script
 * 
 * Validates the dormant-event and lead-output JSON schemas
 * and tests them against fixtures.
 * 
 * Usage: node validate-schemas.js
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

// Initialize AJV with strict mode
const ajv = new Ajv({ 
  allErrors: true, 
  strict: true,
  validateFormats: true 
});
addFormats(ajv);

// Load schemas
const dormantEventSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'dormant-event.schema.json'), 'utf8')
);
const leadOutputSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'lead-output.schema.json'), 'utf8')
);

// Compile validators
const validateDormantEvent = ajv.compile(dormantEventSchema);
const validateLeadOutput = ajv.compile(leadOutputSchema);

console.log('🔍 Schema Validation Report\n');
console.log('=' .repeat(60));

// Test dormant event schema examples
console.log('\n📥 Testing Dormant Event Schema Examples:');
dormantEventSchema.examples.forEach((example, i) => {
  const valid = validateDormantEvent(example);
  if (valid) {
    console.log(`  ✅ Example ${i + 1}: VALID`);
  } else {
    console.log(`  ❌ Example ${i + 1}: INVALID`);
    console.log('     Errors:', validateDormantEvent.errors);
  }
});

// Test lead output schema examples
console.log('\n📤 Testing Lead Output Schema Examples:');
leadOutputSchema.examples.forEach((example, i) => {
  const valid = validateLeadOutput(example);
  if (valid) {
    console.log(`  ✅ Example ${i + 1}: VALID`);
  } else {
    console.log(`  ❌ Example ${i + 1}: INVALID`);
    console.log('     Errors:', validateLeadOutput.errors);
  }
});

// Test invalid cases (should fail)
console.log('\n🚫 Testing Invalid Cases (should fail):');

const invalidDormantEvent = {
  msisdn_hash: 'not-a-hash', // Invalid format
  sim_swap: { occurred: true, ts: '2025-10-19T10:15:00Z' },
  old_device_reachability: { reachable: false, checked_ts: '2025-10-22T11:00:00Z' },
  line_type: 'consumer',
  fraud_flag: false,
};

const invalidDormantEventValid = validateDormantEvent(invalidDormantEvent);
if (!invalidDormantEventValid) {
  console.log('  ✅ Invalid dormant event correctly rejected');
  console.log(`     Error: ${validateDormantEvent.errors[0].message}`);
} else {
  console.log('  ❌ Invalid dormant event incorrectly accepted');
}

const invalidLeadOutput = {
  lead_id: '550e8400-e29b-41d4-a716-446655440000',
  msisdn_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  dormant_score: 1.5, // Out of range
  eligible: true,
  activation_window_days: 14,
  next_action: 'send_nudge',
};

const invalidLeadOutputValid = validateLeadOutput(invalidLeadOutput);
if (!invalidLeadOutputValid) {
  console.log('  ✅ Invalid lead output correctly rejected');
  console.log(`     Error: ${validateLeadOutput.errors[0].message}`);
} else {
  console.log('  ❌ Invalid lead output incorrectly accepted');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ Schema validation complete!\n');
console.log('Next steps:');
console.log('  1. Use these schemas in your NestJS DTOs with class-validator');
console.log('  2. Add unit tests with test-fixtures.ts');
console.log('  3. Import schemas in OpenAPI/Swagger docs');
console.log('  4. Use ajv in CI to validate all fixtures\n');
