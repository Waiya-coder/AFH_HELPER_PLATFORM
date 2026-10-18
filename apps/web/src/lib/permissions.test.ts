import { describe, expect, it } from 'vitest';
import { canAccessRoles, isEmployer } from './permissions';

describe('permissions', () => {
  it('treats admin and supervisor as employers', () => {
    expect(isEmployer('admin')).toBe(true);
    expect(isEmployer('supervisor')).toBe(true);
    expect(isEmployer('staff')).toBe(false);
  });

  it('restricts My Employees to employers only', () => {
    const allowed = ['admin', 'supervisor'] as const;
    expect(canAccessRoles('admin', [...allowed])).toBe(true);
    expect(canAccessRoles('staff', [...allowed])).toBe(false);
    expect(canAccessRoles('auditor', [...allowed])).toBe(false);
  });
});
