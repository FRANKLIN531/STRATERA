import type { LeaveRequest } from './types';

export const LEAVE_TYPE_ANNUAL = 'Annual Leave';
export const LEAVE_TYPE_SICK = 'Sick Leave';
export const LEAVE_TYPE_MATERNITY = 'Maternity Leave';
export const LEAVE_TYPE_PATERNITY = 'Paternity Leave';

export const LEAVE_TYPE_OPTIONS = [
  LEAVE_TYPE_ANNUAL,
  LEAVE_TYPE_SICK,
  LEAVE_TYPE_MATERNITY,
  LEAVE_TYPE_PATERNITY,
];

export interface GhanaLeavePolicy {
  annualDaysStandard: number;
  annualDaysUnderground: number;
  sickDaysDefault: number;
  paternityDaysDefault: number;
  maternityDays: number;
  seniorityYears: number;
  seniorityBonusDays: number;
  sickMedicalCertMinDays: number;
}

export interface EmployeeLeaveProfile {
  id: string;
  name: string;
  gender?: string;
  employmentType: string;
  workHoursRatio: number;
  undergroundMining: boolean;
  joinDate: string;
  probationEndDate?: string;
  status: string;
}

export interface LeaveBalanceSnapshot {
  annualEntitlement: number;
  sickEntitlement: number;
  maternityEntitlement: number;
  paternityEntitlement: number;
}

function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function roundDays(value: number): number {
  return Math.round(value * 10) / 10;
}

export function yearsOfService(joinDate: string, asOf = new Date()): number {
  const join = parseDateOnly(joinDate);
  return (asOf.getTime() - join.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

export function monthsWorkedInCalendarYear(joinDate: string, year: number): number {
  const join = parseDateOnly(joinDate);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const start = join > yearStart ? join : yearStart;
  if (start > yearEnd) return 0;
  const months =
    (yearEnd.getFullYear() - start.getFullYear()) * 12 + (yearEnd.getMonth() - start.getMonth()) + 1;
  return Math.min(12, Math.max(0, months));
}

export function applyEmploymentRatio(days: number, profile: EmployeeLeaveProfile): number {
  if (profile.employmentType === 'part_time' || profile.employmentType === 'contract') {
    const ratio = Math.min(1, Math.max(0, profile.workHoursRatio || 0));
    return roundDays(days * ratio);
  }
  return days;
}

export function calculateAnnualEntitlement(
  profile: EmployeeLeaveProfile,
  policy: GhanaLeavePolicy,
  year = new Date().getFullYear(),
): number {
  const base = profile.undergroundMining ? policy.annualDaysUnderground : policy.annualDaysStandard;
  const months = monthsWorkedInCalendarYear(profile.joinDate, year);
  let days = (months / 12) * base;

  if (yearsOfService(profile.joinDate) >= policy.seniorityYears) {
    days += policy.seniorityBonusDays;
  }

  return applyEmploymentRatio(roundDays(days), profile);
}

export function calculateSickEntitlement(
  profile: EmployeeLeaveProfile,
  policy: GhanaLeavePolicy,
  year = new Date().getFullYear(),
): number {
  const months = monthsWorkedInCalendarYear(profile.joinDate, year);
  const days = (months / 12) * policy.sickDaysDefault;
  return applyEmploymentRatio(roundDays(days), profile);
}

export function calculateMaternityEntitlement(profile: EmployeeLeaveProfile, policy: GhanaLeavePolicy): number {
  if (profile.gender !== 'Female') return 0;
  return policy.maternityDays;
}

export function calculatePaternityEntitlement(profile: EmployeeLeaveProfile, policy: GhanaLeavePolicy): number {
  if (profile.gender !== 'Male') return 0;
  return applyEmploymentRatio(policy.paternityDaysDefault, profile);
}

export function calculateEmployeeEntitlements(
  profile: EmployeeLeaveProfile,
  policy: GhanaLeavePolicy,
  year = new Date().getFullYear(),
): LeaveBalanceSnapshot {
  return {
    annualEntitlement: calculateAnnualEntitlement(profile, policy, year),
    sickEntitlement: calculateSickEntitlement(profile, policy, year),
    maternityEntitlement: calculateMaternityEntitlement(profile, policy),
    paternityEntitlement: calculatePaternityEntitlement(profile, policy),
  };
}

export function classifyLeaveType(leaveType: string): 'annual' | 'sick' | 'maternity' | 'paternity' | 'other' {
  const t = leaveType.toLowerCase();
  if (t.includes('maternity')) return 'maternity';
  if (t.includes('paternity')) return 'paternity';
  if (t.includes('sick')) return 'sick';
  if (t.includes('annual')) return 'annual';
  return 'other';
}

export function canEmployeeTakeLeave(profile: EmployeeLeaveProfile): { ok: true } | { ok: false; error: string } {
  if (profile.probationEndDate) {
    const end = parseDateOnly(profile.probationEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (end >= today) {
      return {
        ok: false,
        error: 'Employee is on probation. Leave accrues but cannot be taken until probation ends.',
      };
    }
  }
  return { ok: true };
}

export function validateLeaveTypeForEmployee(
  profile: EmployeeLeaveProfile,
  leaveType: string,
): { ok: true } | { ok: false; error: string } {
  const t = leaveType.toLowerCase();
  if (t.includes('maternity') && profile.gender !== 'Female') {
    return { ok: false, error: 'Maternity leave applies to female employees only.' };
  }
  if (t.includes('paternity') && profile.gender !== 'Male') {
    return { ok: false, error: 'Paternity leave applies to male employees only.' };
  }
  return { ok: true };
}

export function requiresMedicalCertificate(
  leaveType: string,
  days: number,
  policy: GhanaLeavePolicy,
): boolean {
  return classifyLeaveType(leaveType) === 'sick' && days > policy.sickMedicalCertMinDays;
}

export function isEmployeeOnMaternityLeave(
  employeeName: string,
  requests: LeaveRequest[],
  asOf = new Date().toISOString().slice(0, 10),
): boolean {
  return requests.some(
    (r) =>
      r.employee === employeeName &&
      r.status === 'Approved' &&
      classifyLeaveType(r.type) === 'maternity' &&
      r.startDate <= asOf &&
      r.endDate >= asOf,
  );
}

export interface LeaveValidationInput {
  employee: string;
  type: string;
  days: number;
  medicalCertificateProvided?: boolean;
  /** When true, sick leave over the threshold requires a medical certificate. */
  forApproval?: boolean;
}

export function validateLeaveRequest(
  profile: EmployeeLeaveProfile,
  input: LeaveValidationInput,
  balances: LeaveBalanceSnapshot & {
    annualUsed: number;
    sickUsed: number;
    maternityUsed: number;
    paternityUsed: number;
  },
  policy: GhanaLeavePolicy,
): { ok: true } | { ok: false; error: string } {
  const takeCheck = canEmployeeTakeLeave(profile);
  if (!takeCheck.ok) return takeCheck;

  const typeCheck = validateLeaveTypeForEmployee(profile, input.type);
  if (!typeCheck.ok) return typeCheck;

  if (input.days <= 0) {
    return { ok: false, error: 'Leave days must be greater than zero.' };
  }

  const category = classifyLeaveType(input.type);
  const remaining =
    category === 'annual'
      ? balances.annualEntitlement - balances.annualUsed
      : category === 'sick'
        ? balances.sickEntitlement - balances.sickUsed
        : category === 'maternity'
          ? balances.maternityEntitlement - balances.maternityUsed
          : category === 'paternity'
            ? balances.paternityEntitlement - balances.paternityUsed
            : balances.annualEntitlement - balances.annualUsed;

  if (category !== 'other' && input.days > remaining) {
    return {
      ok: false,
      error: `Insufficient ${input.type} balance. Remaining: ${roundDays(remaining)} day(s).`,
    };
  }

  if (
    input.forApproval &&
    requiresMedicalCertificate(input.type, input.days, policy) &&
    !input.medicalCertificateProvided
  ) {
    return {
      ok: false,
      error: `Sick leave over ${policy.sickMedicalCertMinDays} consecutive days requires a medical certificate before approval.`,
    };
  }

  return { ok: true };
}

export function policyFromSettings(settings: Record<string, string | boolean | undefined>): GhanaLeavePolicy {
  const num = (key: string, fallback: number) => {
    const raw = settings[key];
    const parsed = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    annualDaysStandard: num('leaveAnnualDays', 15),
    annualDaysUnderground: num('leaveUndergroundDays', 21),
    sickDaysDefault: num('leaveSickDays', 12),
    paternityDaysDefault: num('leavePaternityDays', 5),
    maternityDays: num('leaveMaternityDays', 84),
    seniorityYears: num('leaveSeniorityYears', 5),
    seniorityBonusDays: num('leaveSeniorityBonusDays', 3),
    sickMedicalCertMinDays: num('leaveSickMedicalCertDays', 2),
  };
}

export function employeeLeaveProfileFromRow(row: Record<string, unknown>): EmployeeLeaveProfile {
  return {
    id: row.id as string,
    name: row.name as string,
    gender: (row.gender as string) || undefined,
    employmentType: (row.employment_type as string) || 'full_time',
    workHoursRatio: (row.work_hours_ratio as number) ?? 1,
    undergroundMining: Boolean(row.underground_mining),
    joinDate: row.join_date as string,
    probationEndDate: (row.probation_end_date as string) || undefined,
    status: row.status as string,
  };
}
