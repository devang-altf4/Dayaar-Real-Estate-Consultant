import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CallOrigin, IAuthUser, Role } from '@dayaar/shared';
import { Model, Types } from 'mongoose';
import { DevicePrincipal } from '../../common/interfaces/device-principal.interface';
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
