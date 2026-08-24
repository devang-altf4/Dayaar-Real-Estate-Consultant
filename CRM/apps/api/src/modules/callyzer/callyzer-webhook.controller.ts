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
    const rawHeaders = req?.headers || {};
    console.error('[CALLYZER WEBHOOK DEBUG HEADERS]:', JSON.stringify(rawHeaders, null, 2));
    console.error('[CALLYZER WEBHOOK DEBUG QUERY]:', JSON.stringify(req?.query, null, 2));

    let providedSecret =
      (typeof callyzerSecret === 'string' ? callyzerSecret : undefined) ||
      (typeof webhookSecret === 'string' ? webhookSecret : undefined) ||
      (typeof directSecret === 'string' ? directSecret : undefined) ||
      (typeof authorization === 'string' ? authorization.replace(/^Bearer\s+/i, '') : undefined) ||
      (rawHeaders['x-callyzer-signature'] as string) ||
      (rawHeaders['x-callyzer-secret'] as string) ||
      (rawHeaders['x-webhook-secret'] as string) ||
      (rawHeaders['callyzer-secret'] as string) ||
      (rawHeaders['secret'] as string) ||
      (rawHeaders['x-secret'] as string) ||
      (rawHeaders['x-api-key'] as string) ||
      (rawHeaders['authorization'] as string)?.replace(/^Bearer\s+/i, '') ||
      (req?.query?.secret as string) ||
      (payload && typeof payload === 'object' ? (payload as Record<string, unknown>)['secret'] : undefined);

    const expected = this.getExpectedSecret();

    // Dynamically match across any custom header or query param value
    if (!providedSecret && expected) {
      for (const val of Object.values(rawHeaders)) {
        if (typeof val === 'string' && val.trim() === expected) {
          providedSecret = val.trim();
          break;
        }
      }
      if (!providedSecret && req?.query) {
        for (const val of Object.values(req.query)) {
          if (typeof val === 'string' && val.trim() === expected) {
            providedSecret = val.trim();
            break;
          }
        }
      }
    }

    this.assertSecret(typeof providedSecret === 'string' ? providedSecret : undefined, expected);

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
    return { success: true, message: 'Webhook received successfully', accepted: true, duplicate: event.status === 'PROCESSED' };
  }

  private getExpectedSecret(): string {
    const fs = require('fs');
    const path = require('path');
    const dotenv = require('dotenv');

    const candidates = [
      path.resolve(process.cwd(), '../../.env'),
      path.resolve(process.cwd(), '../.env'),
      path.resolve(process.cwd(), '.env'),
      path.resolve(__dirname, '../../../../.env'),
      path.resolve(__dirname, '../../../.env'),
      'D:/coding/Dayaar Real Estate Consultant/CRM/.env',
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const parsed = dotenv.parse(fs.readFileSync(p));
        if (parsed.CALLYZER_WEBHOOK_SECRET) {
          process.env.CALLYZER_WEBHOOK_SECRET = parsed.CALLYZER_WEBHOOK_SECRET;
        }
        if (parsed.CALLYZER_ORGANIZATION_ID) {
          process.env.CALLYZER_ORGANIZATION_ID = parsed.CALLYZER_ORGANIZATION_ID;
        }
        break;
      }
    }

    return (process.env.CALLYZER_WEBHOOK_SECRET || '').trim();
  }

  private assertSecret(provided?: string, expectedValue?: string) {
    const expected = expectedValue || this.getExpectedSecret();
    if (!expected) throw new ServiceUnavailableException('CALLYZER_WEBHOOK_SECRET is not configured in .env.');
    if (!provided || !provided.trim()) throw new UnauthorizedException('Invalid Callyzer webhook secret: none provided.');

    const left = Buffer.from(expected);
    const right = Buffer.from(provided.trim());
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new UnauthorizedException('Invalid Callyzer webhook secret.');
    }
  }
}
