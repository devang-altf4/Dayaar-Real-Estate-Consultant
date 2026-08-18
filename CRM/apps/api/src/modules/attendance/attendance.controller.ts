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

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('today')
  async getTodayStatus(@CurrentUser() user: IAuthUser) {
    return this.attendanceService.getTodayStatus(user);
  }

  @Post('check-in')
  async checkIn(
    @Body(new ZodValidationPipe(CheckInSchema)) dto: CheckInDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.attendanceService.checkIn(dto, user);
  }

  @Post('check-out')
  async checkOut(
    @Body(new ZodValidationPipe(CheckOutSchema)) dto: CheckOutDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.attendanceService.checkOut(dto, user);
  }

  @Post('break/start')
  async startBreak(
    @Body(new ZodValidationPipe(StartBreakSchema)) dto: StartBreakDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.attendanceService.startBreak(dto, user);
  }

  @Post('break/end')
  async endBreak(@CurrentUser() user: IAuthUser) {
    return this.attendanceService.endBreak(user);
  }

  @Get('history')
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
}
