import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from '../../database/schemas/lead.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { AuditService } from '../audit/audit.service';
import {
  BulkImportPayloadDto,
  ImportLeadRowDto,
  LeadStatus,
  Temperature,
  IAuthUser,
  normalizePhoneNumber,
  isValidPhoneNumber,
  Role,
} from '@dayaar/shared';

@Injectable()
export class LeadImportService {
  private readonly logger = new Logger(LeadImportService.name);

  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Processes bulk lead array (from parsed CSV or Excel in client/server).
   * Validates phones, checks for duplicates, and assigns via round-robin.
   */
  async processBulkImport(dto: BulkImportPayloadDto, organizationId: string, user: IAuthUser) {
    const orgObjectId = new Types.ObjectId(organizationId);
    const managerTeamFilter =
      user.role === Role.MANAGER
        ? { managerId: new Types.ObjectId(user.id) }
        : {};
    const managerTeamIds =
      user.role === Role.MANAGER
        ? (
            await this.userModel
              .find({
                organizationId: orgObjectId,
                managerId: new Types.ObjectId(user.id),
                role: Role.EMPLOYEE,
                isActive: true,
              })
              .select('_id')
          ).map((employee) => employee._id)
        : [];

    // Fetch target employees for round-robin if specified
    let targetEmployeeIds: Types.ObjectId[] = [];
    if (dto.autoAssignStrategy === 'ROUND_ROBIN') {
      if (dto.targetEmployeeIds && dto.targetEmployeeIds.length > 0) {
        const employees = await this.userModel
          .find({
            _id: {
              $in: dto.targetEmployeeIds.map((id) => new Types.ObjectId(id)),
            },
            organizationId: orgObjectId,
            role: Role.EMPLOYEE,
            isActive: true,
            ...managerTeamFilter,
          })
          .select('_id managerId');
        if (employees.length !== new Set(dto.targetEmployeeIds).size) {
          throw new ForbiddenException(
            'One or more target employees are outside your organization or team.',
          );
        }
        targetEmployeeIds = employees.map((employee) => employee._id);
      } else {
        // Fetch all active employees
        const employees = await this.userModel
          .find({
            organizationId: orgObjectId,
            role: Role.EMPLOYEE,
            isActive: true,
            ...managerTeamFilter,
          })
          .select('_id');
        targetEmployeeIds = employees.map((e) => e._id);
      }
      if (targetEmployeeIds.length === 0) {
        throw new BadRequestException(
          'No active employees are available for round-robin assignment.',
        );
      }
    }

    const assignedEmployees = await this.userModel
      .find({ _id: { $in: targetEmployeeIds } })
      .select('_id managerId');
    const managerByEmployee = new Map(
      assignedEmployees.map((employee) => [
        employee._id.toString(),
        employee.managerId || null,
      ]),
    );

    const insertedLeads: LeadDocument[] = [];
    const skippedDuplicates: Array<{ row: ImportLeadRowDto; reason: string }> = [];
    const errors: Array<{ row: ImportLeadRowDto; error: string }> = [];

    const seenBatchPhones = new Set<string>();
    let assignIndex = 0;

    for (const row of dto.leads) {
      const normalizedPhone = normalizePhoneNumber(row.phone);

      if (!normalizedPhone || normalizedPhone.length < 10) {
        errors.push({ row, error: 'Invalid phone number format' });
        continue;
      }

      // Check intra-batch duplicate
      if (seenBatchPhones.has(normalizedPhone)) {
        skippedDuplicates.push({ row, reason: 'Duplicate phone in same import batch' });
        continue;
      }
      seenBatchPhones.add(normalizedPhone);

      // Check database duplicate
      const existing = await this.leadModel.findOne({
        organizationId: orgObjectId,
        phone: normalizedPhone,
      });

      if (existing) {
        if (
          user.role === Role.MANAGER &&
          existing.assignedManagerId?.toString() !== user.id &&
          !managerTeamIds.some(
            (id) => id.toString() === existing.assignedEmployeeId?.toString(),
          )
        ) {
          throw new ForbiddenException(
            'Managers cannot modify duplicate leads owned by another team.',
          );
        }
        if (dto.duplicateAction === 'SKIP') {
          skippedDuplicates.push({
            row,
            reason: `Phone number already exists in CRM (Lead ID: ${existing._id})`,
          });
          continue;
        } else if (dto.duplicateAction === 'UPDATE') {
          existing.name = row.name || existing.name;
          existing.project = row.project || existing.project;
          existing.source = row.source || existing.source;
          if (row.email) existing.email = row.email.toLowerCase().trim();
          await existing.save();
          insertedLeads.push(existing);
          continue;
        }
      }

      // Determine assignment
      let assignedEmpId: Types.ObjectId | null = null;
      if (targetEmployeeIds.length > 0) {
        assignedEmpId = targetEmployeeIds[assignIndex % targetEmployeeIds.length];
        assignIndex++;
      }

      const newLead = new this.leadModel({
        organizationId: orgObjectId,
        name: row.name.trim(),
        phone: normalizedPhone,
        alternatePhone: row.alternatePhone ? normalizePhoneNumber(row.alternatePhone) : undefined,
        email: row.email ? row.email.toLowerCase().trim() : undefined,
        source: row.source || 'Bulk CSV Import',
        campaign: row.campaign,
        project: row.project || 'General Inquiry',
        assignedEmployeeId: assignedEmpId,
        assignedManagerId: assignedEmpId
          ? managerByEmployee.get(assignedEmpId.toString()) ||
            (user.role === Role.MANAGER ? new Types.ObjectId(user.id) : null)
          : user.role === Role.MANAGER
          ? new Types.ObjectId(user.id)
          : null,
        status: LeadStatus.NEW,
        temperature: row.temperature || Temperature.UNQUALIFIED,
        employeeNotes: row.notes,
        attemptCount: 0,
      });

      await newLead.save();
      insertedLeads.push(newLead);
    }

    await this.auditService.log({
      organizationId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityType: 'Lead',
      entityId: 'BULK_IMPORT',
      action: 'BULK_IMPORT_LEADS',
      metadata: {
        totalRows: dto.leads.length,
        insertedCount: insertedLeads.length,
        skippedDuplicatesCount: skippedDuplicates.length,
        errorsCount: errors.length,
        duplicateAction: dto.duplicateAction,
        autoAssignStrategy: dto.autoAssignStrategy,
      },
    });

    return {
      success: true,
      summary: {
        totalProcessed: dto.leads.length,
        importedCount: insertedLeads.length,
        skippedDuplicatesCount: skippedDuplicates.length,
        errorsCount: errors.length,
      },
      skippedDuplicates,
      errors,
    };
  }
}
