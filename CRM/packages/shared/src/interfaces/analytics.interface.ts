export interface IDailyPerformanceMetrics {
  userId: string;
  userName: string;
  role: string;
  dailyTarget: number;
  totalCallsMade: number;
  connectedCalls: number;
  unconnectedCalls: number;
  connectionRatePercentage: number;
  interestedCount: number;
  notInterestedCount: number;
  hotLeadsCount: number;
  warmLeadsCount: number;
  coldLeadsCount: number;
  followupsScheduled: number;
  followupsCompleted: number;
  siteVisitsBooked: number;
  avgCallDurationSeconds: number;
  attendanceStatus: string;
  isCheckedIn: boolean;
  isOnBreak: boolean;
}

export interface IAdminDashboardMetrics {
  activeEmployeesCount: number;
  checkedInEmployeesCount: number;
  onlineDevicesCount: number;
  todayCallsTotal: number;
  todayConnectedCalls: number;
  todayNotConnectedCalls: number;
  conversionRatePercentage: number;
  totalLeadsInPipeline: number;
  interestedToday: number;
  notInterestedToday: number;
  mismatchesPendingReview: number;
  topPerformers: Array<{
    userId: string;
    userName: string;
    callsMade: number;
    connectedCalls: number;
    interestedCount: number;
  }>;
}

export interface IManagerDashboardMetrics {
  teamSize: number;
  teamCheckedInCount: number;
  teamOnlineDevicesCount: number;
  teamTodayCalls: number;
  teamTodayConnected: number;
  teamFollowupsDue: number;
  teamMembers: IDailyPerformanceMetrics[];
}
