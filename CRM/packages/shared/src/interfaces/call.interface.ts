import {
  CallAttemptStatus,
  CallCommandStatus,
  CallDisposition,
  CallEventType,
  CallOrigin,
  CallProviderType,
  CallSyncStatus,
  ProviderCallType,
  RecordingStatus,
} from '../enums/call.enum';

export interface ICallAttempt {
  _id: string;
  organizationId: string;
  leadId?: string | null;
  employeeId?: string | null;
  deviceId?: string | null;
  callCommandId?: string | null;
  provider: CallProviderType;
  origin: CallOrigin;
  status: CallAttemptStatus;
  syncStatus: CallSyncStatus;
  phoneNumber: string;
  employeePhoneNumber?: string | null;
  dialedAt: string | Date;
  connectedAt?: string | Date | null;
  endedAt?: string | Date | null;
  duration?: number | null;
  providerCallId?: string | null;
  callType?: ProviderCallType | null;
  connected?: boolean | null;
  disposition?: CallDisposition | null;
  reason?: string | null;
  notes?: string | null;
  followUpAt?: string | Date | null;
  dispositionAt?: string | Date | null;
  recordingStatus: RecordingStatus;
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
  employeeId?: string | null;
  deviceId?: string | null;
  type: CallEventType;
  metadata?: Record<string, unknown>;
  timestamp: string | Date;
}
