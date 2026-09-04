import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Public } from '../../common/decorators/public.decorator';
import { CallyzerWebhookEvent, CallyzerWebhookEventDocument } from '../../database/schemas/callyzer-webhook-event.schema';
import { IntegrationJobsService } from './integration-jobs.service';

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = sortKeys((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}

@Controller('integrations/callyzer')
export class CallyzerWebhookController {
  constructor(
    @InjectModel(CallyzerWebhookEvent.name)
    private readonly eventModel: Model<CallyzerWebhookEventDocument>,
    private readonly jobs: IntegrationJobsService,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async receive(
    @Body() payload: unknown,
    @Headers('x-callyzer-secret') callyzerSecret?: string,
    @Headers('x-webhook-secret') webhookSecret?: string,
    @Headers('authorization') authorization?: string,
    @Headers('secret') directSecret?: string,
    @Req() req?: Request,
  ) {
    const providedSecret =
      (typeof callyzerSecret === 'string' ? callyzerSecret : undefined) ||
      (typeof webhookSecret === 'string' ? webhookSecret : undefined) ||
      (typeof directSecret === 'string' ? directSecret : undefined) ||
      (typeof authorization === 'string' ? authorization.replace(/^Bearer\s+/i, '') : undefined) ||
      (req?.query?.secret as string) ||
      (payload && typeof payload === 'object' ? (payload as Record<string, unknown>)['secret'] as string : undefined);

    const expected = (process.env.CALLYZER_WEBHOOK_SECRET || '').trim();

    this.assertSecret(typeof providedSecret === 'string' ? providedSecret : undefined, expected);

    const organizationId = process.env.CALLYZER_ORGANIZATION_ID;
    if (!organizationId || !Types.ObjectId.isValid(organizationId)) {
      throw new ServiceUnavailableException('CALLYZER_ORGANIZATION_ID is not configured.');
    }
    // Stable dedupe: recursive key sort so reordered retries map to the same key
    const stable = JSON.stringify(sortKeys(payload));
    const dedupeKey = createHash('sha256').update(stable).digest('hex');
    let event = await this.eventModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      dedupeKey,
    });
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
        event = await this.eventModel.findOne({
          organizationId: new Types.ObjectId(organizationId),
          dedupeKey,
        });
      }
    }
    if (!event) throw new Error('Unable to persist the webhook event.');
    await this.jobs.enqueue({
      key: `webhook:${event._id.toString()}`,
      organizationId,
      type: 'PROCESS_WEBHOOK',
      payload: { eventId: event._id.toString() },
    });
    return { success: true, message: 'Webhook received successfully', accepted: true, duplicate: event.status === 'PROCESSED' };
  }

  private assertSecret(provided?: string, expectedValue?: string) {
    const expected = (expectedValue || '').trim();
    if (!expected) throw new ServiceUnavailableException('CALLYZER_WEBHOOK_SECRET is not configured in .env.');
    if (!provided || !provided.trim()) throw new UnauthorizedException('Invalid Callyzer webhook secret: none provided.');

    const left = Buffer.from(expected);
    const right = Buffer.from(provided.trim());
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new UnauthorizedException('Invalid Callyzer webhook secret.');
    }
  }
}
