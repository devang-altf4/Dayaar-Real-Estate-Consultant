import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { FollowupsService } from './followups.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  IAuthUser,
  MongoIdSchema,
  ScheduleFollowUpDto,
  ScheduleFollowUpSchema,
} from '@dayaar/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('follow-ups')
export class FollowupsController {
  constructor(private readonly followupsService: FollowupsService) {}

  @Get()
  async getFollowUps(
    @CurrentUser() user: IAuthUser,
    @Query('type') type: 'today' | 'overdue' | 'upcoming' | 'all' = 'all',
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    const safeLimit = Number.isFinite(+limit) ? +limit : 50;
    const safePage = Number.isFinite(+page) ? +page : 1;
    return this.followupsService.getMyFollowUps(user, type, safePage, safeLimit);
  }

  @Post()
  async scheduleFollowUp(
    @Body(new ZodValidationPipe(ScheduleFollowUpSchema))
    body: ScheduleFollowUpDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.followupsService.scheduleFollowUp(body, user);
  }

  @Patch(':id/complete')
  async completeFollowUp(
    @Param('id', new ZodValidationPipe(MongoIdSchema)) id: string,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.followupsService.completeFollowUp(id, user);
  }
}
