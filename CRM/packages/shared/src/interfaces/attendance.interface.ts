import { AttendanceStatus } from '../enums/attendance.enum';

export interface IGpsLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceFromOfficeMeters?: number;
}

export interface IBreakSession {
  _id?: string;
  attendanceId: string;
  employeeId: string;
  startedAt: string | Date;
  endedAt?: string | Date | null;
  durationSeconds: number;
  reason?: string;
}

export interface IAttendanceRecord {
  _id: string;
  organizationId: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkInAt: string | Date;
  checkInLocation: IGpsLocation;
  checkOutAt?: string | Date | null;
  checkOutLocation?: IGpsLocation | null;
  totalWorkingSeconds: number;
  totalBreakSeconds: number;
  status: AttendanceStatus;
  breaks?: IBreakSession[];
  createdAt: string | Date;
  updatedAt: string | Date;
}
