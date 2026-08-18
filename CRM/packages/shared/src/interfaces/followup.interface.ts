import { FollowUpStatus } from '../enums/followup.enum';

export interface IFollowUp {
  _id: string;
  organizationId: string;
  leadId: string;
  employeeId: string;
  scheduledAt: string | Date;
  reason?: string;
  notes?: string;
  status: FollowUpStatus;
  createdAt: string | Date;
  completedAt?: string | Date | null;
}
