import { Role } from '../enums/role.enum';

export interface IUser {
  _id: string;
  organizationId: string;
  name: string;
  email: string;
  phone: string;
  employeeCode: string;
  role: Role;
  managerId?: string | null;
  isActive: boolean;
  callingEnabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IAuthUser {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: Role;
  employeeCode: string;
  managerId?: string | null;
}
