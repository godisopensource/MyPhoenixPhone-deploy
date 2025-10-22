import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser = require('cookie-parser');
import session = require('express-session');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

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
