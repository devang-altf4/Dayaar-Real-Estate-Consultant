import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ArchivedRecording } from './storage.interface';
import { B2StorageProvider } from './b2-storage.provider';
import { VpsStorageProvider } from './vps-storage.provider';

const MAX_RECORDING_BYTES = 50 * 1024 * 1024;

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly b2: B2StorageProvider,
    private readonly vps: VpsStorageProvider,
  ) {}

  /**
   * True only when recordings reach storage that survives the loss of this
   * host. On an ephemeral filesystem (Render, containers) the on-host backup
   * is NOT durable, so this stays false and the provider copy must be kept.
   */
  primaryIsDurable(): boolean {
    return process.env.RECORDING_STORAGE_ENABLED === 'true' && this.b2.isConfigured();
  }

  /** Retained for callers that only need to know whether B2 playback works. */
  b2Enabled(): boolean {
    return this.primaryIsDurable();
  }

  /**
   * Refuses to boot a production instance that would archive recordings onto a
   * disk it cannot trust. Without this, the archival pipeline deletes the
   * provider's copy and the only remaining copy dies with the container.
   */
  assertProductionReady(): void {
    if (process.env.NODE_ENV !== 'production') return;
    if (process.env.RECORDING_STORAGE_ENABLED !== 'true') {
      this.logger.warn(
        'RECORDING_STORAGE_ENABLED is not true: recordings will be archived on-host only and ' +
          'provider copies will be retained. Configure Backblaze B2 before going live.',
      );
      return;
    }
    if (!this.b2.isConfigured()) {
      throw new Error(
        'RECORDING_STORAGE_ENABLED=true but Backblaze B2 is not configured. Set B2_S3_ENDPOINT, ' +
          'B2_S3_REGION, B2_BUCKET, B2_APPLICATION_KEY_ID and B2_APPLICATION_KEY, or disable ' +
          'recording storage. Refusing to start with an unsafe recording archive.',
      );
    }
  }

  async archiveFromUrl(params: {
    organizationId: string;
    callAttemptId: string;
    providerCallId: string;
    url: string;
  }): Promise<ArchivedRecording> {
    const response = await fetch(params.url, {
      headers: { Accept: 'audio/*,application/octet-stream' },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Recording download failed with HTTP ${response.status}.`);
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_RECORDING_BYTES) throw new Error('Recording exceeds the 50 MB archive limit.');
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_RECORDING_BYTES) {
      throw new Error('Recording is empty or exceeds the archive limit.');
    }
    const mimeType = (response.headers.get('content-type') || 'audio/mpeg').split(';')[0];
    const extension = this.extensionFor(mimeType);
    const digest = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    const key = `recordings/${params.organizationId}/${params.callAttemptId}/${params.providerCallId}-${digest}.${extension}`;

    const durablePrimary = this.primaryIsDurable();
    if (durablePrimary) {
      await this.b2.put(key, buffer, mimeType);
    }
    // The on-host copy is always written: it is the backup tier when B2 is
    // configured, and the demo/playback copy when it is not.
    await this.vps.put(key, buffer, mimeType);

    // Verify by byte length, not existence. A truncated or zero-byte object
    // "exists" and would otherwise authorise deleting the provider's copy.
    await this.assertStoredSize(this.vps, key, buffer.length, 'on-host backup');
    if (durablePrimary) {
      await this.assertStoredSize(this.b2, key, buffer.length, 'Backblaze B2');
    }

    return {
      b2Key: durablePrimary ? key : null,
      vpsPath: key,
      byteSize: buffer.length,
      mimeType,
      durablePrimary,
    };
  }

  private async assertStoredSize(
    provider: { sizeOf(key: string): Promise<number | null> },
    key: string,
    expected: number,
    label: string,
  ): Promise<void> {
    const stored = await provider.sizeOf(key);
    if (stored === null) {
      throw new Error(`Recording archive verification failed: ${label} has no object at ${key}.`);
    }
    if (stored !== expected) {
      throw new Error(
        `Recording archive verification failed: ${label} stored ${stored} bytes, expected ${expected}.`,
      );
    }
  }

  /** Reads back an archived object, preferring the durable copy. */
  async getArchivedBuffer(b2Key: string | null, vpsPath: string | null): Promise<Buffer> {
    if (b2Key && this.primaryIsDurable()) return this.b2.getBuffer(b2Key);
    if (vpsPath) return this.vps.getBuffer(vpsPath);
    throw new ServiceUnavailableException('No archived copy of this recording is available.');
  }

  async getSignedUrl(key: string, ttlSeconds = 300): Promise<string> {
    if (!this.primaryIsDurable()) {
      throw new ServiceUnavailableException({
        code: 'SIGNED_URLS_UNAVAILABLE',
        message: 'Signed recording URLs require Backblaze B2 to be configured.',
      });
    }
    return this.b2.getSignedUrl(key, ttlSeconds);
  }

  async deletePrimary(b2Key: string | null): Promise<void> {
    if (b2Key && this.primaryIsDurable()) await this.b2.delete(b2Key);
  }

  async deleteBoth(b2Key: string | null, backupPath: string | null): Promise<void> {
    await Promise.all([
      this.deletePrimary(b2Key),
      backupPath ? this.vps.delete(backupPath) : Promise.resolve(),
    ]);
  }

  async putExport(key: string, buffer: Buffer): Promise<void> {
    if (this.primaryIsDurable()) await this.b2.put(key, buffer, 'application/zip');
    else await this.vps.put(key, buffer, 'application/zip');
  }

  async getExportBuffer(key: string): Promise<Buffer> {
    return this.primaryIsDurable() ? this.b2.getBuffer(key) : this.vps.getBuffer(key);
  }

  private extensionFor(mimeType: string): string {
    const mapping: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/mp4': 'm4a',
      'audio/m4a': 'm4a',
      'audio/aac': 'aac',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/ogg': 'ogg',
    };
    return mapping[mimeType] || 'bin';
  }
}
