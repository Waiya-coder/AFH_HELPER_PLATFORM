import { describe, expect, it } from 'vitest';
import { getCprStatus } from './cpr';

describe('getCprStatus', () => {
  const today = new Date('2026-08-30');

  it('returns expired when CPR date is in the past', () => {
    expect(getCprStatus('2026-01-01', today)).toBe('expired');
  });

  it('returns expiring_soon within 30 days', () => {
    expect(getCprStatus('2026-09-15', today)).toBe('expiring_soon');
  });

  it('returns valid when CPR is current', () => {
    expect(getCprStatus('2027-01-01', today)).toBe('valid');
  });

  it('returns missing when no date provided', () => {
    expect(getCprStatus(null, today)).toBe('missing');
  });
});
