import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const registerSchema = z.object({
  facilityName: z.string().min(2),
  facilityAddress: z.string().optional(),
  facilityContactInfo: z.string().optional(),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  adminEmail: z.string().email(),
  password: z.string().min(8),
});

describe('facility registration schema', () => {
  it('accepts valid multi-facility signup payload', () => {
    const result = registerSchema.safeParse({
      facilityName: 'Harbor Care Home',
      facilityAddress: '456 Main St',
      adminFirstName: 'Jane',
      adminLastName: 'Owner',
      adminEmail: 'jane@harborcare.com',
      password: 'securepass',
    });

    expect(result.success).toBe(true);
  });

  it('rejects short passwords', () => {
    const result = registerSchema.safeParse({
      facilityName: 'Harbor Care Home',
      adminFirstName: 'Jane',
      adminLastName: 'Owner',
      adminEmail: 'jane@harborcare.com',
      password: 'short',
    });

    expect(result.success).toBe(false);
  });
});

describe('timesheet export format', () => {
  const exportQuerySchema = z.object({
    format: z.enum(['csv', 'pdf']).default('csv'),
  });

  it('defaults to csv when format is omitted', () => {
    const result = exportQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.format).toBe('csv');
    }
  });

  it('accepts pdf format', () => {
    const result = exportQuerySchema.safeParse({ format: 'pdf' });
    expect(result.success).toBe(true);
  });
});
