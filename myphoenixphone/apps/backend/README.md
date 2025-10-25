# Endpoints

- GET `/` -> Hello World!
- GET `/health` -> `{ "status": "ok" }`
- GET `/metrics` -> Prometheus metrics (text/plain)

## Scripts

### Development
- `npm run start:dev` – start in watch mode
- `npm run lint` – ESLint
- `npm run build` – production build

### Database (Prisma)
- `npm run prisma:generate` – generate Prisma client
- `npm run prisma:migrate:dev` – run migrations in dev (creates new migration if needed)
- `npm run prisma:migrate:deploy` – apply existing migrations
- `npm run prisma:studio` – open Prisma Studio

### Testing
- `npm test` – unit tests
- `npm run test:watch` – unit tests in watch mode
- `npm run test:cov` – unit tests with coverage
- `npm run test:e2e` – end-to-end tests
- `npm run test:pact` – Pact contract tests (consumer + provider)
- `npm run test:integration` – database integration tests (requires Docker)
- `npm run test:perf` – all performance tests (requires k6 + running server)
- `npm run test:perf:eligibility` – eligibility API performance test
- `npm run test:perf:consent` – consent API performance test
- `npm run test:perf:verification` – verification API performance test
- `npm run test:perf:workers` – workers benchmark test

## Observability

Basic HTTP metrics are collected with prom-client: total requests and duration histogram. Logs per request are emitted via a simple middleware.

Additionally, repository-level counters are exposed:

- `consent_operations_total{op="create|revoke",result="ok|err"}`
- `eligibility_operations_total{op="upsert",result="ok|err"}`

These are incremented inside the corresponding repositories on success/error.

## Database & Prisma (BE-02)

- Set `DATABASE_URL` to a PostgreSQL connection string. You can copy `.env.example` to `.env` and adjust.
- Generate Prisma client (also runs automatically before tests):

```powershell
pwsh -NoProfile -Command "Set-Location -Path 'c:\Users\VQGR6386\myphoenixphone\myphoenixphone\apps\backend'; npm run prisma:generate"
```

- Apply schema to your DB:

```powershell
pwsh -NoProfile -Command "Set-Location -Path 'c:\Users\VQGR6386\myphoenixphone\myphoenixphone\apps\backend'; npm run prisma:migrate:deploy"
```

For development without creating migration files, you can push the schema:

```powershell
pwsh -NoProfile -Command "Set-Location -Path 'c:\Users\VQGR6386\myphoenixphone\myphoenixphone\apps\backend'; npx prisma db push --schema ./prisma/schema.prisma"
```

### Optional integration tests with Docker

Set `RUN_DB_TESTS=true` to enable the Testcontainers-based integration suite. It will:

- Start a temporary PostgreSQL (16-alpine)
- Set `DATABASE_URL`
- Run `prisma generate` and `prisma db push`
- Exercise basic CRUD via repositories

```powershell
$env:RUN_DB_TESTS='true'
pwsh -NoProfile -Command "Set-Location -Path 'c:\Users\VQGR6386\myphoenixphone\myphoenixphone'; npm run -w apps\backend test"
```

By default (when `RUN_DB_TESTS` is not set), these tests are skipped so CI stays green without Docker.

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Testing Strategy

This project implements a comprehensive, multi-layered testing approach. See [test/DD-12-SUMMARY.md](./test/DD-12-SUMMARY.md) for complete details.

### Test Layers

1. **API Contracts** (OpenAPI/Swagger)
   - Specification: [src/API-CONTRACTS.md](./src/API-CONTRACTS.md)
   - 8 endpoint groups documented
   - 20+ data models with schemas

2. **Contract Tests** (Pact)
   - Consumer tests: 18 tests
   - Provider verification: 16 state handlers
   - Documentation: [test/pact/PACT-SUMMARY.md](./test/pact/PACT-SUMMARY.md)
   ```bash
   npm run test:pact
   ```

3. **Unit Tests** (Jest)
   - 228 tests across modules
   - 212 passing (16 DI issues to fix)
   ```bash
   npm test                # Run unit tests
   npm run test:watch     # Watch mode
   npm run test:cov       # With coverage
   ```

4. **Integration Tests** (Testcontainers)
   - 26 tests for database migrations
   - Requires Docker Desktop running
   - Documentation: [test/integration/INTEGRATION-TESTS.md](./test/integration/INTEGRATION-TESTS.md)
   ```bash
   npm run test:integration
   ```

5. **E2E Tests** (Playwright)
   - **Smoke tests**: 10 tests (health checks, basic functionality)
   - **Happy paths**: 45 tests (eligibility, workers, feature flags, campaigns)
   - **Error scenarios**: 57 tests (validation, auth, rate limiting)
   - **Total**: 112 E2E tests
   - Documentation: [test/e2e/](./test/e2e/)
   ```bash
   npm run test:e2e
   ```

6. **Performance Tests** (k6)
   - 4 load test scripts with baselines
   - Requires k6 installed and backend running
   - Documentation: [test/performance/README.md](./test/performance/README.md)
   ```bash
   # Install k6: brew install k6
   npm run start:dev                # Start server
   npm run test:perf                # All performance tests
   npm run test:perf:eligibility    # Individual test
   ```

### Quick Test Commands

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Contract tests
npm run test:pact

# Integration tests (requires Docker)
npm run test:integration

# Performance tests (requires k6 + running server)
npm run test:perf

# Run specific performance test
npm run test:perf:eligibility
npm run test:perf:consent
npm run test:perf:verification
npm run test:perf:workers
```

### Performance Baselines

| Endpoint | p95 Target | Throughput | Error Rate |
|----------|------------|------------|------------|
| Eligibility API | < 500ms | 100 req/s | < 1% |
| Consent API | < 1000ms | 50 req/s | < 2% |
| Verification API | < 800ms | 30 req/s | < 1% |
| Workers (500 leads) | < 60s | 10 leads/s | < 0.5% |

### Test Coverage

- **Total Tests**: 382+ (Unit: 228, E2E: 112, Integration: 26, Pact: 18, Perf: 4 scripts)
- **Documentation**: 9 comprehensive docs covering all strategies
- **CI/CD Ready**: GitHub Actions examples provided

See [test/DD-12-SUMMARY.md](./test/DD-12-SUMMARY.md) for complete testing strategy documentation.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
