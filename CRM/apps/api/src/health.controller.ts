import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  status() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      integrations: {
        callyzerConfigured: process.env.CALLYZER_INTEGRATION_ENABLED === 'true',
        recordingStorageConfigured: process.env.RECORDING_STORAGE_ENABLED === 'true',
        backgroundJobsEnabled: process.env.BACKGROUND_JOBS_ENABLED !== 'false',
      },
    };
  }
}
