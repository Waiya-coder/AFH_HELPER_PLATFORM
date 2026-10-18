import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildStaffColorMap,
  getMonthGridDays,
  getViewRange,
  groupShiftsByDay,
  navigateAnchorDate,
  startOfMonth,
  startOfWeek,
  toDateInput,
} from './schedule';

describe('schedule view helpers', () => {
  const anchor = new Date(2026, 7, 30);

  it('returns a single day for day view', () => {
    const range = getViewRange('day', anchor);
    expect(toDateInput(range.start)).toBe('2026-08-30');
    expect(toDateInput(range.end)).toBe('2026-08-30');
  });

  it('returns a full week for week view', () => {
    const range = getViewRange('week', anchor);
    expect(toDateInput(range.start)).toBe('2026-08-24');
    expect(toDateInput(range.end)).toBe('2026-08-30');
  });

  it('returns a six-week grid for month view', () => {
    const days = getMonthGridDays(anchor);
    expect(days).toHaveLength(42);
    expect(toDateInput(days[0])).toBe(toDateInput(startOfWeek(startOfMonth(anchor))));
  });

  it('navigates by day, week, and month', () => {
    expect(toDateInput(navigateAnchorDate('day', anchor, 1))).toBe('2026-08-31');
    expect(toDateInput(navigateAnchorDate('week', anchor, -1))).toBe('2026-08-23');
    expect(navigateAnchorDate('month', anchor, 1).getMonth()).toBe(8);
  });

  it('assigns stable colors per staff member', () => {
    const first = buildStaffColorMap(['staff-a', 'staff-b']);
    const second = buildStaffColorMap(['staff-b', 'staff-a']);
    expect(first.get('staff-a')?.dot).toBe(second.get('staff-a')?.dot);
    expect(first.get('staff-b')?.dot).not.toBe(first.get('staff-a')?.dot);
  });

  it('groups shifts by day and sorts by start time', () => {
    const days = [anchor, addDays(anchor, 1)];
    const grouped = groupShiftsByDay(
      [
        { startAt: '2026-08-30T17:00:00.000Z', staffId: 'a' },
        { startAt: '2026-08-30T09:00:00.000Z', staffId: 'b' },
        { startAt: '2026-08-31T12:00:00.000Z', staffId: 'c' },
      ],
      days,
    );

    expect(grouped.get('2026-08-30')).toHaveLength(2);
    expect(grouped.get('2026-08-30')?.[0].staffId).toBe('b');
    expect(grouped.get('2026-08-31')).toHaveLength(1);
  });
});
