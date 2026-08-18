import { z } from 'zod';
import { Temperature } from '../enums/lead.enum';
import { MongoIdSchema } from './common.dto';

export const ImportLeadRowSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  phone: z.string().min(10, 'Valid phone is required').trim(),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  source: z.string().default('Bulk Import'),
  campaign: z.string().optional(),
  project: z.string().default('General Inquiry'),
  temperature: z.nativeEnum(Temperature).default(Temperature.UNQUALIFIED),
  assignedEmployeeCode: z.string().optional(),
  notes: z.string().optional(),
}).strict();

export type ImportLeadRowDto = z.infer<typeof ImportLeadRowSchema>;

export const BulkImportPayloadSchema = z.object({
  leads: z.array(ImportLeadRowSchema).min(1, 'Must provide at least one lead to import'),
  duplicateAction: z.enum(['SKIP', 'UPDATE', 'REPLACE']).default('SKIP'),
  autoAssignStrategy: z.enum(['NONE', 'ROUND_ROBIN']).default('NONE'),
  targetEmployeeIds: z.array(MongoIdSchema).optional(),
}).strict();

export type BulkImportPayloadDto = z.infer<typeof BulkImportPayloadSchema>;
