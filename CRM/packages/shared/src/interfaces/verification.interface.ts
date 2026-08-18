import {
  VerificationStatus,
  MismatchSeverity,
  MismatchType,
} from '../enums/verification.enum';

export interface ILeadVerification {
  _id: string;
  organizationId: string;
  leadId: string;
  originalEmployeeId: string;
  originalDisposition: string;
  originalReason?: string | null;
  originalReasonDetails?: string | null;
  verificationEmployeeId?: string | null;
  verificationDisposition?: string | null;
  verificationReason?: string | null;
  verificationReasonDetails?: string | null;
  status: VerificationStatus;
  isMismatch: boolean;
  mismatchType?: MismatchType | null;
  mismatchSeverity?: MismatchSeverity | null;
  createdAt: string | Date;
  completedAt?: string | Date | null;
}
