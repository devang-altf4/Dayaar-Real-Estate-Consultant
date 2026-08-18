import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DevicesGateway } from './devices.gateway';
import {
  AndroidDevice,
  AndroidDeviceSchema,
} from '../../database/schemas/android-device.schema';
import {
  DevicePairingSession,
  DevicePairingSessionSchema,
} from '../../database/schemas/device-pairing-session.schema';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: AndroidDevice.name, schema: AndroidDeviceSchema },
      { name: DevicePairingSession.name, schema: DevicePairingSessionSchema },
    ]),
  ],
  controllers: [DevicesController],
  providers: [DevicesService, DevicesGateway, DeviceAuthGuard],
  exports: [DevicesService, DevicesGateway, DeviceAuthGuard],
})
export class DevicesModule {}
