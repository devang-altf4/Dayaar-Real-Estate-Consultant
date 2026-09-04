import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  CallDisposition,
  CallOrigin,
  FollowUpStatus,
  IAuthUser,
  LeadStatus,
  NotInterestedReason,
  Role,
  Temperature,
} from '@dayaar/shared';
import { Model, Types } from 'mongoose';
import { DevicePrincipal } from '../../common/interfaces/device-principal.interface';
import { CallAttempt, CallAttemptDocument } from '../../database/schemas/call-attempt.schema';
import { FollowUp, FollowUpDocument } from '../../database/schemas/follow-up.schema';
import { Lead, LeadDocument } from '../../database/schemas/lead.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { AnalyticsService } from '../analytics/analytics.service';
import { CallingService } from '../calling/calling.service';
import { LeadQueueService } from '../lead-queue/lead-queue.service';

@Injectable()
export class MobileService {
  constructor(
    @InjectModel(Lead.name) private readonly leadModel: Model<LeadDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(CallAttempt.name) private readonly attemptModel: Model<CallAttemptDocument>,
    @InjectModel(FollowUp.name) private readonly followUpModel: Model<FollowUpDocument>,
    private readonly analyticsService: AnalyticsService,
    private readonly leadQueueService: LeadQueueService,
    private readonly callingService: CallingService,
  ) {}

  async getDashboard(principal: DevicePrincipal) {
    const { employee, user } = await this.getEmployee(principal);
    const leadFilter = {
      organizationId: new Types.ObjectId(user.organizationId),
      assignedEmployeeId: new Types.ObjectId(user.id),
    };

    const [performance, queue, targetProgress, leads] = await Promise.all([
      this.analyticsService.getEmployeePerformance(user),
      this.leadQueueService.getDailyQueue(user, 300),
      this.leadQueueService.getDailyTargetProgress(user),
      this.leadModel.find(leadFilter).sort({ updatedAt: -1 }),
    ]);

    return {
      employee: {
        id: user.id,
        organizationId: user.organizationId,
        name: user.name,
        email: user.email,
        phone: employee.phone,
        employeeCode: user.employeeCode,
        role: user.role,
        managerId: user.managerId,
        callingEnabled: employee.callingEnabled,
      },
      performance,
      queue,
      targetProgress,
      leads,
    };
  }

  async initiateCall(leadId: string, principal: DevicePrincipal) {
    const { user } = await this.getEmployee(principal);
    return this.callingService.initiateCall(leadId, CallOrigin.ANDROID, user);
  }

  // Mobile must respect the same funnel as web — no skipping qualification
  private readonly mobileTransitions: Record<LeadStatus, LeadStatus[]> = {
    [LeadStatus.NEW]: [LeadStatus.CALLING, LeadStatus.INTERESTED, LeadStatus.NOT_INTERESTED, LeadStatus.FOLLOW_UP, LeadStatus.COLD, LeadStatus.WARM, LeadStatus.HOT, LeadStatus.INVALID_NUMBER, LeadStatus.NOT_PICKED_UP],
    [LeadStatus.CALLING]: [LeadStatus.INTERESTED, LeadStatus.NOT_INTERESTED, LeadStatus.FOLLOW_UP, LeadStatus.NOT_PICKED_UP, LeadStatus.COLD, LeadStatus.WARM, LeadStatus.HOT, LeadStatus.SITE_VISIT, LeadStatus.INVALID_NUMBER],
    [LeadStatus.FOLLOW_UP]: [LeadStatus.CALLING, LeadStatus.INTERESTED, LeadStatus.NOT_INTERESTED, LeadStatus.NOT_PICKED_UP, LeadStatus.COLD, LeadStatus.WARM, LeadStatus.HOT, LeadStatus.SITE_VISIT],
    [LeadStatus.NOT_PICKED_UP]: [LeadStatus.CALLING, LeadStatus.FOLLOW_UP, LeadStatus.INTERESTED, LeadStatus.NOT_INTERESTED, LeadStatus.COLD],
    [LeadStatus.NOT_INTERESTED]: [LeadStatus.CALLING, LeadStatus.FOLLOW_UP, LeadStatus.INTERESTED, LeadStatus.COLD],
    [LeadStatus.INTERESTED]: [LeadStatus.WARM, LeadStatus.HOT, LeadStatus.COLD, LeadStatus.SITE_VISIT, LeadStatus.NEGOTIATION, LeadStatus.BOOKED, LeadStatus.FOLLOW_UP, LeadStatus.NOT_INTERESTED],
    [LeadStatus.COLD]: [LeadStatus.WARM, LeadStatus.HOT, LeadStatus.FOLLOW_UP, LeadStatus.NOT_INTERESTED, LeadStatus.CALLING],
    [LeadStatus.WARM]: [LeadStatus.HOT, LeadStatus.SITE_VISIT, LeadStatus.NEGOTIATION, LeadStatus.FOLLOW_UP, LeadStatus.COLD, LeadStatus.NOT_INTERESTED],
    [LeadStatus.HOT]: [LeadStatus.SITE_VISIT, LeadStatus.NEGOTIATION, LeadStatus.BOOKED, LeadStatus.FOLLOW_UP, LeadStatus.WARM, LeadStatus.NOT_INTERESTED],
    [LeadStatus.SITE_VISIT]: [LeadStatus.NEGOTIATION, LeadStatus.BOOKED, LeadStatus.HOT, LeadStatus.WARM, LeadStatus.FOLLOW_UP, LeadStatus.CLOSED, LeadStatus.NOT_INTERESTED],
    [LeadStatus.NEGOTIATION]: [LeadStatus.BOOKED, LeadStatus.CLOSED, LeadStatus.HOT, LeadStatus.FOLLOW_UP, LeadStatus.NOT_INTERESTED],
    [LeadStatus.BOOKED]: [LeadStatus.CLOSED, LeadStatus.NEGOTIATION],
    [LeadStatus.CLOSED]: [LeadStatus.BOOKED],
    [LeadStatus.INVALID_NUMBER]: [LeadStatus.NEW],
  };

  async recordDisposition(dto: any, principal: DevicePrincipal) {
    const { user } = await this.getEmployee(principal);
    // Whitelist enums — raw device payloads must not drive arbitrary status/temperature
    const allowedDispositions = new Set(Object.values(CallDisposition));
    const allowedStatuses = new Set(Object.values(LeadStatus));
    const allowedTemps = new Set(Object.values(Temperature));
    if (dto.disposition && !allowedDispositions.has(dto.disposition)) {
      throw new ForbiddenException('Invalid disposition value.');
    }
    if (dto.status && !allowedStatuses.has(dto.status)) {
      throw new ForbiddenException('Invalid lead status value.');
    }
    if (dto.temperature && !allowedTemps.has(dto.temperature)) {
      throw new ForbiddenException('Invalid temperature value.');
    }
    const lead = await this.leadModel.findOne({
      _id: new Types.ObjectId(dto.leadId),
      organizationId: new Types.ObjectId(user.organizationId),
      assignedEmployeeId: new Types.ObjectId(user.id),
    });
    if (!lead) {
      throw new NotFoundException('Lead not found or not assigned to this employee.');
    }

    const disposition = (dto.disposition as CallDisposition) || CallDisposition.FOLLOW_UP;
    const reason = (dto.reason || dto.notes || 'Status updated via Mobile companion').trim();
    if (reason.length < 2) {
      throw new ForbiddenException('Disposition reason must be at least 2 characters.');
    }
    const notes = dto.notes?.trim() || reason;
    const followUpAt = dto.followUpAt ? new Date(dto.followUpAt) : null;

    const dispositionMap: Record<string, { status: LeadStatus; temperature?: Temperature }> = {
      HOT: { status: LeadStatus.HOT, temperature: Temperature.HOT },
      WARM: { status: LeadStatus.WARM, temperature: Temperature.WARM },
      COLD: { status: LeadStatus.COLD, temperature: Temperature.COLD },
      NOT_INTERESTED: { status: LeadStatus.NOT_INTERESTED, temperature: Temperature.COLD },
      FOLLOW_UP: { status: LeadStatus.FOLLOW_UP, temperature: Temperature.WARM },
      SITE_VISIT: { status: LeadStatus.SITE_VISIT, temperature: Temperature.HOT },
      NEGOTIATION: { status: LeadStatus.NEGOTIATION, temperature: Temperature.HOT },
      BOOKED: { status: LeadStatus.BOOKED, temperature: Temperature.HOT },
    };

    const mapped = dispositionMap[disposition] || {
      status: (dto.status as LeadStatus) || LeadStatus.FOLLOW_UP,
      temperature: (dto.temperature as Temperature) || Temperature.WARM,
    };

    const nextStatus = (dto.status as LeadStatus) || mapped.status;
    // Enforce state machine (same as LeadsService.updateDisposition)
    if (lead.status !== nextStatus) {
      const allowed = this.mobileTransitions[lead.status] || [];
      if (!allowed.includes(nextStatus)) {
        throw new ForbiddenException(
          `Cannot transition lead from ${lead.status} to ${nextStatus}.`,
        );
      }
    }
    if (nextStatus === LeadStatus.NOT_INTERESTED && reason.trim().length < 2) {
      throw new ForbiddenException('Reason is required when marking NOT_INTERESTED.');
    }
    lead.status = nextStatus;
    lead.temperature = (dto.temperature as Temperature) || mapped.temperature || Temperature.WARM;
    if (notes) lead.employeeNotes = notes;
    if (followUpAt) lead.nextFollowUpAt = followUpAt;
    if (disposition === CallDisposition.NOT_INTERESTED) {
      lead.notInterestedReason = NotInterestedReason.OTHER;
      lead.notInterestedReasonDetails = reason;
    } else {
      lead.notInterestedReason = null;
      lead.notInterestedReasonDetails = null;
    }
    await lead.save();

    // Link or update latest CallAttempt if one exists
    const latestAttempt = await this.attemptModel
      .findOne({
        leadId: lead._id,
        organizationId: new Types.ObjectId(user.organizationId),
        employeeId: new Types.ObjectId(user.id),
      })
      .sort({ createdAt: -1 });

    if (latestAttempt && !latestAttempt.dispositionAt) {
      latestAttempt.disposition = disposition;
      latestAttempt.reason = reason;
      latestAttempt.notes = notes;
      latestAttempt.followUpAt = followUpAt;
      latestAttempt.dispositionAt = new Date();
      await latestAttempt.save();
    }

    if (followUpAt) {
      await this.followUpModel.create({
        organizationId: new Types.ObjectId(user.organizationId),
        leadId: lead._id,
        employeeId: new Types.ObjectId(user.id),
        scheduledAt: followUpAt,
        reason: reason,
        notes: notes,
        status: FollowUpStatus.PENDING,
      });
    }

    return {
      success: true,
      lead,
      message: 'Lead disposition updated and synced successfully',
    };
  }

  private async getEmployee(principal: DevicePrincipal) {
    const employee = await this.userModel
      .findOne({
        _id: new Types.ObjectId(principal.userId),
        organizationId: new Types.ObjectId(principal.organizationId),
        isActive: true,
      })
      .select(
        '_id organizationId name email phone role employeeCode managerId callingEnabled',
      );

    if (!employee || employee.role !== Role.EMPLOYEE) {
      throw new ForbiddenException('An active employee account is required.');
    }

    const user: IAuthUser = {
      id: employee._id.toString(),
      organizationId: employee.organizationId.toString(),
      name: employee.name,
      email: employee.email,
      role: employee.role,
      employeeCode: employee.employeeCode,
      managerId: employee.managerId ? employee.managerId.toString() : null,
    };

    return { employee, user };
  }
}
