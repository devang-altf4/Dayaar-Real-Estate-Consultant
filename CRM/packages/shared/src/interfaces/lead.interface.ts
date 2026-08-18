import {
  LeadStatus,
  Temperature,
  NotInterestedReason,
  PropertyType,
  BhkType,
  PurchasePurpose,
  PurchaseTimeline,
  FinancingType,
} from '../enums/lead.enum';

export interface ILeadQualification {
  budgetMin?: number;
  budgetMax?: number;
  propertyType?: PropertyType;
  bhk?: BhkType;
  preferredLocations?: string[];
  purpose?: PurchasePurpose;
  purchaseTimeline?: PurchaseTimeline;
  financing?: FinancingType;
  loanStatus?: string;
  siteVisitInterested?: boolean;
  siteVisitDate?: string | Date;
  notes?: string;
}

export interface ILead {
  _id: string;
  organizationId: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  source: string;
  campaign?: string;
  project: string;
  assignedEmployeeId?: string | null;
  assignedManagerId?: string | null;
  status: LeadStatus;
  notInterestedReason?: NotInterestedReason;
  notInterestedReasonDetails?: string;
  attemptCount: number;
  temperature: Temperature;
  qualification?: ILeadQualification;
  nextFollowUpAt?: string | Date | null;
  isUnderSecretVerification?: boolean;
  employeeNotes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Sanitized projection of a Lead served exclusively to Employee B (the verifier)
 * so they cannot see Employee A's notes, prior disposition, recordings, or QA flags.
 */
export interface ISanitizedVerificationLead {
  _id: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  source: string;
  project: string;
  attemptCount: number;
  createdAt: string | Date;
}
