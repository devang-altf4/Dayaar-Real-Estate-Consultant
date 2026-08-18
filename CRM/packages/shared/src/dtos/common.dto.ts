import { z } from 'zod';

export const MongoIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Valid MongoDB ObjectId is required');
