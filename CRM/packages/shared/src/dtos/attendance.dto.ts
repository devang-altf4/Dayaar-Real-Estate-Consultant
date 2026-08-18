import { z } from 'zod';

export const CheckInSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Valid latitude required'),
  longitude: z.number().min(-180).max(180, 'Valid longitude required'),
  accuracy: z.number().min(0, 'Accuracy required in meters'),
}).strict();

export type CheckInDto = z.infer<typeof CheckInSchema>;

export const CheckOutSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Valid latitude required'),
  longitude: z.number().min(-180).max(180, 'Valid longitude required'),
  accuracy: z.number().min(0, 'Accuracy required in meters'),
}).strict();

export type CheckOutDto = z.infer<typeof CheckOutSchema>;

export const StartBreakSchema = z.object({
  reason: z.string().trim().default('Short Break'),
}).strict();

export type StartBreakDto = z.infer<typeof StartBreakSchema>;
