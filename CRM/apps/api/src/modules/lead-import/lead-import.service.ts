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
  TextImportPayloadDto,
  GoogleSheetImportPayloadDto,
  ImportLeadRowDto,
  ImportLeadRowSchema,
  LeadStatus,
  Temperature,
  IAuthUser,
  normalizePhoneNumber,
  Role,
} from '@dayaar/shared';
import {
  ParsedTabularInput,
  RawLeadRow,
  parseTabularText,
  parseWorkbookBuffer,
  extractPhonesFromText,
} from './smart-parse';

export interface ImportOptions {
  duplicateAction: 'SKIP' | 'UPDATE' | 'REPLACE';
  autoAssignStrategy: 'NONE' | 'ROUND_ROBIN';
  assignScope: 'TEAM' | 'ORGANIZATION';
  targetEmployeeIds?: string[];
}

const DEFAULT_UNNAMED = 'Inquiry Contact';

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
    return this.processValidatedRows(dto.leads, dto, organizationId, user, 'JSON');
  }

  async processTextImport(dto: TextImportPayloadDto, organizationId: string, user: IAuthUser) {
    const parsed = parseTabularText(dto.text);
    if (parsed.rows.length === 0) {
      throw new BadRequestException(
        parsed.warnings[0] || 'Could not find any row with a usable phone number.',
      );
    }
    const { rows, errors } = this.sanitizeRawRows(parsed.rows);
    const result = await this.processValidatedRows(
      rows,
      dto,
      organizationId,
      user,
      'TEXT_PASTE',
      [...parsed.warnings, ...errors],
    );
    return { ...result, parseWarnings: [...parsed.warnings, ...errors] };
  }

  async processFileImport(
    buffer: Buffer,
    options: ImportOptions,
    organizationId: string,
    user: IAuthUser,
  ) {
    let parsed: ParsedTabularInput;
    try {
      parsed = parseWorkbookBuffer(buffer);
    } catch (err) {
      throw new BadRequestException('Could not read the file as an Excel workbook.');
    }
    if (parsed.rows.length === 0) {
      throw new BadRequestException(
        parsed.warnings[0] || 'No rows with a usable phone number were found in the file.',
      );
    }
    const { rows, errors } = this.sanitizeRawRows(parsed.rows);
    const result = await this.processValidatedRows(
      rows,
      options,
      organizationId,
      user,
      'FILE_UPLOAD',
      [...parsed.warnings, ...errors],
    );
    return { ...result, parseWarnings: [...parsed.warnings, ...errors] };
  }

  async processGoogleSheetImport(
    dto: GoogleSheetImportPayloadDto,
    organizationId: string,
    user: IAuthUser,
  ) {
    const csv = await this.fetchGoogleSheetCsv(dto.url);
    const parsed = parseTabularText(csv);
    if (parsed.rows.length === 0) {
      throw new BadRequestException(
        parsed.warnings[0] || 'The sheet contains no rows with a usable phone number.',
      );
    }
    const { rows, errors } = this.sanitizeRawRows(parsed.rows);
    const result = await this.processValidatedRows(
      rows,
      dto,
      organizationId,
      user,
      'GOOGLE_SHEET',
      [...parsed.warnings, ...errors],
    );
    return { ...result, parseWarnings: [...parsed.warnings, ...errors] };
  }

  private async fetchGoogleSheetCsv(url: string): Promise<string> {
    const idMatch = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!idMatch) {
      throw new BadRequestException('Could not find a spreadsheet ID in that Google Sheets URL.');
    }
    const gidMatch = url.match(/[#&?]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    const exportUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;

    let response: Response;
    try {
      response = await fetch(exportUrl, { redirect: 'follow' });
    } catch (err) {
      throw new BadRequestException('Could not reach Google Sheets. Try again shortly.');
    }
    if (!response.ok) {
      throw new BadRequestException(
        'Google Sheets rejected the export request. Make sure the sheet is shared as "Anyone with the link".',
      );
    }
    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();
    if (contentType.includes('text/html') || body.trimStart().startsWith('<')) {
      throw new BadRequestException(
        'The sheet is not publicly accessible. Set sharing to "Anyone with the link" and try again.',
      );
    }
    if (body.length > 4_000_000) {
      throw new BadRequestException('The sheet is too large to import in one request.');
    }
    return body;
  }

  private sanitizeRawRows(rawRows: RawLeadRow[]): {
    rows: ImportLeadRowDto[];
    errors: string[];
  } {
    const rows: ImportLeadRowDto[] = [];
    const errors: string[] = [];

    for (const raw of rawRows) {
      const phoneCandidates: string[] = [];
      for (const candidate of [raw.phone, raw.alternatePhone]) {
        if (!candidate) continue;
        const found = extractPhonesFromText(candidate);
        const value =
          found[0] ||
          (() => {
            const normalized = normalizePhoneNumber(candidate);
            return normalized.length >= 10 ? normalized : '';
          })();
        if (value && !phoneCandidates.includes(value)) phoneCandidates.push(value);
      }

      if (phoneCandidates.length === 0) continue;

      const name = raw.name?.trim() ? raw.name.trim() : DEFAULT_UNNAMED;
      const candidate = {
        name,
        phone: phoneCandidates[0],
        alternatePhone: phoneCandidates[1] || undefined,
        email: raw.email?.trim() || undefined,
        source: raw.source?.trim() || undefined,
        campaign: raw.campaign?.trim() || undefined,
        project: raw.project?.trim() || undefined,
        notes: raw.notes?.trim() || undefined,
      };

      const validated = ImportLeadRowSchema.safeParse(candidate);
      if (!validated.success) {
        errors.push(`Row "${name} ${phoneCandidates[0]}" was skipped: ${validated.error.issues[0].message}`);
        continue;
      }
      rows.push(validated.data);
    }
    return { rows, errors };
  }

  private async resolveEmployeePool(
    options: ImportOptions,
    orgObjectId: Types.ObjectId,
    user: IAuthUser,
  ): Promise<Types.ObjectId[]> {
    if (options.autoAssignStrategy !== 'ROUND_ROBIN') {
      return [];
    }

    const isManager = user.role === Role.MANAGER;
    // MANAGERs are always team-scoped; only ADMIN may use ORGANIZATION scope
    const teamOnly = isManager;

    const baseFilter: Record<string, unknown> = {
      organizationId: orgObjectId,
      role: Role.EMPLOYEE,
      isActive: true,
    };
    if (teamOnly) {
      baseFilter.managerId = new Types.ObjectId(user.id);
    }

    if (options.targetEmployeeIds && options.targetEmployeeIds.length > 0) {
      const uniqueIds = Array.from(new Set(options.targetEmployeeIds));
      const employees = await this.userModel
        .find({
          _id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) },
          ...baseFilter,
        })
        .select('_id');
      if (employees.length !== uniqueIds.length) {
        throw new ForbiddenException(
          teamOnly
            ? 'One or more selected employees are outside your organization or team.'
            : 'One or more selected employees are inactive or outside your organization.',
        );
      }
      const pool = employees.map((employee) => employee._id);
      if (pool.length === 0) {
        throw new BadRequestException(
          'No active employees are available for round-robin assignment.',
        );
      }
      return pool;
    }

    const employees = await this.userModel.find(baseFilter).select('_id');
    const pool = employees.map((e) => e._id);
    if (pool.length === 0) {
      throw new BadRequestException(
        'No active employees are available for round-robin assignment.',
      );
    }
    return pool;
  }

  private async processValidatedRows(
    leads: ImportLeadRowDto[],
    options: ImportOptions,
    organizationId: string,
    user: IAuthUser,
    importSource: string,
    parseWarnings: string[] = [],
  ) {
    const orgObjectId = new Types.ObjectId(organizationId);
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

    const targetEmployeeIds = await this.resolveEmployeePool(options, orgObjectId, user);

    const assignedEmployees =
      targetEmployeeIds.length > 0
        ? await this.userModel
            .find({ _id: { $in: targetEmployeeIds }, organizationId: orgObjectId })
            .select('_id managerId')
        : [];
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

    for (const row of leads) {
      const normalizedPhone = normalizePhoneNumber(row.phone);

      if (!normalizedPhone || normalizedPhone.length < 10) {
        errors.push({ row, error: 'Invalid phone number format' });
        continue;
      }

      if (seenBatchPhones.has(normalizedPhone)) {
        skippedDuplicates.push({ row, reason: 'Duplicate phone in same import batch' });
        continue;
      }
      seenBatchPhones.add(normalizedPhone);

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
        if (options.duplicateAction === 'SKIP') {
          skippedDuplicates.push({
            row,
            reason: `Phone number already exists in CRM (Lead ID: ${existing._id})`,
          });
          continue;
        } else if (options.duplicateAction === 'UPDATE') {
          existing.name = row.name || existing.name;
          existing.project = row.project || existing.project;
          existing.source = row.source || existing.source;
          if (row.email) existing.email = row.email.toLowerCase().trim();
          await existing.save();
          insertedLeads.push(existing);
          continue;
        }
      }

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
        totalRows: leads.length,
        insertedCount: insertedLeads.length,
        skippedDuplicatesCount: skippedDuplicates.length,
        errorsCount: errors.length,
        duplicateAction: options.duplicateAction,
        autoAssignStrategy: options.autoAssignStrategy,
        assignScope: user.role === Role.ADMIN ? 'ORGANIZATION' : options.assignScope,
        targetEmployeeIds: options.targetEmployeeIds || null,
        importSource,
      },
    });

    return {
      success: true,
      summary: {
        totalProcessed: leads.length,
        importedCount: insertedLeads.length,
        skippedDuplicatesCount: skippedDuplicates.length,
        errorsCount: errors.length,
      },
      skippedDuplicates,
      errors,
    };
  }
}
