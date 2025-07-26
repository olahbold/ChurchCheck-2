export interface AttendanceStats {
  total: number;
  male: number;
  female: number;
  children: number;
  adolescent: number;
}

export interface MemberWithChildren {
  id: string;
  firstName: string;
  surname: string;
  group: string;
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
}

export interface FamilyCheckInResult {
  parent: MemberWithChildren;
  children: MemberWithChildren[];
  attendanceRecords: number;
  success: boolean;
}

export type TabType = 'register' | 'checkin' | 'dashboard' | 'settings';
