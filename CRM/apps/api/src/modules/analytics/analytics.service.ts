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

    const [
      totalEmployees,
      checkedInCount,
      allDevices,
      todayCalls,
      totalLeads,
      interestedLeads,
      notInterestedLeads,
    ] = await Promise.all([
      this.userModel.countDocuments({ organizationId: orgId, isActive: true }),
      this.attendanceModel.countDocuments({
        organizationId: orgId,
        date: todayDateStr,
        checkOutAt: null,
      }),
      this.deviceModel.find({ organizationId: orgId }),
      this.callAttemptModel.find({
        organizationId: orgId,
        dialedAt: { $gte: start, $lte: end },
      }),
      this.leadModel.countDocuments({ organizationId: orgId }),
      this.leadModel.countDocuments({
        organizationId: orgId,
        status: { $in: [LeadStatus.INTERESTED, LeadStatus.HOT, LeadStatus.WARM, LeadStatus.SITE_VISIT, LeadStatus.BOOKED] },
      }),
      this.leadModel.countDocuments({
        organizationId: orgId,
        status: LeadStatus.NOT_INTERESTED,
      }),
    ]);

    // Count online devices (<45s heartbeat)
    const now = Date.now();
    const onlineDevicesCount = allDevices.filter(
      (d) => now - new Date(d.lastSeenAt).getTime() < 45 * 1000,
    ).length;

    const todayCallsTotal = todayCalls.length;
    const todayConnected = todayCalls.filter(
      (c) => c.connected === true || (c.duration || 0) > 2,
    ).length;
    const todayNotConnected = todayCallsTotal - todayConnected;
    const connectionRate =
      todayCallsTotal > 0 ? Math.round((todayConnected / todayCallsTotal) * 100) : 0;

    // Top performers calculation
    const callerMap = new Map<string, { calls: number; connected: number }>();
    todayCalls.forEach((c) => {
      const empId = c.employeeId.toString();
      const curr = callerMap.get(empId) || { calls: 0, connected: 0 };
      curr.calls++;
      if (c.connected === true || (c.duration || 0) > 2) {
        curr.connected++;
      }
      callerMap.set(empId, curr);
    });

    const employees = await this.userModel
      .find({ organizationId: orgId, role: Role.EMPLOYEE })
      .select('name email employeeCode');

    const topPerformers = employees
      .map((emp) => {
        const stats = callerMap.get(emp._id.toString()) || { calls: 0, connected: 0 };
        return {
          userId: emp._id.toString(),
          userName: emp.name,
          employeeCode: emp.employeeCode,
          callsMade: stats.calls,
          connectedCalls: stats.connected,
        };
      })
      .sort((a, b) => b.callsMade - a.callsMade)
      .slice(0, 5);

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

    const [todayCalls, checkedInRecords, devices] = await Promise.all([
      this.callAttemptModel.find({
        organizationId: orgId,
        employeeId: { $in: teamMemberIds },
        dialedAt: { $gte: start, $lte: end },
      }),
      this.attendanceModel.find({
        organizationId: orgId,
        employeeId: { $in: teamMemberIds },
        date: todayDateStr,
        checkOutAt: null,
      }),
      this.deviceModel.find({
        organizationId: orgId,
        userId: { $in: teamMemberIds },
      }),
    ]);

    const now = Date.now();
    const onlineDevicesCount = devices.filter(
      (d) => now - new Date(d.lastSeenAt).getTime() < 45 * 1000,
    ).length;

    const teamCallsTotal = todayCalls.length;
    const teamConnected = todayCalls.filter(
      (c) => c.connected === true || (c.duration || 0) > 2,
    ).length;

    return {
      teamSize: teamMembers.length,
      teamCheckedInCount: checkedInRecords.length,
      teamOnlineDevicesCount: onlineDevicesCount,
      teamTodayCalls: teamCallsTotal,
      teamTodayConnected: teamConnected,
      teamMembers: teamMembers.map((m) => {
        const empCalls = todayCalls.filter((c) => c.employeeId.toString() === m._id.toString());
        const empConnected = empCalls.filter(
          (c) => c.connected === true || (c.duration || 0) > 2,
        ).length;
        const isCheckedIn = checkedInRecords.some(
          (r) => r.employeeId.toString() === m._id.toString(),
        );

        return {
          userId: m._id.toString(),
          userName: m.name,
          employeeCode: m.employeeCode,
          callsToday: empCalls.length,
          connectedToday: empConnected,
          isCheckedIn,
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

    const [todayCalls, assignedLeads, attendance] = await Promise.all([
      this.callAttemptModel.find({
        organizationId: orgId,
        employeeId: empId,
        dialedAt: { $gte: start, $lte: end },
      }),
      this.leadModel.find({
        organizationId: orgId,
        assignedEmployeeId: empId,
      }),
      this.attendanceModel.findOne({
        organizationId: orgId,
        employeeId: empId,
        date: todayDateStr,
      }),
    ]);

    const totalCalls = todayCalls.length;
    const connected = todayCalls.filter(
      (c) => c.connected === true || (c.duration || 0) > 2,
    ).length;
    const totalDuration = todayCalls.reduce((acc, c) => acc + (c.duration || 0), 0);
    const avgDuration = connected > 0 ? Math.round(totalDuration / connected) : 0;

    const hotCount = assignedLeads.filter((l) => l.temperature === Temperature.HOT).length;
    const warmCount = assignedLeads.filter((l) => l.temperature === Temperature.WARM).length;
    const coldCount = assignedLeads.filter((l) => l.temperature === Temperature.COLD).length;
    const interestedCount = assignedLeads.filter((l) =>
      [LeadStatus.INTERESTED, LeadStatus.HOT, LeadStatus.WARM, LeadStatus.SITE_VISIT].includes(
        l.status,
      ),
    ).length;

    return {
      dailyTarget: 300,
      callsMadeToday: totalCalls,
      connectedToday: connected,
      connectionRate: totalCalls > 0 ? Math.round((connected / totalCalls) * 100) : 0,
      totalDurationSeconds: totalDuration,
      avgCallDurationSeconds: avgDuration,
      assignedLeadsCount: assignedLeads.length,
      interestedCount,
      hotCount,
      warmCount,
      coldCount,
      isCheckedIn: !!attendance && !attendance.checkOutAt,
    };
  }
}
