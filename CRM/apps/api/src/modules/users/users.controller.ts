import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  Role,
  IAuthUser,
  CreateUserDto,
  CreateUserSchema,
  MongoIdSchema,
  UpdateUserDto,
  UpdateUserSchema,
} from '@dayaar/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  async findAll(
    @CurrentUser() user: IAuthUser,
    @Query('role') role?: Role,
    @Query('managerId') managerId?: string,
    @Query('scope') scope?: string,
  ) {
    if (user.role === Role.MANAGER) {
      // Minimal cross-team employee list used by the import distribution picker.
      if (scope === 'organization' && role === Role.EMPLOYEE) {
        return this.usersService.findOrgEmployeesMinimal(user.organizationId);
      }
      // Managers only see their own team or subordinate employees
      return this.usersService.findAll(user.organizationId, role, user.id);
    }
    return this.usersService.findAll(user.organizationId, role, managerId);
  }

  @Roles(Role.MANAGER)
  @Get('team')
  async getTeamMembers(@CurrentUser() user: IAuthUser) {
    return this.usersService.findTeamMembers(user.id, user.organizationId);
  }

  @Get(':id')
  async findById(
    @Param('id', new ZodValidationPipe(MongoIdSchema)) id: string,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.usersService.findAccessibleById(id, user);
  }

  @Roles(Role.ADMIN)
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUserDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.usersService.create(dto, user.organizationId);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', new ZodValidationPipe(MongoIdSchema)) id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) body: UpdateUserDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.usersService.updateUser(id, user.organizationId, body);
  }
}
