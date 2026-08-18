import { Body, Controller, Post } from '@nestjs/common';
import { LeadImportService } from './lead-import.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  Role,
  IAuthUser,
  BulkImportPayloadDto,
  BulkImportPayloadSchema,
} from '@dayaar/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('leads/import')
export class LeadImportController {
  constructor(private readonly importService: LeadImportService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  async importLeads(
    @Body(new ZodValidationPipe(BulkImportPayloadSchema)) dto: BulkImportPayloadDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.importService.processBulkImport(dto, user.organizationId, user);
  }
}
