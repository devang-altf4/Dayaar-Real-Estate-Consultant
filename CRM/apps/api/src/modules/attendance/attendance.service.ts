import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AttendanceRecord,
  AttendanceRecordDocument,
} from '../../database/schemas/attendance-record.schema';
import {
  BreakSession,
  BreakSessionDocument,
} from '../../database/schemas/break-session.schema';
import {
  Organization,
  OrganizationDocument,
} from '../../database/schemas/organization.schema';
import { AuditService } from '../audit/audit.service';
import {
  AttendanceStatus,
  IAuthUser,
  CheckInDto,
  CheckOutDto,
  StartBreakDto,
  calculateHaversineDistance,
  isWithinGeofence,
} from '@dayaar/shared';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectModel(AttendanceRecord.name)
    private attendanceModel: Model<AttendanceRecordDocument>,
    @InjectModel(BreakSession.name)
    private breakModel: Model<BreakSessionDocument>,
    @InjectModel(Organization.name)
    private orgModel: Model<OrganizationDocument>,
    private readonly auditService: AuditService,
  ) {}

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Server-side Geofence & GPS Accuracy Validation
   */
  private async validateGeofence(
    orgId: string,
    latitude: number,
    longitude: number,
    accuracy: number,
  ) {
    const org = await this.orgModel.findById(orgId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const { isWithin, distanceMeters } = isWithinGeofence(
      latitude,
      longitude,
      org.officeLatitude,
      org.officeLongitude,
      org.allowedRadiusMeters,
    );

    // Human-readable distance for messages.
    const prettyDistance =
      distanceMeters >= 1000
        ? `${(distanceMeters / 1000).toFixed(1)} km`
        : `${Math.round(distanceMeters)} m`;

    // Case 1: position is unambiguously far from the office (even accounting
    // for GPS error, it cannot be inside the radius) — say so plainly.
    if (distanceMeters > org.allowedRadiusMeters + accuracy) {
      throw new BadRequestException({
        success: false,
        code: 'OUTSIDE_GEOFENCE',
        message: `You are about ${prettyDistance} away from the office. Check-in works only when you are at the office (within ${org.allowedRadiusMeters} m).`,
        distanceMeters,
        allowedRadiusMeters: org.allowedRadiusMeters,
      });
    }

    // Case 2: position is ambiguous — GPS too weak to decide. Ask for a better fix.
    const maxAccuracy = org.maxAllowedGpsAccuracyMeters || 50;
    if (accuracy > maxAccuracy) {
      throw new BadRequestException({
        success: false,
        code: 'GPS_ACCURACY_TOO_LOW',
        message: `GPS signal is too weak to confirm you are at the office (±${Math.round(accuracy)} m). Step near a window or outdoors, make sure Location is on, and try again.`,
      });
    }

    // Case 3: good GPS, but outside the radius.
    if (!isWithin) {
      throw new BadRequestException({
        success: false,
        code: 'OUTSIDE_GEOFENCE',
        message: `You are ${prettyDistance} from the office. Check-in works only within ${org.allowedRadiusMeters} m of the office.`,
        distanceMeters,
        allowedRadiusMeters: org.allowedRadiusMeters,
      });
    }

    return { distanceMeters };
  }

  /**
   * Employee Check-In with Geolocation Validation
   */
  async checkIn(dto: CheckInDto, user: IAuthUser) {
    const today = this.getTodayDateString();
    const existing = await this.attendanceModel.findOne({
      organizationId: new Types.ObjectId(user.organizationId),
      employeeId: new Types.ObjectId(user.id),
      date: today,
    });

    if (existing) {
      throw new BadRequestException({
        success: false,
        code: 'ALREADY_CHECKED_IN',
        message: 'You have already checked in for today.',
      });
    }

    const { distanceMeters } = await this.validateGeofence(
      user.organizationId,
      dto.latitude,
      dto.longitude,
      dto.accuracy,
    );

    const record = new this.attendanceModel({
      organizationId: new Types.ObjectId(user.organizationId),
      employeeId: new Types.ObjectId(user.id),
      date: today,
      checkInAt: new Date(),
      checkInLocation: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        distanceFromOfficeMeters: distanceMeters,
      },
      status: AttendanceStatus.PRESENT,
      totalWorkingSeconds: 0,
      totalBreakSeconds: 0,
    });

    await record.save();

    await this.auditService.log({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityType: 'AttendanceRecord',
      entityId: record._id.toString(),
      action: 'CHECK_IN',
      metadata: { distanceMeters, accuracy: dto.accuracy },
    });

    return record;
  }

  /**
   * Employee Check-Out
   */
  async checkOut(dto: CheckOutDto, user: IAuthUser) {
    const today = this.getTodayDateString();
    const record = await this.attendanceModel.findOne({
      organizationId: new Types.ObjectId(user.organizationId),
      employeeId: new Types.ObjectId(user.id),
      date: today,
    });

    if (!record) {
      throw new BadRequestException('You must check in first before checking out.');
    }

    if (record.checkOutAt) {
      throw new BadRequestException('You have already checked out for today.');
    }

    // If on active break, end it
    await this.endActiveBreakInternal(record._id.toString(), user.id);

    const { distanceMeters } = await this.validateGeofence(
      user.organizationId,
      dto.latitude,
      dto.longitude,
      dto.accuracy,
    );

    const checkOutTime = new Date();
    record.checkOutAt = checkOutTime;
    record.checkOutLocation = {
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      distanceFromOfficeMeters: distanceMeters,
    };

    // Calculate total duration
    const totalDurationSeconds = Math.floor(
      (checkOutTime.getTime() - new Date(record.checkInAt).getTime()) / 1000,
    );
    record.totalWorkingSeconds = Math.max(0, totalDurationSeconds - (record.totalBreakSeconds || 0));

    await record.save();

    await this.auditService.log({
      organizationId: user.organizationId,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      entityType: 'AttendanceRecord',
      entityId: record._id.toString(),
      action: 'CHECK_OUT',
      metadata: { distanceMeters, totalWorkingSeconds: record.totalWorkingSeconds },
    });

    return record;
  }

  /**
   * Starts a break session
   */
  async startBreak(dto: StartBreakDto, user: IAuthUser) {
    const today = this.getTodayDateString();
    const record = await this.attendanceModel.findOne({
      organizationId: new Types.ObjectId(user.organizationId),
      employeeId: new Types.ObjectId(user.id),
      date: today,
    });

    if (!record || record.checkOutAt) {
      throw new BadRequestException('Cannot start break without an active check-in');
    }

    // Check if already on break
    const activeBreak = await this.breakModel.findOne({
      attendanceId: record._id,
      endedAt: null,
    });

    if (activeBreak) {
      throw new BadRequestException('You are already on an active break session');
    }

    const breakSession = new this.breakModel({
      attendanceId: record._id,
      employeeId: new Types.ObjectId(user.id),
      startedAt: new Date(),
      reason: dto.reason || 'Short Break',
    });

    await breakSession.save();
    return breakSession;
  }

  /**
   * Ends active break session
   */
  async endBreak(user: IAuthUser) {
    const today = this.getTodayDateString();
    const record = await this.attendanceModel.findOne({
      organizationId: new Types.ObjectId(user.organizationId),
      employeeId: new Types.ObjectId(user.id),
      date: today,
    });

    if (!record) {
      throw new BadRequestException('No active attendance record found');
    }

    return this.endActiveBreakInternal(record._id.toString(), user.id);
  }

  private async endActiveBreakInternal(attendanceId: string, userId: string) {
    const activeBreak = await this.breakModel.findOne({
      attendanceId: new Types.ObjectId(attendanceId),
      endedAt: null,
    });

    if (!activeBreak) {
      return null;
    }

    const endTime = new Date();
    activeBreak.endedAt = endTime;
    activeBreak.durationSeconds = Math.floor(
      (endTime.getTime() - new Date(activeBreak.startedAt).getTime()) / 1000,
    );
    await activeBreak.save();

    // Increment total break seconds on attendance record
    await this.attendanceModel.findByIdAndUpdate(attendanceId, {
      $inc: { totalBreakSeconds: activeBreak.durationSeconds },
    });

    return activeBreak;
  }

  /**
   * Returns employee's current today status
   */
  async getTodayStatus(user: IAuthUser) {
    const today = this.getTodayDateString();
    const record = await this.attendanceModel.findOne({
      organizationId: new Types.ObjectId(user.organizationId),
      employeeId: new Types.ObjectId(user.id),
      date: today,
    });

    if (!record) {
      return {
        isCheckedIn: false,
        isOnBreak: false,
        record: null,
        activeBreak: null,
      };
    }

    const activeBreak = await this.breakModel.findOne({
      attendanceId: record._id,
      endedAt: null,
    });

    return {
      isCheckedIn: !!record.checkInAt && !record.checkOutAt,
      isOnBreak: !!activeBreak,
      record,
      activeBreak,
    };
  }

  /**
   * Own shift history only. Admins must use getDailyReport via
   * GET /attendance/daily-report instead of hitting this endpoint.
   */
  async getAttendanceHistory(organizationId: string, user: IAuthUser, limit = 30) {
    const filter: any = {
      organizationId: new Types.ObjectId(organizationId),
      employeeId: new Types.ObjectId(user.id),
    };
    limit = Math.min(100, Math.max(1, Number.isFinite(limit) ? limit : 30));

    return this.attendanceModel
      .find(filter)
      .sort({ date: -1 })
      .limit(limit);
  }

  /**
   * Org-wide attendance report for one date (admin only).
   * Returns every record for the date with employee identity and
   * check-in/check-out GPS locations so the boss can audit presence.
   */
  async getDailyReport(organizationId: string, date?: string) {
    const targetDate =
      date && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : this.getTodayDateString();

    const records = await this.attendanceModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        date: targetDate,
      })
      .populate('employeeId', 'name email employeeCode role')
      .sort({ 'checkInLocation.distanceFromOfficeMeters': 1, createdAt: 1 })
      .limit(500)
      .lean();

    return {
      date: targetDate,
      totalRecords: records.length,
      records,
    };
  }
}
