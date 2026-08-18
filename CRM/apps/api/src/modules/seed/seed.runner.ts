import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SeedService } from './seed.service';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seedService = app.get(SeedService);

  console.log('--- EXECUTING SEED SCRIPT ---');
  await seedService.runSeed();
  console.log('--- SEED SCRIPT FINISHED ---');

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Seed runner failed:', err);
  process.exit(1);
});
