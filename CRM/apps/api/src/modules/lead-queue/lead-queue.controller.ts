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
    const raw = Number.isFinite(+limit) ? +limit : 50;
    const safe = Math.min(200, Math.max(1, raw));
    return this.queueService.getDailyQueue(user, safe);
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
