import { DeviceStatus, SimState } from '../enums/device.enum';

export interface IDeviceCapabilities {
  canPlaceCalls: boolean;
  canReadCallLogs: boolean;
  canSyncRecordings: boolean;
}

export interface IAndroidDevice {
  _id: string;
  organizationId: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  manufacturer: string;
  model: string;
  appVersion: string;
  fcmToken?: string | null;
  simState: SimState;
  simOperator?: string;
  status: DeviceStatus;
  capabilities: IDeviceCapabilities;
  isPrimaryCallingDevice: boolean;
  lastSeenAt: string | Date;
  pairedAt: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IDevicePairingSession {
  _id: string;
  organizationId: string;
  userId: string;
  pairingCode: string; // Plaintext sent only once during session generation
  pairingToken: string;
  expiresAt: string | Date;
  isClaimed: boolean;
  createdAt: string | Date;
}
