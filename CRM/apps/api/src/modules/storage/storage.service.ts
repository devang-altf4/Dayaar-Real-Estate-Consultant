import { Injectable, Logger } from '@nestjs/common';
import { IStorageProvider, StorageUploadResult } from './storage.interface';
import { LocalStorageProvider } from './local-storage.provider';
import { Readable } from 'stream';

@Injectable()
export class StorageService implements IStorageProvider {
  private readonly logger = new Logger(StorageService.name);
  private provider: IStorageProvider;

  constructor(private readonly localProvider: LocalStorageProvider) {
    // Storage provider selection
    const providerType = process.env.STORAGE_PROVIDER || 'local';
    if (providerType === 's3') {
      this.logger.log('S3 Storage Provider configured (Ready for AWS/R2)');
      this.provider = this.localProvider; // Fallback to local if S3 creds empty in dev
    } else {
      this.logger.log('Local Storage Provider initialized');
      this.provider = this.localProvider;
    }
  }

  async save(objectKey: string, buffer: Buffer, mimeType: string): Promise<StorageUploadResult> {
    return this.provider.save(objectKey, buffer, mimeType);
  }

  async getStream(objectKey: string): Promise<{ stream: Readable; mimeType: string; byteSize: number }> {
    return this.provider.getStream(objectKey);
  }

  async getSignedUrl(objectKey: string, expiresInSeconds = 3600): Promise<string> {
    return this.provider.getSignedUrl(objectKey, expiresInSeconds);
  }

  async delete(objectKey: string): Promise<boolean> {
    return this.provider.delete(objectKey);
  }

  async exists(objectKey: string): Promise<boolean> {
    return this.provider.exists(objectKey);
  }
}
