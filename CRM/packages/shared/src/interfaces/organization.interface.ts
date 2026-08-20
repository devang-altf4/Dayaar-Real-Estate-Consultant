export interface IOrganization {
  _id: string;
  name: string;
  slug: string;
  officeLatitude: number;
  officeLongitude: number;
  allowedRadiusMeters: number;
  maxAllowedGpsAccuracyMeters: number;
  maxUnsuccessfulAttempts: number;
  dailyCallTarget: number;
  callingSeatLimit: number;
  recordingRetentionMonths: number;
  timezone: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}
