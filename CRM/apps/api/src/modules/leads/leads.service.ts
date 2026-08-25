import {
  Injectable,
  NotFoundException,
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
  LeadStatus,
  Temperature,
  NotInterestedReason,
  Role,
  IAuthUser,
  CreateLeadDto,
  UpdateLeadDispositionDto,
  BulkAssignLeadsDto,
  normalizePhoneNumber,
} from '@dayaar/shared';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  // Valid state transition matrix
  private readonly validTransitions: Record<LeadStatus, LeadStatus[]> = {
    [LeadStatus.NEW]: [
      LeadStatus.CALLING,
      LeadStatus.INTERESTED,
      LeadStatus.NOT_INTERESTED,
      LeadStatus.FOLLOW_UP,
      LeadStatus.COLD,
      LeadStatus.WARM,
      LeadStatus.HOT,
      LeadStatus.INVALID_NUMBER,
      LeadStatus.NOT_PICKED_UP,
    ],
    [LeadStatus.CALLING]: [
      LeadStatus.INTERESTED,
      LeadStatus.NOT_INTERESTED,
      LeadStatus.FOLLOW_UP,
      LeadStatus.NOT_PICKED_UP,
      LeadStatus.COLD,
      LeadStatus.WARM,
      LeadStatus.HOT,
      LeadStatus.SITE_VISIT,
      LeadStatus.INVALID_NUMBER,
    ],
    [LeadStatus.FOLLOW_UP]: [
      LeadStatus.CALLING,
      LeadStatus.INTERESTED,
      LeadStatus.NOT_INTERESTED,
      LeadStatus.NOT_PICKED_UP,
      LeadStatus.COLD,
      LeadStatus.WARM,
      LeadStatus.HOT,
      LeadStatus.SITE_VISIT,
    ],
    [LeadStatus.NOT_PICKED_UP]: [
      LeadStatus.CALLING,
      LeadStatus.FOLLOW_UP,
      LeadStatus.INTERESTED,
      LeadStatus.NOT_INTERESTED,
      LeadStatus.COLD,
    ],
    [LeadStatus.NOT_INTERESTED]: [
      LeadStatus.CALLING,
      LeadStatus.FOLLOW_UP,
      LeadStatus.INTERESTED,
      LeadStatus.COLD,
    ],
    [LeadStatus.INTERESTED]: [
      LeadStatus.WARM,
      LeadStatus.HOT,
      LeadStatus.COLD,
      LeadStatus.SITE_VISIT,
      LeadStatus.NEGOTIATION,
      LeadStatus.BOOKED,
      LeadStatus.FOLLOW_UP,
      LeadStatus.NOT_INTERESTED,
    ],
    [LeadStatus.COLD]: [
      LeadStatus.WARM,
      LeadStatus.HOT,
      LeadStatus.FOLLOW_UP,
      LeadStatus.NOT_INTERESTED,
      LeadStatus.CALLING,
    ],
    [LeadStatus.WARM]: [
      LeadStatus.HOT,
      LeadStatus.SITE_VISIT,
      LeadStatus.NEGOTIATION,
      LeadStatus.FOLLOW_UP,
      LeadStatus.COLD,
      LeadStatus.NOT_INTERESTED,
    ],
    [LeadStatus.HOT]: [
      LeadStatus.SITE_VISIT,
      LeadStatus.NEGOTIATION,
      LeadStatus.BOOKED,
      LeadStatus.FOLLOW_UP,
      LeadStatus.WARM,
      LeadStatus.NOT_INTERESTED,
    ],
    [LeadStatus.SITE_VISIT]: [
      LeadStatus.NEGOTIATION,
      LeadStatus.BOOKED,
      LeadStatus.HOT,
      LeadStatus.WARM,
      LeadStatus.FOLLOW_UP,
      LeadStatus.CLOSED,
      LeadStatus.NOT_INTERESTED,
    ],
    [LeadStatus.NEGOTIATION]: [
      LeadStatus.BOOKED,
      LeadStatus.CLOSED,
      LeadStatus.HOT,
      LeadStatus.FOLLOW_UP,
      LeadStatus.NOT_INTERESTED,
    ],
    [LeadStatus.BOOKED]: [LeadStatus.CLOSED, LeadStatus.NEGOTIATION],
    [LeadStatus.CLOSED]: [LeadStatus.BOOKED],
    [LeadStatus.INVALID_NUMBER]: [LeadStatus.NEW],
  };

  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    organizationId: string,
    user: IAuthUser,
    options: {
      search?: string;
      status?: LeadStatus;
      temperature?: Temperature;
      project?: string;
      assignedEmployeeId?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const filter: any = { organizationId: new Types.ObjectId(organizationId) };
    const andConditions: Record<string, unknown>[] = [];

    // RBAC lead filtering
    if (user.role === Role.EMPLOYEE) {
      filter.assignedEmployeeId = new Types.ObjectId(user.id);
    } else if (user.role === Role.MANAGER) {
      const teamIds = await this.getManagerTeamIds(user);

      if (options.assignedEmployeeId) {
        if (
          !teamIds.some((id) => id.toString() === options.assignedEmployeeId)
        ) {
          throw new ForbiddenException(
            'Managers can only filter leads assigned to their team.',
          );
        }
        filter.assignedEmployeeId = new Types.ObjectId(options.assignedEmployeeId);
      } else {
        andConditions.push({
          $or: [
            { assignedEmployeeId: { $in: teamIds } },
            { assignedManagerId: new Types.ObjectId(user.id) },
          ],
        });
      }
    } else if (options.assignedEmployeeId) {
      filter.assignedEmployeeId = new Types.ObjectId(options.assignedEmployeeId);
    }

    if (options.status) {
      filter.status = options.status;
    }
    if (options.temperature) {
      filter.temperature = options.temperature;
    }
    if (options.project) {
      filter.project = options.project;
    }
    if (options.search) {
      const escapedSearch = options.search
        .trim()
        .slice(0, 100)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      const normPhone = normalizePhoneNumber(options.search);
      andConditions.push({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: normPhone ? new RegExp(`^${normPhone}`) : searchRegex },
          { project: searchRegex },
        ],
      });
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const skip = (page - 1) * limit;

    const allowedSortFields = new Set([
      'createdAt',
      'updatedAt',
      'name',
      'status',
      'temperature',
      'nextFollowUpAt',
      'attemptCount',
    ]);
    const sortField = allowedSortFields.has(options.sortBy || '')
      ? options.sortBy!
      : 'updatedAt';
    const sortDir = options.sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.leadModel
        .find(filter)
        .populate('assignedEmployeeId', 'name email employeeCode')
        .populate('assignedManagerId', 'name email employeeCode')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit),
      this.leadModel.countDocuments(filter),
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

  async findById(id: string, organizationId: string, user: IAuthUser) {
    const lead = await this.leadModel
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .populate('assignedEmployeeId', 'name email employeeCode phone')
      .populate('assignedManagerId', 'name email employeeCode');

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    await this.assertLeadAccess(lead, user);

    return lead;
  }

  async create(dto: CreateLeadDto, organizationId: string, user: IAuthUser) {
    const normalizedPhone = normalizePhoneNumber(dto.phone);

    // Check duplicate phone in organization
    const existing = await this.leadModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      phone: normalizedPhone,
    });

    if (existing) {
      throw new BadRequestException({
        success: false,
        code: 'DUPLICATE_PHONE_NUMBER',
        message: `A lead with phone number ${dto.phone} already exists in the system (${existing.name} - ${existing.project}).`,
        existingLeadId: existing._id.toString(),
      });
    }

    let assignedEmployeeId: Types.ObjectId | null = null;
    let assignedManagerId: Types.ObjectId | null = null;
    if (user.role === Role.EMPLOYEE) {
      assignedEmployeeId = new Types.ObjectId(user.id);
      assignedManagerId = user.managerId
        ? new Types.ObjectId(user.managerId)
        : null;
    } else if (dto.assignedEmployeeId) {
      const employee = await this.getAssignableEmployee(
        dto.assignedEmployeeId,
        organizationId,
        user,
      );
      assignedEmployeeId = employee._id;
      assignedManagerId = employee.managerId
        ? new Types.ObjectId(employee.managerId.toString())
        : null;
    } else if (user.role === Role.MANAGER) {
      assignedManagerId = new Types.ObjectId(user.id);
    }

    const lead = new this.leadModel({
      organizationId: new Types.ObjectId(organizationId),
      name: dto.name.trim(),
      phone: normalizedPhone,
      alternatePhone: dto.alternatePhone ? normalizePhoneNumber(dto.alternatePhone) : undefined,
      email: dto.email ? dto.email.toLowerCase().trim() : undefined,
      source: dto.source || 'Manual Entry',
      campaign: dto.campaign,
      project: dto.project || 'General Inquiry',
      assignedEmployeeId,
      assignedManagerId,
      status: LeadStatus.NEW,
      temperature: dto.temperature || Temperature.UNQUALIFIED,
      qualification: {
        budgetMin: dto.qualification?.budgetMin ?? dto.budgetMin,
        budgetMax: dto.qualification?.budgetMax ?? dto.budgetMax,
        propertyType: dto.qualification?.propertyType,
        bhk: dto.qualification?.bhk,
        preferredLocations: dto.qualification?.preferredLocations,
        purpose: dto.qualification?.purpose,
        purchaseTimeline: dto.qualification?.purchaseTimeline,
        financing: dto.qualification?.financing,
        loanStatus: dto.qualification?.loanStatus,
        siteVisitInterested: dto.qualification?.siteVisitInterested,
        siteVisitDate: dto.qualification?.siteVisitDate,
        notes: dto.qualification?.notes ?? dto.notes,
      },
      employeeNotes: dto.employeeNotes || dto.notes,
      attemptCount: 0,
    });

    await lead.save();

    await this.auditService.log({
      organizationId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityType: 'Lead',
      entityId: lead._id.toString(),
      action: 'CREATE_LEAD',
      metadata: { name: lead.name, phone: lead.phone, project: lead.project },
    });

    return lead;
  }

  async updateDisposition(
    id: string,
    dto: UpdateLeadDispositionDto,
    organizationId: string,
    user: IAuthUser,
  ) {
    const lead = await this.leadModel.findOne({
      _id: new Types.ObjectId(id),
      organizationId: new Types.ObjectId(organizationId),
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    await this.assertLeadAccess(lead, user);

    // Strict state transition validation
    if (lead.status !== dto.status) {
      const allowed = this.validTransitions[lead.status] || [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException({
          success: false,
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition lead from ${lead.status} to ${dto.status}. Permitted transitions: ${allowed.join(', ')}`,
        });
      }
    }

    // Not Interested validation
    if (dto.status === LeadStatus.NOT_INTERESTED) {
      if (!dto.notInterestedReason) {
        throw new BadRequestException({
          success: false,
          code: 'REASON_REQUIRED',
          message: 'Reason is strictly required when marking a lead as NOT_INTERESTED.',
        });
      }
      if (
        dto.notInterestedReason === NotInterestedReason.OTHER &&
        (!dto.notInterestedReasonDetails || dto.notInterestedReasonDetails.trim().length === 0)
      ) {
        throw new BadRequestException({
          success: false,
          code: 'REASON_DETAILS_REQUIRED',
          message: 'Detailed explanation is required when Reason is OTHER.',
        });
      }
      lead.notInterestedReason = dto.notInterestedReason;
      lead.notInterestedReasonDetails = dto.notInterestedReasonDetails?.trim() || null;
    } else {
      lead.notInterestedReason = null;
      lead.notInterestedReasonDetails = null;
    }

    lead.status = dto.status;
    if (dto.temperature) lead.temperature = dto.temperature;
    if (dto.qualification) {
      lead.qualification = {
        ...lead.qualification,
        ...dto.qualification,
      } as any;
    }
    if (dto.nextFollowUpAt !== undefined) {
      lead.nextFollowUpAt = dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : null;
    }
    if (dto.employeeNotes !== undefined) {
      lead.employeeNotes = dto.employeeNotes;
    }

    await lead.save();

    await this.auditService.log({
      organizationId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityType: 'Lead',
      entityId: lead._id.toString(),
      action: 'UPDATE_DISPOSITION',
      metadata: {
        status: lead.status,
        temperature: lead.temperature,
        reason: lead.notInterestedReason,
      },
    });

    return lead;
  }

  async bulkAssign(dto: BulkAssignLeadsDto, organizationId: string, user: IAuthUser) {
    if (user.role === Role.EMPLOYEE) {
      throw new ForbiddenException('Employees are not authorized to assign leads');
    }

    const { leadIds, employeeIds, strategy } = dto;
    const uniqueEmployeeIds = [...new Set(employeeIds)];
    const employeeFilter: Record<string, unknown> = {
      _id: { $in: uniqueEmployeeIds.map((id) => new Types.ObjectId(id)) },
      organizationId: new Types.ObjectId(organizationId),
      role: Role.EMPLOYEE,
      isActive: true,
    };
    if (user.role === Role.MANAGER) {
      employeeFilter.managerId = new Types.ObjectId(user.id);
    }
    const employees = await this.userModel.find(employeeFilter);
    if (employees.length !== uniqueEmployeeIds.length) {
      throw new ForbiddenException(
        'One or more target employees are outside your organization or team.',
      );
    }
    const employeeById = new Map(
      employees.map((employee) => [employee._id.toString(), employee]),
    );

    const leadFilter: Record<string, unknown> = {
      _id: { $in: leadIds.map((id) => new Types.ObjectId(id)) },
      organizationId: new Types.ObjectId(organizationId),
    };
    if (user.role === Role.MANAGER) {
      const teamIds = await this.getManagerTeamIds(user);
      leadFilter.$or = [
        { assignedEmployeeId: { $in: teamIds } },
        { assignedManagerId: new Types.ObjectId(user.id) },
      ];
    }
    const leads = await this.leadModel.find(leadFilter);
    if (leads.length !== new Set(leadIds).size) {
      throw new ForbiddenException(
        'One or more leads are outside your organization or team.',
      );
    }

    let assignedCount = 0;
    if (strategy === 'ROUND_ROBIN') {
      for (let i = 0; i < leads.length; i++) {
        const assignedEmpId = employeeIds[i % employeeIds.length];
        leads[i].assignedEmployeeId = new Types.ObjectId(assignedEmpId) as any;
        leads[i].assignedManagerId =
          employeeById.get(assignedEmpId)?.managerId || null;
        await leads[i].save();
        assignedCount++;
      }
    } else {
      const singleEmpId = new Types.ObjectId(employeeIds[0]);
      const singleManagerId = employeeById.get(employeeIds[0])?.managerId || null;
      await this.leadModel.updateMany(
        {
          _id: { $in: leadIds.map((id) => new Types.ObjectId(id)) },
          organizationId: new Types.ObjectId(organizationId),
        },
        {
          $set: {
            assignedEmployeeId: singleEmpId,
            assignedManagerId: singleManagerId,
          },
        },
      );
      assignedCount = leads.length;
    }

    await this.auditService.log({
      organizationId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityType: 'Lead',
      entityId: 'BULK',
      action: 'BULK_ASSIGN_LEADS',
      metadata: { count: assignedCount, employeeIds, strategy },
    });

    return { success: true, count: assignedCount };
  }

  async getPipelineCounts(organizationId: string, user: IAuthUser) {
    const match: any = { organizationId: new Types.ObjectId(organizationId) };
    if (user.role === Role.EMPLOYEE) {
      match.assignedEmployeeId = new Types.ObjectId(user.id);
    } else if (user.role === Role.MANAGER) {
      const teamIds = await this.getManagerTeamIds(user);
      match.$or = [
        { assignedEmployeeId: { $in: teamIds } },
        { assignedManagerId: new Types.ObjectId(user.id) },
      ];
    }

    const counts = await this.leadModel.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const result: Record<string, number> = {};
    Object.values(LeadStatus).forEach((st) => (result[st] = 0));
    counts.forEach((c) => {
      result[c._id] = c.count;
    });

    return result;
  }

  private async getManagerTeamIds(user: IAuthUser): Promise<Types.ObjectId[]> {
    const team = await this.userModel
      .find({
        organizationId: new Types.ObjectId(user.organizationId),
        managerId: new Types.ObjectId(user.id),
        isActive: true,
      })
      .select('_id');
    return [new Types.ObjectId(user.id), ...team.map((member) => member._id)];
  }

  private async assertLeadAccess(lead: LeadDocument, user: IAuthUser) {
    const assignedEmployee = lead.assignedEmployeeId as any;
    const assignedManager = lead.assignedManagerId as any;
    const assignedEmployeeId =
      assignedEmployee?._id?.toString() || assignedEmployee?.toString();
    const assignedManagerId =
      assignedManager?._id?.toString() || assignedManager?.toString();

    if (user.role === Role.EMPLOYEE && assignedEmployeeId !== user.id) {
      throw new ForbiddenException('You can only access leads assigned to you.');
    }
    if (user.role === Role.MANAGER) {
      const teamIds = await this.getManagerTeamIds(user);
      const isTeamLead = teamIds.some(
        (id) => id.toString() === assignedEmployeeId,
      );
      if (!isTeamLead && assignedManagerId !== user.id) {
        throw new ForbiddenException(
          'You can only access leads assigned to your team.',
        );
      }
    }
  }

  private async getAssignableEmployee(
    employeeId: string,
    organizationId: string,
    user: IAuthUser,
  ) {
    const filter: Record<string, unknown> = {
      _id: new Types.ObjectId(employeeId),
      organizationId: new Types.ObjectId(organizationId),
      role: Role.EMPLOYEE,
      isActive: true,
    };
    const employee = await this.userModel.findOne(filter);
    if (!employee) {
      throw new ForbiddenException(
        'Target employee is outside your organization.',
      );
    }
    return employee;
  }
}
