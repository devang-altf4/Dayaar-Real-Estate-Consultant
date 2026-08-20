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
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin && origin !== '*');
  app.enableCors({
    origin: corsOrigins,
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

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`=======================================================`);
  logger.log(` Dayaar Real Estate CRM API running on port: ${port}`);
  logger.log(` API Base URL: http://localhost:${port}/api`);
  logger.log(` WebSocket Server listening on port: ${port}`);
  logger.log(`=======================================================`);
}

bootstrap();
