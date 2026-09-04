import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FollowUp, FollowUpDocument } from '../../database/schemas/follow-up.schema';
import { Lead, LeadDocument } from '../../database/schemas/lead.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { FollowUpStatus, IAuthUser, Role } from '@dayaar/shared';

@Injectable()
export class FollowupsService {
  private readonly logger = new Logger(FollowupsService.name);

  constructor(
    @InjectModel(FollowUp.name) private followUpModel: Model<FollowUpDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async scheduleFollowUp(
    params: {
      leadId: string;
      scheduledAt: Date | string;
      reason?: string;
      notes?: string;
    },
    user: IAuthUser,
  ) {
    const scheduledDate = new Date(params.scheduledAt);
    const lead = await this.leadModel.findOne({
      _id: new Types.ObjectId(params.leadId),
      organizationId: new Types.ObjectId(user.organizationId),
    });
    if (!lead) {
      throw new NotFoundException('Lead not found.');
    }
    await this.assertLeadAccess(lead, user);
    const followUpEmployeeId =
      lead.assignedEmployeeId || new Types.ObjectId(user.id);

    const followUp = new this.followUpModel({
      organizationId: new Types.ObjectId(user.organizationId),
      leadId: new Types.ObjectId(params.leadId),
      employeeId: followUpEmployeeId,
      scheduledAt: scheduledDate,
      reason: params.reason || 'Follow-up Call',
      notes: params.notes || null,
      status: FollowUpStatus.PENDING,
    });

    await followUp.save();

    // Also update nextFollowUpAt on the lead
    await this.leadModel.updateOne(
      {
        _id: lead._id,
        organizationId: new Types.ObjectId(user.organizationId),
      },
      { $set: { nextFollowUpAt: scheduledDate } },
    );

    return followUp;
  }

  async getMyFollowUps(
    user: IAuthUser,
    type: 'today' | 'overdue' | 'upcoming' | 'all',
    page = 1,
    limit = 50,
  ) {
    const orgId = new Types.ObjectId(user.organizationId);
    const empId = new Types.ObjectId(user.id);

    const safeLimit = Math.min(100, Math.max(1, Number.isFinite(+limit) ? +limit : 50));
    const safePage = Math.min(1000, Math.max(1, Number.isFinite(+page) ? +page : 1));
    const skip = (safePage - 1) * safeLimit;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const filter: any = {
      organizationId: orgId,
      status: FollowUpStatus.PENDING,
    };
    if (user.role === Role.EMPLOYEE) {
      filter.employeeId = empId;
    } else if (user.role === Role.MANAGER) {
      filter.employeeId = { $in: await this.getManagerTeamIds(user) };
    }

    if (type === 'today') {
      filter.scheduledAt = { $gte: startOfToday, $lte: endOfToday };
    } else if (type === 'overdue') {
      filter.scheduledAt = { $lt: startOfToday };
    } else if (type === 'upcoming') {
      filter.scheduledAt = { $gt: endOfToday };
    }

    const [data, total] = await Promise.all([
      this.followUpModel
        .find(filter)
        .populate('leadId', 'name phone project status temperature attemptCount')
        .sort({ scheduledAt: 1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      this.followUpModel.countDocuments(filter),
    ]);
    return {
      data,
      meta: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) },
    };
  }

  async completeFollowUp(id: string, user: IAuthUser) {
    const filter: Record<string, unknown> = {
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
    };
    if (user.role === Role.EMPLOYEE) {
      filter.employeeId = new Types.ObjectId(user.id);
    } else if (user.role === Role.MANAGER) {
      filter.employeeId = { $in: await this.getManagerTeamIds(user) };
    }

    const followUp = await this.followUpModel.findOneAndUpdate(
      filter,
      {
        $set: {
          status: FollowUpStatus.COMPLETED,
          completedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }

    return followUp;
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
    const assignedEmployeeId = lead.assignedEmployeeId?.toString();
    if (user.role === Role.EMPLOYEE && assignedEmployeeId !== user.id) {
      throw new ForbiddenException('You can only schedule follow-ups for your leads.');
    }
    if (user.role === Role.MANAGER) {
      const teamIds = await this.getManagerTeamIds(user);
      const isTeamLead = teamIds.some(
        (id) => id.toString() === assignedEmployeeId,
      );
      if (!isTeamLead && lead.assignedManagerId?.toString() !== user.id) {
        throw new ForbiddenException(
          'You can only schedule follow-ups for your team leads.',
        );
      }
    }
  }
}
