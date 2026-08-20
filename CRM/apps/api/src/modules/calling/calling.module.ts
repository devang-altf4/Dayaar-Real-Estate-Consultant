import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AndroidDevice, AndroidDeviceSchema } from '../../database/schemas/android-device.schema';
import { CallAttempt, CallAttemptSchema } from '../../database/schemas/call-attempt.schema';
import { CallCommand, CallCommandSchema } from '../../database/schemas/call-command.schema';
import { CallEvent, CallEventSchema } from '../../database/schemas/call-event.schema';
import { FollowUp, FollowUpSchema } from '../../database/schemas/follow-up.schema';
import { Lead, LeadSchema } from '../../database/schemas/lead.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { DevicesModule } from '../devices/devices.module';
import { AndroidDialProvider } from './android-dial.provider';
import { CallingController } from './calling.controller';
import { CallingService } from './calling.service';
import { FcmService } from './fcm.service';

@Module({
  imports: [
    DevicesModule,
    MongooseModule.forFeature([
      { name: AndroidDevice.name, schema: AndroidDeviceSchema },
      { name: CallAttempt.name, schema: CallAttemptSchema },
      { name: CallCommand.name, schema: CallCommandSchema },
      { name: CallEvent.name, schema: CallEventSchema },
      { name: FollowUp.name, schema: FollowUpSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CallingController],
  providers: [CallingService, AndroidDialProvider, FcmService],
  exports: [CallingService],
})
export class CallingModule {}
