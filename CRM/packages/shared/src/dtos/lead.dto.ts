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

export const CreateLeadSchema = z.object({
  name: z.string().min(2, 'Lead name is required').trim(),
  phone: z.string().min(10, 'Valid phone number is required').trim(),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  source: z.string().min(1, 'Source is required').trim(),
  campaign: z.string().optional(),
  project: z.string().min(1, 'Project is required').trim(),
  assignedEmployeeId: MongoIdSchema.optional().nullable(),
  temperature: z.nativeEnum(Temperature).default(Temperature.UNQUALIFIED),
  qualification: LeadQualificationSchema.optional(),
  employeeNotes: z.string().optional(),
}).strict();

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
  leadIds: z.array(MongoIdSchema).min(1, 'At least one lead ID is required'),
  employeeIds: z.array(MongoIdSchema).min(1, 'At least one employee ID is required'),
  strategy: z.enum(['SINGLE', 'ROUND_ROBIN']).default('ROUND_ROBIN'),
}).strict();

export type BulkAssignLeadsDto = z.infer<typeof BulkAssignLeadsSchema>;
