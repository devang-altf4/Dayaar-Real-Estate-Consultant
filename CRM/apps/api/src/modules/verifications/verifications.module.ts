import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VerificationsService } from './verifications.service';
import { VerificationsController } from './verifications.controller';
import {
  LeadVerification,
  LeadVerificationSchema,
} from '../../database/schemas/lead-verification.schema';
import { Lead, LeadSchema } from '../../database/schemas/lead.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeadVerification.name, schema: LeadVerificationSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [VerificationsController],
  providers: [VerificationsService],
  exports: [VerificationsService],
})
export class VerificationsModule {}
