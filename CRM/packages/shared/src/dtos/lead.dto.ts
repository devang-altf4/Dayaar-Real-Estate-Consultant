import { z } from 'zod';
import {
  LeadStatus,
  Temperature,
  NotInterestedReason,
  PropertyType,
  BhkType,
  PurchasePurpose,
  PurchaseTimeline,
  FinancingType,
} from '../enums/lead.enum';
import { CallDisposition } from '../enums/call.enum';
import { MongoIdSchema } from './common.dto';

export const LeadQualificationSchema = z.object({
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  propertyType: z.nativeEnum(PropertyType).optional(),
  bhk: z.nativeEnum(BhkType).optional(),
  preferredLocations: z.array(z.string()).optional(),
  purpose: z.nativeEnum(PurchasePurpose).optional(),
  purchaseTimeline: z.nativeEnum(PurchaseTimeline).optional(),
  financing: z.nativeEnum(FinancingType).optional(),
  loanStatus: z.string().optional(),
  siteVisitInterested: z.boolean().optional(),
  siteVisitDate: z.string().or(z.date()).optional().nullable(),
  notes: z.string().optional(),
});

export type LeadQualificationDto = z.infer<typeof LeadQualificationSchema>;

import { normalizePhoneNumber } from '../utils/phone';

export const CreateLeadSchema = z.object({
  name: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : 'Inquiry Contact')),
  phone: z
    .string()
    .min(10, 'Valid phone number is required')
    .trim()
    .transform((val) => normalizePhoneNumber(val)),
  alternatePhone: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() ? normalizePhoneNumber(val) : undefined)),
  email: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || typeof val !== 'string') return undefined;
      const clean = val.trim().toLowerCase();
      return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(clean) ? clean : undefined;
    }),
  source: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() ? val.trim() : 'Manual Entry')),
  campaign: z.string().optional().nullable(),
  project: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() ? val.trim() : 'General Inquiry')),
  assignedEmployeeId: z
    .union([MongoIdSchema, z.literal(''), z.null(), z.undefined()])
    .optional()
    .transform((val) => (val && typeof val === 'string' && val.trim() ? val.trim() : undefined)),
  temperature: z.nativeEnum(Temperature).default(Temperature.UNQUALIFIED),
  qualification: LeadQualificationSchema.optional(),
  employeeNotes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  budgetMin: z.number().optional().nullable(),
  budgetMax: z.number().optional().nullable(),
});

export type CreateLeadDto = z.infer<typeof CreateLeadSchema>;

export const UpdateLeadDispositionSchema = z
  .object({
    status: z.nativeEnum(LeadStatus),
    temperature: z.nativeEnum(Temperature).optional(),
    notInterestedReason: z.nativeEnum(NotInterestedReason).optional(),
    notInterestedReasonDetails: z.string().optional(),
    qualification: LeadQualificationSchema.optional(),
    nextFollowUpAt: z.string().or(z.date()).optional().nullable(),
    followUpReason: z.string().optional(),
    employeeNotes: z.string().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.status === LeadStatus.NOT_INTERESTED) {
        return !!data.notInterestedReason;
      }
      return true;
    },
    {
      message: 'Reason is required when status is NOT_INTERESTED',
      path: ['notInterestedReason'],
    },
  )
  .refine(
    (data) => {
      if (
        data.status === LeadStatus.NOT_INTERESTED &&
        data.notInterestedReason === NotInterestedReason.OTHER
      ) {
        return !!data.notInterestedReasonDetails && data.notInterestedReasonDetails.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Details are required when Reason is OTHER',
      path: ['notInterestedReasonDetails'],
    },
  );

export type UpdateLeadDispositionDto = z.infer<typeof UpdateLeadDispositionSchema>;

export const BulkAssignLeadsSchema = z.object({
  leadIds: z.array(MongoIdSchema).min(1, 'At least one lead ID is required').max(500),
  employeeIds: z.array(MongoIdSchema).min(1, 'At least one employee ID is required'),
  strategy: z.enum(['SINGLE', 'ROUND_ROBIN']).default('ROUND_ROBIN'),
}).strict();

export type BulkAssignLeadsDto = z.infer<typeof BulkAssignLeadsSchema>;

export const MobileDispositionSchema = z
  .object({
    leadId: MongoIdSchema,
    disposition: z.nativeEnum(CallDisposition).optional(),
    status: z.nativeEnum(LeadStatus).optional(),
    temperature: z.nativeEnum(Temperature).optional(),
    reason: z.string().trim().min(2).max(1000).optional(),
    notes: z.string().trim().max(5000).optional(),
    followUpAt: z.string().datetime({ offset: true }).optional().nullable(),
  })
  .strict();

export type MobileDispositionDto = z.infer<typeof MobileDispositionSchema>;
