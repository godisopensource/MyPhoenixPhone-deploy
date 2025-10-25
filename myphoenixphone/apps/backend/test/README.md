# Backend Testing Suite

**Complete testing infrastructure for MyPhoenixPhone Backend API**

## 📚 Documentation Quick Links

| Document | Description |
|----------|-------------|
| **[COMPLETION-SUMMARY.md](./COMPLETION-SUMMARY.md)** | 🎉 DD-12 project completion summary |
| **[DD-12-SUMMARY.md](./DD-12-SUMMARY.md)** | 📊 Complete testing strategy & metrics |
| **[pact/PACT-SUMMARY.md](./pact/PACT-SUMMARY.md)** | 🤝 Contract testing results |
| **[e2e/E2E-INFRASTRUCTURE.md](./e2e/E2E-INFRASTRUCTURE.md)** | 🎭 Playwright setup guide |
| **[e2e/HAPPY-PATH-SUMMARY.md](./e2e/HAPPY-PATH-SUMMARY.md)** | ✅ Happy path test catalog |
| **[e2e/ERROR-SCENARIOS-SUMMARY.md](./e2e/ERROR-SCENARIOS-SUMMARY.md)** | ❌ Error scenario catalog |
| **[integration/INTEGRATION-TESTS.md](./integration/INTEGRATION-TESTS.md)** | 🐳 Database integration tests |
| **[performance/README.md](./performance/README.md)** | ⚡ k6 performance testing |

## 🧪 Test Suite Overview

### 382+ Tests Across 6 Layers

```
┌─────────────────────────────────────┐
│     API Contracts (OpenAPI)         │  ← Specification
├─────────────────────────────────────┤
│     Pact (18 consumer tests)        │  ← Contract Testing
├─────────────────────────────────────┤
│     Unit Tests (228 tests)          │  ← Fast, Isolated
├─────────────────────────────────────┤
│     Integration (26 tests)          │  ← Database Validation
├─────────────────────────────────────┤
│     E2E (112 tests)                 │  ← Full Flow Testing
│  • Smoke: 10                        │
│  • Happy Paths: 45                  │
│  • Error Scenarios: 57              │
├─────────────────────────────────────┤
│     Performance (4 scripts)         │  ← Load Testing
│  • Eligibility: 100 req/s           │
│  • Consent: 50 req/s                │
│  • Verification: 30 req/s           │
│  • Workers: 500 leads               │
└─────────────────────────────────────┘
```

## ⚡ Quick Commands

```bash
# Unit Tests
npm test                          # Run all unit tests
npm run test:watch               # Watch mode
npm run test:cov                 # With coverage

# Contract Tests
npm run test:pact                # Pact consumer + provider

# Integration Tests (requires Docker)
npm run test:integration         # Database migrations

# E2E Tests
npm run test:e2e                 # All E2E tests

# Performance Tests (requires k6 + server)
npm run test:perf                # All performance tests
npm run test:perf:eligibility    # Eligibility API
npm run test:perf:consent        # Consent API
npm run test:perf:verification   # Verification API
npm run test:perf:workers        # Workers benchmark
```

## 📁 Directory Structure

```
test/
├── README.md                    # This file
├── COMPLETION-SUMMARY.md        # Project completion summary
├── DD-12-SUMMARY.md             # Complete testing strategy
│
├── pact/                        # Contract Testing (Pact)
│   ├── PACT-SUMMARY.md
│   ├── eligibility-api.pact.spec.ts (8 tests)
│   ├── consent-api.pact.spec.ts (6 tests)
│   └── verification-api.pact.spec.ts (4 tests)
│
├── e2e/                         # End-to-End Tests (Playwright)
│   ├── E2E-INFRASTRUCTURE.md
│   ├── HAPPY-PATH-SUMMARY.md
│   ├── ERROR-SCENARIOS-SUMMARY.md
│   ├── fixtures/                # Test fixtures
│   ├── helpers/                 # Test helpers
│   ├── smoke.e2e-spec.ts       # Smoke tests (10)
│   ├── happy-paths/            # Happy path tests (45)
│   └── errors/                 # Error scenarios (57)
│
├── integration/                 # Integration Tests (Testcontainers)
│   ├── INTEGRATION-TESTS.md
│   ├── TASK-6-SUMMARY.md
│   ├── database-migrations.spec.ts (16 tests)
│   └── migration-rollback.spec.ts (10 tests)
│
├── performance/                 # Performance Tests (k6)
│   ├── README.md
│   ├── run-all-performance-tests.sh
│   ├── eligibility-api.js
│   ├── consent-api.js
│   ├── verification-api.js
│   ├── workers-benchmark.js
│   └── results/                # Test results
│
└── jest-*.json                  # Jest configurations
```

## 🎯 Performance Targets

| Endpoint | p95 | Throughput | Error Rate |
|----------|-----|------------|------------|
| Eligibility | < 500ms | 100 req/s | < 1% |
| Consent | < 1000ms | 50 req/s | < 2% |
| Verification | < 800ms | 30 req/s | < 1% |
| Workers | < 60s | 10 leads/s | < 0.5% |

## 📊 Test Statistics

- **Total Tests**: 382+
- **Unit Tests**: 228 (212 passing)
- **Pact Tests**: 18 consumer tests
- **Integration Tests**: 26 (requires Docker)
- **E2E Tests**: 112 (smoke + happy + errors)
- **Performance Scripts**: 4

## 🔧 Prerequisites

### All Tests
- Node.js 18+
- PostgreSQL (for integration tests)

### Integration Tests
- Docker Desktop (for testcontainers)

### Performance Tests
- k6: `brew install k6`
- Backend server running: `npm run start:dev`

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run unit tests**:
   ```bash
   npm test
   ```

3. **Run contract tests**:
   ```bash
   npm run test:pact
   ```

4. **Run E2E tests**:
   ```bash
   npm run test:e2e
   ```

5. **Run integration tests** (requires Docker):
   ```bash
   npm run test:integration
   ```

6. **Run performance tests** (requires k6 + server):
   ```bash
   npm run start:dev              # Start server
   npm run test:perf              # Run tests
   ```

## 📖 Learn More

- **New to testing?** Start with [DD-12-SUMMARY.md](./DD-12-SUMMARY.md)
- **Setting up E2E?** See [e2e/E2E-INFRASTRUCTURE.md](./e2e/E2E-INFRASTRUCTURE.md)
- **Running performance tests?** Check [performance/README.md](./performance/README.md)
- **Database testing?** Read [integration/INTEGRATION-TESTS.md](./integration/INTEGRATION-TESTS.md)

## ✅ Status

**DD-12 Status**: ✅ **COMPLETED** (8/8 tasks)  
**Test Coverage**: ✅ **Good** (382+ tests)  
**Documentation**: ✅ **Comprehensive** (10 guides)  
**CI/CD Ready**: ✅ **Yes** (examples provided)

---

**Last Updated**: October 25, 2025  
**Maintained by**: MyPhoenixPhone Backend Team
