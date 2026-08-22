import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Organization, OrganizationDocument } from '../../database/schemas/organization.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Lead, LeadDocument } from '../../database/schemas/lead.schema';
import { AndroidDevice, AndroidDeviceDocument } from '../../database/schemas/android-device.schema';
import { CallAttempt, CallAttemptDocument } from '../../database/schemas/call-attempt.schema';
import { AttendanceRecord, AttendanceRecordDocument } from '../../database/schemas/attendance-record.schema';
import { FollowUp, FollowUpDocument } from '../../database/schemas/follow-up.schema';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';
import { CallEvent, CallEventDocument } from '../../database/schemas/call-event.schema';
import {
  Role,
  LeadStatus,
  Temperature,
  NotInterestedReason,
  PropertyType,
  BhkType,
  PurchasePurpose,
  PurchaseTimeline,
  FinancingType,
  SimState,
  DeviceStatus,
  CallProviderType,
  CallAttemptStatus,
  CallOrigin,
  CallSyncStatus,
  RecordingStatus,
  AttendanceStatus,
  FollowUpStatus,
  CallEventType,
} from '@dayaar/shared';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Organization.name) private orgModel: Model<OrganizationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(AndroidDevice.name) private deviceModel: Model<AndroidDeviceDocument>,
    @InjectModel(CallAttempt.name) private callAttemptModel: Model<CallAttemptDocument>,
    @InjectModel(AttendanceRecord.name) private attendanceModel: Model<AttendanceRecordDocument>,
    @InjectModel(FollowUp.name) private followUpModel: Model<FollowUpDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(CallEvent.name) private callEventModel: Model<CallEventDocument>,
  ) {}

  async runSeed() {
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.ALLOW_DESTRUCTIVE_SEED !== 'true'
    ) {
      throw new ForbiddenException(
        'Destructive seed is disabled. Run only outside production with ALLOW_DESTRUCTIVE_SEED=true.',
      );
    }

    this.logger.log('Starting CRM database seeding...');

    // 1. Clear existing collections
    await Promise.all([
      this.orgModel.deleteMany({}),
      this.userModel.deleteMany({}),
      this.leadModel.deleteMany({}),
      this.deviceModel.deleteMany({}),
      this.callAttemptModel.deleteMany({}),
      this.attendanceModel.deleteMany({}),
      this.followUpModel.deleteMany({}),
      this.auditLogModel.deleteMany({}),
      this.callEventModel.deleteMany({}),
    ]);

    // Drop legacy non-sparse indexes and sync schema indexes
    await Promise.all([
      this.orgModel.collection.dropIndexes().catch(() => {}),
      this.userModel.collection.dropIndexes().catch(() => {}),
      this.leadModel.collection.dropIndexes().catch(() => {}),
      this.deviceModel.collection.dropIndexes().catch(() => {}),
      this.callAttemptModel.collection.dropIndexes().catch(() => {}),
      this.attendanceModel.collection.dropIndexes().catch(() => {}),
      this.followUpModel.collection.dropIndexes().catch(() => {}),
      this.auditLogModel.collection.dropIndexes().catch(() => {}),
      this.callEventModel.collection.dropIndexes().catch(() => {}),
    ]);

    await Promise.all([
      this.orgModel.syncIndexes(),
      this.userModel.syncIndexes(),
      this.leadModel.syncIndexes(),
      this.deviceModel.syncIndexes(),
      this.callAttemptModel.syncIndexes(),
      this.attendanceModel.syncIndexes(),
      this.followUpModel.syncIndexes(),
      this.auditLogModel.syncIndexes(),
      this.callEventModel.syncIndexes(),
    ]).catch(() => {});

    // 2. Create Organization
    const organization = new this.orgModel({
      name: 'Dayaar Real Estate Consultant Pvt Ltd',
      slug: 'dayaar-consultants',
      officeLatitude: 19.296201, // Oswal Garden, Kanakia Rd, near Park View Hotel, Mira Road East, Thane 401107
      officeLongitude: 72.876082,
      allowedRadiusMeters: 10,
      maxAllowedGpsAccuracyMeters: 20,
      maxUnsuccessfulAttempts: 4,
      dailyCallTarget: 300,
      isActive: true,
    });
    await organization.save();
    const orgId = organization._id;
    this.logger.log(`Created Organization: ${organization.name}`);

    // 3. Password Hash for Demo Accounts
    const defaultPassword = '123456789';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    // 4. Create Admin
    const admin = new this.userModel({
      organizationId: orgId,
      name: 'Salman',
      email: 'admin29@dayyar.com',
      phone: '9811001122',
      employeeCode: 'ADM001',
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    });
    await admin.save();

    // 5. Create 2 Managers
    const managerA = new this.userModel({
      organizationId: orgId,
      name: 'Gazala',
      email: 'manager1@dayyar.com',
      phone: '9822002233',
      employeeCode: 'MGR001',
      passwordHash,
      role: Role.MANAGER,
      isActive: true,
    });
    await managerA.save();

    const managerB = new this.userModel({
      organizationId: orgId,
      name: 'Priya Nair',
      email: 'manager2@dayyar.com',
      phone: '9833003344',
      employeeCode: 'MGR002',
      passwordHash,
      role: Role.MANAGER,
      isActive: true,
    });
    await managerB.save();

    // 6. Create 8 Employees
    const employeeData = [
      { name: 'Devang', email: 'employee1@dayyar.com', phone: '9844004401', code: 'EMP101', mgr: managerA._id },
      { name: 'Devang2', email: 'employee2@dayyar.com', phone: '9844004402', code: 'EMP102', mgr: managerA._id },
      { name: 'Vikram Singh', email: 'employee3@dayyar.com', phone: '9844004403', code: 'EMP103', mgr: managerA._id },
      { name: 'Ananya Joshi', email: 'employee4@dayyar.com', phone: '9844004404', code: 'EMP104', mgr: managerA._id },
      { name: 'Rohit Mehta', email: 'employee5@dayyar.com', phone: '9844004405', code: 'EMP105', mgr: managerB._id },
      { name: 'Pooja Rao', email: 'employee6@dayyar.com', phone: '9844004406', code: 'EMP106', mgr: managerB._id },
      { name: 'Karan Malhotra', email: 'employee7@dayyar.com', phone: '9844004407', code: 'EMP107', mgr: managerB._id },
      { name: 'Neha Verma', email: 'employee8@dayyar.com', phone: '9844004408', code: 'EMP108', mgr: managerB._id },
    ];

    const employees: UserDocument[] = [];
    for (const emp of employeeData) {
      const user = new this.userModel({
        organizationId: orgId,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        employeeCode: emp.code,
        passwordHash,
        role: Role.EMPLOYEE,
        managerId: emp.mgr,
        isActive: true,
        callingEnabled: true,
      });
      await user.save();
      employees.push(user);
    }
    this.logger.log(`Created ${employees.length} employee accounts`);

    // 7. Create Paired Android Devices for Employees
    const devices: AndroidDeviceDocument[] = [];
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const device = new this.deviceModel({
        organizationId: orgId,
        userId: emp._id,
        deviceId: `android-seed-device-${i + 1}`,
        deviceName: `Samsung Galaxy A15 (${emp.name.split(' ')[0]})`,
        manufacturer: 'Samsung',
        model: 'SM-A155F',
        appVersion: '1.0.0',
        simState: SimState.READY,
        simOperator: i % 2 === 0 ? 'Airtel' : 'Jio',
        status: DeviceStatus.ONLINE,
        capabilities: { canPlaceCalls: true, canReadCallLogs: false, canSyncRecordings: false },
        isPrimaryCallingDevice: true,
        lastSeenAt: new Date(),
        pairedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      });
      await device.save();
      devices.push(device);
    }

    // 8. Create 50+ Realistic Real Estate Leads
    const projects = [
      'Dayaar Heights - Golf Course Ext Rd',
      'Emerald Bay Residences - Dwarka Expressway',
      'Godrej Palm Retreat - Sector 150',
      'DLF Cyber City Luxury Floors',
      'M3M Golfestate - Sector 65',
      'Sobha City - Sector 108',
      'Smartworld Orchard - Sector 61',
    ];

    const sources = ['Meta Ads', 'Google Ads', '99acres', 'MagicBricks', 'Referral', 'Walk-in'];

    const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Kabir', 'Ananya', 'Diya', 'Gauri', 'Isha', 'Kavya', 'Khushi', 'Myra', 'Navya', 'Pari', 'Prisha', 'Riya', 'Saanvi', 'Tanvi', 'Vanya', 'Zoya'];
    const lastNames = ['Agarwal', 'Bansal', 'Bhatia', 'Chawla', 'Deshmukh', 'Garg', 'Gupta', 'Jain', 'Kapoor', 'Khanna', 'Kumar', 'Malhotra', 'Mehta', 'Narang', 'Pandey', 'Patel', 'Rao', 'Reddy', 'Saxena', 'Sharma', 'Singh', 'Singhal', 'Srivastava', 'Verma', 'Yadav'];

    const createdLeads: LeadDocument[] = [];
    for (let i = 1; i <= 55; i++) {
      const fn = firstNames[i % firstNames.length];
      const ln = lastNames[Math.floor(i / 2) % lastNames.length];
      const phone = `98${String(10000000 + i * 137).slice(0, 8)}`;
      const assignedEmp = employees[i % employees.length];
      const project = projects[i % projects.length];
      const source = sources[i % sources.length];

      let status = LeadStatus.NEW;
      let temp = Temperature.UNQUALIFIED;
      let reason: NotInterestedReason | null = null;
      let attemptCount = 0;

      if (i % 6 === 0) {
        status = LeadStatus.HOT;
        temp = Temperature.HOT;
        attemptCount = 1;
      } else if (i % 6 === 1) {
        status = LeadStatus.WARM;
        temp = Temperature.WARM;
        attemptCount = 1;
      } else if (i % 6 === 2) {
        status = LeadStatus.FOLLOW_UP;
        temp = Temperature.WARM;
        attemptCount = 2;
      } else if (i % 6 === 3) {
        status = LeadStatus.NOT_INTERESTED;
        temp = Temperature.COLD;
        reason = i % 2 === 0 ? NotInterestedReason.BUDGET : NotInterestedReason.ALREADY_PURCHASED;
        attemptCount = 1;
      } else if (i % 6 === 4) {
        status = LeadStatus.NOT_PICKED_UP;
        temp = Temperature.COLD;
        attemptCount = 4; // Max attempts hit
      } else {
        status = LeadStatus.NEW;
        temp = Temperature.UNQUALIFIED;
        attemptCount = 0;
      }

      const lead = new this.leadModel({
        organizationId: orgId,
        name: `${fn} ${ln}`,
        phone,
        alternatePhone: i % 3 === 0 ? `97${String(20000000 + i * 251).slice(0, 8)}` : undefined,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`,
        source,
        project,
        assignedEmployeeId: assignedEmp._id,
        assignedManagerId: assignedEmp.managerId,
        status,
        notInterestedReason: reason,
        attemptCount,
        temperature: temp,
        qualification: {
          budgetMin: 12000000 + (i % 5) * 5000000,
          budgetMax: 20000000 + (i % 5) * 5000000,
          propertyType: PropertyType.APARTMENT,
          bhk: (i % 2 === 0 ? BhkType.THREE_BHK : BhkType.FOUR_BHK),
          preferredLocations: ['Golf Course Extension Road', 'Dwarka Expressway', 'Southern Peripheral Road'],
          purpose: PurchasePurpose.SELF_USE,
          purchaseTimeline: PurchaseTimeline.ONE_TO_THREE_MONTHS,
          financing: FinancingType.LOAN,
          loanStatus: 'Pre-approved from HDFC Bank',
          siteVisitInterested: status === LeadStatus.HOT || status === LeadStatus.WARM,
          siteVisitDate: status === LeadStatus.HOT ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) : null,
          notes: `Customer is searching for a ready-to-move / near possession 3BHK flat near metro connectivity.`,
        },
        nextFollowUpAt: status === LeadStatus.FOLLOW_UP ? new Date(Date.now() + (i % 3) * 60 * 60 * 1000) : null,
      });

      await lead.save();
      createdLeads.push(lead);
    }
    this.logger.log(`Created ${createdLeads.length} real estate leads`);

    // 9. Seed Sample Calls & Historical Attempts + Call Events
    for (let i = 0; i < 25; i++) {
      const lead = createdLeads[i % createdLeads.length];
      const emp = employees[i % employees.length];
      const device = devices[i % devices.length];

      const isConnected = i % 3 !== 0;
      const duration = isConnected ? 45 + (i * 12) : 0;
      const dialedAt = new Date(Date.now() - (i + 1) * 35 * 60 * 1000);
      const connectedAt = isConnected ? new Date(dialedAt.getTime() + 6000) : null;
      const endedAt = new Date(dialedAt.getTime() + (duration + 6) * 1000);

      const call = new this.callAttemptModel({
        organizationId: orgId,
        leadId: lead._id,
        employeeId: emp._id,
        deviceId: device._id,
        provider: CallProviderType.CALLYZER_SIM,
        origin: i % 2 === 0 ? CallOrigin.WEB : CallOrigin.ANDROID,
        syncStatus: CallSyncStatus.MATCHED,
        status: isConnected ? CallAttemptStatus.COMPLETED : CallAttemptStatus.NOT_CONNECTED,
        countsAsAttempt: true,
        dialedAt,
        connectedAt,
        endedAt,
        duration,
        phoneNumber: `+91${lead.phone}`,
        employeePhoneNumber: `+91${emp.phone}`,
        providerCallId: `demo-callyzer-${i + 1}`,
        connected: isConnected,
        recordingStatus: isConnected ? RecordingStatus.ARCHIVED : RecordingStatus.NO_RECORDING,
        recordingB2Key: isConnected ? `recordings/${orgId.toString()}/sample_${i + 1}.wav` : null,
        recordingBytes: isConnected ? 1048576 : null,
        recordingMimeType: isConnected ? 'audio/wav' : null,
      });
      await call.save();

      // Create Call Lifecycle Events
      await this.callEventModel.create([
        {
          organizationId: orgId,
          callAttemptId: call._id,
          employeeId: emp._id,
          deviceId: device._id,
          type: CallEventType.CALL_ATTEMPT_CREATED,
          metadata: { origin: call.origin },
          timestamp: dialedAt,
        },
        {
          organizationId: orgId,
          callAttemptId: call._id,
          employeeId: emp._id,
          deviceId: device._id,
          type: CallEventType.DIALING_STARTED,
          metadata: { dialedAt },
          timestamp: dialedAt,
        },
        {
          organizationId: orgId,
          callAttemptId: call._id,
          employeeId: emp._id,
          deviceId: device._id,
          type: CallEventType.CALL_ENDED,
          metadata: { duration, isConnected },
          timestamp: endedAt,
        },
      ]);
    }
    this.logger.log('Created 25 call attempts and lifecycle events');

    // 10. Seed Today Attendance for all Employees
    const todayStr = new Date().toISOString().split('T')[0];
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const att = new this.attendanceModel({
        organizationId: orgId,
        employeeId: emp._id,
        date: todayStr,
        checkInAt: new Date(Date.now() - (5 + (i % 3)) * 60 * 60 * 1000),
        checkInLocation: {
          latitude: 28.45952,
          longitude: 77.02661,
          accuracy: 12,
          distanceFromOfficeMeters: 8,
        },
        status: AttendanceStatus.PRESENT,
        totalWorkingSeconds: 16000 + i * 600,
        totalBreakSeconds: 1800,
      });
      await att.save();
    }
    this.logger.log(`Created attendance records for ${employees.length} employees`);

    // 11. Seed Realistic Follow-Ups
    const followUpReasons = [
      'Site Visit Discussion',
      'Price Negotiation & Discount',
      'Share Floor Plan on WhatsApp',
      'Follow-up after Home Loan Approval',
      'Unit Booking Advance Payment',
    ];
    for (let i = 0; i < 20; i++) {
      const lead = createdLeads[i];
      const emp = employees[i % employees.length];
      const isCompleted = i % 2 === 0;

      const followUp = new this.followUpModel({
        organizationId: orgId,
        leadId: lead._id,
        employeeId: emp._id,
        scheduledAt: new Date(Date.now() + (i - 5) * 4 * 60 * 60 * 1000),
        reason: followUpReasons[i % followUpReasons.length],
        notes: `Customer requested a callback regarding payment plans for ${lead.project}.`,
        status: isCompleted ? FollowUpStatus.COMPLETED : FollowUpStatus.PENDING,
        completedAt: isCompleted ? new Date() : null,
      });
      await followUp.save();
    }
    this.logger.log('Created 20 scheduled & completed follow-ups');

    // 12. Seed System Audit Logs
    const auditActions = [
      { action: 'USER_LOGIN', entityType: 'USER', entityId: admin._id.toString(), actorName: admin.name, actorRole: admin.role },
      { action: 'LEAD_IMPORTED', entityType: 'LEAD', entityId: createdLeads[0]._id.toString(), actorName: admin.name, actorRole: admin.role },
      { action: 'DEVICE_PAIRED', entityType: 'DEVICE', entityId: devices[0]._id.toString(), actorName: employees[0].name, actorRole: employees[0].role },
      { action: 'ORGANIZATION_SETTINGS_UPDATED', entityType: 'ORGANIZATION', entityId: orgId.toString(), actorName: admin.name, actorRole: admin.role },
      { action: 'LEADS_BULK_ASSIGNED', entityType: 'LEAD_ASSIGNMENT', entityId: orgId.toString(), actorName: managerA.name, actorRole: managerA.role },
    ];
    for (const item of auditActions) {
      await this.auditLogModel.create({
        organizationId: orgId,
        actorId: admin._id,
        actorName: item.actorName,
        actorRole: item.actorRole,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        metadata: { source: 'seed_initialization' },
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      });
    }
    this.logger.log('Created system audit logs');

    this.logger.log('Database seeding successfully completed with all collections!');
    return {
      success: true,
      message: 'Full seeding completed',
      organization: { id: orgId, name: organization.name },
      accounts: {
        admin: admin.email,
        managers: [managerA.email, managerB.email],
        employeesCount: employees.length,
      },
    };
  }
}
