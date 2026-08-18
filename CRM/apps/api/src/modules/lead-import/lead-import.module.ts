import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadImportService } from './lead-import.service';
import { LeadImportController } from './lead-import.controller';
import { Lead, LeadSchema } from '../../database/schemas/lead.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [LeadImportController],
  providers: [LeadImportService],
  exports: [LeadImportService],
})
export class LeadImportModule {}
