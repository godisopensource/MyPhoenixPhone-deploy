#!/usr/bin/env ts-node

/**
 * Manual test script to verify CAMARA API integration
 * 
 * Usage:
 *   npm run build
 *   node dist/camara/test-integration.js +33699901032
 * 
 * Or with ts-node:
 *   npx ts-node src/camara/test-integration.ts +33699901032
 */

import { OAuth2ClientService } from './oauth2-client.service'
import { SimSwapService } from './sim-swap.service'
import { ReachabilityService } from './reachability.service'

async function testCamaraIntegration(phoneNumber: string) {
  console.log('='.repeat(60))
  console.log('CAMARA API Integration Test')
  console.log('='.repeat(60))
  console.log(`Testing with phone number: ${phoneNumber}`)
  console.log()

  // Initialize services
  const oauth2Client = new OAuth2ClientService()
  const simSwapService = new SimSwapService(oauth2Client)
  const reachabilityService = new ReachabilityService(oauth2Client)

  try {
    // Test 1: OAuth2 Token
    console.log('Test 1: OAuth2 Token Acquisition')
    console.log('-'.repeat(60))
    const token = await oauth2Client.getAccessToken()
    console.log(`✓ Access token obtained: ${token.substring(0, 20)}...`)
    console.log()

    // Test 2: SIM Swap - Retrieve Date
    console.log('Test 2: SIM Swap - Retrieve Last Swap Date')
    console.log('-'.repeat(60))
    try {
      const swapDate = await simSwapService.retrieveSimSwapDate(phoneNumber)
      console.log('✓ SIM Swap Date Response:')
      console.log(JSON.stringify(swapDate, null, 2))
    } catch (error) {
      console.error('✗ SIM Swap Date Error:', error.message)
    }
    console.log()

    // Test 3: SIM Swap - Check (last 240 hours = 10 days)
    console.log('Test 3: SIM Swap - Check (last 240 hours)')
    console.log('-'.repeat(60))
    try {
      const swapCheck = await simSwapService.checkSimSwap(phoneNumber, 240)
      console.log('✓ SIM Swap Check Response:')
      console.log(JSON.stringify(swapCheck, null, 2))
    } catch (error) {
      console.error('✗ SIM Swap Check Error:', error.message)
    }
    console.log()

    // Test 4: SIM Swap - Get Status (convenience method)
    console.log('Test 4: SIM Swap - Get Status (convenience)')
    console.log('-'.repeat(60))
    try {
      const swapStatus = await simSwapService.getSimSwapStatus(phoneNumber)
      console.log('✓ SIM Swap Status Response:')
      console.log(JSON.stringify(swapStatus, null, 2))
    } catch (error) {
      console.error('✗ SIM Swap Status Error:', error.message)
    }
    console.log()

    // Test 5: Device Reachability
    console.log('Test 5: Device Reachability Status')
    console.log('-'.repeat(60))
    try {
      const reachability = await reachabilityService.getReachabilityStatus(phoneNumber)
      console.log('✓ Reachability Response:')
      console.log(JSON.stringify(reachability, null, 2))
    } catch (error) {
      console.error('✗ Reachability Error:', error.message)
    }
    console.log()

    // Test 6: Reachability - Is Reachable (convenience)
    console.log('Test 6: Is Reachable (convenience)')
    console.log('-'.repeat(60))
    try {
      const isReachable = await reachabilityService.isReachable(phoneNumber)
      console.log('✓ Is Reachable Response:')
      console.log(JSON.stringify(isReachable, null, 2))
    } catch (error) {
      console.error('✗ Is Reachable Error:', error.message)
    }

    console.log()
    console.log('='.repeat(60))
    console.log('Integration test completed!')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

// Main execution
const phoneNumber = process.argv[2]

if (!phoneNumber) {
  console.error('Usage: ts-node test-integration.ts <phone-number>')
  console.error('Example: ts-node test-integration.ts +33699901032')
  process.exit(1)
}

// Validate E.164 format
if (!/^\+[1-9][0-9]{4,14}$/.test(phoneNumber)) {
  console.error('Error: Phone number must be in E.164 format (e.g., +33699901032)')
  process.exit(1)
}

testCamaraIntegration(phoneNumber)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
