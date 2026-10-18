export * from './cpr';
export * from './auditChecklist';
export * from './clientDocuments';

export const ROLES = {
  STAFF: 'staff',
  SUPERVISOR: 'supervisor',
  ADMIN: 'admin',
  AUDITOR: 'auditor',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const STAFF_STATUSES = {
  ACTIVE: 'active',
  ON_DUTY: 'on_duty',
  OFF_DUTY: 'off_duty',
  ON_BREAK: 'on_break',
  ARCHIVED: 'archived',
} as const;

export type StaffStatus = (typeof STAFF_STATUSES)[keyof typeof STAFF_STATUSES];

export const TIMESHEET_STATUSES = {
  OPEN: 'open',
  CLOSED: 'closed',
  PENDING_APPROVAL: 'pending_approval',
} as const;

export type TimesheetStatus = (typeof TIMESHEET_STATUSES)[keyof typeof TIMESHEET_STATUSES];

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  facilityId: string;
  staffId?: string | null;
  profileComplete?: boolean;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface FacilitySignupRequest {
  facilityName: string;
  facilityAddress?: string;
  facilityContactInfo?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  password: string;
}

export interface FacilitySummary {
  id: string;
  name: string;
  address: string | null;
  contactInfo: string | null;
  joinCode?: string | null;
}

export interface SignupResponse extends LoginResponse {
  facility: FacilitySummary;
}

export interface StaffMember {
  id: string;
  facilityId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  status: StaffStatus;
  hireDate: string;
  profileComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffRosterEntry extends StaffMember {
  cprIssueDate: string | null;
  cprExpirationDate: string | null;
  cprStatus: import('./cpr').CprStatus;
  totalHoursWorked: number;
}

export interface StaffProfileRequest {
  firstName: string;
  lastName: string;
  cprIssueDate: string;
  cprExpirationDate: string;
}

export interface StaffJoinRequest {
  joinCode: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  cprIssueDate: string;
  cprExpirationDate: string;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  hireDate: string;
  password: string;
  cprIssueDate?: string;
  cprExpirationDate?: string;
}

export interface EmployeeLoginRequest {
  firstName: string;
  lastName: string;
  facilityCode: string;
  password: string;
}

export interface StaffProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileComplete: boolean;
  cprIssueDate: string | null;
  cprExpirationDate: string | null;
  cprStatus: import('./cpr').CprStatus;
  totalHoursWorked: number;
  status: StaffStatus;
}

export interface Timesheet {
  id: string;
  staffId: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  hoursWorked: number | null;
  notes: string | null;
  status: TimesheetStatus;
  createdAt: string;
  updatedAt: string;
  staff?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AuditLogEntry {
  id: string;
  facilityId: string;
  userId: string;
  action: string;
  tableName: string;
  recordId: string;
  changes: Record<string, unknown> | null;
  timestamp: string;
  user?: {
    email: string;
  };
}

export interface ScheduleShift {
  id: string;
  facilityId: string;
  staffId: string;
  startAt: string;
  endAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  staff?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ScheduleShiftRequest {
  staffId: string;
  startAt: string;
  endAt: string;
  notes?: string;
}

export type ClientStatus = 'active' | 'archived';

export interface ClientSummary {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  healthProblems: string | null;
  needs: string | null;
  dailyCarePlan: string | null;
  status: ClientStatus;
  assignedStaff: Array<{ id: string; firstName: string; lastName: string }>;
  documents: Array<{
    id: string;
    category: string;
    fileName: string;
    fileType: string;
    uploadDate: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  healthProblems?: string;
  needs?: string;
  dailyCarePlan?: string;
  assignedStaffIds?: string[];
}

export type UpdateClientRequest = Partial<Omit<CreateClientRequest, 'healthProblems' | 'needs' | 'dailyCarePlan'>> & {
  healthProblems?: string | null;
  needs?: string | null;
  dailyCarePlan?: string | null;
};
