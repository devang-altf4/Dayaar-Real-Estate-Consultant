import { z } from 'zod';
import { Role } from '../enums/role.enum';
import { MongoIdSchema } from './common.dto';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).strict();

export type LoginDto = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
}).strict();

export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

export const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  phone: z.string().min(10, 'Phone must be valid'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(Role),
  managerId: MongoIdSchema.optional().nullable(),
  employeeCode: z.string().min(2, 'Employee code required').toUpperCase().trim(),
}).strict();

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    phone: z.string().trim().min(10).max(20).optional(),
    password: z.string().min(8).max(200).optional(),
    role: z.nativeEnum(Role).optional(),
    managerId: MongoIdSchema.optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
