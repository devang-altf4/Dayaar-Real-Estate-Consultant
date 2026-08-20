import {
  Controller,
  Headers,
  HttpCode,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Public } from '../../common/decorators/public.decorator';
import { IntegrationWorkerService } from './integration-worker.service';

/**
 * External scheduler entry point. The in-process worker interval cannot be
 * relied on where the instance sleeps or scales to zero, so reconciliation,
 * retention and archival can also be driven by a platform cron job hitting
 * this route with the shared secret.
 */
@Controller('integrations/maintenance')
export class IntegrationMaintenanceController {
  constructor(private readonly worker: IntegrationWorkerService) {}

  @Public()
  @Post('run')
  @HttpCode(200)
  async run(
    @Headers('x-maintenance-secret') maintenanceSecret?: string,
    @Headers('authorization') authorization?: string,
  ) {
    this.assertSecret(maintenanceSecret || authorization?.replace(/^Bearer\s+/i, ''));
    return this.worker.runMaintenanceNow();
  }

  private assertSecret(provided?: string) {
    const expected = process.env.MAINTENANCE_TRIGGER_SECRET;
    if (!expected) {
      throw new ServiceUnavailableException('MAINTENANCE_TRIGGER_SECRET is not configured.');
    }
    if (!provided) throw new UnauthorizedException('Invalid maintenance secret.');
    const left = Buffer.from(expected);
    const right = Buffer.from(provided);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new UnauthorizedException('Invalid maintenance secret.');
    }
  }
}
