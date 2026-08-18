import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { VerificationsService } from './verifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  Role,
  IAuthUser,
  VerificationStatus,
  CreateLeadVerificationTaskDto,
  SubmitVerificationDispositionDto,
  ReviewVerificationMismatchDto,
  CreateLeadVerificationTaskSchema,
  SubmitVerificationDispositionSchema,
  ReviewVerificationMismatchSchema,
  AssignVerificationEmployeeSchema,
  MongoIdSchema,
} from '@dayaar/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('verifications')
export class VerificationsController {
  constructor(private readonly verificationsService: VerificationsService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('tasks')
  async createTask(
    @Body(new ZodValidationPipe(CreateLeadVerificationTaskSchema))
    dto: CreateLeadVerificationTaskDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.verificationsService.createVerificationTask(dto, user.organizationId, user);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch(':id/assign')
  async assignVerifier(
    @Param('id', new ZodValidationPipe(MongoIdSchema)) id: string,
    @Body(new ZodValidationPipe(AssignVerificationEmployeeSchema))
    body: { verifierEmployeeId: string },
    @CurrentUser() user: IAuthUser,
  ) {
    return this.verificationsService.assignVerifier(
      id,
      body.verifierEmployeeId,
      user.organizationId,
      user,
    );
  }

  @Get('my-queue')
  async getVerifierQueue(@CurrentUser() user: IAuthUser) {
    return this.verificationsService.getVerifierQueue(user);
  }

  @Post('submit')
  async submitDisposition(
    @Body(new ZodValidationPipe(SubmitVerificationDispositionSchema))
    dto: SubmitVerificationDispositionDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.verificationsService.submitVerificationDisposition(dto, user.organizationId, user);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('mismatches')
  async getMismatches(
    @CurrentUser() user: IAuthUser,
    @Query('status') status?: VerificationStatus,
  ) {
    return this.verificationsService.getVerificationMismatches(user, status);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Patch('mismatches/review')
  async reviewMismatch(
    @Body(new ZodValidationPipe(ReviewVerificationMismatchSchema))
    dto: ReviewVerificationMismatchDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.verificationsService.reviewMismatch(dto, user.organizationId, user);
  }
}
