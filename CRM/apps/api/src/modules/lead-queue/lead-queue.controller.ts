import { Controller, Get, Query } from '@nestjs/common';
import { LeadQueueService } from './lead-queue.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IAuthUser } from '@dayaar/shared';

@Controller('queue')
export class LeadQueueController {
  constructor(private readonly queueService: LeadQueueService) {}

  @Get()
  async getDailyQueue(
    @CurrentUser() user: IAuthUser,
    @Query('limit') limit = '50',
  ) {
    return this.queueService.getDailyQueue(user, parseInt(limit, 10));
  }

  @Get('next')
  async getNextLead(
    @CurrentUser() user: IAuthUser,
    @Query('excludeLeadId') excludeLeadId?: string,
  ) {
    return this.queueService.getNextLead(user, excludeLeadId);
  }

  @Get('progress')
  async getProgress(@CurrentUser() user: IAuthUser) {
    return this.queueService.getDailyTargetProgress(user);
  }
}
