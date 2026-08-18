import { z } from 'zod';
import { LeadStatus, NotInterestedReason } from '../enums/lead.enum';
import { LeadQualificationSchema } from './lead.dto';
import { MongoIdSchema } from './common.dto';

export const CreateLeadVerificationTaskSchema = z.object({
  leadId: MongoIdSchema,
  verificationEmployeeId: MongoIdSchema.optional().nullable(),
}).strict();

export type CreateLeadVerificationTaskDto = z.infer<typeof CreateLeadVerificationTaskSchema>;

export const SubmitVerificationDispositionSchema = z
  .object({
    verificationId: MongoIdSchema,
    disposition: z.nativeEnum(LeadStatus),
    reason: z.nativeEnum(NotInterestedReason).optional(),
    reasonDetails: z.string().optional(),
    qualification: LeadQualificationSchema.optional(),
    verifierNotes: z.string().optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.disposition === LeadStatus.NOT_INTERESTED && !data.reason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Reason is required when status is NOT_INTERESTED',
      });
    }
    if (
      data.disposition === LeadStatus.NOT_INTERESTED &&
      data.reason === NotInterestedReason.OTHER &&
      !data.reasonDetails?.trim()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reasonDetails'],
        message: 'Details are required when reason is OTHER',
      });
    }
  });

export type SubmitVerificationDispositionDto = z.infer<typeof SubmitVerificationDispositionSchema>;

export const ReviewVerificationMismatchSchema = z.object({
  verificationId: MongoIdSchema,
  resolutionAction: z.enum(['ACCEPT_ORIGINAL', 'ACCEPT_VERIFIER', 'REASSIGN_FRESH', 'DISMISS']),
  managerNotes: z.string().optional(),
}).strict();

export const AssignVerificationEmployeeSchema = z
  .object({ verifierEmployeeId: MongoIdSchema })
  .strict();

export type ReviewVerificationMismatchDto = z.infer<typeof ReviewVerificationMismatchSchema>;
