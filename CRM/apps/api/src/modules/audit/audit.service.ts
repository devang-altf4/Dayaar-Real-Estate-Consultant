import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(params: {
    organizationId: string;
    actorId: string;
    actorName?: string;
    actorRole?: string;
    entityType: string;
    entityId: string;
    action: string;
    metadata?: Record<string, any>;
    ip?: string;
    userAgent?: string;
  }) {
    try {
      const log = new this.auditLogModel({
        organizationId: new Types.ObjectId(params.organizationId),
        actorId: new Types.ObjectId(params.actorId),
        actorName: params.actorName,
        actorRole: params.actorRole,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        metadata: params.metadata || {},
        ip: params.ip || null,
        userAgent: params.userAgent || null,
      });
      await log.save();
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err?.message}`, err?.stack);
    }
  }

  async findAll(organizationId: string, rawLimit = 50, rawPage = 1, entityType?: string) {
    const limit = Math.min(100, Math.max(1, Number.isFinite(+rawLimit) ? +rawLimit : 50));
    const page = Math.min(1000, Math.max(1, Number.isFinite(+rawPage) ? +rawPage : 1));
    const filter: any = { organizationId: new Types.ObjectId(organizationId) };
    if (entityType) {
      filter.entityType = entityType;
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actorId', 'name email employeeCode role')
        .lean(),
      this.auditLogModel.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
