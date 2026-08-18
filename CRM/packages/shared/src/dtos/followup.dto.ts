import { z } from 'zod';
import { MongoIdSchema } from './common.dto';

export const ScheduleFollowUpSchema = z
  .object({
    leadId: MongoIdSchema,
    scheduledAt: z.string().datetime({ offset: true }),
    reason: z.string().trim().min(1).max(500).optional(),
    notes: z.string().trim().max(5000).optional(),
  })
  .strict();

export type ScheduleFollowUpDto = z.infer<typeof ScheduleFollowUpSchema>;
