export interface AttendanceStats {
  total: number;
  male: number;
  female: number;
  child: number;
  adolescent: number;
  adult: number;
}

export interface MemberWithChildren {
  id: string;
  firstName: string;
  surname: string;
  gender: string;
  ageGroup: string;
  phone: string;
  dateOfBirth: string;
  isCurrentMember: boolean;
  fingerprintId?: string;
  parentId?: string;
  children?: MemberWithChildren[];
  lastAttendance?: string;
  consecutiveAbsences?: number;
}

export interface CheckInResult {
  member: MemberWithChildren | null;
  checkInSuccess: boolean;
  scannedFingerprintId?: string;
  isDuplicate?: boolean;
  message?: string;
}

export interface FamilyCheckInResult {
  parent: MemberWithChildren;
  children: MemberWithChildren[];
  attendanceRecords: number;
  success: boolean;
}

export type TabType = 'register' | 'checkin' | 'dashboard' | 'history' | 'visitors' | 'admin';

export interface AuthState {
  isAuthenticated: boolean;
  user: AdminUser | null;
  isLoading: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'admin' | 'volunteer' | 'data_viewer';
  region?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportConfig {
  id: string;
  reportType: string;
  title: string;
  description?: string;
  frequency: 'weekly' | 'monthly' | 'on-demand';
  isActive: boolean;
  createdAt: string;
}

export interface ReportData {
  [key: string]: any;
}
