import 'reflect-metadata';
import * as dotenv from 'dotenv';

// Loaded before anything else: CognitoService reads process.env in its
// constructor and refuses to start without a pool configured.
dotenv.config({ path: '.env.local' });
dotenv.config();

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  if (process.env.NODE_ENV === 'production' && process.env.COGNITO_ENDPOINT) {
    // The simulator issues tokens for accounts nobody vetted. Refusing here is
    // cheaper than discovering it in production.
    logger.error(
      'COGNITO_ENDPOINT is set with NODE_ENV=production. That points authentication at a local Cognito simulator. Refusing to start.',
    );
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  // Behind nginx: without this every request looks like it comes from the
  // proxy, so per-IP throttling would rate-limit the whole internet as one.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000'
  )
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // No Origin header means same-origin or a server-to-server call
      // (assessment-service posts certificate mail here).
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const port = Number(process.env.AUTH_SERVICE_PORT || process.env.PORT || 4002);
  await app.listen(port, '0.0.0.0');
  logger.log(`auth-service listening on ${port}`);
}

void bootstrap();
