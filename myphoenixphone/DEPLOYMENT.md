# Deploying MyPhoenixPhone to Vercel (Frontend + Backend)

This document explains how to deploy the entire monorepo (Next.js frontend and NestJS backend) to Vercel from the `myphoenixphone` workspace root. It also covers environment variables, routing, Prisma on serverless, and common pitfalls.

---

## Repository layout (relevant parts)

- myphoenixphone/
  - apps/
    - web/                 Next.js app (frontend)
    - backend/             NestJS app (backend)
      - api/index.ts       Serverless entry for Vercel Node Functions
      - prisma/            Prisma schema and metadata
        - schema.prisma
  - vercel.json            Vercel config that builds web and mounts backend under /api
  - turbo.json             Turborepo pipelines
  - package.json           Workspace root (engines pinned to Node 20.x)

---

## Vercel project settings

- Root Directory: myphoenixphone
- Framework Preset: Next.js (auto)
- Node.js Version: 20.x (either set in the UI or rely on engines.node=20.x in package.json)
- Build Command: leave default (Vercel auto-detects Next.js and builds serverless functions)
- Output Directory: leave default

Note: Avoid setting a custom “Root Directory” to only one app if you want both frontend and backend in the same Vercel project. The monorepo is configured to build both via `vercel.json`.

---

## Environment variables

Set these in Vercel Project Settings -> Environment Variables (for each environment: Production, Preview, Development). Do not commit secrets.

Frontend (exposed to the browser; non-sensitive):
- NEXT_PUBLIC_TURNSTILE_SITE_KEY: your Turnstile site key
- NEXT_PUBLIC_API_BASE_URL: https://your-vercel-domain.vercel.app (optional; if the frontend calls the backend directly from the browser)

Backend (server-side only; sensitive):
- DATABASE_URL: your Postgres connection string (e.g., from Neon, Supabase, RDS, etc.)
- CAMARA_BASE_URL: https://api.orange.com
- CAMARA_CLIENT_ID
- CAMARA_CLIENT_SECRET
- CAMARA_TOKEN_URL: https://api.orange.com/oauth/v3/token
- TURNSTILE_ENABLED: true
- TURNSTILE_SECRET_KEY: your Turnstile secret key
- TURNSTILE_VERIFY_URL: https://challenges.cloudflare.com/turnstile/v0/siteverify
- SESSION_SECRET: a random, strong secret (used by express-session)
- DEV_WEB_ORIGIN: optional extra origin to allow in CORS during development

Local development:
- Copy apps/backend/.env.example to apps/backend/.env and fill in values
- Copy apps/web/.env.example to apps/web/.env.local and fill in values

---

## Routing and build structure

This repository uses a `vercel.json` at the workspace root to:
- Build the Next.js app in `apps/web`
- Deploy the NestJS backend as a Vercel Node Function mounted under `/api`

Effective routes:
- Frontend: all non-API paths are served by the Next.js app
- Backend: requests matching /api/(...) are routed to the NestJS serverless function
- Swagger UI is mounted at /api/docs

High-level `vercel.json` shape (for reference; do not copy/paste paths blindly):
    {
      "version": 2,
      "builds": [
        { "src": "apps/web/next.config.mjs", "use": "@vercel/next" },
        {
          "src": "apps/backend/api/**/*.ts",
          "use": "@vercel/node",
          "config": {
            "includeFiles": [
              "apps/backend/node_modules/.prisma/**",
              "apps/backend/prisma/**"
            ]
          }
        }
      ],
      "functions": {
        "apps/backend/api/**/*.ts": {
          "runtime": "nodejs20.x",
          "memory": 1024,
          "maxDuration": 10
        }
      },
      "routes": [
        { "src": "/api/(.*)", "dest": "apps/backend/api/$1" },
        { "src": "/(.*)", "dest": "apps/web/$1" }
      ]
    }

Notes:
- The backend’s serverless entry lives at apps/backend/api/index.ts and initializes the Nest app once per container instance (warm reuse).
- Swagger UI is set up at /api/docs (not /api directly).

---

## Prisma on Vercel serverless

- The Prisma client must exist at build/deploy time. The backend package defines a postinstall script that runs prisma generate for apps/backend.
- The vercel.json “includeFiles” ensures Prisma engine files and the prisma directory are bundled with the serverless function.
- Database migrations should not run on every serverless boot. Run them manually or via CI/CD (e.g., GitHub Actions, Vercel Cron, or local):
    cd myphoenixphone/apps/backend
    npx prisma migrate deploy --schema ./prisma/schema.prisma

- Ensure DATABASE_URL is configured in the “Backend” section of environment variables.

---

## Sessions and CORS

- The backend uses express-session with a cookie-based session. On Vercel, this means you’ll have ephemeral in-memory sessions per lambda instance. For production-grade persistence, use a dedicated session store (e.g., Redis with connect-redis) and configure it in the Nest app.
- Cookies use secure: true when NODE_ENV=production.
- CORS: The serverless backend allows localhost during development and checks additional origins via DEV_WEB_ORIGIN. If your web app lives on the same Vercel domain as the API, this is typically fine out of the box.

---

## Turnstile (Cloudflare captcha)

Frontend:
- NEXT_PUBLIC_TURNSTILE_SITE_KEY must be set. The frontend renders the widget using this key.

Backend:
- TURNSTILE_SECRET_KEY is required to verify tokens server-side.
- TURNSTILE_VERIFY_URL defaults to Cloudflare’s verify endpoint.

Toggle:
- TURNSTILE_ENABLED=true to enforce verification in production. You can set it to false in dev/preview if needed.

---

## Node.js version and monorepo notes

- Engines are pinned to Node 20.x in the workspace to avoid auto-major upgrades on Vercel.
- Ensure you do NOT have a dependency on the npm package named “node” anywhere. Installing that package can break runtime resolution (e.g., prisma preinstall runs with a wrong-arch “node” binary). If you previously had one at the repository root, remove it.

---

## Local development

- From myphoenixphone/, you can run:
    npm run dev
  This starts all apps via Turborepo.

- For development with the MCP service and apps concurrently:
    npm run dev:local

- Backend only:
    cd myphoenixphone/apps/backend
    npm run dev

- Frontend only:
    cd myphoenixphone/apps/web
    npm run dev

---

## Troubleshooting

Exec format error: cannot execute binary file (node in node_modules/.bin)
- Cause: The npm package “node” was installed in your repo. This shadows the actual Node runtime with an incompatible binary.
- Fix: Remove the “node” dependency and pin engines.node=20.x at the workspace root. Clear build cache and redeploy.

Prisma client missing or engine errors
- Ensure postinstall runs prisma generate in apps/backend.
- Verify vercel.json includes “includeFiles” entries for Prisma.
- Confirm DATABASE_URL is set and reachable from Vercel.

404 for /api or Swagger not loading
- Confirm vercel.json routes include “/api/(.*) -> apps/backend/api/$1”.
- Swagger UI is at /api/docs.

CORS errors in the browser
- Set NEXT_PUBLIC_API_BASE_URL for the frontend to the correct domain.
- Add DEV_WEB_ORIGIN (if needed) or keep both frontend and backend on the same Vercel project/domain.

Turnstile verification failing
- Verify NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are correctly set in Vercel.
- Set TURNSTILE_ENABLED=true only when ready in production.

---

## Deployment checklist

- Project root directory in Vercel: myphoenixphone
- Node.js version: 20.x
- vercel.json present at myphoenixphone/vercel.json
- Environment variables set (frontend and backend)
- Prisma generate runs (postinstall) and “includeFiles” are configured
- Database exists and DATABASE_URL is correct
- Clear build cache and trigger a redeploy after config changes

This setup deploys the Next.js frontend and the NestJS backend (as a Vercel Node Function under /api) in a single Vercel project.