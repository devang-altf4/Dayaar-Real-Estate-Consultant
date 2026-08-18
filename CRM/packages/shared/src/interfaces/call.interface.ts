import {
  CallProviderType,
  CallAttemptStatus,
  CallCommandStatus,
  CallEventType,
  RecordingStatus,
} from '../enums/call.enum';

export interface ICallAttempt {
  _id: string;
  organizationId: string;
  leadId: string;
  employeeId: string;
  deviceId?: string | null;
  callCommandId?: string | null;
  provider: CallProviderType;
  status: CallAttemptStatus;
  rawStatus?: string;
  countsAsAttempt: boolean; // True ONLY for genuine customer failures
  startedAt: string | Date;
  connectedAt?: string | Date | null;
  endedAt?: string | Date | null;
  durationSeconds: number;
  phoneNumberDialed: string;
  recordingStatus: RecordingStatus;
  recordingObjectKey?: string | null;
  recordingBytes?: number | null;
  recordingMimeType?: string | null;
  createdAt: string | Date;
}

export interface ICallCommand {
  _id: string;
  organizationId: string;
  employeeId: string;
  leadId: string;
  deviceId: string;
  callAttemptId: string;
  phoneNumber: string;
  status: CallCommandStatus;
  deliveredAt?: string | Date | null;
  acknowledgedAt?: string | Date | null;
  expiresAt: string | Date;
  createdAt: string | Date;
}

export interface ICallEvent {
  _id: string;
  organizationId: string;
  callAttemptId: string;
  employeeId: string;
  deviceId?: string | null;
  type: CallEventType;
  metadata?: Record<string, any>;
  timestamp: string | Date;
}
