import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from '../../database/schemas/lead.schema';
import { CallAttempt, CallAttemptDocument } from '../../database/schemas/call-attempt.schema';
import { Organization, OrganizationDocument } from '../../database/schemas/organization.schema';
import { LeadStatus, IAuthUser, CallAttemptStatus } from '@dayaar/shared';

@Injectable()
export class LeadQueueService {
  private readonly logger = new Logger(LeadQueueService.name);

  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(CallAttempt.name) private callAttemptModel: Model<CallAttemptDocument>,
    @InjectModel(Organization.name) private orgModel: Model<OrganizationDocument>,
  ) {}

  /**
   * Fetches the employee's high-speed daily call queue.
   * Priority:
   * 1. Overdue Follow-ups
   * 2. Today's Scheduled Follow-ups
   * 3. Fresh NEW leads
   * 4. Retry leads (attemptCount 1-3)
   */
  async getDailyQueue(user: IAuthUser, limit = 50) {
    const orgId = new Types.ObjectId(user.organizationId);
    const empId = new Types.ObjectId(user.id);
    const now = new Date();

    // 1. Follow-ups due
    const followUps = await this.leadModel
      .find({
        organizationId: orgId,
        assignedEmployeeId: empId,
        status: LeadStatus.FOLLOW_UP,
        nextFollowUpAt: { $lte: now },
      })
      .sort({ nextFollowUpAt: 1 })
      .limit(limit);

    // 2. Fresh NEW leads
    const remainingLimit1 = limit - followUps.length;
    let newLeads: LeadDocument[] = [];
    if (remainingLimit1 > 0) {
      newLeads = await this.leadModel
        .find({
          organizationId: orgId,
          assignedEmployeeId: empId,
          status: LeadStatus.NEW,
        })
        .sort({ createdAt: -1 })
        .limit(remainingLimit1);
    }

    // 3. Retry leads with attemptCount < 4
    const remainingLimit2 = limit - (followUps.length + newLeads.length);
    let retryLeads: LeadDocument[] = [];
    if (remainingLimit2 > 0) {
      retryLeads = await this.leadModel
        .find({
          organizationId: orgId,
          assignedEmployeeId: empId,
          status: { $in: [LeadStatus.CALLING, LeadStatus.FOLLOW_UP] },
          attemptCount: { $gte: 1, $lt: 4 },
          _id: { $nin: [...followUps.map((f) => f._id), ...newLeads.map((n) => n._id)] },
        })
        .sort({ attemptCount: 1, updatedAt: 1 })
        .limit(remainingLimit2);
    }

    const queue = [...followUps, ...newLeads, ...retryLeads];

    return {
      queue,
      totalCount: queue.length,
      breakdown: {
        followUpsDue: followUps.length,
        freshNewLeads: newLeads.length,
        retryLeads: retryLeads.length,
      },
    };
  }

  /**
   * Returns the immediate next lead for automatic high-velocity progression.
   */
  async getNextLead(user: IAuthUser, excludeLeadId?: string) {
    const orgId = new Types.ObjectId(user.organizationId);
    const empId = new Types.ObjectId(user.id);
    const now = new Date();

    const excludeFilter: any = {};
    if (excludeLeadId) {
      excludeFilter._id = { $ne: new Types.ObjectId(excludeLeadId) };
    }

    // 1. Check overdue / due follow-up
    let next = await this.leadModel.findOne({
      organizationId: orgId,
      assignedEmployeeId: empId,
      status: LeadStatus.FOLLOW_UP,
      nextFollowUpAt: { $lte: now },
      ...excludeFilter,
    }).sort({ nextFollowUpAt: 1 });

    // 2. Check fresh NEW lead
    if (!next) {
      next = await this.leadModel.findOne({
        organizationId: orgId,
        assignedEmployeeId: empId,
        status: LeadStatus.NEW,
        ...excludeFilter,
      }).sort({ createdAt: -1 });
    }

    // 3. Check retry lead
    if (!next) {
      next = await this.leadModel.findOne({
        organizationId: orgId,
        assignedEmployeeId: empId,
        status: { $in: [LeadStatus.CALLING, LeadStatus.FOLLOW_UP] },
        attemptCount: { $gte: 1, $lt: 4 },
        ...excludeFilter,
      }).sort({ attemptCount: 1, updatedAt: 1 });
    }

    return next;
  }

  /**
   * Retrieves today's 300 target metrics and real-time velocity for the current caller.
   */
  async getDailyTargetProgress(user: IAuthUser) {
    const orgId = new Types.ObjectId(user.organizationId);
    const empId = new Types.ObjectId(user.id);

    const org = await this.orgModel.findById(orgId);
    const dailyTarget = org?.dailyCallTarget || 300;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayCalls = await this.callAttemptModel.find({
      organizationId: orgId,
      employeeId: empId,
      dialedAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const totalCalls = todayCalls.length;
    const connectedCalls = todayCalls.filter(
      (c) => c.connected === true || (c.duration || 0) > 2,
    ).length;
    const unconnectedCalls = totalCalls - connectedCalls;
    const remainingCalls = Math.max(0, dailyTarget - totalCalls);
    const progressPercentage = Math.min(100, Math.round((totalCalls / dailyTarget) * 100));

    // Total assigned leads count
    const totalAssigned = await this.leadModel.countDocuments({
      organizationId: orgId,
      assignedEmployeeId: empId,
    });

    const pendingInQueue = await this.leadModel.countDocuments({
      organizationId: orgId,
      assignedEmployeeId: empId,
      status: { $in: [LeadStatus.NEW, LeadStatus.FOLLOW_UP, LeadStatus.CALLING] },
      attemptCount: { $lt: 4 },
    });

    return {
      dailyTarget,
      totalCallsMadeToday: totalCalls,
      connectedToday: connectedCalls,
      unconnectedToday: unconnectedCalls,
      remainingCalls,
      progressPercentage,
      totalAssignedLeads: totalAssigned,
      pendingInQueue,
    };
  }
}
