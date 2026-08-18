import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesGateway } from './devices.gateway';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentDevice } from '../../common/decorators/current-device.decorator';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { DevicePrincipal } from '../../common/interfaces/device-principal.interface';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  Role,
  IAuthUser,
  ClaimDevicePairingDto,
  DeviceHeartbeatDto,
  ClaimDevicePairingSchema,
  DeviceHeartbeatSchema,
} from '@dayaar/shared';

@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly devicesGateway: DevicesGateway,
  ) {}

  @Get('my-device')
  async getMyDevice(@CurrentUser() user: IAuthUser) {
    return this.devicesService.getPrimaryDeviceForUser(user.id, user.organizationId);
  }

  @Post('pairing-session')
  async createPairingSession(@CurrentUser() user: IAuthUser) {
    return this.devicesService.createPairingSession(user.id, user.organizationId);
  }

  @Public()
  @Post('pair')
  async claimPairing(
    @Body(new ZodValidationPipe(ClaimDevicePairingSchema))
    dto: ClaimDevicePairingDto,
  ) {
    const result = await this.devicesService.claimPairing(dto);
    this.devicesGateway.emitDeviceStatusUpdate(result.userId, result);
    return result;
  }

  @Public()
  @UseGuards(DeviceAuthGuard)
  @Post('heartbeat')
  async heartbeat(
    @Body(new ZodValidationPipe(DeviceHeartbeatSchema)) dto: DeviceHeartbeatDto,
    @CurrentDevice() device: DevicePrincipal,
  ) {
    const result = await this.devicesService.processHeartbeat(dto, device);
    this.devicesGateway.emitDeviceStatusUpdate(device.userId, result);
    return result;
  }

  @Roles(Role.ADMIN)
  @Get('all')
  async getAllDevices(@CurrentUser() user: IAuthUser) {
    return this.devicesService.listDevicesForOrg(user.organizationId);
  }

  @Delete(':deviceId')
  async unpairDevice(@Param('deviceId') deviceId: string, @CurrentUser() user: IAuthUser) {
    const result = await this.devicesService.unpairDevice(
      deviceId,
      user.organizationId,
      user.id,
      user.role === Role.ADMIN,
    );
    if (result.userId) {
      this.devicesGateway.emitDeviceStatusUpdate(result.userId, {
        deviceId,
        status: 'REVOKED',
      });
    }
    return result;
  }
}
