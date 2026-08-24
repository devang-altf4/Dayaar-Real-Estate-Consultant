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

  async recordDisposition(dto: any, principal: DevicePrincipal) {
    const { user } = await this.getEmployee(principal);
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

    lead.status = (dto.status as LeadStatus) || mapped.status;
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
