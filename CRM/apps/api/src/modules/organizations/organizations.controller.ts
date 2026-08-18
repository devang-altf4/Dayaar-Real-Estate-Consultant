import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  Role,
  IAuthUser,
  UpdateOrganizationSettingsDto,
  UpdateOrganizationSettingsSchema,
} from '@dayaar/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Get('current')
  async getCurrent(@CurrentUser() user: IAuthUser) {
    return this.orgService.findById(user.organizationId);
  }

  @Roles(Role.ADMIN)
  @Patch('settings')
  async updateSettings(
    @CurrentUser() user: IAuthUser,
    @Body(new ZodValidationPipe(UpdateOrganizationSettingsSchema))
    body: UpdateOrganizationSettingsDto,
  ) {
    return this.orgService.updateSettings(user.organizationId, body);
  }
}
