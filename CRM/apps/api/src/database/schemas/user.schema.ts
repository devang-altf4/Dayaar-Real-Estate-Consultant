import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Role } from '@dayaar/shared';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, uppercase: true, trim: true })
  employeeCode: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: String, enum: Object.values(Role), default: Role.EMPLOYEE, required: true })
  role: Role;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  managerId: MongooseSchema.Types.ObjectId | null;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false, index: true })
  callingEnabled: boolean;

  @Prop({ default: 0 })
  tokenVersion: number;

  @Prop({ type: [String], default: [] })
  revokedRefreshJtis: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ organizationId: 1, employeeCode: 1 }, { unique: true });
UserSchema.index({ organizationId: 1, email: 1 }, { unique: true });
UserSchema.index({ organizationId: 1, role: 1 });
UserSchema.index({ organizationId: 1, managerId: 1 });
UserSchema.index({ organizationId: 1, managerId: 1, isActive: 1 });
UserSchema.index({ organizationId: 1, callingEnabled: 1, isActive: 1 });
