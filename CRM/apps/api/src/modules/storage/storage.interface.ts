export interface StoredObject {
  objectKey: string;
  byteSize: number;
  mimeType: string;
}

export interface IStorageProvider {
  put(objectKey: string, buffer: Buffer, mimeType: string): Promise<StoredObject>;
  getBuffer(objectKey: string): Promise<Buffer>;
  getSignedUrl(objectKey: string, ttlSeconds: number): Promise<string>;
  delete(objectKey: string): Promise<void>;
  exists(objectKey: string): Promise<boolean>;
  /**
   * Stored byte length, or null when the object is absent. Used to verify an
   * archive actually landed intact before the provider copy is deleted.
   */
  sizeOf(objectKey: string): Promise<number | null>;
}

export interface ArchivedRecording {
  /**
   * Durable off-host key. Null when Backblaze B2 is not configured, in which
   * case the only copy is the on-host backup and the provider copy MUST be
   * left in place.
   */
  b2Key: string | null;
  vpsPath: string;
  byteSize: number;
  mimeType: string;
  /**
   * True only when the recording reached storage that survives losing this
   * host. This is the sole authority for deleting the provider's copy.
   */
  durablePrimary: boolean;
}
