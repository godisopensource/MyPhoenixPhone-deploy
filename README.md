# MyPhoenixPhone

A dormant device buyback platform that leverages [Orange Network APIs](https://developer.orange.com/products/network-apis/) to detect inactive phone numbers, verify device eligibility, and facilitate device collection through multiple handover methods (shipping, in-store, donation). This development project is part of the [Orange Network APIs 2025 hackathon](https://hackathon.developer.orange.com/). 

## Architecture Overview

MyPhoenixPhone is a full-stack TypeScript monorepo built with Turborepo:

- **Backend** (NestJS): RESTful API with OpenAPI documentation, OAuth2 consent flows, SMS verification, device pricing, dormant detection workers, and Camara Network API integration
- **Web** (Next.js 15): Customer-facing application with Orange Boosted design system, consent management, eligibility checking, and verification flows
- **Packages**: Shared UI components, TypeScript configs, ESLint configs, and Model Context Protocol (MCP) server for AI agent integration

### Key Features

- **Device Eligibility**: Check if a phone number is eligible for buyback based on network signals (SIM swap detection, reachability status)
- **OAuth2 Consent**: Secure consent flow using Orange Authentication France for accessing user network data
- **SMS Verification**: Two-factor authentication via SMS codes
- **Dormant Detection**: Background workers that analyze cohorts of leads to identify dormant devices using Camara Network APIs
- **Pricing Engine**: Dynamic device valuation based on model, condition, and market data
- **Handover Methods**: Multiple collection options (ship device, drop at store, donate to charity)
- **Campaign Management**: Marketing campaigns with A/B testing and feature flags
- **Comprehensive Testing**: 382+ tests across 8 layers (unit, integration, E2E, performance, contract testing with Pact)

## Prerequisites

- **Node.js 20+** (recommended via nvm)
- **npm 10+** (Corepack enabled by default on Node 20)
- **PostgreSQL 14+** for the backend database
- **Docker** (optional, for integration tests with testcontainers)
- **k6** (optional, for performance testing)
- **Xcode Command Line Tools** (macOS only, required for building native packages like sharp)

## Installation

### 1. Clone the Repository

```sh
git clone https://codeberg.org/godisopensource/MyPhoenixPhone
cd MyPhoenixPhone
```

### 2. Install Dependencies

From the monorepo root, install all dependencies for all workspaces (backend, web, packages):

```sh
cd myphoenixphone
corepack enable
npm ci
```

### 3. Configure Environment Variables

Create a `.env` file in `myphoenixphone/apps/backend/`:

```sh
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/myphoenixphone"

# Server
PORT=3000
NODE_ENV=development

# Session
SESSION_SECRET="your-session-secret-change-in-production"

# Orange Network APIs (Camara)
CAMARA_CLIENT_ID="your-client-id"
CAMARA_CLIENT_SECRET="your-client-secret"
CAMARA_BASE_URL="https://api.orange.com"

# Orange Authentication France (OAuth2)
AUTH_FRANCE_CLIENT_ID="your-auth-client-id"
AUTH_FRANCE_CLIENT_SECRET="your-auth-secret"
AUTH_FRANCE_REDIRECT_URI="http://localhost:3000/api/consent/callback"

# Admin API (optional)
ADMIN_TOKEN="your-admin-token"

# Feature Flags (optional)
ENABLE_DORMANT_WORKERS="true"
```

### 4. Setup Database

Run Prisma migrations:

```sh
cd myphoenixphone/apps/backend
npm run prisma:migrate:dev
```

Generate Prisma client:

```sh
npm run prisma:generate
```

### 5. Load Demo Data (Optional)

For testing and demonstrations, load sample data.

IMPORTANT: The Orange Network APIs playground used for demos enforces a quota on the number of phone numbers that can exist in the account. The current demo setup uses 10 playground slots. Before running the seeder you must:

- start the local MCP playground proxy (see `/MCP_SETUP.md`)
- ensure the 10 demo phone numbers are present in the playground (see `/myphoenixphone/scripts/create-playground-phones.ts`)

Run the Prisma demo seeder after MCP playground phone numbers are configured:

```sh
npm run seed:demo
```

Notes:
- The seeder populates the local PostgreSQL database (Prisma). It does NOT automatically create phone numbers in the Orange playground — those must be created/updated via the MCP tools prior to running the seeder.
- We use the following 10 playground numbers for demo scenarios (source: `myphoenixphone/scripts/create-playground-phones.ts`):

   1. +33699901001 — Candidat Parfait
   2. +33699901002 — SIM Swap Récent
   3. +33699901003 — Utilisateur Actif
   4. +33699901004 — Avec Consentement
   5. +33699901005 — Vérifié par SMS
   6. +33699901006 — Avec Tarification
   7. +33699901007 — Livraison Choisie
   8. +33699901008 — A Refusé (Opt-Out)
   9. +33699901009 — En Campagne
 10. +33699901010 — Multi-Contacts

See `/ACTIONS_DEMO.md` for the step-by-step MCP actions (create/update/delete) used to configure each playground number's metadata (SIM swap date, reachability, location, roaming).

**📚 Demo Mode Guide**: See `apps/web/DEMO_MODE.md` for instructions on using the interactive demo mode in the web app.

### 6. Start Development Servers

From the monorepo root `myphoenixphone/`:

```sh
# Start all services in parallel (backend + web + MCP server)
npm run dev:local

# OR start individually:
npm run dev -w apps/backend   # Backend API on http://localhost:3000
npm run dev -w apps/web        # Web app on http://localhost:3001
```

The backend will be available at `http://localhost:3000` with OpenAPI documentation at `http://localhost:3000/api`.

## How It Works

### 1. Lead Collection

Marketing campaigns collect phone numbers (leads) from various channels. Each lead is stored with campaign metadata and tracking information.

### 2. Eligibility Check

When a user submits their phone number:

1. The system checks network signals via Camara APIs:
   - SIM swap detection (has the SIM been changed recently?)
   - Reachability status (is the device currently connected to the network?)
   - Location verification (optional)

2. Business rules determine eligibility:
   - Recent SIM swap might indicate device abandonment
   - Unreachable device suggests it's powered off or inactive
   - Eligibility rules can be customized via feature flags

### 3. Consent Flow

For accessing detailed network data, the system requires user consent via OAuth2:

1. User initiates consent via `/api/consent/init`
2. Backend redirects to Orange Authentication France
3. User authenticates and approves data access
4. Orange redirects back with authorization code
5. Backend exchanges code for access token and stores consent proof

### 4. Device Verification

After consent, the user can:

1. Receive an SMS verification code via `/api/verification/send`
2. Submit the code via `/api/verification/verify`
3. Get accurate device information and pricing

### 5. Pricing & Handover

Once verified:

1. User provides device details (model, condition)
2. Pricing engine calculates buyback value
3. User selects handover method:
   - **Ship**: Free shipping label generated
   - **Store**: QR code for in-store drop-off
   - **Donate**: Tax deduction receipt

### 6. Background Workers

Daily cron jobs process large cohorts of leads:

1. **DailyRefreshWorker**: Fetches fresh network signals for active leads
2. **DormantDetectionWorker**: Analyzes signals to identify dormant devices
3. **CampaignEnrichmentWorker**: Enriches lead data with network intelligence

Workers use rate limiting and batch processing to handle thousands of API calls efficiently.

## Development

### Available Scripts

From `myphoenixphone/` root:

```sh
# Development
npm run dev              # Start all services with Turborepo
npm run dev:local        # Start with concurrently (better logging)
npm run dev:with-mcp     # Start with MCP server for AI agents

# Building
npm run build            # Build all applications
npm run lint             # Lint all workspaces
npm run format           # Format code with Prettier
npm run check-types      # TypeScript type checking

# Testing (from apps/backend/)
npm run test             # Run unit tests
npm run test:watch       # Watch mode
npm run test:cov         # Generate coverage report
npm run test:e2e         # End-to-end tests with Playwright
npm run test:integration # Integration tests (requires Docker)
npm run test:pact        # Consumer contract tests
npm run test:perf        # Performance tests with k6

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate:dev    # Create and apply migration
npm run prisma:migrate:deploy # Deploy migrations (production)
npm run prisma:studio    # Open Prisma Studio (GUI)
```


### Testing Strategy

The project implements 8 layers of testing:

1. **API Contracts**: OpenAPI 3.0 specification (645 lines, 8 endpoints)
2. **Consumer Contract Tests**: 18 Pact tests ensuring web app expectations match API
3. **Unit Tests**: 228 tests (212 passing) with Jest
4. **Integration Tests**: 26 tests with testcontainers (database migrations, rollbacks)
5. **E2E Smoke Tests**: 10 critical path tests (health, metrics, basic flows)
6. **E2E Happy Paths**: 45 tests covering all successful user journeys
7. **E2E Error Scenarios**: 57 tests for validation, rate limiting, error handling
8. **Performance Tests**: 4 k6 scripts with load baselines (eligibility, consent, verification, workers)

See `apps/backend/test/DD-12-SUMMARY.md` for complete testing documentation.

## Deployment

### Backend Deployment

1. Set environment variables (DATABASE_URL, secrets)
2. Run database migrations:
   ```sh
   npm run prisma:migrate:deploy
   ```
3. Build the application:
   ```sh
   npm run build -w apps/backend
   ```
4. Start the server:
   ```sh
   npm run start -w apps/backend
   ```

### Web Deployment

The Next.js app can be deployed to Vercel, Netlify, or any Node.js hosting:

```sh
npm run build -w apps/web
npm run start -w apps/web
```

### Database

PostgreSQL 14+ is required. The schema includes:

- **Consent**: OAuth2 consent records with proof storage
- **EligibilitySignal**: Cached network signals (SIM swap, reachability)
- **Interaction**: User interaction tracking
- **NetworkEvent**: Event log for dormant detection
- **Lead**: Marketing lead data with campaign attribution
- **DormantDevice**: Detected dormant devices
- **WorkerRun**: Background job execution tracking
- **Campaign**: Marketing campaign configuration
- **FeatureFlag**: A/B testing and feature toggles

## API Documentation

Once the backend is running, visit:

- **Swagger UI**: `http://localhost:3000/api`
- **OpenAPI YAML**: `http://localhost:3000/api-yaml`
- **Health Check**: `http://localhost:3000/health`
- **Metrics**: `http://localhost:3000/metrics` (Prometheus format)

### Key Endpoints

- `POST /api/eligibility/check` - Check if a phone number is eligible
- `POST /api/consent/init` - Initiate OAuth2 consent flow
- `POST /api/consent/callback` - Handle OAuth2 redirect
- `POST /api/verification/send` - Send SMS verification code
- `POST /api/verification/verify` - Verify SMS code
- `POST /api/pricing/estimate` - Get device price estimate
- `POST /api/workers/daily-refresh/trigger` - Trigger background worker (admin)
- `GET /api/feature-flags` - Get feature flag values
- `GET /api/campaign/:slug` - Get campaign details

## Continuous Integration

The project includes Woodpecker CI configuration (`.woodpecker.yml`):

- Node.js 20 Alpine container
- Install dependencies with `npm ci`
- Lint all workspaces
- Build backend and web apps
- Run backend tests

## Contributing

1. Follow the existing code style (ESLint + Prettier configured)
2. Write tests for new features (maintain coverage)
3. Update OpenAPI spec when adding/modifying endpoints
4. Run `npm run check-types` before committing
5. Ensure all tests pass: `npm run test -w apps/backend`

## License

ISC

## Support

For issues or questions, please open an issue on the repository.
