import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CallEventType, IAuthUser, RecordingStatus, Role } from '@dayaar/shared';
import { CallAttempt, CallAttemptDocument } from '../../database/schemas/call-attempt.schema';
import { CallEvent, CallEventDocument } from '../../database/schemas/call-event.schema';
import { Organization, OrganizationDocument } from '../../database/schemas/organization.schema';
import { RecordingExport, RecordingExportDocument } from '../../database/schemas/recording-export.schema';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { CallyzerClient } from './callyzer.client';
import { IntegrationJobsService } from './integration-jobs.service';
import { createStoreOnlyZip } from './zip.util';

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);

  constructor(
    @InjectModel(CallAttempt.name) private readonly attemptModel: Model<CallAttemptDocument>,
    @InjectModel(CallEvent.name) private readonly eventModel: Model<CallEventDocument>,
    @InjectModel(Organization.name) private readonly orgModel: Model<OrganizationDocument>,
    @InjectModel(RecordingExport.name) private readonly exportModel: Model<RecordingExportDocument>,
    private readonly storage: StorageService,
    private readonly callyzer: CallyzerClient,
    private readonly jobs: IntegrationJobsService,
    private readonly audit: AuditService,
  ) {}

  async archive(callAttemptId: string, recordingUrl: string): Promise<void> {
    const attempt = await this.attemptModel.findById(callAttemptId).select('+recordingB2Key +recordingVpsPath');
    if (!attempt || !attempt.providerCallId) throw new NotFoundException('Archive call attempt not found.');
    if (attempt.providerRecordingDeletedAt) return;

    const alreadyArchived =
      attempt.recordingStatus === RecordingStatus.ARCHIVED && Boolean(attempt.recordingVpsPath);
    // Re-archive when a durable store became available after an on-host-only
    // archive, so recordings captured before B2 was configured get promoted.
    const needsArchive = !alreadyArchived || (this.storage.primaryIsDurable() && !attempt.recordingB2Key);

    try {
      if (needsArchive) {
        attempt.recordingStatus = RecordingStatus.ARCHIVING;
        await attempt.save();
        const archived = await this.storage.archiveFromUrl({
          organizationId: attempt.organizationId.toString(),
          callAttemptId: attempt._id.toString(),
          providerCallId: attempt.providerCallId,
          url: recordingUrl,
        });
        // Persist verified archive locations before deleting the provider copy.
        attempt.recordingB2Key = archived.b2Key;
        attempt.recordingVpsPath = archived.vpsPath;
        attempt.recordingBytes = archived.byteSize;
        attempt.recordingMimeType = archived.mimeType;
        attempt.recordingStatus = RecordingStatus.ARCHIVED;
        attempt.archivedAt = new Date();
        await attempt.save();
      }

      await this.eventModel.create({
        organizationId: attempt.organizationId,
        callAttemptId: attempt._id,
        employeeId: attempt.employeeId,
        deviceId: attempt.deviceId,
        type: CallEventType.RECORDING_ARCHIVED,
        metadata: { byteSize: attempt.recordingBytes, durable: Boolean(attempt.recordingB2Key) },
      });

      // Deleting the provider's copy is only safe once the recording exists in
      // storage that outlives this host. Without a durable copy the on-host
      // file is the ONLY one, and an ephemeral filesystem would lose it
      // permanently, so the provider copy is deliberately retained.
      if (!attempt.recordingB2Key) {
        this.logger.warn(
          `Retaining the provider recording for call ${attempt._id.toString()}: no durable archive ` +
            'is configured. Configure Backblaze B2 to enable provider-side cleanup.',
        );
        return;
      }

      await this.callyzer.removeRecording(attempt.providerCallId);
      attempt.providerRecordingDeletedAt = new Date();
      await attempt.save();
    } catch (error) {
      if (!attempt.recordingVpsPath) {
        attempt.recordingStatus = RecordingStatus.FAILED;
        await attempt.save();
      }
      throw error;
    }
  }

  async createExport(user: IAuthUser, from: Date, to: Date) {
    const record = await this.exportModel.create({
      organizationId: new Types.ObjectId(user.organizationId),
      requestedBy: new Types.ObjectId(user.id),
      from,
      to,
      status: 'QUEUED',
    });
    await this.jobs.enqueue({
      key: `recording-export:${record._id.toString()}`,
      organizationId: user.organizationId,
      type: 'RECORDING_EXPORT',
      payload: { exportId: record._id.toString() },
      maxAttempts: 3,
    });
    return { id: record._id.toString(), status: record.status };
  }

  async buildExport(exportId: string): Promise<void> {
    const record = await this.exportModel.findById(exportId).select('+objectKey');
    if (!record || record.status === 'READY') return;
    record.status = 'RUNNING';
    await record.save();
    try {
      const attempts = await this.attemptModel
        .find({
          organizationId: record.organizationId,
          dialedAt: { $gte: record.from, $lte: record.to },
          recordingStatus: RecordingStatus.ARCHIVED,
        })
        .select('+recordingB2Key +recordingVpsPath providerCallId recordingBytes recordingMimeType');
      const totalBytes = attempts.reduce((total, attempt) => total + Number(attempt.recordingBytes || 0), 0);
      // The archive is assembled in memory, so the cap bounds peak heap at
      // roughly twice this value. Keep it below the instance memory limit.
      const maxBytes = Math.max(
        16 * 1024 * 1024,
        Number(process.env.RECORDING_EXPORT_MAX_BYTES || 96 * 1024 * 1024),
      );
      if (totalBytes > maxBytes) {
        throw new BadRequestException(
          `This export would be ${Math.ceil(totalBytes / 1024 / 1024)} MB, above the ` +
            `${Math.floor(maxBytes / 1024 / 1024)} MB limit. Use a smaller date range.`,
        );
      }
      const entries: Array<{ name: string; data: Buffer }> = [];
      for (const attempt of attempts) {
        if (!attempt.recordingB2Key && !attempt.recordingVpsPath) continue;
        const data = await this.storage.getArchivedBuffer(
          attempt.recordingB2Key,
          attempt.recordingVpsPath,
        );
        entries.push({
          name: `${attempt.providerCallId || attempt._id.toString()}${this.extensionFor(attempt.recordingMimeType)}`,
          data,
        });
      }
      const zip = createStoreOnlyZip(entries);
      const key = `exports/${record.organizationId.toString()}/${record._id.toString()}.zip`;
      await this.storage.putExport(key, zip);
      record.objectKey = key;
      record.fileCount = entries.length;
      record.totalBytes = zip.length;
      record.status = 'READY';
      record.readyAt = new Date();
      record.error = null;
      await record.save();
    } catch (error) {
      record.status = 'FAILED';
      record.error = error instanceof Error ? error.message : String(error);
      await record.save();
      throw error;
    }
  }

  async getExport(user: IAuthUser, exportId: string) {
    const record = await this.exportModel.findOne({
      _id: new Types.ObjectId(exportId),
      organizationId: new Types.ObjectId(user.organizationId),
    }).select('+objectKey');
    if (!record) throw new NotFoundException('Recording export not found.');
    const ready = record.status === 'READY' && Boolean(record.objectKey);
    // Prefer a short-lived signed URL. Without durable storage there is no
    // bucket to sign against, so fall back to the authenticated stream route
    // rather than exposing a raw path.
    const downloadUrl = ready && this.storage.primaryIsDurable()
      ? await this.storage.getSignedUrl(record.objectKey as string, 300)
      : null;
    return {
      id: record._id.toString(),
      status: record.status,
      fileCount: record.fileCount,
      totalBytes: record.totalBytes,
      error: record.error,
      readyAt: record.readyAt,
      downloadUrl,
      streamPath: ready && !downloadUrl ? `/admin/recordings/export/${record._id.toString()}/download` : null,
      downloadConfirmedAt: record.downloadConfirmedAt,
    };
  }

  /** Authenticated fallback download used when no signed-URL store is configured. */
  async streamExport(user: IAuthUser, exportId: string) {
    const record = await this.exportModel.findOne({
      _id: new Types.ObjectId(exportId),
      organizationId: new Types.ObjectId(user.organizationId),
      status: 'READY',
    }).select('+objectKey');
    if (!record?.objectKey) throw new NotFoundException('Recording export is not ready.');
    return {
      buffer: await this.storage.getExportBuffer(record.objectKey),
      filename: `recordings-${record._id.toString()}.zip`,
    };
  }

  private extensionFor(mimeType?: string | null): string {
    const mapping: Record<string, string> = {
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/mp4': '.m4a',
      'audio/m4a': '.m4a',
      'audio/aac': '.aac',
      'audio/wav': '.wav',
      'audio/x-wav': '.wav',
      'audio/ogg': '.ogg',
    };
    return mapping[mimeType || ''] || '.mp3';
  }

  /**
   * Month subtraction that clamps to the target month's last day. Naive
   * setUTCMonth arithmetic overflows (31 March minus one month becomes
   * 3 March), which would delete recordings days earlier than the policy says.
   */
  private subtractMonths(from: Date, months: number): Date {
    const day = from.getUTCDate();
    const target = new Date(from.getTime());
    target.setUTCDate(1);
    target.setUTCMonth(target.getUTCMonth() - months);
    const lastDayOfTarget = new Date(
      Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
    ).getUTCDate();
    target.setUTCDate(Math.min(day, lastDayOfTarget));
    return target;
  }

  async confirmDownload(user: IAuthUser, exportId: string) {
    const record = await this.exportModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(exportId),
        organizationId: new Types.ObjectId(user.organizationId),
        status: 'READY',
      },
      { $set: { downloadConfirmedAt: new Date() } },
      { new: true },
    );
    if (!record) throw new BadRequestException('Only a ready export can be confirmed.');
    return { confirmed: true, confirmedAt: record.downloadConfirmedAt };
  }

  async purgeExportedRange(user: IAuthUser, exportId: string) {
    const record = await this.exportModel.findOne({
      _id: new Types.ObjectId(exportId),
      organizationId: new Types.ObjectId(user.organizationId),
      status: 'READY',
      downloadConfirmedAt: { $ne: null },
    });
    if (!record) throw new BadRequestException('Purge requires a confirmed downloaded export.');
    // Purge removes the primary copy only, never every copy in one action. With
    // no durable primary the on-host file is the only copy, so there is nothing
    // that can be purged safely.
    if (!this.storage.primaryIsDurable()) {
      throw new BadRequestException({
        code: 'PURGE_REQUIRES_DURABLE_PRIMARY',
        message:
          'Purge needs a durable primary store so the backup copy survives. Configure Backblaze B2 first.',
      });
    }
    const attempts = await this.attemptModel
      .find({
        organizationId: record.organizationId,
        dialedAt: { $gte: record.from, $lte: record.to },
        recordingStatus: RecordingStatus.ARCHIVED,
      })
      .select('+recordingB2Key +recordingVpsPath');
    let totalBytes = 0;
    for (const attempt of attempts) {
      if (!attempt.recordingB2Key || !attempt.recordingVpsPath) continue;
      await this.storage.deletePrimary(attempt.recordingB2Key);
      totalBytes += Number(attempt.recordingBytes || 0);
      attempt.recordingStatus = RecordingStatus.PURGED;
      attempt.purgedAt = new Date();
      await attempt.save();
    }
    record.status = 'PURGED';
    record.purgedAt = new Date();
    await record.save();
    await this.audit.log({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityType: 'RecordingExport',
      entityId: record._id.toString(),
      action: 'PURGE_EXPORTED_RECORDINGS',
      metadata: { fileCount: attempts.length, totalBytes, from: record.from, to: record.to },
    });
    return { purged: attempts.length, totalBytes, backupPreserved: true };
  }

  async runRetention(organizationId: string): Promise<void> {
    const organization = await this.orgModel.findById(organizationId).select('recordingRetentionMonths');
    if (!organization) return;
    const cutoff = this.subtractMonths(new Date(), organization.recordingRetentionMonths);
    const attempts = await this.attemptModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        archivedAt: { $lte: cutoff },
        recordingStatus: RecordingStatus.ARCHIVED,
      })
      .select('+recordingB2Key +recordingVpsPath');
    for (const attempt of attempts) {
      if (!attempt.recordingB2Key && !attempt.recordingVpsPath) continue;
      await this.storage.deleteBoth(attempt.recordingB2Key, attempt.recordingVpsPath);
      attempt.recordingStatus = RecordingStatus.PURGED;
      attempt.purgedAt = new Date();
      await attempt.save();
    }
  }
}
