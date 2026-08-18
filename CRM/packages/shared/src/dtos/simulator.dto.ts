import { z } from 'zod';
import { CallAttemptStatus } from '../enums/call.enum';
import { SimState } from '../enums/device.enum';
import { MongoIdSchema } from './common.dto';

export const PairSimulatorSchema = z
  .object({
    deviceName: z.string().trim().min(1).max(200).optional(),
    simState: z.nativeEnum(SimState).optional(),
  })
  .strict();

export const SimulatorHeartbeatSchema = z
  .object({ deviceId: z.string().trim().min(3).max(200) })
  .strict();

export const SimulatorCallStepSchema = z
  .object({
    commandId: MongoIdSchema,
    callAttemptId: MongoIdSchema,
    status: z.nativeEnum(CallAttemptStatus),
    rawStatus: z.string().trim().max(200).optional(),
    durationSeconds: z.number().int().min(0).max(24 * 60 * 60).optional(),
    uploadSampleRecording: z.boolean().optional(),
  })
  .strict();
