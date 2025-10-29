import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// Keep the same import style as in main.ts for compatibility with tsconfig
import cookieParser = require('cookie-parser');
import session = require('express-session');

/**
 * Serverless entry for the NestJS backend when deployed on Vercel Node Functions.
 *
 * Notes:
 * - We initialize the Nest app once per Lambda/container instance and reuse it across invocations.
 * - We avoid writing files (like openapi.yaml) to the filesystem since it's read-only/ephemeral.
 * - Swagger UI is mounted at /api/docs (this function is mounted under /api).
 * - In-memory session store is fine for dev/preview; use a persistent store for production.
 */

let server: any;
let serverInitPromise: Promise<any> | null = null;

async function createNestServer() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  // Swagger/OpenAPI configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MyPhoenixPhone API')
    .setDescription(
      'API for MyPhoenixPhone - Dormant device buyback platform using Orange Network APIs',
    )
    .setVersion('1.0')
    .addTag('health', 'Health check endpoints')
    .addTag('eligibility', 'Device eligibility verification')
    .addTag('consent', 'User consent management')
    .addTag('verification', 'SMS verification codes')
    .addTag('pricing', 'Device pricing estimation')
    .addTag('handover', 'Device handover methods (ship/store/donate)')
    .addTag('phone-models', 'Phone model catalog')
    .addTag('dormant', 'Dormant device detection and management')
    .addTag('workers', 'Background workers and cohorts')
    .addTag('campaign', 'Marketing campaigns')
    .addTag('feature-flags', 'Feature flags and A/B testing')
    .addTag('metrics', 'Prometheus metrics')
    // Do not set explicit servers here; Vercel will handle the base URL
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Mount Swagger UI at /api/docs (since this function runs under /api on Vercel)
  SwaggerModule.setup('docs', app, document);


  // Configure comma-separated list in ALLOWED_ORIGINS. Same-origin on Vercel is allowed via VERCEL_URL.
  const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const vercelOrigin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined;

  const allowedOrigins = [

    'http://localhost:3000',

    'http://localhost:3001',

    'http://localhost:3002',

    process.env.DEV_WEB_ORIGIN,

    process.env.PUBLIC_ORIGIN,
    vercelOrigin,
    ...extraOrigins,
  ].filter(Boolean);


  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (
        process.env.NODE_ENV !== 'production' &&
        origin.startsWith('http://localhost:')
      ) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Cookie parser and session middleware
  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'dev-session-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
      },
    }),
  );

  // Important: In serverless, call init() instead of listen()
  await app.init();

  // Get underlying Express instance to use as a Vercel handler
  const expressInstance = app.getHttpAdapter().getInstance();

  return expressInstance;
}

export default async function handler(req: any, res: any) {
  if (!server) {
    server = await (serverInitPromise ?? (serverInitPromise = createNestServer()));
  }
  // Express instance is callable as a handler
  return server(req, res);
}
