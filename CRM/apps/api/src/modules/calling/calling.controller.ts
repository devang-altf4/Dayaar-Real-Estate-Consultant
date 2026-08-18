import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CallingService } from './calling.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentDevice } from '../../common/decorators/current-device.decorator';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { DevicePrincipal } from '../../common/interfaces/device-principal.interface';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  IAuthUser,
  InitiateCallDto,
  UpdateCallStatusDto,
  CompleteCallLogDto,
  InitiateCallSchema,
  UpdateCallStatusSchema,
  CompleteCallLogSchema,
  MongoIdSchema,
} from '@dayaar/shared';

@Controller('calls')
export class CallingController {
  constructor(private readonly callingService: CallingService) {}

  @Post('initiate')
  async initiateCall(
    @Body(new ZodValidationPipe(InitiateCallSchema)) dto: InitiateCallDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.callingService.initiateCall(dto.leadId, user);
  }

  @Public()
  @UseGuards(DeviceAuthGuard)
  @Post('status')
  async updateStatus(
    @Body(new ZodValidationPipe(UpdateCallStatusSchema)) dto: UpdateCallStatusDto,
    @CurrentDevice() device: DevicePrincipal,
  ) {
    return this.callingService.updateCallStatus(
      dto.commandId,
      dto.callAttemptId,
      dto.status,
      device,
      dto.rawStatus,
      dto.durationSeconds,
    );
  }

  @Public()
  @UseGuards(DeviceAuthGuard)
  @Post('complete')
  async completeCall(
    @Body(new ZodValidationPipe(CompleteCallLogSchema)) dto: CompleteCallLogDto,
    @CurrentDevice() device: DevicePrincipal,
  ) {
    return this.callingService.completeCall(dto, device);
  }

  @Public()
  @UseGuards(DeviceAuthGuard)
  @Post(':id/recording-upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }),
  )
  async uploadRecording(
    @Param('id', new ZodValidationPipe(MongoIdSchema)) callAttemptId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentDevice() device: DevicePrincipal,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('A non-empty recording file is required.');
    }
    const allowedMimeTypes = new Set([
      'audio/m4a',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/x-wav',
      'audio/aac',
      'audio/ogg',
    ]);
    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Unsupported recording MIME type.');
    }
    return this.callingService.uploadRecording(
      callAttemptId,
      file.buffer,
      file.mimetype,
      device,
    );
  }

  @Get(':id/recording')
  async streamRecording(
    @Param('id', new ZodValidationPipe(MongoIdSchema)) callAttemptId: string,
    @CurrentUser() user: IAuthUser,
    @Res() res: Response,
  ) {
    const { stream, mimeType, byteSize } =
      await this.callingService.getRecordingStream(callAttemptId, user);

    res.set({
      'Content-Type': mimeType,
      'Content-Length': byteSize,
      'Accept-Ranges': 'bytes',
    });

    stream.pipe(res);
  }

  @Get('lead/:leadId')
  async getCallHistoryForLead(
    @Param('leadId', new ZodValidationPipe(MongoIdSchema)) leadId: string,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.callingService.getCallHistoryForLead(leadId, user);
  }

  @Get()
  async getRecentCalls(
    @CurrentUser() user: IAuthUser,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.callingService.getRecentCalls(
      user.organizationId,
      user,
      parseInt(limit, 10),
      parseInt(page, 10),
    );
  }
}
