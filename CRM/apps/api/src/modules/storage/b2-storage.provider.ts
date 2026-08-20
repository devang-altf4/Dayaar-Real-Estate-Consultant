import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageProvider, StoredObject } from './storage.interface';

@Injectable()
export class B2StorageProvider implements IStorageProvider {
  private client: S3Client | null = null;

  async put(objectKey: string, buffer: Buffer, mimeType: string): Promise<StoredObject> {
    await this.getClient().send(new PutObjectCommand({
      Bucket: this.bucket(),
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType,
    }));
    return { objectKey, byteSize: buffer.length, mimeType };
  }

  async getBuffer(objectKey: string): Promise<Buffer> {
    const response = await this.getClient().send(new GetObjectCommand({
      Bucket: this.bucket(),
      Key: objectKey,
    }));
    if (!response.Body) throw new Error('B2 returned an empty object body.');
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async getSignedUrl(objectKey: string, ttlSeconds: number): Promise<string> {
    return getSignedUrl(
      this.getClient(),
      new GetObjectCommand({ Bucket: this.bucket(), Key: objectKey }),
      { expiresIn: Math.min(900, Math.max(30, ttlSeconds)) },
    );
  }

  async delete(objectKey: string): Promise<void> {
    await this.getClient().send(new DeleteObjectCommand({ Bucket: this.bucket(), Key: objectKey }));
  }

  async exists(objectKey: string): Promise<boolean> {
    return (await this.sizeOf(objectKey)) !== null;
  }

  async sizeOf(objectKey: string): Promise<number | null> {
    try {
      const response = await this.getClient().send(
        new HeadObjectCommand({ Bucket: this.bucket(), Key: objectKey }),
      );
      return Number(response.ContentLength ?? 0);
    } catch (error: any) {
      if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') return null;
      throw error;
    }
  }

  isConfigured(): boolean {
    return Boolean(
      process.env.B2_S3_ENDPOINT &&
        process.env.B2_S3_REGION &&
        process.env.B2_APPLICATION_KEY_ID &&
        process.env.B2_APPLICATION_KEY &&
        process.env.B2_BUCKET,
    );
  }

  private getClient(): S3Client {
    if (this.client) return this.client;
    const endpoint = process.env.B2_S3_ENDPOINT;
    const region = process.env.B2_S3_REGION;
    const accessKeyId = process.env.B2_APPLICATION_KEY_ID;
    const secretAccessKey = process.env.B2_APPLICATION_KEY;
    if (!endpoint || !region || !accessKeyId || !secretAccessKey || !process.env.B2_BUCKET) {
      throw new ServiceUnavailableException({
        code: 'B2_NOT_CONFIGURED',
        message: 'Backblaze B2 credentials are required when recording integration is enabled.',
      });
    }
    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
    return this.client;
  }

  private bucket(): string {
    const bucket = process.env.B2_BUCKET;
    if (!bucket) throw new ServiceUnavailableException('B2_BUCKET is not configured.');
    return bucket;
  }
}
