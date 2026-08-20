import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProviderThrottleDocument = ProviderThrottle & Document;

@Schema({ collection: 'providerThrottles', versionKey: false })
export class ProviderThrottle {
  @Prop({ required: true })
  _id: string;

  @Prop({ type: Date, default: Date.now })
  availableAt: Date;
}

export const ProviderThrottleSchema = SchemaFactory.createForClass(ProviderThrottle);
