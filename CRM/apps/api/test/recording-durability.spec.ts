import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RecordingStatus, Role } from '@dayaar/shared';
import { StorageService } from '../src/modules/storage/storage.service';
import { RecordingsService } from '../src/modules/callyzer/recordings.service';

/**
 * Guards the invariant that the provider's copy of a recording is only ever
 * deleted once our own copy is somewhere that outlives this host.
 */
describe('Recording archive durability', () => {
  const originalStorageFlag = process.env.RECORDING_STORAGE_ENABLED;
  const originalEndpoint = process.env.B2_S3_ENDPOINT;
  const originalRegion = process.env.B2_S3_REGION;
  const originalBucket = process.env.B2_BUCKET;
  const originalKeyId = process.env.B2_APPLICATION_KEY_ID;
  const originalKey = process.env.B2_APPLICATION_KEY;

  const restore = (name: string, value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };

  afterEach(() => {
    restore('RECORDING_STORAGE_ENABLED', originalStorageFlag);
    restore('B2_S3_ENDPOINT', originalEndpoint);
    restore('B2_S3_REGION', originalRegion);
    restore('B2_BUCKET', originalBucket);
    restore('B2_APPLICATION_KEY_ID', originalKeyId);
    restore('B2_APPLICATION_KEY', originalKey);
    jest.restoreAllMocks();
  });

  const configureB2 = () => {
    process.env.RECORDING_STORAGE_ENABLED = 'true';
    process.env.B2_S3_ENDPOINT = 'https://s3.example.backblazeb2.com';
    process.env.B2_S3_REGION = 'us-west-000';
    process.env.B2_BUCKET = 'test-bucket';
    process.env.B2_APPLICATION_KEY_ID = 'key-id';
    process.env.B2_APPLICATION_KEY = 'key-secret';
  };

  const buildAttempt = (overrides: Record<string, unknown> = {}) => ({
    _id: new Types.ObjectId(),
    organizationId: new Types.ObjectId(),
    employeeId: new Types.ObjectId(),
    deviceId: null,
    providerCallId: 'provider-call-1',
    recordingStatus: RecordingStatus.PENDING,
    recordingB2Key: null as string | null,
    recordingVpsPath: null as string | null,
    recordingBytes: null,
    recordingMimeType: null,
    archivedAt: null,
    providerRecordingDeletedAt: null as Date | null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const buildService = (attempt: any, storage: any, callyzer: any) =>
    new RecordingsService(
      {
        findOneAndUpdate: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(attempt),
        }),
        findById: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(attempt) }),
      } as any,
      { create: jest.fn().mockResolvedValue(undefined) } as any,
      {} as any,
      {} as any,
      storage as any,
      callyzer as any,
      { enqueue: jest.fn() } as any,
      { log: jest.fn() } as any,
    );

  it('does not treat an on-host-only archive as durable', () => {
    process.env.RECORDING_STORAGE_ENABLED = 'false';
    const storage = new StorageService({ isConfigured: () => false } as any, {} as any);
    expect(storage.primaryIsDurable()).toBe(false);
  });

  it('does not treat B2 as durable when its credentials are absent', () => {
    process.env.RECORDING_STORAGE_ENABLED = 'true';
    const storage = new StorageService({ isConfigured: () => false } as any, {} as any);
    expect(storage.primaryIsDurable()).toBe(false);
  });

  it('keeps the provider recording when there is no durable archive', async () => {
    const attempt = buildAttempt();
    const storage = {
      primaryIsDurable: () => false,
      archiveFromUrl: jest.fn().mockResolvedValue({
        b2Key: null,
        vpsPath: 'recordings/org/attempt/provider-call-1.mp3',
        byteSize: 2048,
        mimeType: 'audio/mpeg',
        durablePrimary: false,
      }),
    };
    const callyzer = { removeRecording: jest.fn() };

    await buildService(attempt, storage, callyzer).archive(
      attempt._id.toString(),
      'https://media.callyzer/recording.mp3',
    );

    expect(callyzer.removeRecording).not.toHaveBeenCalled();
    expect(attempt.providerRecordingDeletedAt).toBeNull();
    expect(attempt.recordingStatus).toBe(RecordingStatus.ARCHIVED);
  });

  it('deletes the provider recording only after a durable archive is verified', async () => {
    const attempt = buildAttempt();
    const storage = {
      primaryIsDurable: () => true,
      archiveFromUrl: jest.fn().mockResolvedValue({
        b2Key: 'recordings/org/attempt/provider-call-1.mp3',
        vpsPath: 'recordings/org/attempt/provider-call-1.mp3',
        byteSize: 2048,
        mimeType: 'audio/mpeg',
        durablePrimary: true,
      }),
    };
    const callyzer = { removeRecording: jest.fn().mockResolvedValue(undefined) };

    await buildService(attempt, storage, callyzer).archive(
      attempt._id.toString(),
      'https://media.callyzer/recording.mp3',
    );

    expect(callyzer.removeRecording).toHaveBeenCalledWith('provider-call-1');
    expect(attempt.providerRecordingDeletedAt).toBeInstanceOf(Date);
  });

  it('rejects a purge that would leave no second copy', async () => {
    const service = new RecordingsService(
      {} as any,
      {} as any,
      {} as any,
      {
        findOne: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          organizationId: new Types.ObjectId(),
          from: new Date(),
          to: new Date(),
        }),
      } as any,
      { primaryIsDurable: () => false } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.purgeExportedRange(
        { id: new Types.ObjectId().toString(), organizationId: new Types.ObjectId().toString(), role: Role.ADMIN } as any,
        new Types.ObjectId().toString(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('verifies an archive by byte length rather than mere existence', async () => {
    configureB2();
    const put = jest.fn().mockResolvedValue(undefined);
    const storage = new StorageService(
      { isConfigured: () => true, put, sizeOf: jest.fn().mockResolvedValue(3) } as any,
      { put, sizeOf: jest.fn().mockResolvedValue(3) } as any,
    );
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'audio/mpeg', 'content-length': '4' }),
      arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
    } as any);

    await expect(
      storage.archiveFromUrl({
        organizationId: new Types.ObjectId().toString(),
        callAttemptId: new Types.ObjectId().toString(),
        providerCallId: 'provider-call-1',
        url: 'https://media.callyzer/recording.mp3',
      }),
    ).rejects.toThrow(/stored 3 bytes, expected 4/);
  });
});
