import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CallingService } from './calling.service';
import { CallingController } from './calling.controller';
import { AndroidSimCallingProvider } from './android-sim-calling.provider';
import { DevicesModule } from '../devices/devices.module';
import {
  CallAttempt,
  CallAttemptSchema,
} from '../../database/schemas/call-attempt.schema';
import {
  CallCommand,
  CallCommandSchema,
} from '../../database/schemas/call-command.schema';
import {
  CallEvent,
  CallEventSchema,
} from '../../database/schemas/call-event.schema';
import { Lead, LeadSchema } from '../../database/schemas/lead.schema';
import {
  AndroidDevice,
  AndroidDeviceSchema,
} from '../../database/schemas/android-device.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';

@Module({
  imports: [
    DevicesModule,
    MongooseModule.forFeature([
      { name: CallAttempt.name, schema: CallAttemptSchema },
      { name: CallCommand.name, schema: CallCommandSchema },
      { name: CallEvent.name, schema: CallEventSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: AndroidDevice.name, schema: AndroidDeviceSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CallingController],
  providers: [CallingService, AndroidSimCallingProvider],
  exports: [CallingService, AndroidSimCallingProvider],
})
export class CallingModule {}
