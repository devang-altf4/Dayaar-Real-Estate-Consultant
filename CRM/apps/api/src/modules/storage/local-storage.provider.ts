import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import * as mime from 'mime-types';
import { IStorageProvider, StorageUploadResult } from './storage.interface';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly basePath: string;

  constructor() {
    this.basePath = path.resolve(process.env.LOCAL_STORAGE_PATH || './uploads/recordings');
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async save(objectKey: string, buffer: Buffer, mimeType: string): Promise<StorageUploadResult> {
    const fullPath = path.join(this.basePath, objectKey);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(fullPath, buffer);
    const stats = await fs.promises.stat(fullPath);

    return {
      objectKey,
      byteSize: stats.size,
      mimeType: mimeType || (mime.lookup(fullPath) as string) || 'audio/mp4',
    };
  }

  async getStream(objectKey: string): Promise<{ stream: Readable; mimeType: string; byteSize: number }> {
    const fullPath = path.join(this.basePath, objectKey);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`Recording not found at path: ${objectKey}`);
    }

    const stats = await fs.promises.stat(fullPath);
    const detectedMime = (mime.lookup(fullPath) as string) || 'audio/mp4';
    const stream = fs.createReadStream(fullPath);

    return {
      stream,
      mimeType: detectedMime,
      byteSize: stats.size,
    };
  }

  async getSignedUrl(objectKey: string, expiresInSeconds = 3600): Promise<string> {
    // For local dev, returns authenticated stream route
    const apiUrl = process.env.API_URL || 'http://localhost:4000/api';
    return `${apiUrl}/calls/recording-stream/${encodeURIComponent(objectKey)}`;
  }

  async delete(objectKey: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, objectKey);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
    return false;
  }

  async exists(objectKey: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, objectKey);
    return fs.existsSync(fullPath);
  }
}
