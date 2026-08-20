import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import {
  CallDispositionDto,
  CallDispositionSchema,
  CallOrigin,
  IAuthUser,
  InitiateCallDto,
  InitiateCallSchema,
  MongoIdSchema,
  UpdateCallStatusDto,
  UpdateCallStatusSchema,
} from '@dayaar/shared';
import { CurrentDevice } from '../../common/decorators/current-device.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { DevicePrincipal } from '../../common/interfaces/device-principal.interface';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CallingService } from './calling.service';

@Controller('calls')
export class CallingController {
  constructor(private readonly callingService: CallingService) {}

  @Post('initiate')
  initiateCall(
    @Body(new ZodValidationPipe(InitiateCallSchema)) dto: InitiateCallDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.callingService.initiateCall(dto.leadId, dto.origin || CallOrigin.WEB, user);
  }

  @Public()
  @UseGuards(DeviceAuthGuard)
  @Post('device-status')
  updateDeviceStatus(
    @Body(new ZodValidationPipe(UpdateCallStatusSchema)) dto: UpdateCallStatusDto,
    @CurrentDevice() device: DevicePrincipal,
  ) {
    return this.callingService.updateDeviceStatus(
      dto.callAttemptId,
      dto.commandId,
      dto.status,
      device,
      dto.occurredAt,
    );
  }

  @Patch(':id/disposition')
  disposition(
    @Param('id', new ZodValidationPipe(MongoIdSchema)) id: string,
    @Body(new ZodValidationPipe(CallDispositionSchema)) dto: CallDispositionDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.callingService.recordDisposition(id, dto, user);
  }

  @Get(':id/recording-url')
  recordingUrl(
    @Param('id', new ZodValidationPipe(MongoIdSchema)) id: string,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.callingService.getRecordingUrl(id, user);
  }

  @Get(':id/recording-stream')
  async recordingStream(
    @Param('id', new ZodValidationPipe(MongoIdSchema)) id: string,
    @CurrentUser() user: IAuthUser,
    @Res() res: Response,
  ) {
    const { buffer, mimeType } = await this.callingService.getRecordingStream(id, user);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Accept-Ranges', 'none');
    res.end(buffer);
  }

  @Get('lead/:leadId')
  history(
    @Param('leadId', new ZodValidationPipe(MongoIdSchema)) leadId: string,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.callingService.getCallHistoryForLead(leadId, user);
  }

  @Get()
  recent(
    @CurrentUser() user: IAuthUser,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.callingService.getRecentCalls(user, Number(limit), Number(page));
  }
}
