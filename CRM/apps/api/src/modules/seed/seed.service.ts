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
    ]);

    // 2. Create Organization
    const organization = new this.orgModel({
      name: 'Dayaar Real Estate Consultant Pvt Ltd',
      slug: 'dayaar-consultants',
      officeLatitude: 28.4595, // Sector 29, Gurgaon HQ
      officeLongitude: 77.0266,
      allowedRadiusMeters: 150,
      maxAllowedGpsAccuracyMeters: 60,
      maxUnsuccessfulAttempts: 4,
      dailyCallTarget: 300,
      isActive: true,
    });
    await organization.save();
    const orgId = organization._id;
    this.logger.log(`Created Organization: ${organization.name}`);

    // 3. Password Hash for Demo Accounts
    const defaultPassword = 'Password@123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    // 4. Create Admin
    const admin = new this.userModel({
      organizationId: orgId,
      name: 'Rajesh Sharma',
      email: 'admin@dayaar.com',
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
      name: 'Amit Verma',
      email: 'manager.amit@dayaar.com',
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
      email: 'manager.priya@dayaar.com',
      phone: '9833003344',
      employeeCode: 'MGR002',
      passwordHash,
      role: Role.MANAGER,
      isActive: true,
    });
    await managerB.save();

    // 6. Create 8 Employees
    const employeeData = [
      { name: 'Rahul Kapoor', email: 'rahul.k@dayaar.com', phone: '9844004401', code: 'EMP101', mgr: managerA._id },
      { name: 'Sneha Patel', email: 'sneha.p@dayaar.com', phone: '9844004402', code: 'EMP102', mgr: managerA._id },
      { name: 'Vikram Singh', email: 'vikram.s@dayaar.com', phone: '9844004403', code: 'EMP103', mgr: managerA._id },
      { name: 'Ananya Joshi', email: 'ananya.j@dayaar.com', phone: '9844004404', code: 'EMP104', mgr: managerA._id },
      { name: 'Rohit Mehta', email: 'rohit.m@dayaar.com', phone: '9844004405', code: 'EMP105', mgr: managerB._id },
      { name: 'Pooja Rao', email: 'pooja.r@dayaar.com', phone: '9844004406', code: 'EMP106', mgr: managerB._id },
      { name: 'Karan Malhotra', email: 'karan.m@dayaar.com', phone: '9844004407', code: 'EMP107', mgr: managerB._id },
      { name: 'Neha Verma', email: 'neha.v@dayaar.com', phone: '9844004408', code: 'EMP108', mgr: managerB._id },
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

    // 9. Seed Sample Calls & Historical Attempts
    for (let i = 0; i < 20; i++) {
      const lead = createdLeads[i];
      const emp = employees[i % employees.length];
      const device = devices[i % devices.length];

      const isConnected = i % 3 !== 0;
      const duration = isConnected ? 45 + (i * 12) : 0;

      const call = new this.callAttemptModel({
        organizationId: orgId,
        leadId: lead._id,
        employeeId: emp._id,
        deviceId: device._id,
        provider: CallProviderType.CALLYZER_SIM,
        origin: CallOrigin.ANDROID,
        syncStatus: CallSyncStatus.MATCHED,
        status: isConnected ? CallAttemptStatus.COMPLETED : CallAttemptStatus.NOT_CONNECTED,
        countsAsAttempt: true,
        dialedAt: new Date(Date.now() - (i + 1) * 35 * 60 * 1000),
        connectedAt: isConnected ? new Date(Date.now() - (i + 1) * 35 * 60 * 1000 + 6000) : null,
        endedAt: new Date(Date.now() - (i + 1) * 35 * 60 * 1000 + duration * 1000),
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
    }

    // 10. Seed Today Attendance for all Employees
    const todayStr = new Date().toISOString().split('T')[0];
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const att = new this.attendanceModel({
        organizationId: orgId,
        employeeId: emp._id,
        date: todayStr,
        checkInAt: new Date(Date.now() - (4 + (i % 3)) * 60 * 60 * 1000),
        checkInLocation: {
          latitude: 28.45952,
          longitude: 77.02661,
          accuracy: 12,
          distanceFromOfficeMeters: 8,
        },
        status: AttendanceStatus.PRESENT,
        totalWorkingSeconds: 14400 + i * 600,
        totalBreakSeconds: 1800,
      });
      await att.save();
    }

    this.logger.log('Database seeding successfully completed!');
    return {
      success: true,
      message: 'Seeding completed',
      organization: { id: orgId, name: organization.name },
      accounts: {
        admin: admin.email,
        managers: [managerA.email, managerB.email],
        employeesCount: employees.length,
      },
    };
  }
}
