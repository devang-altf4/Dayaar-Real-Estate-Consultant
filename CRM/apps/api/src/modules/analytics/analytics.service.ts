import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from '../../database/schemas/lead.schema';
import {
  CallAttempt,
  CallAttemptDocument,
} from '../../database/schemas/call-attempt.schema';
import {
  AndroidDevice,
  AndroidDeviceDocument,
} from '../../database/schemas/android-device.schema';
import {
  AttendanceRecord,
  AttendanceRecordDocument,
} from '../../database/schemas/attendance-record.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import {
  LeadStatus,
  Temperature,
  CallAttemptStatus,
  AttendanceStatus,
  IAuthUser,
  Role,
} from '@dayaar/shared';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(CallAttempt.name) private callAttemptModel: Model<CallAttemptDocument>,
    @InjectModel(AndroidDevice.name) private deviceModel: Model<AndroidDeviceDocument>,
    @InjectModel(AttendanceRecord.name) private attendanceModel: Model<AttendanceRecordDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private getStartAndEndOfToday() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end, todayDateStr: new Date().toISOString().split('T')[0] };
  }

  /**
   * Computes comprehensive admin dashboard overview
   */
  async getAdminDashboard(organizationId: string) {
    const orgId = new Types.ObjectId(organizationId);
    const { start, end, todayDateStr } = this.getStartAndEndOfToday();
    const cutoff = new Date(Date.now() - 45 * 1000);

    const [
      totalEmployees,
      checkedInCount,
      onlineDevicesCount,
      callAgg,
      totalLeads,
      interestedLeads,
      notInterestedLeads,
      topAgg,
    ] = await Promise.all([
      this.userModel.countDocuments({ organizationId: orgId, isActive: true }),
      this.attendanceModel.countDocuments({
        organizationId: orgId,
        date: todayDateStr,
        checkOutAt: null,
      }),
      this.deviceModel.countDocuments({
        organizationId: orgId,
        status: { $ne: 'REVOKED' },
        lastSeenAt: { $gte: cutoff },
      }),
      this.callAttemptModel
        .aggregate([
          { $match: { organizationId: orgId, dialedAt: { $gte: start, $lte: end } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              connected: {
                $sum: { $cond: [{ $or: ['$connected', { $gt: ['$duration', 2] }] }, 1, 0] },
              },
            },
          },
        ])
        .then((r) => r[0] || { total: 0, connected: 0 }),
      this.leadModel.countDocuments({ organizationId: orgId }),
      this.leadModel.countDocuments({
        organizationId: orgId,
        status: { $in: [LeadStatus.INTERESTED, LeadStatus.HOT, LeadStatus.WARM, LeadStatus.SITE_VISIT, LeadStatus.BOOKED] },
      }),
      this.leadModel.countDocuments({
        organizationId: orgId,
        status: LeadStatus.NOT_INTERESTED,
      }),
      this.callAttemptModel.aggregate([
        { $match: { organizationId: orgId, dialedAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: '$employeeId',
            calls: { $sum: 1 },
            connected: {
              $sum: { $cond: [{ $or: ['$connected', { $gt: ['$duration', 2] }] }, 1, 0] },
            },
          },
        },
        { $sort: { calls: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'emp',
          },
        },
        { $unwind: { path: '$emp', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            userId: { $toString: '$_id' },
            userName: '$emp.name',
            employeeCode: '$emp.employeeCode',
            callsMade: '$calls',
            connectedCalls: '$connected',
          },
        },
      ]),
    ]);

    const todayCallsTotal = callAgg.total || 0;
    const todayConnected = callAgg.connected || 0;
    const todayNotConnected = todayCallsTotal - todayConnected;
    const connectionRate =
      todayCallsTotal > 0 ? Math.round((todayConnected / todayCallsTotal) * 100) : 0;

    const topPerformers = topAgg;

    return {
      activeEmployeesCount: totalEmployees,
      checkedInEmployeesCount: checkedInCount,
      onlineDevicesCount,
      todayCallsTotal,
      todayConnectedCalls: todayConnected,
      todayNotConnectedCalls: todayNotConnected,
      conversionRatePercentage: connectionRate,
      totalLeadsInPipeline: totalLeads,
      interestedToday: interestedLeads,
      notInterestedToday: notInterestedLeads,
      topPerformers,
    };
  }

  /**
   * Computes manager-scoped team dashboard overview
   */
  async getManagerDashboard(managerId: string, organizationId: string) {
    const orgId = new Types.ObjectId(organizationId);
    const mgrId = new Types.ObjectId(managerId);
    const { start, end, todayDateStr } = this.getStartAndEndOfToday();

    const teamMembers = await this.userModel.find({
      organizationId: orgId,
      managerId: mgrId,
      isActive: true,
    });

    const teamMemberIds = teamMembers.map((m) => m._id);

    const cutoff = new Date(Date.now() - 45 * 1000);
    const [callAgg, checkedInRecords, devices, onlineDevicesCount] = await Promise.all([
      this.callAttemptModel
        .aggregate([
          { $match: { organizationId: orgId, employeeId: { $in: teamMemberIds }, dialedAt: { $gte: start, $lte: end } } },
          {
            $group: {
              _id: '$employeeId',
              calls: { $sum: 1 },
              connected: {
                $sum: { $cond: [{ $or: ['$connected', { $gt: ['$duration', 2] }] }, 1, 0] },
              },
            },
          },
        ])
        .then((rows) => {
          const byId = new Map(rows.map((r: any) => [r._id.toString(), r]));
          const total = rows.reduce((a: number, r: any) => a + r.calls, 0);
          const conn = rows.reduce((a: number, r: any) => a + r.connected, 0);
          return { byId, total, conn };
        }),
      this.attendanceModel
        .find({
          organizationId: orgId,
          employeeId: { $in: teamMemberIds },
          date: todayDateStr,
          checkOutAt: null,
        })
        .select('employeeId')
        .lean(),
      this.deviceModel
        .find({
          organizationId: orgId,
          userId: { $in: teamMemberIds },
        })
        .select('userId deviceName status lastSeenAt')
        .lean(),
      this.deviceModel.countDocuments({
        organizationId: orgId,
        userId: { $in: teamMemberIds },
        status: { $ne: 'REVOKED' },
        lastSeenAt: { $gte: cutoff },
      }),
    ]);

    const teamCallsTotal = (callAgg as any).total;
    const teamConnected = (callAgg as any).conn;

    return {
      teamSize: teamMembers.length,
      teamCheckedInCount: checkedInRecords.length,
      teamOnlineDevicesCount: onlineDevicesCount,
      teamTodayCalls: teamCallsTotal,
      teamTodayConnected: teamConnected,
      teamMembers: teamMembers.map((m) => {
        const stats: any = (callAgg as any).byId.get(m._id.toString()) || { calls: 0, connected: 0 };
        const isCheckedIn = (checkedInRecords as any[]).some(
          (r) => r.employeeId.toString() === m._id.toString(),
        );

        const empDevice: any = (devices as any[]).find((d) => d.userId.toString() === m._id.toString());
        const dynamicStatus = empDevice
          ? Date.now() - new Date(empDevice.lastSeenAt).getTime() < 45 * 1000
            ? 'ONLINE'
            : Date.now() - new Date(empDevice.lastSeenAt).getTime() < 120 * 1000
              ? 'STALE'
              : 'OFFLINE'
          : null;

        return {
          userId: m._id.toString(),
          userName: m.name,
          email: m.email,
          employeeCode: m.employeeCode,
          callsToday: stats.calls,
          connectedToday: stats.connected,
          isCheckedIn,
          device: empDevice
            ? {
                deviceName: empDevice.deviceName,
                status: dynamicStatus ?? empDevice.status,
                lastSeenAt: empDevice.lastSeenAt,
              }
            : null,
        };
      }),
    };
  }

  /**
   * Computes employee personal daily performance and target metrics
   */
  async getEmployeePerformance(user: IAuthUser) {
    const orgId = new Types.ObjectId(user.organizationId);
    const empId = new Types.ObjectId(user.id);
    const { start, end, todayDateStr } = this.getStartAndEndOfToday();

    const [callAgg, leadAgg, attendance] = await Promise.all([
      this.callAttemptModel
        .aggregate([
          { $match: { organizationId: orgId, employeeId: empId, dialedAt: { $gte: start, $lte: end } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              connected: {
                $sum: { $cond: [{ $or: ['$connected', { $gt: ['$duration', 2] }] }, 1, 0] },
              },
              dur: { $sum: { $ifNull: ['$duration', 0] } },
            },
          },
        ])
        .then((r) => r[0] || { total: 0, connected: 0, dur: 0 }),
      this.leadModel.aggregate([
        { $match: { organizationId: orgId, assignedEmployeeId: empId } },
        { $group: { _id: { t: '$temperature', s: '$status' }, n: { $sum: 1 } } },
      ]),
      this.attendanceModel.findOne({
        organizationId: orgId,
        employeeId: empId,
        date: todayDateStr,
      }),
    ]);

    const totalCalls = callAgg.total || 0;
    const connected = callAgg.connected || 0;
    const totalDuration = callAgg.dur || 0;
    const avgDuration = connected > 0 ? Math.round(totalDuration / connected) : 0;

    let hotCount = 0;
    let warmCount = 0;
    let coldCount = 0;
    let interestedCount = 0;
    let assignedTotal = 0;
    for (const row of leadAgg as any[]) {
      assignedTotal += row.n;
      if (row._id?.t === Temperature.HOT) hotCount += row.n;
      if (row._id?.t === Temperature.WARM) warmCount += row.n;
      if (row._id?.t === Temperature.COLD) coldCount += row.n;
      if ([LeadStatus.INTERESTED, LeadStatus.HOT, LeadStatus.WARM, LeadStatus.SITE_VISIT].includes(row._id?.s)) {
        interestedCount += row.n;
      }
    }

    return {
      dailyTarget: 300,
      callsMadeToday: totalCalls,
      connectedToday: connected,
      connectionRate: totalCalls > 0 ? Math.round((connected / totalCalls) * 100) : 0,
      totalDurationSeconds: totalDuration,
      avgCallDurationSeconds: avgDuration,
      assignedLeadsCount: assignedTotal,
      interestedCount,
      hotCount,
      warmCount,
      coldCount,
      isCheckedIn: !!attendance && !attendance.checkOutAt,
    };
  }
}
