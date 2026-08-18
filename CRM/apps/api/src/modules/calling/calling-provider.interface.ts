import { CallProviderType, CallAttemptStatus } from '@dayaar/shared';

export interface InitiateCallPayload {
  organizationId: string;
  employeeId: string;
  leadId: string;
  deviceRecordId: string;
  deviceId: string;
  phoneNumber: string;
  callAttemptId: string;
}

export interface CallInitiateResult {
  success: boolean;
  commandId: string;
  provider: CallProviderType;
  status: string;
}

export interface NormalizedCallOutcome {
  status: CallAttemptStatus;
  rawStatus?: string;
  countsAsAttempt: boolean;
  durationSeconds: number;
}

export interface ICallingProvider {
  readonly providerId: CallProviderType;
  initiateCall(payload: InitiateCallPayload): Promise<CallInitiateResult>;
  normalizeOutcome(rawStatus: string, durationSeconds: number): NormalizedCallOutcome;
}
