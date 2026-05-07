import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Middleware
  app.enableCors();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global Prefix
  app.setGlobalPrefix('api');

  const PORT = process.env.PORT || 5000;
  await app.listen(PORT);
  
  logger.log(`Server running on port ${PORT}`);
}

bootstrap();
