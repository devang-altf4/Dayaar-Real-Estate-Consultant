import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from workspace root or current directory before any module loads
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { StorageService } from './modules/storage/storage.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Fail closed rather than archiving recordings somewhere we cannot trust.
  app.get(StorageService).assertProductionReady();

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS configuration
  const corsOriginsRaw = process.env.CORS_ORIGIN || '*';
  const allowAll = corsOriginsRaw === '*' || corsOriginsRaw.includes('*');
  app.enableCors({
    origin: allowAll
      ? true
      : corsOriginsRaw
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 8080;
  await app.listen(port, '0.0.0.0');
  logger.log(`=======================================================`);
  logger.log(` Dayaar Real Estate CRM API running on port: ${port}`);
  logger.log(` API Base URL: http://0.0.0.0:${port}/api`);
  logger.log(` WebSocket Server listening on port: ${port}`);
  logger.log(`=======================================================`);
}

bootstrap().catch((err) => {
  console.error('Fatal Bootstrap Error:', err);
  process.exit(1);
});

