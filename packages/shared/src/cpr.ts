export type CprStatus = 'valid' | 'expiring_soon' | 'expired' | 'missing';

const EXPIRING_SOON_DAYS = 30;

export function getCprStatus(expirationDate: Date | string | null | undefined, now = new Date()): CprStatus {
  if (!expirationDate) {
    return 'missing';
  }

  const expiry = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  if (expiry < today) {
    return 'expired';
  }

  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + EXPIRING_SOON_DAYS);

  if (expiry <= warningDate) {
    return 'expiring_soon';
  }

  return 'valid';
}

export function cprStatusLabel(status: CprStatus): string {
  switch (status) {
    case 'valid':
      return 'Valid';
    case 'expiring_soon':
      return 'Expiring soon';
    case 'expired':
      return 'Expired';
    case 'missing':
      return 'Not on file';
  }
}

export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
