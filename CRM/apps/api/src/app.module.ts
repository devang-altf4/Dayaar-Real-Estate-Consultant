import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Global Guards, Filters, Interceptors
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { AuditModule } from './modules/audit/audit.module';
import { StorageModule } from './modules/storage/storage.module';
import { DevicesModule } from './modules/devices/devices.module';
import { CallingModule } from './modules/calling/calling.module';
import { SimulatorModule } from './modules/simulator/simulator.module';
import { LeadsModule } from './modules/leads/leads.module';
import { LeadQueueModule } from './modules/lead-queue/lead-queue.module';
import { LeadImportModule } from './modules/lead-import/lead-import.module';
import { VerificationsModule } from './modules/verifications/verifications.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { FollowupsModule } from './modules/followups/followups.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SeedModule } from './modules/seed/seed.module';

const simulatorEnabled =
  process.env.NODE_ENV !== 'production' &&
  process.env.DEV_CALL_SIMULATOR === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/dayaar_crm',
    ),
    AuthModule,
    OrganizationsModule,
    UsersModule,
    AuditModule,
    StorageModule,
    DevicesModule,
    CallingModule,
    ...(simulatorEnabled ? [SimulatorModule] : []),
    LeadsModule,
    LeadQueueModule,
    LeadImportModule,
    VerificationsModule,
    AttendanceModule,
    FollowupsModule,
    AnalyticsModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
