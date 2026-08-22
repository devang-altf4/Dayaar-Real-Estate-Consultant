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

/**
 * Scope used when resolving the round-robin employee pool.
 * TEAM          Manager's own team (Admins treat this as the whole org).
 * ORGANIZATION  All active employees in the organization.
 */
export const AssignScopeSchema = z.enum(['TEAM', 'ORGANIZATION']);
export type AssignScope = z.infer<typeof AssignScopeSchema>;

const ImportOptionsShape = {
  duplicateAction: z.enum(['SKIP', 'UPDATE', 'REPLACE']).default('SKIP'),
  autoAssignStrategy: z.enum(['NONE', 'ROUND_ROBIN']).default('NONE'),
  assignScope: AssignScopeSchema.default('TEAM'),
  targetEmployeeIds: z.array(MongoIdSchema).optional(),
};

export const BulkImportPayloadSchema = z.object({
  leads: z.array(ImportLeadRowSchema).min(1, 'Must provide at least one lead to import'),
  ...ImportOptionsShape,
}).strict();

export type BulkImportPayloadDto = z.infer<typeof BulkImportPayloadSchema>;

/** Raw pasted text (CSV/TSV/one-per-line) parsed on the server. */
export const TextImportPayloadSchema = z.object({
  text: z.string().min(1, 'Pasted content is required').max(4_000_000),
  ...ImportOptionsShape,
}).strict();

export type TextImportPayloadDto = z.infer<typeof TextImportPayloadSchema>;

/** Public Google Sheets link exported as CSV by the server. */
export const GoogleSheetImportPayloadSchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => /^https:\/\/docs\.google\.com\/spreadsheets\//.test(u), {
      message: 'Must be a Google Sheets URL',
    }),
  ...ImportOptionsShape,
}).strict();

export type GoogleSheetImportPayloadDto = z.infer<typeof GoogleSheetImportPayloadSchema>;
