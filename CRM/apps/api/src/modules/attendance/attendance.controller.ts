import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  Role,
  IAuthUser,
  CheckInDto,
  CheckOutDto,
  StartBreakDto,
  CheckInSchema,
  CheckOutSchema,
  StartBreakSchema,
} from '@dayaar/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

/**
 * Self-service shift endpoints are for employees and managers only.
 * Admins manage attendance organization-wide via GET /attendance/daily-report
 * (surfaced on the "Org Attendance Logs" screen) — the boss does not clock in.
 */
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('today')
  @Roles(Role.EMPLOYEE, Role.MANAGER)
  async getTodayStatus(@CurrentUser() user: IAuthUser) {
    return this.attendanceService.getTodayStatus(user);
  }

  @Post('check-in')
  @Roles(Role.EMPLOYEE, Role.MANAGER)
  async checkIn(
    @Body(new ZodValidationPipe(CheckInSchema)) dto: CheckInDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.attendanceService.checkIn(dto, user);
  }

  @Post('check-out')
  @Roles(Role.EMPLOYEE, Role.MANAGER)
  async checkOut(
    @Body(new ZodValidationPipe(CheckOutSchema)) dto: CheckOutDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.attendanceService.checkOut(dto, user);
  }

  @Post('break/start')
  @Roles(Role.EMPLOYEE, Role.MANAGER)
  async startBreak(
    @Body(new ZodValidationPipe(StartBreakSchema)) dto: StartBreakDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.attendanceService.startBreak(dto, user);
  }

  @Post('break/end')
  @Roles(Role.EMPLOYEE, Role.MANAGER)
  async endBreak(@CurrentUser() user: IAuthUser) {
    return this.attendanceService.endBreak(user);
  }

  /** Own shift history only (one row per day for the signed-in user). */
  @Get('history')
  @Roles(Role.EMPLOYEE, Role.MANAGER)
  async getHistory(
    @CurrentUser() user: IAuthUser,
    @Query('limit') limit = '30',
  ) {
    return this.attendanceService.getAttendanceHistory(
      user.organizationId,
      user,
      parseInt(limit, 10),
    );
  }

  /** Admin-only org-wide report for a single date, including GPS locations. */
  @Get('daily-report')
  @Roles(Role.ADMIN)
  async getDailyReport(
    @Query('date') date: string,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.attendanceService.getDailyReport(user.organizationId, date);
  }
}
