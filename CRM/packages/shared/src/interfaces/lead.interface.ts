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
  employeeNotes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}
