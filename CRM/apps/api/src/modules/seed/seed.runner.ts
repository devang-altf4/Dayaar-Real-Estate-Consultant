import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SeedService } from './seed.service';

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
