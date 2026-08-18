import { z } from 'zod';

export const UpdateOrganizationSettingsSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    officeLatitude: z.number().min(-90).max(90).optional(),
    officeLongitude: z.number().min(-180).max(180).optional(),
    allowedRadiusMeters: z.number().int().min(10).max(10000).optional(),
    maxAllowedGpsAccuracyMeters: z.number().min(1).max(5000).optional(),
    maxUnsuccessfulAttempts: z.number().int().min(1).max(20).optional(),
    dailyCallTarget: z.number().int().min(1).max(5000).optional(),
  })
  .strict();

export type UpdateOrganizationSettingsDto = z.infer<
  typeof UpdateOrganizationSettingsSchema
>;
