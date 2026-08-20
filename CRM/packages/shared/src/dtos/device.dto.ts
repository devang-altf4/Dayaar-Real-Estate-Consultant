import { z } from 'zod';
import { SimState } from '../enums/device.enum';

export const CreatePairingSessionSchema = z.object({
  // Generated on Web for current logged-in employee (or admin pairing on their behalf)
  targetUserId: z.string().optional(),
});

export type CreatePairingSessionDto = z.infer<typeof CreatePairingSessionSchema>;

export const ClaimDevicePairingSchema = z.object({
  pairingCode: z.string().length(6, 'Pairing code must be 6 digits').regex(/^\d{6}$/, 'Must be 6 digits'),
  pairingToken: z.string().uuid('Valid pairing token is required'),
  deviceId: z.string().trim().min(3, 'Hardware device ID is required').max(200),
  deviceName: z.string().trim().min(1, 'Device name is required').max(200),
  manufacturer: z.string().default('Android'),
  model: z.string().default('Device'),
  appVersion: z.string().default('1.0.0'),
  fcmToken: z.string().optional().nullable(),
  capabilities: z
    .object({
      canPlaceCalls: z.boolean().default(true),
      canReadCallLogs: z.boolean().default(false),
      canSyncRecordings: z.boolean().default(false),
    })
    .default({ canPlaceCalls: true, canReadCallLogs: false, canSyncRecordings: false }),
  simState: z.nativeEnum(SimState).default(SimState.READY),
  simOperator: z.string().optional(),
}).strict();

export type ClaimDevicePairingDto = z.infer<typeof ClaimDevicePairingSchema>;

export const DeviceHeartbeatSchema = z.object({
  deviceId: z.string().trim().min(1, 'Device ID is required').max(200),
  batteryLevel: z.number().min(0).max(100).optional(),
  isCharging: z.boolean().optional(),
  networkType: z.string().optional(),
  simState: z.nativeEnum(SimState).default(SimState.READY),
  simOperator: z.string().optional(),
  capabilities: z
    .object({
      canPlaceCalls: z.boolean().default(true),
      canReadCallLogs: z.boolean().default(false),
      canSyncRecordings: z.boolean().default(false),
    })
    .optional(),
}).strict();

export type DeviceHeartbeatDto = z.infer<typeof DeviceHeartbeatSchema>;

export const UpdateDeviceFcmTokenSchema = z
  .object({
    fcmToken: z.string().trim().min(20).max(4096),
  })
  .strict();

export type UpdateDeviceFcmTokenDto = z.infer<typeof UpdateDeviceFcmTokenSchema>;
