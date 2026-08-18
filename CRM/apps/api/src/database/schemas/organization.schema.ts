import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrganizationDocument = Organization & Document;

@Schema({ timestamps: true, collection: 'organizations' })
export class Organization {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true, default: 28.4595 })
  officeLatitude: number;

  @Prop({ required: true, default: 77.0266 })
  officeLongitude: number;

  @Prop({ required: true, default: 100 })
  allowedRadiusMeters: number;

  @Prop({ required: true, default: 50 })
  maxAllowedGpsAccuracyMeters: number;

  @Prop({ required: true, default: 4 })
  maxUnsuccessfulAttempts: number;

  @Prop({ required: true, default: 300 })
  dailyCallTarget: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
OrganizationSchema.index({ slug: 1 });
