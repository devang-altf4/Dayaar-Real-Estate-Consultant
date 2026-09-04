import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, IAuthUser } from '@dayaar/shared';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Roles(Role.ADMIN)
  @Get()
  async findAll(
    @CurrentUser() user: IAuthUser,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('entityType') entityType?: string,
  ) {
    const safeLimit = Number.isFinite(+limit) ? +limit : 50;
    const safePage = Number.isFinite(+page) ? +page : 1;
    return this.auditService.findAll(
      user.organizationId,
      safeLimit,
      safePage,
      entityType,
    );
  }
}
