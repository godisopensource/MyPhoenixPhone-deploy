import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser = require('cookie-parser');
import session = require('express-session');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  // Swagger/OpenAPI configuration
  const config = new DocumentBuilder()
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
    .addServer('http://localhost:3003', 'Development server')
    .addServer('https://api.myphoenixphone.com', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Save OpenAPI spec to file for contract testing
  const fs = require('fs');
  const yaml = require('yaml');
  const openApiYaml = yaml.stringify(document);
  fs.writeFileSync('./openapi.yaml', openApiYaml);

  // Allow CORS for local development
  // Support multiple origins when running with Turbo (backend on 3000, frontend on 3001, etc.)
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    process.env.DEV_WEB_ORIGIN,
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      // In development, allow all localhost origins
      if (
        process.env.NODE_ENV !== 'production' &&
        origin.startsWith('http://localhost:')
      ) {
        return callback(null, true);
      }

      // Check allowed origins list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Cookie parser and session middleware are required to persist
  // auth state/nonce across the redirect to/from Orange Authentication France.
  // For development the in-memory session store is fine. In production,
  // use a persistent store such as Redis (connect-redis) and set cookie.secure=true.
  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'dev-session-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        // secure should be true in production when using HTTPS
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
