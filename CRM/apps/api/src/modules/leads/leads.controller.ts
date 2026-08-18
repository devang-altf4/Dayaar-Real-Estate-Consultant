import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  Role,
  IAuthUser,
  LeadStatus,
  Temperature,
  CreateLeadDto,
  UpdateLeadDispositionDto,
  BulkAssignLeadsDto,
  CreateLeadSchema,
  UpdateLeadDispositionSchema,
  BulkAssignLeadsSchema,
  MongoIdSchema,
} from '@dayaar/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: IAuthUser,
    @Query('search') search?: string,
    @Query('status') status?: LeadStatus,
    @Query('temperature') temperature?: Temperature,
    @Query('project') project?: string,
    @Query('assignedEmployeeId') assignedEmployeeId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('sortBy') sortBy = 'updatedAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.leadsService.findAll(user.organizationId, user, {
      search,
      status,
      temperature,
      project,
      assignedEmployeeId,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sortBy,
      sortOrder,
    });
  }

  @Get('pipeline/counts')
  async getPipelineCounts(@CurrentUser() user: IAuthUser) {
    return this.leadsService.getPipelineCounts(user.organizationId, user);
  }

  @Get(':id')
  async findById(
    @Param('id', new ZodValidationPipe(MongoIdSchema)) id: string,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.leadsService.findById(id, user.organizationId, user);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateLeadSchema)) dto: CreateLeadDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.leadsService.create(dto, user.organizationId, user);
  }

  @Patch(':id/disposition')
  async updateDisposition(
    @Param('id', new ZodValidationPipe(MongoIdSchema)) id: string,
    @Body(new ZodValidationPipe(UpdateLeadDispositionSchema))
    dto: UpdateLeadDispositionDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.leadsService.updateDisposition(id, dto, user.organizationId, user);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('bulk-assign')
  async bulkAssign(
    @Body(new ZodValidationPipe(BulkAssignLeadsSchema)) dto: BulkAssignLeadsDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.leadsService.bulkAssign(dto, user.organizationId, user);
  }
}
