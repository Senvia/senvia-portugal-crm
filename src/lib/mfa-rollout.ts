export const MFA_ENFORCEMENT_AT_MS = Date.parse('2026-09-21T00:00:00+01:00');

export type MfaStatus = 'none' | 'pending' | 'verified' | 'enrollment' | 'checking' | 'error';

type MfaReminderInput = {
  readonly mfaStatus: MfaStatus;
  readonly today: string;
  readonly dismissedDay: string | null;
  readonly enforcementActive: boolean;
  readonly announcementOpen: boolean;
};

const LISBON_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Lisbon',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function isMfaEnforcementActive(nowMs: number): boolean {
  return nowMs >= MFA_ENFORCEMENT_AT_MS;
}

export function getMfaReminderDay(now: Date): string {
  return LISBON_DAY_FORMATTER.format(now);
}

export function shouldShowMfaReminder(input: MfaReminderInput): boolean {
  return input.mfaStatus === 'none'
    && !input.enforcementActive
    && !input.announcementOpen
    && input.dismissedDay !== input.today;
}
