import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DevicePrincipal } from '../interfaces/device-principal.interface';

export const CurrentDevice = createParamDecorator(
  (data: keyof DevicePrincipal | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const device = request.device as DevicePrincipal | undefined;
    return data ? device?.[data] : device;
  },
);
