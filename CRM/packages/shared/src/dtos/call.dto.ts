import { z } from 'zod';
import { CallAttemptStatus, CallProviderType } from '../enums/call.enum';
import { MongoIdSchema } from './common.dto';

export const InitiateCallSchema = z.object({
  leadId: MongoIdSchema,
}).strict();

export type InitiateCallDto = z.infer<typeof InitiateCallSchema>;

export const UpdateCallStatusSchema = z.object({
  commandId: MongoIdSchema,
  callAttemptId: MongoIdSchema,
  status: z.nativeEnum(CallAttemptStatus),
  rawStatus: z.string().optional(),
  durationSeconds: z.number().min(0).default(0),
  startedAt: z.string().or(z.date()).optional(),
  connectedAt: z.string().or(z.date()).optional().nullable(),
  endedAt: z.string().or(z.date()).optional().nullable(),
  hasRecording: z.boolean().default(false),
  recordingBytes: z.number().optional(),
  recordingMimeType: z.string().optional(),
}).strict();

export type UpdateCallStatusDto = z.infer<typeof UpdateCallStatusSchema>;

export const CompleteCallLogSchema = z.object({
  callAttemptId: MongoIdSchema,
  status: z.nativeEnum(CallAttemptStatus),
  rawStatus: z.string().optional(),
  durationSeconds: z.number().min(0).default(0),
  startedAt: z.string().or(z.date()).optional(),
  connectedAt: z.string().or(z.date()).optional().nullable(),
  endedAt: z.string().or(z.date()).optional().nullable(),
  hasRecording: z.boolean().default(false),
  recordingBytes: z.number().optional(),
  recordingMimeType: z.string().optional(),
}).strict();

export type CompleteCallLogDto = z.infer<typeof CompleteCallLogSchema>;
