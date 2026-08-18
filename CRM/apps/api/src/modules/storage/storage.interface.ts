import { Readable } from 'stream';

export interface StorageUploadResult {
  objectKey: string;
  byteSize: number;
  mimeType: string;
}

export interface IStorageProvider {
  save(objectKey: string, buffer: Buffer, mimeType: string): Promise<StorageUploadResult>;
  getStream(objectKey: string): Promise<{ stream: Readable; mimeType: string; byteSize: number }>;
  getSignedUrl(objectKey: string, expiresInSeconds?: number): Promise<string>;
  delete(objectKey: string): Promise<boolean>;
  exists(objectKey: string): Promise<boolean>;
}
