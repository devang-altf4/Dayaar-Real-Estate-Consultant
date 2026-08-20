import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { normalizePhoneToE164, ProviderCallType } from '@dayaar/shared';
import { ProviderThrottle, ProviderThrottleDocument } from '../../database/schemas/provider-throttle.schema';
import { ICallCaptureProvider, NormalizedProviderCall } from '../calling/calling-provider.interface';

interface CallyzerHistoryResponse {
  result?: Array<Record<string, unknown>>;
  total_records?: number;
  message?: string;
}

@Injectable()
export class CallyzerClient implements ICallCaptureProvider {
  constructor(
    @InjectModel(ProviderThrottle.name)
    private readonly throttleModel: Model<ProviderThrottleDocument>,
  ) {}

  async fetchHistory(from: Date, to: Date, page: number) {
    // Callyzer rejects ranges wider than 180 days with a 400.
    const maxRangeMs = 180 * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maxRangeMs) {
      throw new Error('Callyzer history requests cannot span more than 180 days.');
    }
    const body = await this.request<CallyzerHistoryResponse>('/call-log/history', 'POST', {
      synced_from: Math.floor(from.getTime() / 1000),
      synced_to: Math.floor(to.getTime() / 1000),
      call_types: ['Incoming', 'Outgoing', 'Missed', 'Rejected'],
      page_no: page,
      page_size: 100,
      call_method: 'PhoneCall',
      call_mode: 'Voice',
    });
    return {
      calls: (body.result || []).map((call) => this.normalize(call)),
      totalRecords: Number(body.total_records || 0),
    };
  }

  async removeRecording(providerCallId: string): Promise<void> {
    const response = await this.request<{ result?: Array<{ id: string; status: string; message: string }> }>(
      '/call-log/call-recording/remove',
      'DELETE',
      { unique_ids: [providerCallId] },
    );
    const result = response.result?.find((item) => item.id.trim() === providerCallId);
    const message = result?.message?.toLowerCase() || '';
    const alreadyAbsent = message.includes('not found') || message.includes('already removed') || message.includes('no recording');
    if ((!result || result.status.toLowerCase() !== 'success') && !alreadyAbsent) {
      throw new Error(result?.message || 'Callyzer did not confirm recording removal.');
    }
  }

  normalize(raw: Record<string, unknown>): NormalizedProviderCall {
    const callDate = this.parseProviderDate(
      String(raw.call_date || ''),
      String(raw.call_time || '00:00:00'),
    );
    return {
      providerCallId: String(raw.id || ''),
      employeePhoneNumber: normalizePhoneToE164(
        `${String(raw.emp_country_code || '91')}${String(raw.emp_number || '')}`,
      ),
      clientPhoneNumber: normalizePhoneToE164(
        `${String(raw.client_country_code || '91')}${String(raw.client_number || '')}`,
      ),
      duration: Math.max(0, Number(raw.duration || 0)),
      callType: String(raw.call_type || ProviderCallType.OUTGOING),
      callDate,
      syncedAt: raw.synced_at ? this.parseLooseDate(String(raw.synced_at)) : undefined,
      recordingUrl: raw.call_recording_url ? String(raw.call_recording_url) : undefined,
      raw,
    };
  }

  private async request<T>(path: string, method: 'POST' | 'DELETE', payload: unknown): Promise<T> {
    const token = process.env.CALLYZER_API_TOKEN;
    if (!token) {
      throw new ServiceUnavailableException({
        code: 'CALLYZER_NOT_CONFIGURED',
        message: 'CALLYZER_API_TOKEN is required for provider synchronization.',
      });
    }
    await this.acquireGlobalSlot();
    const base = process.env.CALLYZER_BASE_URL || 'https://api1.callyzer.co/api/v2.2';
    const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status === 429) {
      const retryAfter = Math.max(2, Number(response.headers.get('retry-after') || 2));
      throw Object.assign(new Error('Callyzer rate limit reached.'), { retryAfterSeconds: retryAfter });
    }
    const body = (await response.json().catch(() => ({}))) as any;
    if (!response.ok) {
      throw new Error(`Callyzer HTTP ${response.status}: ${String(body?.message || 'request failed')}`);
    }
    return body as T;
  }

  private async acquireGlobalSlot(): Promise<void> {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const now = new Date();
      try {
        const claimed = await this.throttleModel.findOneAndUpdate(
          {
            _id: 'callyzer',
            $or: [{ availableAt: { $lte: now } }, { availableAt: { $exists: false } }],
          },
          { $set: { availableAt: new Date(now.getTime() + 2100) } },
          { new: true, upsert: attempt === 0 },
        );
        if (claimed) return;
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error('Timed out waiting for the global Callyzer request slot.');
  }

  private parseProviderDate(date: string, time: string): Date {
    const offset = process.env.CALLYZER_TIMEZONE_OFFSET || '+05:30';
    const parsed = new Date(`${date}T${time}${offset}`);
    if (Number.isNaN(parsed.getTime())) throw new Error('Callyzer call has an invalid call date.');
    return parsed;
  }

  private parseLooseDate(value: string): Date {
    const normalized = value.replace(/\s+(IST|Asia\/Kolkata)$/i, '').replace(' ', 'T');
    const withOffset = /(?:Z|[+-]\d\d:\d\d)$/.test(normalized)
      ? normalized
      : `${normalized}${process.env.CALLYZER_TIMEZONE_OFFSET || '+05:30'}`;
    const parsed = new Date(withOffset);
    if (Number.isNaN(parsed.getTime())) throw new Error('Callyzer call has an invalid sync timestamp.');
    return parsed;
  }
}
