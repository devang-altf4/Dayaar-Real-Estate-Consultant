import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Public } from '../../common/decorators/public.decorator';
import { CallyzerWebhookEvent, CallyzerWebhookEventDocument } from '../../database/schemas/callyzer-webhook-event.schema';
import { IntegrationJobsService } from './integration-jobs.service';

@Controller('integrations/callyzer')
export class CallyzerWebhookController {
  constructor(
    @InjectModel(CallyzerWebhookEvent.name)
    private readonly eventModel: Model<CallyzerWebhookEventDocument>,
    private readonly jobs: IntegrationJobsService,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(202)
  async receive(
    @Body() payload: unknown,
    @Headers('x-callyzer-secret') callyzerSecret?: string,
    @Headers('x-webhook-secret') webhookSecret?: string,
    @Headers('authorization') authorization?: string,
  ) {
    // Header only. A query-string secret is copied into access logs, proxy
    // logs and platform request logs, which leaks the shared credential.
    this.assertSecret(callyzerSecret || webhookSecret || authorization?.replace(/^Bearer\s+/i, ''));
    const organizationId = process.env.CALLYZER_ORGANIZATION_ID;
    if (!organizationId || !Types.ObjectId.isValid(organizationId)) {
      throw new ServiceUnavailableException('CALLYZER_ORGANIZATION_ID is not configured.');
    }
    const dedupeKey = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    let event = await this.eventModel.findOne({ dedupeKey });
    if (!event) {
      try {
        event = await this.eventModel.create({
          organizationId: new Types.ObjectId(organizationId),
          dedupeKey,
          payload,
          status: 'RECEIVED',
        });
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
        event = await this.eventModel.findOne({ dedupeKey });
      }
    }
    if (!event) throw new Error('Unable to persist the webhook event.');
    await this.jobs.enqueue({
      key: `webhook:${event._id.toString()}`,
      organizationId,
      type: 'PROCESS_WEBHOOK',
      payload: { eventId: event._id.toString() },
    });
    return { accepted: true, duplicate: event.status === 'PROCESSED' };
  }

  private assertSecret(provided?: string) {
    const expected = process.env.CALLYZER_WEBHOOK_SECRET;
    if (!expected) throw new ServiceUnavailableException('Callyzer webhook secret is not configured.');
    if (!provided) throw new UnauthorizedException('Invalid Callyzer webhook secret.');
    const left = Buffer.from(expected);
    const right = Buffer.from(provided);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new UnauthorizedException('Invalid Callyzer webhook secret.');
    }
  }
}
