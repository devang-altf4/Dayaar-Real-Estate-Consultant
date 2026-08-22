import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { CallyzerModule } from './modules/callyzer/callyzer.module';
import { LeadsModule } from './modules/leads/leads.module';
import { LeadQueueModule } from './modules/lead-queue/lead-queue.module';
import { LeadImportModule } from './modules/lead-import/lead-import.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { FollowupsModule } from './modules/followups/followups.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SeedModule } from './modules/seed/seed.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '../.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          process.env.MONGODB_URI ||
          'mongodb://localhost:27017/dayaar_crm',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    OrganizationsModule,
    UsersModule,
    AuditModule,
    StorageModule,
    DevicesModule,
    CallingModule,
    CallyzerModule,
    LeadsModule,
    LeadQueueModule,
    LeadImportModule,
    AttendanceModule,
    FollowupsModule,
    AnalyticsModule,
    SeedModule,
  ],
  controllers: [HealthController],
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
