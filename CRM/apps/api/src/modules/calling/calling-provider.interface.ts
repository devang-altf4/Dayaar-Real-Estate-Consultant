import { CallCommandStatus } from '@dayaar/shared';

export interface DialCommandPayload {
  organizationId: string;
  employeeId: string;
  leadId: string;
  deviceRecordId: string;
  fcmToken: string;
  phoneNumber: string;
  callAttemptId: string;
}

export interface DialCommandResult {
  commandId: string;
  status: CallCommandStatus;
  expiresAt: Date;
}

/** Delivery only. Callyzer is deliberately not modelled as a dial provider. */
export interface IDialProvider {
  initiateCall(payload: DialCommandPayload): Promise<DialCommandResult>;
}

export interface NormalizedProviderCall {
  providerCallId: string;
  employeePhoneNumber: string;
  clientPhoneNumber: string;
  duration: number;
  callType: string;
  callDate: Date;
  syncedAt?: Date;
  recordingUrl?: string;
  raw: Record<string, unknown>;
}

/** Capture/reporting only. The v1 implementation is Callyzer. */
export interface ICallCaptureProvider {
  fetchHistory(from: Date, to: Date, page: number): Promise<{
    calls: NormalizedProviderCall[];
    totalRecords: number;
  }>;
  removeRecording(providerCallId: string): Promise<void>;
}
