import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DevicesService } from '../../modules/devices/devices.service';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly devicesService: DevicesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const deviceId = this.singleHeader(request.headers['x-device-id']);
    const deviceToken = this.singleHeader(request.headers['x-device-token']);

    if (!deviceId || !deviceToken) {
      throw new UnauthorizedException({
        success: false,
        code: 'DEVICE_AUTH_REQUIRED',
        message: 'Valid device credentials are required.',
      });
    }

    request.device = await this.devicesService.authenticateDevice(
      deviceId,
      deviceToken,
    );
    return true;
  }

  private singleHeader(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }
}
