import { describe, expect, it } from 'vitest';

function parseShiftTimes(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid shift times');
  }

  if (end <= start) {
    throw new Error('Shift end time must be after start time');
  }

  return { start, end };
}

function shiftsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

describe('schedule shift validation', () => {
  it('accepts a valid shift range', () => {
    const { start, end } = parseShiftTimes(
      '2026-08-30T09:00:00.000Z',
      '2026-08-30T17:00:00.000Z',
    );
    expect(end.getTime() - start.getTime()).toBe(8 * 60 * 60 * 1000);
  });

  it('rejects shifts where end is before start', () => {
    expect(() =>
      parseShiftTimes('2026-08-30T17:00:00.000Z', '2026-08-30T09:00:00.000Z'),
    ).toThrow('Shift end time must be after start time');
  });

  it('detects overlapping shifts', () => {
    const existingStart = new Date('2026-08-30T09:00:00.000Z');
    const existingEnd = new Date('2026-08-30T17:00:00.000Z');
    const newStart = new Date('2026-08-30T16:00:00.000Z');
    const newEnd = new Date('2026-08-30T20:00:00.000Z');

    expect(shiftsOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
  });

  it('allows back-to-back shifts', () => {
    const firstStart = new Date('2026-08-30T09:00:00.000Z');
    const firstEnd = new Date('2026-08-30T17:00:00.000Z');
    const secondStart = new Date('2026-08-30T17:00:00.000Z');
    const secondEnd = new Date('2026-08-30T21:00:00.000Z');

    expect(shiftsOverlap(firstStart, firstEnd, secondStart, secondEnd)).toBe(false);
  });
});
