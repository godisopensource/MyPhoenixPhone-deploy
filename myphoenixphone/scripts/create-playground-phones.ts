#!/usr/bin/env tsx
/**
 * Create Playground Phone Numbers Script (adapted for limited playground quota)
 *
 * The playground account used for demos is limited to 10 phone numbers.
 * This script lists the 10 numbers that will be configured in the playground
 * and the intended scenario mapping. Use this file as the source-of-truth
 * for MCP-based setup.
 *
 * Usage (manual / guidance):
 *  - Ask Copilot to create or update these numbers using the MCP tools
 *  - Then run `npm run seed:demo` to populate Prisma with matching demo data
 */

const TEST_NUMBERS = [
  {
    phone: '+33699901001',
    name: 'Candidat Parfait',
    simSwap: '2025-09-29T10:00:00.000Z', // 28 days ago from Oct 27, 2025
    reachable: 'NOT_CONNECTED',
    roaming: false,
    location: { lat: 48.8566, lon: 2.3522, radius: 5000 },
  },
  {
    phone: '+33699901002',
    name: 'SIM Swap Récent',
    simSwap: '2025-10-20T10:00:00.000Z',
    reachable: 'CONNECTED_SMS',
    roaming: false,
    location: { lat: 48.8566, lon: 2.3522, radius: 5000 },
  },
  {
    phone: '+33699901003',
    name: 'Utilisateur Actif',
    simSwap: '2025-10-25T10:00:00.000Z',
    reachable: 'CONNECTED_DATA',
    roaming: false,
    location: { lat: 48.8566, lon: 2.3522, radius: 1000 },
  },
  {
    phone: '+33699901004',
    name: 'Avec Consentement',
    simSwap: '2024-08-27T10:00:00.000Z',
    reachable: 'CONNECTED_SMS',
    roaming: false,
    location: { lat: 48.8566, lon: 2.3522, radius: 5000 },
  },
  {
    phone: '+33699901005',
    name: 'Vérifié par SMS',
    simSwap: '2024-09-27T10:00:00.000Z',
    reachable: 'CONNECTED_SMS',
    roaming: false,
    location: { lat: 48.8566, lon: 2.3522, radius: 3000 },
  },
  {
    phone: '+33699901006',
    name: 'Avec Tarification',
    simSwap: '2024-01-27T10:00:00.000Z',
    reachable: 'CONNECTED_DATA',
    roaming: false,
    location: { lat: 48.8566, lon: 2.3522, radius: 5000 },
  },
  {
    phone: '+33699901007',
    name: 'Livraison Choisie',
    simSwap: '2024-06-27T10:00:00.000Z',
    reachable: 'CONNECTED_SMS',
    roaming: false,
    location: { lat: 48.8566, lon: 2.3522, radius: 5000 },
  },
  {
    phone: '+33699901008',
    name: 'A Refusé (Opt-Out)',
    simSwap: '2024-07-27T10:00:00.000Z',
    reachable: 'CONNECTED_SMS',
    roaming: false,
    location: { lat: 48.8566, lon: 2.3522, radius: 5000 },
  },
  {
    phone: '+33699901009',
    name: 'En Campagne',
    simSwap: '2024-05-27T10:00:00.000Z',
    reachable: 'CONNECTED_SMS',
    roaming: false,
    location: { lat: 48.8566, lon: 2.3522, radius: 5000 },
  },
  {
    phone: '+33699901010',
    name: 'Multi-Contacts',
    simSwap: '2024-03-27T10:00:00.000Z',
    reachable: 'CONNECTED_DATA',
    roaming: false,
    location: { lat: 48.8566, lon: 2.3522, radius: 5000 },
  },
];

console.log('Playground demo phone numbers (quota-limited to 10):');
TEST_NUMBERS.forEach((p, i) =>
  console.log(
    ` ${i + 1}. ${p.phone} — ${p.name} (simSwap=${p.simSwap}, reachable=${p.reachable}, roaming=${p.roaming})`,
  ),
);

export { TEST_NUMBERS };
