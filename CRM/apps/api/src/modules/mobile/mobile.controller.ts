import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InitiateCallDto, InitiateCallSchema, MobileDispositionSchema } from '@dayaar/shared';
import { CurrentDevice } from '../../common/decorators/current-device.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { DevicePrincipal } from '../../common/interfaces/device-principal.interface';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { MobileService } from './mobile.service';

@Controller('mobile')
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Public()
  @UseGuards(DeviceAuthGuard)
  @Get('dashboard')
  getDashboard(@CurrentDevice() device: DevicePrincipal) {
    return this.mobileService.getDashboard(device);
  }

  @Public()
  @UseGuards(DeviceAuthGuard)
  @Post('calls')
  initiateCall(
    @Body(new ZodValidationPipe(InitiateCallSchema)) dto: InitiateCallDto,
    @CurrentDevice() device: DevicePrincipal,
  ) {
    return this.mobileService.initiateCall(dto.leadId, device);
  }

  @Public()
  @UseGuards(DeviceAuthGuard)
  @Post('disposition')
  recordDisposition(
    @Body(new ZodValidationPipe(MobileDispositionSchema)) dto: any,
    @CurrentDevice() device: DevicePrincipal,
  ) {
    return this.mobileService.recordDisposition(dto, device);
  }
}
