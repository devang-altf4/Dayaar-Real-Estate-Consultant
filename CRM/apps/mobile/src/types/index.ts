export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  organizationId: string;
  phone?: string;
  employeeCode?: string;
  isActive: boolean;
  callingEnabled?: boolean;
  managerId?: string;
}

export interface Lead {
  id: string;
  _id?: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  project?: string;
  source?: string;
  status: string;
  temperature?: string;
  assignedEmployeeId?: any;
  assignedManagerId?: any;
  attemptCount?: number;
  employeeNotes?: string;
  notesTimeline?: Array<{
    note: string;
    authorName: string;
    createdAt: string;
  }>;
  nextFollowUpAt?: string;
  followUpAt?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface CallAttempt {
  _id: string;
  id?: string;
  phoneNumber: string;
  employeePhoneNumber?: string;
  employeeId?: any;
  leadId?: any;
  status: string;
  duration?: number;
  callType?: string;
  recordingStatus?: string;
  recordingUrl?: string;
  dialedAt: string;
  disposition?: string;
  notes?: string;
}

export interface AttendanceRecord {
  _id: string;
  userId: any;
  date: string;
  checkIn: string;
  checkOut?: string;
  totalWorkingMinutes?: number;
  status: 'PRESENT' | 'HALF_DAY' | 'ABSENT';
  breaks: Array<{
    type: 'TEA' | 'LUNCH' | 'BIO' | 'TECHNICAL' | 'EMERGENCY';
    startTime: string;
    endTime?: string;
    durationMinutes?: number;
  }>;
}

export interface AnalyticsSummary {
  totalLeads?: number;
  newLeadsToday?: number;
  totalCallsToday?: number;
  connectedCallsToday?: number;
  hotLeads?: number;
  siteVisits?: number;
  bookedLeads?: number;
  conversionRate?: number;
  targetProgress?: {
    dailyTarget: number;
    completedCalls: number;
    remainingCalls: number;
    progressPercentage: number;
  };
}
