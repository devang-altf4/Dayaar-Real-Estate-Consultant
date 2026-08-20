import { Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { IStorageProvider, StoredObject } from './storage.interface';

@Injectable()
export class VpsStorageProvider implements IStorageProvider {
  private readonly basePath = path.resolve(
    process.env.VPS_RECORDING_BACKUP_PATH || './data/recording-backup',
  );

  async put(objectKey: string, buffer: Buffer, mimeType: string): Promise<StoredObject> {
    const fullPath = this.resolveKey(objectKey);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const temporary = `${fullPath}.${process.pid}.tmp`;
    await fs.writeFile(temporary, buffer);
    await fs.rename(temporary, fullPath);
    return { objectKey, byteSize: buffer.length, mimeType };
  }

  async getBuffer(objectKey: string): Promise<Buffer> {
    try {
      return await fs.readFile(this.resolveKey(objectKey));
    } catch (error: any) {
      if (error?.code === 'ENOENT') throw new NotFoundException('Recording backup not found.');
      throw error;
    }
  }

  async getSignedUrl(): Promise<string> {
    throw new Error('VPS backup objects are never directly exposed.');
  }

  async delete(objectKey: string): Promise<void> {
    try {
      await fs.unlink(this.resolveKey(objectKey));
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  async exists(objectKey: string): Promise<boolean> {
    return (await this.sizeOf(objectKey)) !== null;
  }

  async sizeOf(objectKey: string): Promise<number | null> {
    try {
      const stats = await fs.stat(this.resolveKey(objectKey));
      return stats.size;
    } catch (error: any) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  }

  private resolveKey(objectKey: string): string {
    if (!/^[a-zA-Z0-9/_\-.]+$/.test(objectKey) || objectKey.includes('..')) {
      throw new Error('Invalid storage object key.');
    }
    const resolved = path.resolve(this.basePath, objectKey);
    const prefix = `${this.basePath}${path.sep}`;
    if (resolved !== this.basePath && !resolved.startsWith(prefix)) {
      throw new Error('Storage key escapes the configured backup directory.');
    }
    return resolved;
  }
}
