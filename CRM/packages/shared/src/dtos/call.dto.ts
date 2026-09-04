import { z } from 'zod';
import {
  CallAttemptStatus,
  CallDisposition,
  CallOrigin,
} from '../enums/call.enum';
import { MongoIdSchema } from './common.dto';

export const InitiateCallSchema = z
  .object({
    leadId: MongoIdSchema,
    origin: z.nativeEnum(CallOrigin).optional(),
    idempotencyKey: z.string().min(8).max(64).optional(),
  })
  .strict();

export type InitiateCallDto = z.infer<typeof InitiateCallSchema>;

export const UpdateCallStatusSchema = z
  .object({
    commandId: MongoIdSchema.optional(),
    callAttemptId: MongoIdSchema,
    status: z.nativeEnum(CallAttemptStatus),
    occurredAt: z.string().datetime().optional(),
  })
  .strict();

export type UpdateCallStatusDto = z.infer<typeof UpdateCallStatusSchema>;

export const CallDispositionSchema = z
  .object({
    disposition: z.nativeEnum(CallDisposition),
    reason: z.string().trim().min(2).max(1000),
    notes: z.string().trim().max(5000).optional(),
    followUpAt: z.string().datetime().optional().nullable(),
    hotDetails: z.record(z.unknown()).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.disposition === CallDisposition.FOLLOW_UP && !data.followUpAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['followUpAt'],
        message: 'followUpAt is required for a follow-up disposition',
      });
    }
  });

export type CallDispositionDto = z.infer<typeof CallDispositionSchema>;

export const RecordingExportSchema = z
  .object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  })
  .strict()
  .refine((value) => new Date(value.from) <= new Date(value.to), {
    message: 'from must be before or equal to to',
    path: ['to'],
  });

export type RecordingExportDto = z.infer<typeof RecordingExportSchema>;
