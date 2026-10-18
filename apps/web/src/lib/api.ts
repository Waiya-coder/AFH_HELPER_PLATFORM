import type {
  AuthUser,
  ClientSummary,
  CreateClientRequest,
  CreateEmployeeRequest,
  EmployeeLoginRequest,
  UpdateClientRequest,
  FacilitySignupRequest,
  LoginResponse,
  SignupResponse,
  StaffJoinRequest,
  StaffProfile,
  StaffProfileRequest,
  StaffRosterEntry,
} from '@afh/shared';
import type { CprStatus } from '@afh/shared';
import { cprStatusLabel } from '@afh/shared';
import { useAuthStore } from '../stores/auth.store';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body !== undefined && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(body.message ?? 'Request failed', response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const { refreshToken, setAuth, clearAuth } = useAuthStore.getState();
    if (!refreshToken) {
      clearAuth();
      return null;
    }

    try {
      const result = await request<LoginResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      setAuth(result.accessToken, result.refreshToken, result.user);
      return result.accessToken;
    } catch {
      clearAuth();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  if (!token) {
    throw new ApiError('Your session expired. Please sign in again.', 401);
  }

  try {
    return await request<T>(path, options, token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    const newToken = await refreshAccessToken();
    if (!newToken) {
      throw new ApiError('Your session expired. Please sign in again.', 401);
    }

    return request<T>(path, options, newToken);
  }
}

async function authDownload(path: string, filename: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  if (!token) {
    throw new ApiError('Your session expired. Please sign in again.', 401);
  }

  async function downloadWithToken(accessToken: string): Promise<Response> {
    return fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  let response = await downloadWithToken(token);
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      throw new ApiError('Your session expired. Please sign in again.', 401);
    }
    response = await downloadWithToken(newToken);
  }

  if (!response.ok) {
    throw new ApiError('Export failed', response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const api = {
  register(payload: FacilitySignupRequest) {
    return request<SignupResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  registerStaff(payload: StaffJoinRequest) {
    return request<LoginResponse & { facility: { id: string; name: string } }>(
      '/auth/register-staff',
      { method: 'POST', body: JSON.stringify(payload) },
    );
  },

  login(email: string, password: string) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  employeeLogin(payload: EmployeeLoginRequest) {
    return request<LoginResponse>('/auth/employee-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async bootstrapSession(): Promise<void> {
    const { accessToken, refreshToken, updateUser, clearAuth } = useAuthStore.getState();
    if (!accessToken && !refreshToken) {
      return;
    }

    try {
      const { user } = await authRequest<{ user: AuthUser }>('/auth/me', {});
      updateUser(user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuth();
      }
    }
  },

  me() {
    return authRequest<{ user: AuthUser }>('/auth/me', {});
  },

  getCurrentShift() {
    return authRequest<{
      openTimesheet: {
        id: string;
        checkInTime: string;
        status: string;
      } | null;
      dailyTotalHours: number;
      elapsedHours: number;
    }>('/timesheets/current', {});
  },

  checkIn() {
    return authRequest('/timesheets/check-in', { method: 'POST' });
  },

  checkOut() {
    return authRequest('/timesheets/check-out', { method: 'POST' });
  },

  createManualTimesheet(payload: {
    staffId: string;
    date: string;
    checkInTime: string;
    checkOutTime: string;
    notes?: string;
  }) {
    return authRequest<{ timesheet: import('@afh/shared').Timesheet }>('/timesheets/manual', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  completeStaffProfile(payload: StaffProfileRequest) {
    return authRequest<{ profile: StaffProfile }>('/staff/me/profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMyStaffProfile() {
    return authRequest<{ profile: StaffProfile }>('/staff/me/profile', {});
  },

  listStaffRoster(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return authRequest<{ roster: StaffRosterEntry[] }>(`/staff/roster${query}`, {});
  },

  getFacilityInfo() {
    return authRequest<{ facility: { id: string; name: string; joinCode: string } }>(
      '/facility/me',
      {},
    );
  },

  listStaff(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return authRequest<{ staff: import('@afh/shared').StaffMember[] }>(`/staff${query}`, {});
  },

  createStaff(payload: CreateEmployeeRequest) {
    return authRequest<{ staff: StaffRosterEntry }>('/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  archiveStaff(id: string) {
    return authRequest<{ staff: import('@afh/shared').StaffMember }>(`/staff/${id}/archive`, {
      method: 'POST',
    });
  },

  listTimesheets(params?: { startDate?: string; endDate?: string; staffId?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.staffId) searchParams.set('staffId', params.staffId);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return authRequest<{ timesheets: import('@afh/shared').Timesheet[] }>(
      `/timesheets${query}`,
      {},
    );
  },

  exportTimesheets(params?: { startDate?: string; endDate?: string; format?: 'csv' | 'pdf' }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.format) searchParams.set('format', params.format);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const format = params?.format ?? 'csv';

    return authDownload(
      `/timesheets/export${query}`,
      format === 'pdf' ? 'timesheets.pdf' : 'timesheets.csv',
    );
  },

  getAuditReadiness() {
    return authRequest<{ readiness: import('@afh/shared').AuditReadinessSummary }>('/audit/readiness', {});
  },

  updateManualChecklistItem(
    itemKey: string,
    payload: { status: 'complete' | 'pending' | 'not_applicable'; notes?: string | null },
  ) {
    return authRequest<{ readiness: import('@afh/shared').AuditReadinessSummary }>(
      `/audit/checklist/${encodeURIComponent(itemKey)}`,
      { method: 'PATCH', body: JSON.stringify(payload) },
    );
  },

  downloadAuditPacket() {
    return authDownload('/audit/packet', 'afh-audit-packet.zip');
  },

  listAuditLogs() {
    return authRequest<{ logs: import('@afh/shared').AuditLogEntry[] }>('/audit-logs', {});
  },

  listSchedules(params: { startDate: string; endDate: string; staffId?: string }) {
    const searchParams = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    });
    if (params.staffId) {
      searchParams.set('staffId', params.staffId);
    }
    return authRequest<{ shifts: import('@afh/shared').ScheduleShift[] }>(
      `/schedules?${searchParams.toString()}`,
      {},
    );
  },

  createScheduleShift(payload: import('@afh/shared').ScheduleShiftRequest) {
    return authRequest<{ shift: import('@afh/shared').ScheduleShift }>('/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateScheduleShift(id: string, payload: Partial<import('@afh/shared').ScheduleShiftRequest>) {
    return authRequest<{ shift: import('@afh/shared').ScheduleShift }>(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteScheduleShift(id: string) {
    return authRequest<void>(`/schedules/${id}`, { method: 'DELETE' });
  },

  listClients(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return authRequest<{ clients: ClientSummary[] }>(`/clients${query}`, {});
  },

  getClient(id: string) {
    return authRequest<{ client: ClientSummary }>(`/clients/${id}`, {});
  },

  createClient(payload: CreateClientRequest) {
    return authRequest<{ client: ClientSummary }>('/clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateClient(id: string, payload: UpdateClientRequest) {
    return authRequest<{ client: ClientSummary }>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  uploadClientDocument(clientId: string, file: File, category = 'hospital_care_plan') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return authRequest<{ document: ClientSummary['documents'][number] }>(
      `/clients/${clientId}/documents`,
      { method: 'POST', body: formData },
    );
  },

  downloadClientDocument(documentId: string, fileName: string) {
    return authDownload(`/clients/documents/${documentId}/download`, fileName);
  },
};

export function formatHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'on_duty':
      return 'badge bg-emerald-100 text-emerald-800';
    case 'off_duty':
      return 'badge bg-slate-100 text-slate-700';
    case 'on_break':
      return 'badge bg-amber-100 text-amber-800';
    case 'archived':
      return 'badge bg-red-100 text-red-800';
    default:
      return 'badge bg-blue-100 text-blue-800';
  }
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export function cprBadgeClass(status: CprStatus): string {
  switch (status) {
    case 'valid':
      return 'badge bg-emerald-100 text-emerald-800';
    case 'expiring_soon':
      return 'badge bg-amber-100 text-amber-800';
    case 'expired':
      return 'badge bg-red-100 text-red-800';
    case 'missing':
      return 'badge bg-slate-100 text-slate-700';
  }
}

export { cprStatusLabel };

export function formatTotalHours(hours: number): string {
  return `${hours.toFixed(1)} hrs`;
}

export function formatDisplayDate(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return '—';
  }

  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function cprExpiredLabel(status: CprStatus): string {
  switch (status) {
    case 'expired':
      return 'Yes';
    case 'valid':
    case 'expiring_soon':
      return 'No';
    case 'missing':
      return 'Unknown';
  }
}

export function cprExpiredClass(status: CprStatus): string {
  switch (status) {
    case 'expired':
      return 'font-semibold text-red-700';
    case 'expiring_soon':
      return 'font-semibold text-amber-700';
    case 'valid':
      return 'font-semibold text-emerald-700';
    case 'missing':
      return 'text-slate-500';
  }
}
