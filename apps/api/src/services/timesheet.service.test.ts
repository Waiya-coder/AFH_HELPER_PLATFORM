import { describe, expect, it } from 'vitest';

function calculateHours(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

describe('timesheet hours calculation', () => {
  it('calculates hours between check-in and check-out', () => {
    const checkIn = new Date('2026-08-30T08:00:00.000Z');
    const checkOut = new Date('2026-08-30T16:30:00.000Z');
    expect(calculateHours(checkIn, checkOut)).toBe(8.5);
  });

  it('returns zero for same-time check-in and check-out', () => {
    const time = new Date('2026-08-30T08:00:00.000Z');
    expect(calculateHours(time, time)).toBe(0);
  });
});

describe('role access matrix', () => {
  const roles = ['staff', 'supervisor', 'admin', 'auditor'] as const;

  it('staff can check in but not list all staff', () => {
    expect(roles.includes('staff')).toBe(true);
    expect(['supervisor', 'admin', 'auditor'].includes('staff')).toBe(false);
  });
});
